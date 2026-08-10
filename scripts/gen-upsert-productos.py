#!/usr/bin/env python3
"""
Generate an idempotent SQL script that upserts products from
'Productos Serfel.xls' into 20_m_producto and their prices into
40_m_precio_producto (id_lista_precio = 1, the default price list).

Match key: xls 'CÓD ALT' (strip leading 'C'/'c') == 20_m_producto.cod_serfel.

Per xls row:
  * Resolve the target product id (@pid) for the stripped cod. When several
    products share the same cod_serfel, prefer the active one (id_estado = 1),
    then the most recently modified:
        ORDER BY (id_estado = 1) DESC, ult_fecha_mod DESC LIMIT 1
  * If found  -> UPDATE it: reactivate (id_estado = 1) and refresh
    nom_producto + costo_prom (+ audit fields).
  * If not found (or the row has no CÓD ALT) -> INSERT a new product
    (cod_serfel = stripped code, or 0 when the row has no code) and take
    @pid from LAST_INSERT_ID().
  * Upsert the price row for (id_lista_precio = 1, @pid) via
    ON DUPLICATE KEY UPDATE.

Static defaults for NEW products:
  id_tipo_producto = 0 (SIN TIPO), id_marca = 128 (SIN MARCA),
  desc_producto = '', cod_barra_producto = EAN or '', usa_porciones = 0,
  id_usuario_mod = 2, ult_fecha_mod = NOW().

id_UM  : mapped from the xls UM text (see UM_MAP).
impuesto : blank -> 0, 0.1 -> 1, 0.18 -> 4 (only applied to NEW inserts).
prices : precio_neto = round(PRECIO VENTA NETO), precio = round(PRECIO VENTA BRUTO).
"""
import math
import re
import sys
import unicodedata
from pathlib import Path

import xlrd

ROOT = Path(__file__).resolve().parent.parent
XLS = ROOT / "packages/db/dump/Productos Serfel.xls"
# Drizzle custom migration (applied by the migrate Lambda / `pnpm db:migrate`).
OUT = ROOT / "packages/db/migrations/0005_seed_productos.sql"
REPORT = ROOT / "packages/db/dump/upsert-productos.report.txt"

# Drizzle splits migration files on this marker and runs each chunk as one
# statement on a single connection (so @pid/@uid session vars persist).
BREAKPOINT = "\n--> statement-breakpoint\n"

USUARIO_MOD = 2
TIPO_FALLBACK = 0        # SIN TIPO (used when CATEGORÍA is blank/out of range)
# xls CATEGORÍA -> id_tipo_producto (rows created in 20_p_tipo_producto):
#   1 VARIOS · 2 ABARROTES · 3 CONFITES Y BEBESTIBLES
#   4 DETERGENTES Y PAPELERÍA · 5 FRAGILES · 6 REFRIGERADOS
CATEGORIA_IDS = {1, 2, 3, 4, 5, 6}
# (id, nombre, descripcion) rows to ensure in 20_p_tipo_producto before the
# product inserts reference them via the prod_tipo_prod foreign key.
TIPO_ROWS = [
    (1, "VARIOS", "VARIOS"),
    (2, "ABARROTES", "ABARROTES"),
    (3, "CONFITES Y BEBESTIBLES", "CONFITES Y BEBESTIBLES"),
    (4, "DETERGENTES Y PAPELERÍA", "DETERGENTES Y PAPELERÍA"),
    (5, "FRAGILES", "FRAGILES"),
    (6, "REFRIGERADOS", "REFRIGERADOS"),
]
ID_MARCA = 128           # SIN MARCA
UM_FALLBACK = 2          # UNI

# xls UM text -> id_UM (verified against existing 20_m_producto usage)
UM_MAP = {
    "UND": 2, "UNI": 2, "DSP": 1, "CJ": 4, "CJA": 4, "BLS": 5, "KG": 6,
    "KGS": 6, "BLI": 12, "PQA": 10, "PAQ": 10, "BID": 3, "GAL": 7, "EST": 9,
}

# xls IMPUESTO ADICIONAL -> impuesto code
IMPUESTO_MAP = {0.1: 1, 0.18: 4}

# column indices
C_CAT, C_ALT, C_EAN, C_DESC = 1, 3, 5, 6
C_COMPRA, C_NETO, C_IMP, C_BRUTO, C_UM = 7, 8, 9, 10, 11


def fix_mojibake(s: str) -> str:
    if not s:
        return s
    try:
        return s.encode("cp1252").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def txt(v) -> str:
    if v is None:
        return ""
    if isinstance(v, float):
        v = str(int(v)) if v == int(v) else str(v)
    return fix_mojibake(str(v)).strip()


def q(v, maxlen=None) -> str:
    """SQL string literal (never NULL) from a value."""
    s = txt(v)
    if maxlen is not None:
        s = s[:maxlen]
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


def money(v) -> int:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return 0
    if f != f:  # NaN
        return 0
    return int(math.floor(f + 0.5)) if f >= 0 else -int(math.floor(-f + 0.5))


def costo(v) -> str:
    try:
        return f"{float(v):.2f}"
    except (TypeError, ValueError):
        return "0.00"


def impuesto_code(v) -> int:
    s = txt(v)
    if s == "":
        return 0
    try:
        f = round(float(v), 4)
    except (TypeError, ValueError):
        return 0
    for k, code in IMPUESTO_MAP.items():
        if abs(f - k) < 1e-6:
            return code
    return 0


def stripped_cod(alt: str):
    """Return int cod_serfel from 'C1234' / 'c1234', or None if no usable code."""
    a = txt(alt)
    if a and a[0] in ("C", "c"):
        a = a[1:]
    a = a.strip()
    if a.isdigit():
        return int(a)
    return None


PROD_INSERT_COLS = (
    "nom_producto, desc_producto, cod_barra_producto, id_tipo_producto, id_marca, "
    "id_UM, id_usuario_mod, ult_fecha_mod, id_estado, costo_prom, cod_serfel, "
    "impuesto, usa_porciones"
)


def main():
    sh = xlrd.open_workbook(str(XLS)).sheet_by_index(0)

    # Migration header lives in the first chunk (with SET NAMES) so no
    # comment-only chunk is ever sent to the server as an empty query.
    header = (
        "-- Custom SQL migration file, put your code below! --\n"
        "-- Auto-generated by scripts/gen-upsert-productos.py from 'Productos Serfel.xls'.\n"
        "-- Upserts products (match on cod_serfel) and default-list prices (id_lista_precio=1).\n"
        "-- The nom_tipo_producto column is widened by migration 0003 (schema.ts).\n"
        "SET NAMES utf8mb4;"
    )
    stmts = [header, f"SET @uid := {USUARIO_MOD};"]

    # Ensure product categories exist (id_tipo_producto <- xls CATEGORÍA) before
    # any product references them via the prod_tipo_prod foreign key.
    for tid, nom, desc in TIPO_ROWS:
        stmts.append(
            "INSERT IGNORE INTO `20_p_tipo_producto` "
            "(`id_tipo_producto`, `nom_tipo_producto`, `desc_tipo_producto`, "
            "`nivel_1`, `nivel_2`, `id_usuario_mod`, `ult_fecha_mod`, `id_estado`) "
            f"VALUES ({tid}, {q(nom, 50)}, {q(desc, 200)}, 0, 0, @uid, NOW(), 1);"
        )

    n_keyed = n_nokey = 0
    bad_impuesto = []
    unknown_um = {}
    unknown_cat = {}

    for r in range(1, sh.nrows):
        row = [sh.cell_value(r, c) for c in range(sh.ncols)]
        cod = stripped_cod(row[C_ALT])
        nom = q(row[C_DESC], 200)
        barra = q(row[C_EAN], 200)
        cprom = costo(row[C_COMPRA])
        um_txt = txt(row[C_UM]).upper()
        um = UM_MAP.get(um_txt, UM_FALLBACK)
        if um_txt and um_txt not in UM_MAP:
            unknown_um[um_txt] = unknown_um.get(um_txt, 0) + 1
        imp = impuesto_code(row[C_IMP])
        if txt(row[C_IMP]) != "" and imp == 0:
            bad_impuesto.append((r + 1, row[C_IMP]))
        p_neto = money(row[C_NETO])
        p_bruto = money(row[C_BRUTO])
        try:
            cat = int(float(row[C_CAT]))
        except (TypeError, ValueError):
            cat = None
        id_tipo = cat if cat in CATEGORIA_IDS else TIPO_FALLBACK
        if cat not in CATEGORIA_IDS:
            unknown_cat[txt(row[C_CAT])] = unknown_cat.get(txt(row[C_CAT]), 0) + 1

        insert_new = (
            f"INSERT INTO `20_m_producto` ({PROD_INSERT_COLS}) SELECT "
            f"{nom}, '', {barra}, {id_tipo}, {ID_MARCA}, {um}, @uid, NOW(), 1, "
            f"{cprom}, {{cod}}, {imp}, 0 WHERE @pid IS NULL;"
        )

        if cod is not None:
            n_keyed += 1
            stmts.append(
                "SET @pid := (SELECT `id_producto` FROM `20_m_producto` "
                f"WHERE `cod_serfel` = {cod} "
                "ORDER BY (`id_estado` = 1) DESC, `ult_fecha_mod` DESC LIMIT 1);"
            )
            # update path (no-op when @pid IS NULL)
            stmts.append(
                "UPDATE `20_m_producto` SET "
                f"`nom_producto` = {nom}, `costo_prom` = {cprom}, `id_estado` = 1, "
                "`id_usuario_mod` = @uid, `ult_fecha_mod` = NOW() "
                "WHERE `id_producto` = @pid;"
            )
            # insert path (only when not found)
            stmts.append(insert_new.replace("{cod}", str(cod)))
            stmts.append("SET @pid := IF(@pid IS NULL, LAST_INSERT_ID(), @pid);")
        else:
            # no CÓD ALT -> always insert as new (cod_serfel = 0)
            n_nokey += 1
            stmts.append("SET @pid := NULL;")
            stmts.append(insert_new.replace("{cod}", "0"))
            stmts.append("SET @pid := LAST_INSERT_ID();")

        # price upsert on the default list
        stmts.append(
            "INSERT INTO `40_m_precio_producto` "
            "(`id_lista_precio`, `id_producto`, `precio_neto`, `precio`) "
            f"VALUES (1, @pid, {p_neto}, {p_bruto}) "
            "ON DUPLICATE KEY UPDATE `precio_neto` = VALUES(`precio_neto`), "
            "`precio` = VALUES(`precio`);"
        )

    OUT.write_text(BREAKPOINT.join(stmts) + "\n", encoding="utf-8")

    rep = [
        f"xls rows           : {sh.nrows - 1}",
        f"with CÓD ALT (keyed): {n_keyed}",
        f"no CÓD ALT (new)   : {n_nokey}",
        f"unknown UM values  : {unknown_um}",
        f"CATEGORÍA->0 (out of range): {unknown_cat}",
        f"blank->0 impuesto rows unmapped: {len(bad_impuesto)} {bad_impuesto[:10]}",
    ]
    REPORT.write_text("\n".join(rep), encoding="utf-8")

    print(f"Wrote {OUT.relative_to(ROOT)}")
    print(f"Wrote {REPORT.relative_to(ROOT)}")
    print(f"keyed={n_keyed} no_key_new={n_nokey} unknown_um={unknown_um} "
          f"unmapped_impuesto={len(bad_impuesto)}")


if __name__ == "__main__":
    main()

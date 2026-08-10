#!/usr/bin/env python3
"""
Generate an idempotent SQL script that inserts clients present in
'Clientes Serfel.xls' but (potentially) missing from the Serfel DB.

For every xls row we emit a pair of statements:
  1) INSERT IGNORE INTO 10_m_cliente ...            (skipped if rut already exists)
  2) INSERT INTO 10_m_local_cliente ... WHERE ROW_COUNT() = 1
     (the local is created ONLY when the cliente above was actually inserted,
      i.e. only for genuinely new clients)

id_local_cliente is NOT auto_increment, so we assign it from a session
variable seeded with MAX(id_local_cliente) at run time.

Mappings:
  ID              -> rut_cliente (PK)
  RUT (after '-') -> dv_cliente
  VENDEDOR name   -> id_vendedor  (resolved here against 10_m_usuario, fallback 5)
  CONDICION PAGO  -> id_forma_pago (resolved here vs 10_p_tipo_docto.nom_tipo_docto,
                                    fallback 7 = 'CONTADO')
  id_usuario_mod  = 2 (Felipe Aranda), ult_fecha_mod = NOW()
"""
import re
import sys
import unicodedata
from pathlib import Path

import xlrd

ROOT = Path(__file__).resolve().parent.parent
XLS = ROOT / "packages/db/dump/Clientes Serfel.xls"
DUMP = ROOT / "packages/db/dump/legacy-data.sql"
# Drizzle custom migration (applied by the migrate Lambda / `pnpm db:migrate`).
OUT = ROOT / "packages/db/migrations/0004_seed_clientes.sql"
REPORT = ROOT / "packages/db/dump/insert-missing-clientes.report.txt"

# Drizzle splits migration files on this marker and runs each chunk as one
# statement on a single connection (so @next / ROW_COUNT() stay consistent).
BREAKPOINT = "\n--> statement-breakpoint\n"

USUARIO_MOD = 2
VENDEDOR_FALLBACK = 5
FORMA_PAGO_FALLBACK = 7

# ── helpers ─────────────────────────────────────────────────────────────────

def fix_mojibake(s: str) -> str:
    """Reverse UTF-8 bytes that were decoded as cp1252 (e.g. 'PIÃ‘A' -> 'PIÑA')."""
    if not s:
        return s
    try:
        repaired = s.encode("cp1252").decode("utf-8")
        # Only accept if it actually changed things toward valid text.
        return repaired
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def norm_name(s: str) -> str:
    """Uppercase, strip accents, collapse whitespace - for name matching."""
    s = fix_mojibake(s)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s).strip().upper()


def sql_str(v, maxlen: int | None = None, nullable: bool = False):
    """Render a Python value as a SQL string/NULL literal."""
    if v is None:
        return "NULL"
    if isinstance(v, float):
        # xls numeric cell (e.g. phone) -> integer-ish string, no trailing .0
        v = str(int(v)) if v == int(v) else str(v)
    s = fix_mojibake(str(v)).strip()
    if s == "":
        return "NULL" if nullable else "''"
    if maxlen is not None:
        s = s[:maxlen]
    return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"


def cell_str(v) -> str:
    """Plain trimmed string for non-null text columns (never NULL)."""
    if v is None:
        return ""
    if isinstance(v, float):
        v = str(int(v)) if v == int(v) else str(v)
    return fix_mojibake(str(v)).strip()


# ── build vendedor name -> id_usuario map from the dump ─────────────────────

def load_tipo_docto():
    """norm(nom_tipo_docto) -> id_tipo_docto, used for id_forma_pago."""
    data = DUMP.read_text(encoding="latin-1")
    m = re.search(r"INSERT INTO `10_p_tipo_docto`[^;]*?VALUES\s*(.*?);", data, re.S)
    if not m:
        print("WARN: no 10_p_tipo_docto insert found in dump", file=sys.stderr)
        return {}
    name2id = {}
    for t in re.findall(r"\(([^()]*)\)", m.group(1)):
        parts = next_split(t)
        if len(parts) < 2:
            continue
        try:
            tid = int(parts[0])
        except ValueError:
            continue
        nom = norm_name(unquote(parts[1]))
        if nom:
            name2id.setdefault(nom, tid)
    return name2id


def load_usuarios():
    data = DUMP.read_text(encoding="latin-1")
    m = re.search(r"INSERT INTO `10_m_usuario`[^;]*?VALUES\s*(.*?);", data, re.S)
    if not m:
        print("WARN: no 10_m_usuario insert found in dump", file=sys.stderr)
        return {}
    body = m.group(1)
    # split top-level (...) tuples
    tuples = re.findall(r"\(([^()]*)\)", body)
    name2id = {}
    for t in tuples:
        # id, rut, dv, nom, apell_pat, apell_mat, password, ...
        parts = next_split(t)
        if len(parts) < 6:
            continue
        try:
            uid = int(parts[0])
        except ValueError:
            continue
        nom = unquote(parts[3])
        ap = unquote(parts[4])
        am = unquote(parts[5])
        full = norm_name(f"{nom} {ap} {am}")
        if full:
            name2id.setdefault(full, uid)
    return name2id


def unquote(p: str) -> str:
    p = p.strip()
    if p.upper() == "NULL":
        return ""
    if p.startswith("'") and p.endswith("'"):
        p = p[1:-1]
    return p.replace("\\'", "'").replace('\\"', '"').replace("\\\\", "\\")


def next_split(t: str):
    """Split a SQL tuple body on top-level commas, honoring quotes."""
    out, cur, q, esc = [], [], False, False
    for ch in t:
        if esc:
            cur.append(ch); esc = False; continue
        if ch == "\\":
            cur.append(ch); esc = True; continue
        if ch == "'":
            q = not q; cur.append(ch); continue
        if ch == "," and not q:
            out.append("".join(cur)); cur = []; continue
        cur.append(ch)
    out.append("".join(cur))
    return out


# ── main ────────────────────────────────────────────────────────────────────

def main():
    name2id = load_usuarios()
    docto2id = load_tipo_docto()
    wb = xlrd.open_workbook(str(XLS))
    sh = wb.sheet_by_index(0)

    CLIENTE_COLS = (
        "rut_cliente, dv_cliente, razon_social, nom_fantasia, telefono_cliente, "
        "direccion_cliente, comuna, ciudad, email_cliente, id_lista_precio, "
        "id_usuario_mod, ult_fecha_mod, id_estado, permite_venta_deuda"
    )
    LOCAL_COLS = (
        "id_local_cliente, rut_cliente, nom_local_cliente, telefono_local_cliente, "
        "direccion_local_cliente, comuna_local_cliente, email_local_cliente, giro, "
        "nom_contacto, apell_pat_contacto, apell_mat_contacto, telefono_contacto, "
        "email_contacto, tope_venta, tope_credito, id_vendedor, id_forma_pago, "
        "comuna, observaciones, id_usuario_mod, ult_fecha_mod, id_estado, "
        "permite_venta_tope_mensual"
    )

    # Migration header lives in the first chunk (with SET NAMES) so no
    # comment-only chunk is ever sent to the server as an empty query.
    header = (
        "-- Custom SQL migration file, put your code below! --\n"
        "-- Auto-generated by scripts/gen-insert-missing-clientes.py from 'Clientes Serfel.xls'.\n"
        "-- Existing ruts (10_m_cliente PK) are skipped via INSERT IGNORE; a\n"
        "-- 10_m_local_cliente row is created ONLY when the cliente was newly inserted.\n"
        "SET NAMES utf8mb4;"
    )
    stmts = [
        header,
        "SET @uid := %d;" % USUARIO_MOD,
        "SELECT @next := COALESCE(MAX(`id_local_cliente`), 0) FROM `10_m_local_cliente`;",
    ]

    unmatched = {}
    fp_unmatched = {}
    matched = 0
    total = 0
    bad_rut = []

    for r in range(1, sh.nrows):
        row = [sh.cell_value(r, c) for c in range(sh.ncols)]
        (c_id, c_rut, c_rs, c_nf, c_cont, c_giro, c_dir, c_com,
         c_mail, c_tel, c_vend, c_cond, c_medio) = row

        # rut_cliente
        try:
            rut = int(c_id)
        except (ValueError, TypeError):
            bad_rut.append((r + 1, c_id))
            continue
        # dv from "12345678-K"
        rut_txt = cell_str(c_rut)
        dv = rut_txt.split("-")[-1].strip().upper()[:1] if "-" in rut_txt else ""
        if not dv:
            dv = "0"

        razon = cell_str(c_rs)[:50] or "SIN RAZON SOCIAL"
        fantasia = cell_str(c_nf)[:50]
        nom_local = (cell_str(c_nf) or cell_str(c_rs))[:30] or "SIN NOMBRE"
        comuna20 = cell_str(c_com)[:20]

        # vendedor mapping
        vend_id = VENDEDOR_FALLBACK
        vnorm = norm_name(cell_str(c_vend))
        if vnorm:
            if vnorm in name2id:
                vend_id = name2id[vnorm]
                matched += 1
            else:
                unmatched[vnorm] = unmatched.get(vnorm, 0) + 1

        # id_forma_pago from CONDICION PAGO vs 10_p_tipo_docto (fallback 7 = CONTADO)
        fp_id = FORMA_PAGO_FALLBACK
        cnorm = norm_name(cell_str(c_cond))
        if cnorm:
            if cnorm in docto2id:
                fp_id = docto2id[cnorm]
            else:
                fp_unmatched[cnorm] = fp_unmatched.get(cnorm, 0) + 1
        fp = str(fp_id)

        total += 1

        cliente_vals = ", ".join([
            str(rut), sql_str(dv, 1), sql_str(razon, 50), sql_str(fantasia, 50),
            sql_str(c_tel, 15, nullable=True), sql_str(c_dir, 200), sql_str(comuna20, 20),
            "''",                       # ciudad (not in xls)
            sql_str(c_mail, 50, nullable=True),
            "1",                        # id_lista_precio
            "@uid", "NOW()", "1", "0",  # id_usuario_mod, ult_fecha_mod, id_estado, permite_venta_deuda
        ])

        local_vals = ", ".join([
            "@next := @next + 1", str(rut), sql_str(nom_local, 30),
            sql_str(c_tel, 15, nullable=True), sql_str(c_dir, 200),
            sql_str(c_com, 30), sql_str(c_mail, 50, nullable=True),
            sql_str(c_giro, 30), sql_str(c_cont, 50),
            "''", "''",                 # apell_pat_contacto, apell_mat_contacto
            "NULL", "NULL",             # telefono_contacto, email_contacto
            "0", "0",                   # tope_venta, tope_credito
            str(vend_id), fp,
            sql_str(comuna20, 20),      # comuna
            "''",                       # observaciones
            "@uid", "NOW()", "1", "0",  # id_usuario_mod, ult_fecha_mod, id_estado, permite_venta_tope_mensual
        ])

        stmts.append(f"INSERT IGNORE INTO `10_m_cliente` ({CLIENTE_COLS}) VALUES ({cliente_vals});")
        stmts.append(
            f"INSERT INTO `10_m_local_cliente` ({LOCAL_COLS}) "
            f"SELECT {local_vals} WHERE ROW_COUNT() = 1;"
        )

    OUT.write_text(BREAKPOINT.join(stmts) + "\n", encoding="utf-8")

    # report
    rep = [
        f"xls rows processed : {total}",
        f"vendedor matched   : {matched}",
        f"vendedor unmatched : {sum(unmatched.values())} occurrences, {len(unmatched)} distinct names",
        f"forma_pago unmatch : {sum(fp_unmatched.values())} occurrences, {len(fp_unmatched)} distinct values",
        f"bad/blank ID rows  : {len(bad_rut)} {bad_rut[:10]}",
        "",
        "-- Unmatched CONDICION PAGO values (value -> occurrences), default id_forma_pago=7 used:",
    ]
    for name, cnt in sorted(fp_unmatched.items(), key=lambda x: -x[1]):
        rep.append(f"  {cnt:5d}  {name}")
    rep += ["", "-- Unmatched vendedor names (name -> occurrences), default id_vendedor=5 used:"]
    for name, cnt in sorted(unmatched.items(), key=lambda x: -x[1]):
        rep.append(f"  {cnt:5d}  {name}")
    REPORT.write_text("\n".join(rep), encoding="utf-8")

    print(f"Wrote {OUT.relative_to(ROOT)}  ({total} client pairs)")
    print(f"Wrote {REPORT.relative_to(ROOT)}")
    print(f"vendedor matched={matched} unmatched_occ={sum(unmatched.values())} "
          f"distinct_unmatched={len(unmatched)} bad_id_rows={len(bad_rut)}")


if __name__ == "__main__":
    main()

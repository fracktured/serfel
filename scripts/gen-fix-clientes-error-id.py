#!/usr/bin/env python3
"""
Generate a Drizzle custom migration that fixes the clients seeded with a WRONG
rut_cliente in 0004_seed_clientes.sql.

Background
----------
For the rows listed in 'clientes con error de id.csv', the previous seed used
the spreadsheet ID column (e.g. 100620709) as `rut_cliente` instead of the real
RUT (e.g. 13347732 from '13347732-2'). Every other field of those rows is
correct. This migration, for each affected client:

  1) Creates a NEW 10_m_cliente with the correct rut (left part of the RUT
     field, dropping the '-DV'), copying all other fields from the wrong row.
  2) Creates a NEW 10_m_local_cliente pointing at the correct rut, copying all
     fields from the wrong local (id_local_cliente is NOT auto_increment, so it
     is assigned from a session var seeded with MAX(id_local_cliente)).
  3) Re-points TODAY's rows in 30_m_pedido (by id_local_cliente) to the new
     local.
  4) Re-points TODAY's rows in 40_m_venta to the new local AND fixes their
     rut_cliente to the correct rut.
  5) Marks the OLD cliente and OLD local (rut_cliente = ID) as id_estado = 0
     (Inactivo).

Only the ID -> (new_rut, dv) mapping is taken from the CSV; every other value is
copied from the live DB rows so we preserve whatever 0004 computed (vendedor,
forma_pago, giro, ...). "TODAY" is CURDATE() at run time (see @fix_date).

This migration is single-run (not idempotent): re-running would duplicate the
new locals. Drizzle applies each migration exactly once.
"""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "packages/db/dump/clientes con error de id.csv"
OUT = ROOT / "packages/db/migrations/0007_fix_clientes_error_id.sql"

# Drizzle splits migration files on this marker and runs each chunk as one
# statement on a single connection (so @next / @old_lc / @uid stay consistent).
BREAKPOINT = "\n--> statement-breakpoint\n"

USUARIO_MOD = 2  # Felipe Aranda


def parse_rows(path: Path):
    rows = []
    with path.open(encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        for r in reader:
            old_rut = r["ID"].strip()
            rut_raw = r["RUT"].strip()
            razon = (r["RAZON SOCIAL"] or "").strip()
            if not old_rut or not rut_raw:
                continue
            left, _, dv = rut_raw.partition("-")
            new_rut = left.replace(".", "").strip()
            dv = dv.strip().upper()
            if not new_rut.isdigit() or not dv:
                raise ValueError(f"bad RUT {rut_raw!r} for ID {old_rut}")
            rows.append((int(old_rut), int(new_rut), dv, razon))
    return rows


def block(old_rut: int, new_rut: int, dv: str, razon: str) -> str:
    safe_razon = razon.replace("--", "- -")
    return "\n".join(
        [
            f"-- ID {old_rut}  ->  RUT {new_rut}-{dv}  ({safe_razon})",
            # 0) reset @old_lc so a no-match lookup below can't reuse a prior value
            "SELECT @old_lc := NULL;",
            BREAKPOINT.strip("\n"),
            # 1) locate the WRONG local (still active) for this ID
            f"SELECT @old_lc := id_local_cliente FROM `10_m_local_cliente` "
            f"WHERE rut_cliente = {old_rut} AND id_estado <> 0 "
            f"ORDER BY id_local_cliente LIMIT 1;",
            BREAKPOINT.strip("\n"),
            # 2) new cliente with correct rut, copying the wrong row's fields
            "INSERT IGNORE INTO `10_m_cliente` (rut_cliente, dv_cliente, razon_social, "
            "nom_fantasia, telefono_cliente, direccion_cliente, comuna, ciudad, "
            "email_cliente, id_lista_precio, id_usuario_mod, ult_fecha_mod, id_estado, "
            "permite_venta_deuda) SELECT "
            f"{new_rut}, '{dv}', razon_social, nom_fantasia, telefono_cliente, "
            "direccion_cliente, comuna, ciudad, email_cliente, id_lista_precio, @uid, "
            f"NOW(), 1, permite_venta_deuda FROM `10_m_cliente` WHERE rut_cliente = {old_rut};",
            BREAKPOINT.strip("\n"),
            # 3) reserve the next id_local_cliente
            "SELECT @next := @next + 1;",
            BREAKPOINT.strip("\n"),
            # 4) new local with correct rut, copying the wrong local's fields
            "INSERT INTO `10_m_local_cliente` (id_local_cliente, rut_cliente, "
            "nom_local_cliente, telefono_local_cliente, direccion_local_cliente, "
            "comuna_local_cliente, email_local_cliente, giro, nom_contacto, "
            "apell_pat_contacto, apell_mat_contacto, telefono_contacto, email_contacto, "
            "tope_venta, tope_credito, id_vendedor, id_forma_pago, comuna, observaciones, "
            "id_usuario_mod, ult_fecha_mod, id_estado, permite_venta_tope_mensual) SELECT "
            f"@next, {new_rut}, nom_local_cliente, telefono_local_cliente, "
            "direccion_local_cliente, comuna_local_cliente, email_local_cliente, giro, "
            "nom_contacto, apell_pat_contacto, apell_mat_contacto, telefono_contacto, "
            "email_contacto, tope_venta, tope_credito, id_vendedor, id_forma_pago, comuna, "
            "observaciones, @uid, NOW(), 1, permite_venta_tope_mensual "
            "FROM `10_m_local_cliente` WHERE id_local_cliente = @old_lc;",
            BREAKPOINT.strip("\n"),
            # 5) re-point TODAY's pedidos to the new local
            "UPDATE `30_m_pedido` SET id_local_cliente = @next "
            "WHERE id_local_cliente = @old_lc AND fecha_pedido >= @fix_date;",
            BREAKPOINT.strip("\n"),
            # 6) re-point TODAY's ventas to the new local AND fix their rut_cliente
            f"UPDATE `40_m_venta` SET id_local_cliente = @next, rut_cliente = {new_rut} "
            "WHERE id_local_cliente = @old_lc AND fecha_venta >= @fix_date;",
            BREAKPOINT.strip("\n"),
            # 7) deactivate the OLD local and OLD cliente
            "UPDATE `10_m_local_cliente` SET id_estado = 0, id_usuario_mod = @uid, "
            "ult_fecha_mod = NOW() WHERE id_local_cliente = @old_lc;",
            BREAKPOINT.strip("\n"),
            f"UPDATE `10_m_cliente` SET id_estado = 0, id_usuario_mod = @uid, "
            f"ult_fecha_mod = NOW() WHERE rut_cliente = {old_rut};",
        ]
    )


def main() -> None:
    rows = parse_rows(CSV_PATH)
    header = "\n".join(
        [
            "-- Custom SQL migration file, put your code below! --",
            "-- Auto-generated by scripts/gen-fix-clientes-error-id.py from",
            "-- 'clientes con error de id.csv'. Fixes rows that 0004_seed_clientes.sql",
            "-- seeded with rut_cliente = spreadsheet ID instead of the real RUT.",
            "-- Single-run migration (not idempotent). @fix_date = CURDATE() = 'today'.",
            "SET NAMES utf8mb4;",
            BREAKPOINT.strip("\n"),
            "SET @uid := 2;",
            BREAKPOINT.strip("\n"),
            "SET @fix_date := CURDATE();",
            BREAKPOINT.strip("\n"),
            "SELECT @next := COALESCE(MAX(`id_local_cliente`), 0) FROM `10_m_local_cliente`;",
        ]
    )
    parts = [header] + [block(*r) for r in rows]
    OUT.write_text(BREAKPOINT.join(parts) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(rows)} clients)")


if __name__ == "__main__":
    main()

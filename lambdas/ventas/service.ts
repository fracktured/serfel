import { and, asc, eq, ne, notExists, sql } from "drizzle-orm";
import {
  t10MUsuario,
  t10MEmpresa,
  t10MCliente,
  t10MLocalCliente,
  t30MPedido,
  t40MVenta,
  type Db,
} from "@serfel/db";
import {
  ESTADO_ACTIVO,
  ESTADO_ANULADO,
  type EmpresaDto,
  type PedidoPendienteDto,
} from "@serfel/shared";

/** drizzle transaction object — same query API as Db for our purposes. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db
    .select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario)
    .where(eq(t10MUsuario.idUsuario, idUsuario))
    .limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}

export async function listEmpresas(db: Db): Promise<EmpresaDto[]> {
  // 10_m_empresa PK is composite (rut_empresa, ult_fecha_mod): collapse to one
  // row per rut, keeping the latest ult_fecha_mod.
  const rows = await db
    .select({
      rutEmpresa: t10MEmpresa.rutEmpresa,
      dv: sql<string>`MAX(${t10MEmpresa.dvEmpresa})`,
      razonSocial: sql<string>`MAX(${t10MEmpresa.razonSocial})`,
    })
    .from(t10MEmpresa)
    .where(eq(t10MEmpresa.idEstado, ESTADO_ACTIVO))
    .groupBy(t10MEmpresa.rutEmpresa)
    .orderBy(asc(sql`MAX(${t10MEmpresa.razonSocial})`));
  return rows;
}

function fullName(nom: string, ap: string | null, am: string | null): string {
  return [nom, ap ?? "", am ?? ""].join(" ").replace(/\s+/g, " ").trim();
}

export async function listPendientes(db: Db): Promise<PedidoPendienteDto[]> {
  const rows = await db
    .select({
      idPedido: t30MPedido.idPedido,
      fecha: t30MPedido.fechaPedido,
      precioTotal: t30MPedido.precioTotal,
      rutCliente: t10MCliente.rutCliente,
      dvCliente: t10MCliente.dvCliente,
      nomFantasia: t10MCliente.nomFantasia,
      nomLocal: t10MLocalCliente.nomLocalCliente,
      nomContacto: t10MLocalCliente.nomContacto,
      apellPatContacto: t10MLocalCliente.apellPatContacto,
      apellMatContacto: t10MLocalCliente.apellMatContacto,
      nomVendedor: t10MUsuario.nomUsuario,
      apellPatVendedor: t10MUsuario.apellPatUsuario,
      apellMatVendedor: t10MUsuario.apellMatUsuario,
    })
    .from(t30MPedido)
    .innerJoin(t10MLocalCliente, eq(t30MPedido.idLocalCliente, t10MLocalCliente.idLocalCliente))
    .innerJoin(t10MCliente, eq(t10MLocalCliente.rutCliente, t10MCliente.rutCliente))
    .innerJoin(t10MUsuario, eq(t30MPedido.idUsuario, t10MUsuario.idUsuario))
    .where(
      and(
        eq(t30MPedido.idEstado, ESTADO_ACTIVO),
        notExists(
          db
            .select({ x: sql`1` })
            .from(t40MVenta)
            .where(
              and(
                eq(t40MVenta.idPedido, t30MPedido.idPedido),
                ne(t40MVenta.idEstado, ESTADO_ANULADO)
              )
            )
        )
      )
    )
    .orderBy(asc(t30MPedido.idPedido));

  return rows.map((r) => ({
    idPedido: r.idPedido,
    fecha: r.fecha,
    rutCliente: r.rutCliente,
    dvCliente: r.dvCliente,
    nomFantasia: r.nomFantasia,
    nomLocal: r.nomLocal,
    contacto: fullName(r.nomContacto ?? "", r.apellPatContacto, r.apellMatContacto),
    vendedor: fullName(r.nomVendedor, r.apellPatVendedor, r.apellMatVendedor),
    precioTotal: r.precioTotal,
  }));
}

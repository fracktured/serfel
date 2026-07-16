import { asc, eq } from "drizzle-orm";
import {
  t20MProducto,
  t20PMarca,
  t20PTipoProducto,
  t20PUnidadMedida,
  type Db,
} from "@serfel/db";
import {
  ESTADO_ACTIVO,
  ESTADO_INACTIVO,
  type EstadoFilter,
  type LookupsDto,
  type ProductoDto,
} from "@serfel/shared";

/** drizzle transaction object — same query API as Db for our purposes. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

const productoDtoColumns = {
  idProducto: t20MProducto.idProducto,
  codSerfel: t20MProducto.codSerfel,
  nomProducto: t20MProducto.nomProducto,
  idMarca: t20MProducto.idMarca,
  nomMarca: t20PMarca.nomMarca,
  idUm: t20MProducto.idUm,
  nomUm: t20PUnidadMedida.nomUm,
  idTipoProducto: t20MProducto.idTipoProducto,
  nomTipoProducto: t20PTipoProducto.nomTipoProducto,
  idEstado: t20MProducto.idEstado,
};

function productQuery(db: DbOrTx) {
  return (db as Db)
    .select(productoDtoColumns)
    .from(t20MProducto)
    .innerJoin(t20PMarca, eq(t20MProducto.idMarca, t20PMarca.idMarca))
    .innerJoin(t20PUnidadMedida, eq(t20MProducto.idUm, t20PUnidadMedida.idUm))
    .innerJoin(
      t20PTipoProducto,
      eq(t20MProducto.idTipoProducto, t20PTipoProducto.idTipoProducto)
    );
}

export async function getLookups(db: Db): Promise<LookupsDto> {
  const [marcas, tiposProducto, unidadesMedida] = await Promise.all([
    db
      .select({ id: t20PMarca.idMarca, nombre: t20PMarca.nomMarca })
      .from(t20PMarca)
      .orderBy(asc(t20PMarca.idMarca)),
    db
      .select({
        id: t20PTipoProducto.idTipoProducto,
        nombre: t20PTipoProducto.nomTipoProducto,
      })
      .from(t20PTipoProducto)
      .orderBy(asc(t20PTipoProducto.idTipoProducto)),
    db
      .select({ id: t20PUnidadMedida.idUm, nombre: t20PUnidadMedida.nomUm })
      .from(t20PUnidadMedida)
      .orderBy(asc(t20PUnidadMedida.idUm)),
  ]);
  return { marcas, tiposProducto, unidadesMedida };
}

export async function listProducts(
  db: Db,
  estado: EstadoFilter
): Promise<ProductoDto[]> {
  const query = productQuery(db);
  const filtered =
    estado === "todos"
      ? query
      : query.where(
          eq(
            t20MProducto.idEstado,
            estado === "activos" ? ESTADO_ACTIVO : ESTADO_INACTIVO
          )
        );
  return filtered.orderBy(asc(t20MProducto.codSerfel));
}

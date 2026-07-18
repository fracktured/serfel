import { asc, eq, and, ne, or } from "drizzle-orm";
import {
  t20MProducto,
  t20PMarca,
  t20PTipoProducto,
  t20PUnidadMedida,
  t99PImpuesto,
  type Db,
} from "@serfel/db";
import {
  ESTADO_ACTIVO,
  ESTADO_INACTIVO,
  type EstadoFilter,
  type LookupsDto,
  type ProductoDto,
  type ProductoInput,
} from "@serfel/shared";
import { AppError } from "./errors";

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
  impuesto: t20MProducto.impuesto,
  usaPorciones: t20MProducto.usaPorciones,
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
  const [marcas, tiposProducto, unidadesMedida, impuestoRows] =
    await Promise.all([
      db
        .select({ id: t20PMarca.idMarca, nombre: t20PMarca.nomMarca })
        .from(t20PMarca)
        .orderBy(asc(t20PMarca.nomMarca)),
      db
        .select({
          id: t20PTipoProducto.idTipoProducto,
          nombre: t20PTipoProducto.nomTipoProducto,
        })
        .from(t20PTipoProducto)
        .orderBy(asc(t20PTipoProducto.nomTipoProducto)),
      db
        .select({ id: t20PUnidadMedida.idUm, nombre: t20PUnidadMedida.nomUm })
        .from(t20PUnidadMedida)
        .orderBy(asc(t20PUnidadMedida.nomUm)),
      db
        .select({
          id: t99PImpuesto.idImpuesto,
          nombre: t99PImpuesto.nomImpuesto,
          valor: t99PImpuesto.valor,
        })
        .from(t99PImpuesto)
        .orderBy(asc(t99PImpuesto.nomImpuesto)),
    ]);
  // dropdown label shows the rate, e.g. "IABA 18%"
  const impuestos = impuestoRows.map((r) => ({
    id: r.id,
    nombre: `${r.nombre} ${r.valor}%`,
  }));
  return { marcas, tiposProducto, unidadesMedida, impuestos };
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

function nowDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

async function getProductDto(
  db: DbOrTx,
  idProducto: number
): Promise<ProductoDto> {
  const rows = await productQuery(db).where(
    eq(t20MProducto.idProducto, idProducto)
  );
  if (rows.length === 0) {
    throw new AppError(
      "PRODUCTO_NO_ENCONTRADO",
      404,
      `Producto ${idProducto} no existe`
    );
  }
  return rows[0];
}

/**
 * Business rule: codSerfel and nomProducto must be unique among ACTIVE
 * products (id_estado = 1). MariaDB's default collation makes the name
 * comparison case-insensitive.
 */
async function assertUnique(
  tx: DbOrTx,
  codSerfel: number,
  nomProducto: string,
  excludeIdProducto: number | null
): Promise<void> {
  const conditions = [
    eq(t20MProducto.idEstado, ESTADO_ACTIVO),
    or(
      eq(t20MProducto.codSerfel, codSerfel),
      eq(t20MProducto.nomProducto, nomProducto)
    ),
  ];
  if (excludeIdProducto !== null) {
    conditions.push(ne(t20MProducto.idProducto, excludeIdProducto));
  }
  const clashes = await (tx as Db)
    .select({
      codSerfel: t20MProducto.codSerfel,
      nomProducto: t20MProducto.nomProducto,
    })
    .from(t20MProducto)
    .where(and(...conditions));

  if (clashes.some((c) => c.codSerfel === codSerfel)) {
    throw new AppError(
      "COD_SERFEL_EN_USO",
      409,
      `El código ${codSerfel} ya está en uso por otro producto activo`
    );
  }
  if (clashes.length > 0) {
    throw new AppError(
      "NOMBRE_EN_USO",
      409,
      `El nombre "${nomProducto}" ya está en uso por otro producto activo`
    );
  }
}

export async function createProduct(
  db: Db,
  input: ProductoInput,
  idUsuario: number
): Promise<ProductoDto> {
  return db.transaction(async (tx) => {
    await assertUnique(tx, input.codSerfel, input.nomProducto, null);
    // $returningId() does not work with this schema's table-level PK style —
    // read the DB-assigned id from mysql2's ResultSetHeader.
    const [header] = await tx.insert(t20MProducto).values({
      codSerfel: input.codSerfel,
      nomProducto: input.nomProducto,
      descProducto: "",
      codBarraProducto: "",
      idMarca: input.idMarca,
      idUm: input.idUm,
      idTipoProducto: input.idTipoProducto,
      idUsuarioMod: idUsuario,
      ultFechaMod: nowDateTime(),
      idEstado: ESTADO_ACTIVO,
      impuesto: input.impuesto,
      usaPorciones: input.usaPorciones,
    });
    return getProductDto(tx, header.insertId);
  });
}

export async function updateProduct(
  db: Db,
  idProducto: number,
  input: ProductoInput,
  idUsuario: number
): Promise<ProductoDto> {
  return db.transaction(async (tx) => {
    await getProductDto(tx, idProducto); // 404 if missing
    await assertUnique(tx, input.codSerfel, input.nomProducto, idProducto);
    await tx
      .update(t20MProducto)
      .set({
        codSerfel: input.codSerfel,
        nomProducto: input.nomProducto,
        idMarca: input.idMarca,
        idUm: input.idUm,
        idTipoProducto: input.idTipoProducto,
        impuesto: input.impuesto,
        usaPorciones: input.usaPorciones,
        idUsuarioMod: idUsuario,
        ultFechaMod: nowDateTime(),
      })
      .where(eq(t20MProducto.idProducto, idProducto));
    return getProductDto(tx, idProducto);
  });
}

export async function deactivateProduct(
  db: Db,
  idProducto: number,
  idUsuario: number
): Promise<ProductoDto> {
  return db.transaction(async (tx) => {
    const current = await getProductDto(tx, idProducto);
    if (current.idEstado === ESTADO_INACTIVO) return current;
    await tx
      .update(t20MProducto)
      .set({
        idEstado: ESTADO_INACTIVO,
        idUsuarioMod: idUsuario,
        ultFechaMod: nowDateTime(),
      })
      .where(eq(t20MProducto.idProducto, idProducto));
    return getProductDto(tx, idProducto);
  });
}

export async function restoreProduct(
  db: Db,
  idProducto: number,
  idUsuario: number
): Promise<ProductoDto> {
  return db.transaction(async (tx) => {
    const current = await getProductDto(tx, idProducto);
    if (current.idEstado === ESTADO_ACTIVO) return current;
    await assertUnique(tx, current.codSerfel, current.nomProducto, idProducto);
    await tx
      .update(t20MProducto)
      .set({
        idEstado: ESTADO_ACTIVO,
        idUsuarioMod: idUsuario,
        ultFechaMod: nowDateTime(),
      })
      .where(eq(t20MProducto.idProducto, idProducto));
    return getProductDto(tx, idProducto);
  });
}

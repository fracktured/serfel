import { asc, eq, and, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import {
  t20MProducto,
  t20PMarca,
  t20PTipoProducto,
  t20PUnidadMedida,
  t99PImpuesto,
  t10MUsuario,
  t50MStock,
  t50MStockLog,
  t40MPrecioProducto,
  t99PIva,
  t50MProductoRecepcion,
  t50MRecepcionCompra,
  t70MProveedor,
  type Db,
} from "@serfel/db";
import {
  ESTADO_ACTIVO,
  ESTADO_INACTIVO,
  modulesForTipo,
  type EstadoFilter,
  type LookupsDto,
  type MeDto,
  type ProductoDto,
  type ProductoInput,
  type ProductoDetalleDto,
} from "@serfel/shared";
import { AppError } from "./errors";

/** drizzle transaction object — same query API as Db for our purposes. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

const BODEGA_CENTRAL = 1;
const LISTA_PRECIO_DEFAULT = 1;

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

export async function getUserTipo(
  db: Db,
  idUsuario: number
): Promise<number | null> {
  const rows = await db
    .select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario)
    .where(eq(t10MUsuario.idUsuario, idUsuario))
    .limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}

export async function getMe(db: Db, idUsuario: number): Promise<MeDto> {
  const rows = await db
    .select({
      idTipoUsuario: t10MUsuario.idTipoUsuario,
      nomUsuario: t10MUsuario.nomUsuario,
    })
    .from(t10MUsuario)
    .where(eq(t10MUsuario.idUsuario, idUsuario))
    .limit(1);
  if (rows.length === 0) {
    throw new AppError(
      "NO_AUTORIZADO",
      403,
      "El usuario autenticado no existe en el sistema"
    );
  }
  const { idTipoUsuario, nomUsuario } = rows[0];
  return {
    idUsuario,
    idTipoUsuario,
    nomUsuario,
    modulos: modulesForTipo(idTipoUsuario),
  };
}

export async function getProductoDetalle(
  db: Db,
  idProducto: number
): Promise<ProductoDetalleDto> {
  const padre = alias(t20PTipoProducto, "padre");
  const baseRows = await db
    .select({
      idProducto: t20MProducto.idProducto,
      codSerfel: t20MProducto.codSerfel,
      nomProducto: t20MProducto.nomProducto,
      nomMarca: t20PMarca.nomMarca,
      nomUm: t20PUnidadMedida.nomUm,
      tipoProducto: t20PTipoProducto.nomTipoProducto,
      tipoProductoPadre: padre.nomTipoProducto,
      costoProm: t20MProducto.costoProm,
      ultFechaCompra: t20MProducto.ultFechaCompra,
      impuesto: t20MProducto.impuesto,
    })
    .from(t20MProducto)
    .innerJoin(t20PMarca, eq(t20MProducto.idMarca, t20PMarca.idMarca))
    .innerJoin(t20PUnidadMedida, eq(t20MProducto.idUm, t20PUnidadMedida.idUm))
    .innerJoin(t20PTipoProducto, eq(t20MProducto.idTipoProducto, t20PTipoProducto.idTipoProducto))
    .leftJoin(padre, eq(t20PTipoProducto.nivel1, padre.idTipoProducto))
    .where(eq(t20MProducto.idProducto, idProducto));

  if (baseRows.length === 0) {
    throw new AppError("PRODUCTO_NO_ENCONTRADO", 404, `Producto ${idProducto} no existe`);
  }
  const base = baseRows[0];
  const costoProm = Number(base.costoProm ?? 0);

  const [stockRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${t50MStock.cantidad}), 0)` })
    .from(t50MStock)
    .where(eq(t50MStock.idProducto, idProducto));
  const cantidadStock = Number(stockRow?.total ?? 0);

  const [precioRow] = await db
    .select({ precioNeto: t40MPrecioProducto.precioNeto, porcenDesc: t40MPrecioProducto.porcenDesc })
    .from(t40MPrecioProducto)
    .where(and(
      eq(t40MPrecioProducto.idProducto, idProducto),
      eq(t40MPrecioProducto.idListaPrecio, LISTA_PRECIO_DEFAULT)
    ))
    .limit(1);
  const precioNeto = Number(precioRow?.precioNeto ?? 0);
  const porcenDesc = Number(precioRow?.porcenDesc ?? 0);

  const [ivaRow] = await db.select({ iva: t99PIva.iva }).from(t99PIva).limit(1);
  const iva = Number(ivaRow?.iva ?? 0);

  let impuestoAdicional: ProductoDetalleDto["impuestoAdicional"] = null;
  if (base.impuesto > 0) {
    const [impRow] = await db
      .select({ nombre: t99PImpuesto.nomImpuesto, valor: t99PImpuesto.valor })
      .from(t99PImpuesto)
      .where(eq(t99PImpuesto.idImpuesto, base.impuesto))
      .limit(1);
    if (impRow) {
      impuestoAdicional = {
        nombre: impRow.nombre,
        porcentaje: Number(impRow.valor),
        monto: (precioNeto * Number(impRow.valor)) / 100,
      };
    }
  }

  const [recRow] = await db
    .select({ maxId: sql<number | null>`MAX(${t50MProductoRecepcion.idRecepcion})` })
    .from(t50MProductoRecepcion)
    .where(eq(t50MProductoRecepcion.idProducto, idProducto));
  let proveedorUltCompra: ProductoDetalleDto["proveedorUltCompra"] = null;
  if (recRow?.maxId != null) {
    const [prov] = await db
      .select({
        rut: t70MProveedor.rutProveedor,
        dv: t70MProveedor.dvProveedor,
        razonSocial: t70MProveedor.razonSocial,
      })
      .from(t50MRecepcionCompra)
      .innerJoin(t70MProveedor, eq(t50MRecepcionCompra.rutProveedor, t70MProveedor.rutProveedor))
      .where(eq(t50MRecepcionCompra.idRecepcion, recRow.maxId))
      .limit(1);
    if (prov) {
      proveedorUltCompra = { rut: `${prov.rut}-${prov.dv}`, razonSocial: prov.razonSocial };
    }
  }

  const ivaMonto = (precioNeto * iva) / 100;
  const impMonto = impuestoAdicional?.monto ?? 0;
  const precioBase = precioNeto + ivaMonto + impMonto;
  const precioVentaCliente = precioBase * (1 - porcenDesc / 100);

  return {
    idProducto: base.idProducto,
    codSerfel: base.codSerfel,
    nomProducto: base.nomProducto,
    nomMarca: base.nomMarca,
    nomUm: base.nomUm,
    tipoProductoPadre: base.tipoProductoPadre ?? null,
    tipoProducto: base.tipoProducto,
    costoProm,
    costoConIva: costoProm * (1 + iva / 100),
    ultFechaCompra: base.ultFechaCompra ?? null,
    cantidadStock,
    costoTotalStock: cantidadStock * costoProm,
    precioNeto,
    precioVentaCliente,
    valorMargen: precioNeto - costoProm,
    porcenMargen: precioNeto > 0 ? ((precioNeto - costoProm) / precioNeto) * 100 : 0,
    impuestoAdicional,
    proveedorUltCompra,
  };
}

/**
 * Sets absolute stock for the product in the CENTRAL bodega (id 1) and writes
 * an audit row. NOTE: getProductoDetalle sums stock across ALL bodegas (legacy-
 * faithful), while this write targets only the central bodega. Serfel operates a
 * single central bodega, so the read sum and the central row are equal; if
 * multiple bodegas ever hold stock for one product, the modal's "Cantidad Stock"
 * (an all-bodega sum) would no longer match what this absolute write sets.
 */
export async function setStock(
  db: Db,
  idProducto: number,
  cantidad: number,
  idUsuario: number
): Promise<ProductoDetalleDto> {
  await db.transaction(async (tx) => {
    const prod = await (tx as Db)
      .select({ id: t20MProducto.idProducto })
      .from(t20MProducto)
      .where(eq(t20MProducto.idProducto, idProducto))
      .limit(1);
    if (prod.length === 0) {
      throw new AppError("PRODUCTO_NO_ENCONTRADO", 404, `Producto ${idProducto} no existe`);
    }

    const existing = await (tx as Db)
      .select({ cantidad: t50MStock.cantidad })
      .from(t50MStock)
      .where(and(eq(t50MStock.idBodega, BODEGA_CENTRAL), eq(t50MStock.idProducto, idProducto)))
      .limit(1);
    const antes = existing.length > 0 ? Number(existing[0].cantidad) : null;

    if (existing.length > 0) {
      await tx
        .update(t50MStock)
        .set({ cantidad: String(cantidad) })
        .where(and(eq(t50MStock.idBodega, BODEGA_CENTRAL), eq(t50MStock.idProducto, idProducto)));
    } else {
      await tx.insert(t50MStock).values({ idBodega: BODEGA_CENTRAL, idProducto, cantidad: String(cantidad) });
    }

    await tx.insert(t50MStockLog).values({
      idBodega: BODEGA_CENTRAL,
      idProducto,
      cantidadAntes: antes === null ? null : String(antes),
      cantidadNueva: String(cantidad),
      diferencia: String(cantidad - (antes ?? 0)),
      fecha: nowDateTime(),
      idUsuario,
    });
  });

  return getProductoDetalle(db, idProducto);
}

import { and, asc, eq, ne, sql } from "drizzle-orm";
import {
  t40MListaPrecio, t10MUsuario, t20MProducto, t40MPrecioProducto, t99PIva, t99PImpuesto, type Db,
} from "@serfel/db";
import {
  ESTADO_ACTIVO, ESTADO_INACTIVO,
  buildPrecioProductoRow, computePrecioBase,
  type ListaPrecioDto, type ListaPrecioInput,
  type BulkInput, type PrecioProductoInput, type PrecioProductoRowDto, type Tramo,
} from "@serfel/shared";
import { AppError } from "./errors";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbOrTx = Db | Tx;

const NOW = () => new Date().toISOString().slice(0, 19).replace("T", " ");

const listaColumns = {
  idListaPrecio: t40MListaPrecio.idListaPrecio,
  nombre: t40MListaPrecio.nomListaPrecio,
  idEstado: t40MListaPrecio.idEstado,
};

export async function getUserTipo(db: Db, idUsuario: number): Promise<number | null> {
  const rows = await db
    .select({ idTipoUsuario: t10MUsuario.idTipoUsuario })
    .from(t10MUsuario)
    .where(eq(t10MUsuario.idUsuario, idUsuario))
    .limit(1);
  return rows.length > 0 ? rows[0].idTipoUsuario : null;
}

async function getListaDto(db: DbOrTx, id: number): Promise<ListaPrecioDto> {
  const rows = await (db as Db).select(listaColumns).from(t40MListaPrecio)
    .where(eq(t40MListaPrecio.idListaPrecio, id));
  if (rows.length === 0) {
    throw new AppError("LISTA_NO_ENCONTRADA", 404, `Lista de precio ${id} no existe`);
  }
  return rows[0];
}

export async function listListas(db: Db): Promise<ListaPrecioDto[]> {
  return db.select(listaColumns).from(t40MListaPrecio)
    .where(eq(t40MListaPrecio.idEstado, ESTADO_ACTIVO))
    .orderBy(asc(t40MListaPrecio.nomListaPrecio));
}

async function findByName(tx: DbOrTx, nombre: string) {
  const rows = await (tx as Db).select(listaColumns).from(t40MListaPrecio)
    .where(eq(t40MListaPrecio.nomListaPrecio, nombre));
  return rows[0] ?? null;
}

export async function createLista(
  db: Db, input: ListaPrecioInput, idUsuario: number
): Promise<ListaPrecioDto> {
  return db.transaction(async (tx) => {
    const existing = await findByName(tx, input.nombre);
    if (existing && existing.idEstado === ESTADO_ACTIVO) {
      throw new AppError("NOMBRE_EN_USO", 409, `La lista "${input.nombre}" ya existe`);
    }
    if (existing && existing.idEstado === ESTADO_INACTIVO) {
      await tx.update(t40MListaPrecio)
        .set({ idEstado: ESTADO_ACTIVO, idUsuarioMod: idUsuario, ultFechaMod: NOW() })
        .where(eq(t40MListaPrecio.idListaPrecio, existing.idListaPrecio));
      return getListaDto(tx, existing.idListaPrecio);
    }
    const [{ next }] = await tx
      .select({ next: sql<number>`COALESCE(MAX(${t40MListaPrecio.idListaPrecio}), 0) + 1` })
      .from(t40MListaPrecio);
    await tx.insert(t40MListaPrecio).values({
      idListaPrecio: next, nomListaPrecio: input.nombre,
      idUsuarioMod: idUsuario, ultFechaMod: NOW(), idEstado: ESTADO_ACTIVO,
    });
    return getListaDto(tx, next);
  });
}

export async function updateLista(
  db: Db, id: number, input: ListaPrecioInput, idUsuario: number
): Promise<ListaPrecioDto> {
  return db.transaction(async (tx) => {
    await getListaDto(tx, id); // 404 if missing
    const clash = await (tx as Db).select({ id: t40MListaPrecio.idListaPrecio })
      .from(t40MListaPrecio)
      .where(and(
        eq(t40MListaPrecio.idEstado, ESTADO_ACTIVO),
        eq(t40MListaPrecio.nomListaPrecio, input.nombre),
        ne(t40MListaPrecio.idListaPrecio, id),
      ));
    if (clash.length > 0) {
      throw new AppError("NOMBRE_EN_USO", 409, `La lista "${input.nombre}" ya existe`);
    }
    await tx.update(t40MListaPrecio)
      .set({ nomListaPrecio: input.nombre, idUsuarioMod: idUsuario, ultFechaMod: NOW() })
      .where(eq(t40MListaPrecio.idListaPrecio, id));
    return getListaDto(tx, id);
  });
}

export async function deactivateLista(
  db: Db, id: number, idUsuario: number
): Promise<ListaPrecioDto> {
  return db.transaction(async (tx) => {
    const current = await getListaDto(tx, id);
    if (current.idEstado === ESTADO_INACTIVO) return current;
    await tx.update(t40MListaPrecio)
      .set({ idEstado: ESTADO_INACTIVO, idUsuarioMod: idUsuario, ultFechaMod: NOW() })
      .where(eq(t40MListaPrecio.idListaPrecio, id));
    return getListaDto(tx, id);
  });
}

async function getIva(db: DbOrTx): Promise<number> {
  const rows = await (db as Db).select({ iva: t99PIva.iva }).from(t99PIva).limit(1);
  return rows.length > 0 ? rows[0].iva : 0;
}

/** id_impuesto -> valor%, for products whose impuesto > 0. */
async function getImpuestoValores(db: DbOrTx): Promise<Map<number, number>> {
  const rows = await (db as Db)
    .select({ id: t99PImpuesto.idImpuesto, valor: t99PImpuesto.valor })
    .from(t99PImpuesto);
  return new Map(rows.map((r) => [r.id, r.valor]));
}

function impuestosPorcenFor(iva: number, productoImpuesto: number, valores: Map<number, number>): number {
  return iva + (productoImpuesto > 0 ? valores.get(productoImpuesto) ?? 0 : 0);
}

function tramosFromRow(pp: {
  cantTramo1: number | null; maxPorcenTramo1: number | null;
  cantTramo2: number | null; maxPorcenTramo2: number | null;
  cantTramo3: number | null; maxPorcenTramo3: number | null;
} | null): Tramo[] {
  return [
    { cantidad: pp?.cantTramo1 ?? 0, maxPorcen: pp?.maxPorcenTramo1 ?? 0 },
    { cantidad: pp?.cantTramo2 ?? 0, maxPorcen: pp?.maxPorcenTramo2 ?? 0 },
    { cantidad: pp?.cantTramo3 ?? 0, maxPorcen: pp?.maxPorcenTramo3 ?? 0 },
  ];
}

export async function getGrid(db: Db, idLista: number): Promise<PrecioProductoRowDto[]> {
  await getListaDto(db, idLista); // 404 if missing
  const iva = await getIva(db);
  const valores = await getImpuestoValores(db);

  const rows = await db
    .select({
      idProducto: t20MProducto.idProducto,
      codSerfel: t20MProducto.codSerfel,
      nomProducto: t20MProducto.nomProducto,
      costoProm: t20MProducto.costoProm,
      impuesto: t20MProducto.impuesto,
      precioNeto: t40MPrecioProducto.precioNeto,
      maxPorcenDesc: t40MPrecioProducto.maxPorcenDesc,
      cantTramo1: t40MPrecioProducto.cantTramo1,
      maxPorcenTramo1: t40MPrecioProducto.maxPorcenTramo1,
      cantTramo2: t40MPrecioProducto.cantTramo2,
      maxPorcenTramo2: t40MPrecioProducto.maxPorcenTramo2,
      cantTramo3: t40MPrecioProducto.cantTramo3,
      maxPorcenTramo3: t40MPrecioProducto.maxPorcenTramo3,
    })
    .from(t20MProducto)
    .leftJoin(
      t40MPrecioProducto,
      and(
        eq(t40MPrecioProducto.idProducto, t20MProducto.idProducto),
        eq(t40MPrecioProducto.idListaPrecio, idLista),
      ),
    )
    .where(eq(t20MProducto.idEstado, ESTADO_ACTIVO))
    .orderBy(asc(t20MProducto.nomProducto));

  return rows.map((r) =>
    buildPrecioProductoRow({
      idProducto: r.idProducto,
      codSerfel: r.codSerfel,
      nomProducto: r.nomProducto,
      costoProm: Number(r.costoProm ?? 0),
      precioNeto: r.precioNeto ?? 0,
      maxPorcenDesc: r.maxPorcenDesc ?? 0,
      tramos: tramosFromRow(r.precioNeto === null ? null : r),
      impuestosPorcen: impuestosPorcenFor(iva, r.impuesto, valores),
    }),
  );
}

/** Loads iva + the product's impuesto valor to derive precio (base) for a write. */
async function impuestosForProducto(tx: DbOrTx, idProducto: number): Promise<number> {
  const iva = await getIva(tx);
  const prod = await (tx as Db)
    .select({ impuesto: t20MProducto.impuesto })
    .from(t20MProducto)
    .where(eq(t20MProducto.idProducto, idProducto))
    .limit(1);
  const impuesto = prod[0]?.impuesto ?? 0;
  if (impuesto <= 0) return iva;
  const valores = await getImpuestoValores(tx);
  return iva + (valores.get(impuesto) ?? 0);
}

async function writeRow(
  tx: DbOrTx,
  idLista: number,
  idProducto: number,
  patch: {
    precioNeto?: number;
    maxPorcenDesc?: number;
    tramos?: Tramo[];
    // Single-tramo patch: touches only that tramo's two columns, preserving the others.
    tramoPatch?: { index: 1 | 2 | 3; cantidad: number; maxPorcen: number };
  },
): Promise<void> {
  const impuestos = await impuestosForProducto(tx, idProducto);
  const precioNeto = patch.precioNeto ?? 0;
  const precio = patch.precioNeto !== undefined ? computePrecioBase(precioNeto, impuestos) : 0;
  const t = patch.tramos;
  const tp = patch.tramoPatch;
  // A single-tramo patch expands to its two column overrides, applied to both
  // the INSERT values and the UPDATE set so the other two tramos survive.
  const tramoInsert =
    tp?.index === 1 ? { cantTramo1: tp.cantidad, maxPorcenTramo1: tp.maxPorcen }
    : tp?.index === 2 ? { cantTramo2: tp.cantidad, maxPorcenTramo2: tp.maxPorcen }
    : tp?.index === 3 ? { cantTramo3: tp.cantidad, maxPorcenTramo3: tp.maxPorcen }
    : {};
  // INSERT ... ON DUPLICATE KEY UPDATE — porcen_desc is never in the update set.
  const insertValues = {
    idListaPrecio: idLista,
    idProducto,
    precioNeto: patch.precioNeto ?? 0,
    precio,
    porcenDesc: 0,
    maxPorcenDesc: patch.maxPorcenDesc ?? 0,
    cantTramo1: t?.[0].cantidad ?? 0, maxPorcenTramo1: t?.[0].maxPorcen ?? 0,
    cantTramo2: t?.[1].cantidad ?? 0, maxPorcenTramo2: t?.[1].maxPorcen ?? 0,
    cantTramo3: t?.[2].cantidad ?? 0, maxPorcenTramo3: t?.[2].maxPorcen ?? 0,
    ...tramoInsert,
  };
  const updateSet: Record<string, number> = {};
  if (patch.precioNeto !== undefined) { updateSet.precioNeto = precioNeto; updateSet.precio = precio; }
  if (patch.maxPorcenDesc !== undefined) updateSet.maxPorcenDesc = patch.maxPorcenDesc;
  if (t) {
    updateSet.cantTramo1 = t[0].cantidad; updateSet.maxPorcenTramo1 = t[0].maxPorcen;
    updateSet.cantTramo2 = t[1].cantidad; updateSet.maxPorcenTramo2 = t[1].maxPorcen;
    updateSet.cantTramo3 = t[2].cantidad; updateSet.maxPorcenTramo3 = t[2].maxPorcen;
  }
  if (tp) { Object.assign(updateSet, tramoInsert); }
  await (tx as Db).insert(t40MPrecioProducto).values(insertValues).onDuplicateKeyUpdate({ set: updateSet });
}

async function readRow(db: DbOrTx, idLista: number, idProducto: number): Promise<PrecioProductoRowDto> {
  const grid = await getGrid(db as Db, idLista);
  const row = grid.find((r) => r.idProducto === idProducto);
  if (!row) {
    throw new AppError("PRECIO_PRODUCTO_NO_ENCONTRADO", 404,
      `Producto ${idProducto} no está activo en la lista ${idLista}`);
  }
  return row;
}

export async function upsertPrecioProducto(
  db: Db, idLista: number, idProducto: number, input: PrecioProductoInput
): Promise<PrecioProductoRowDto> {
  await getListaDto(db, idLista);
  await db.transaction(async (tx) => {
    await writeRow(tx, idLista, idProducto, {
      precioNeto: input.precioNeto, maxPorcenDesc: input.maxPorcenDesc, tramos: input.tramos,
    });
  });
  return readRow(db, idLista, idProducto);
}

export async function bulkApply(
  db: Db, idLista: number, input: BulkInput
): Promise<PrecioProductoRowDto[]> {
  await getListaDto(db, idLista);
  await db.transaction(async (tx) => {
    for (const idProducto of input.idProductos) {
      if (input.action === "setPrecioNeto") {
        await writeRow(tx, idLista, idProducto, { precioNeto: input.valor! });
      } else if (input.action === "setMaxDesc") {
        await writeRow(tx, idLista, idProducto, { maxPorcenDesc: input.valor! });
      } else if (input.action === "setTramo") {
        await writeRow(tx, idLista, idProducto, {
          tramoPatch: { index: input.tramo! as 1 | 2 | 3, cantidad: input.cantidad!, maxPorcen: input.maxPorcen! },
        });
      } else {
        await writeRow(tx, idLista, idProducto, { maxPorcenDesc: 0 });
      }
    }
  });
  const grid = await getGrid(db, idLista);
  const wanted = new Set(input.idProductos);
  return grid.filter((r) => wanted.has(r.idProducto));
}

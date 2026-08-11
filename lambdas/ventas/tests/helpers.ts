import { fileURLToPath } from "node:url";
import mysql, { type Pool } from "mysql2/promise";
import {
  createDb,
  migrateSchemaOnly,
  type Db,
  t99PEstado,
  t99PImpuesto,
  t10PTipoUsuario,
  t10MUsuario,
  t40MListaPrecio,
  t10PTipoDocto,
  t10MEmpresa,
  t10MCliente,
  t10MLocalCliente,
  t20PMarca,
  t20PTipoProducto,
  t20PUnidadMedida,
  t20MProducto,
  t50PTipoBodega,
  t50MBodega,
  t50MStock,
  t30MPedido,
  t30MProductoPedido,
  t40MVenta,
} from "@serfel/db";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const MIGRATIONS = fileURLToPath(new URL("../../../packages/db/migrations", import.meta.url));
const NOW = "2026-01-01 00:00:00";

export const SEED = {
  usuarioAdmin: 1,
  usuarioVendedor: 2,
  tipoAdmin: 1,
  tipoVendedor: 2,
  empresaTarget: 76000000, // target rutEmpresa for facturación
  empresaInterna: 76999999, // an empresa whose rut is also used as a cliente rut
  cliente: 55000000, // normal external cliente
  clienteInterno: 76999999, // internal cliente (rut present in empresa table)
  bodegaCentral: 1,
  marca: 1,
  tipoBebidas: 1,
  um: 1,
  impEspec: 2, // ESPEC
  impIva: 3, // IVA
  impIla: 27, // ILA (bebidas)
  prodAgua: 1, // impuesto 0, stock 100
  prodJugo: 2, // impuesto 27 (ILA), stock 5
  prodEspec: 3, // impuesto 2 (ESPEC), stock 100
  prodLeche: 4, // usaPorciones=1
  prodSinStock: 5, // no stock row
  localNorte: 500, // cliente normal
  localInterno: 501, // clienteInterno
  pedidoNormal: 10, // agua+jugo, activo
  pedidoEspec: 11, // prodEspec, activo
  pedidoInterno: 12, // agua, clienteInterno, activo
  pedidoPorciones: 13, // leche, activo -> should error
  pedidoYaVendido: 14, // activo but has a non-anulada venta
  pedidoSinStock: 15, // prodSinStock only, activo -> venta with 0 lines
  pedidoClamp: 16, // jugo qty 20 vs stock 5 -> clamp warning
  ESTADO_ACTIVO: 1,
  ESTADO_FINALIZADO: 3,
  ESTADO_ANULADO: 4,
} as const;

export async function setupTestDb(
  dbName: string
): Promise<{ db: Db; pool: Pool; teardown: () => Promise<void> }> {
  const conn = await mysql.createConnection(ROOT);
  await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await conn.query(`CREATE DATABASE \`${dbName}\``);
  await conn.end();

  const { db, pool } = createDb(
    { host: ROOT.host, port: ROOT.port, username: ROOT.user, password: ROOT.password, dbname: dbName },
    { ssl: false }
  );
  await migrateSchemaOnly(db, MIGRATIONS);

  await db.insert(t99PEstado).values([
    { idEstado: 0, nomEstado: "Inactivo", descEstado: "Inactivo" },
    { idEstado: 1, nomEstado: "Activo", descEstado: "Activo" },
    { idEstado: 3, nomEstado: "Finalizado", descEstado: "Finalizado" },
    { idEstado: 4, nomEstado: "Anulado", descEstado: "Anulado" },
  ]);
  await db.insert(t99PImpuesto).values([
    { idImpuesto: SEED.impEspec, nomImpuesto: "ESPEC", valor: 13 },
    { idImpuesto: SEED.impIva, nomImpuesto: "IVA", valor: 19 },
    { idImpuesto: SEED.impIla, nomImpuesto: "ILA", valor: 18 },
  ]);
  await db.insert(t10PTipoUsuario).values([
    { idTipoUsuario: SEED.tipoAdmin, nomTipoUsuario: "Admin", descTipoUsuario: "Administrador" },
    { idTipoUsuario: SEED.tipoVendedor, nomTipoUsuario: "Vendedor", descTipoUsuario: "Vendedor" },
  ]);
  await db.insert(t10MUsuario).values([
    { idUsuario: SEED.usuarioAdmin, rutUsuario: 11111111, dvUsuario: "1", nomUsuario: "Admin", apellPatUsuario: "Perez", apellMatUsuario: "Soto", password: "unused", idTipoUsuario: SEED.tipoAdmin, direccionUsuario: "-", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
    { idUsuario: SEED.usuarioVendedor, rutUsuario: 22222222, dvUsuario: "2", nomUsuario: "Vera", apellPatUsuario: "Diaz", apellMatUsuario: "Rojas", password: "unused", idTipoUsuario: SEED.tipoVendedor, direccionUsuario: "-", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
  ]);
  await db.insert(t40MListaPrecio).values({ idListaPrecio: 1, nomListaPrecio: "GENERAL", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 });
  await db.insert(t10PTipoDocto).values({ idTipoDocto: 1, nomTipoDocto: "FACTURA", descTipoDocto: "Factura" });

  const empresa = (rutEmpresa: number, razon: string) => ({
    rutEmpresa, dvEmpresa: "0", razonSocial: razon, nomFantasia: razon, direccionEmpresa: "-",
    idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1, giro: "-", codActividadEconomica: 1,
    comuna: "-", ciudad: "-", rutRepresentanteLegal: 1, dvRepresentanteLegal: "0", fechaAprobacionSii: "2026-01-01", numAprobacionSii: 1,
  });
  await db.insert(t10MEmpresa).values([
    empresa(SEED.empresaTarget, "SERFEL"),
    empresa(SEED.empresaInterna, "INTERNA"),
    { ...empresa(SEED.empresaTarget, "SERFEL NUEVO"), ultFechaMod: "2026-06-01 00:00:00" },
  ]);

  await db.insert(t10MCliente).values([
    { rutCliente: SEED.cliente, dvCliente: "0", razonSocial: "CLIENTE", nomFantasia: "Fantasia Norte", idListaPrecio: 1, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
    { rutCliente: SEED.clienteInterno, dvCliente: "0", razonSocial: "INTERNA", nomFantasia: "Fantasia Interna", idListaPrecio: 1, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
  ]);
  await db.insert(t10MLocalCliente).values([
    { idLocalCliente: SEED.localNorte, rutCliente: SEED.cliente, nomLocalCliente: "Local Norte", nomContacto: "Juan", apellPatContacto: "Lopez", apellMatContacto: "Vega", idVendedor: SEED.usuarioVendedor, idFormaPago: 7, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
    { idLocalCliente: SEED.localInterno, rutCliente: SEED.clienteInterno, nomLocalCliente: "Local Interno", nomContacto: "Ana", apellPatContacto: "Diaz", apellMatContacto: "Paz", idVendedor: SEED.usuarioVendedor, idFormaPago: 7, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
  ]);
  await db.insert(t20PMarca).values({ idMarca: SEED.marca, nomMarca: "MARCA" });
  await db.insert(t20PTipoProducto).values({ idTipoProducto: SEED.tipoBebidas, nomTipoProducto: "BEBIDAS", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 });
  await db.insert(t20PUnidadMedida).values({ idUm: SEED.um, nomUm: "UNI" });

  const prod = (idProducto: number, nom: string, impuesto: number, usaPorciones: number, cod: number) => ({
    idProducto, nomProducto: nom, descProducto: "", codBarraProducto: "", idTipoProducto: SEED.tipoBebidas, idMarca: SEED.marca, idUm: SEED.um, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1, codSerfel: cod, impuesto, usaPorciones,
  });
  await db.insert(t20MProducto).values([
    prod(SEED.prodAgua, "Agua", 0, 0, 100),
    prod(SEED.prodJugo, "Jugo", SEED.impIla, 0, 200),
    prod(SEED.prodEspec, "Bebida ESPEC", SEED.impEspec, 0, 300),
    prod(SEED.prodLeche, "Leche", 0, 1, 400),
    prod(SEED.prodSinStock, "Sin Stock", 0, 0, 500),
  ]);
  await db.insert(t50PTipoBodega).values({ idTipoBodega: 1, nomTipoBodega: "PRINCIPAL", idEstado: 1 });
  await db.insert(t50MBodega).values({ idBodega: SEED.bodegaCentral, nomBodega: "CENTRAL", descBodega: "Bodega Central", idTipoBodega: 1, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 });
  await db.insert(t50MStock).values([
    { idBodega: SEED.bodegaCentral, idProducto: SEED.prodAgua, cantidad: "100.000" },
    { idBodega: SEED.bodegaCentral, idProducto: SEED.prodJugo, cantidad: "5.000" },
    { idBodega: SEED.bodegaCentral, idProducto: SEED.prodEspec, cantidad: "100.000" },
    { idBodega: SEED.bodegaCentral, idProducto: SEED.prodLeche, cantidad: "100.000" },
    // prodSinStock: intentionally no stock row
  ]);

  const pedido = (idPedido: number, idLocalCliente: number, idEstado: number) => ({
    idPedido, fechaPedido: NOW, idLocalCliente, idListaPrecio: 1, idEstado, precioTotal: 1000, idUsuario: SEED.usuarioVendedor,
  });
  await db.insert(t30MPedido).values([
    pedido(SEED.pedidoNormal, SEED.localNorte, SEED.ESTADO_ACTIVO),
    pedido(SEED.pedidoEspec, SEED.localNorte, SEED.ESTADO_ACTIVO),
    pedido(SEED.pedidoInterno, SEED.localInterno, SEED.ESTADO_ACTIVO),
    pedido(SEED.pedidoPorciones, SEED.localNorte, SEED.ESTADO_ACTIVO),
    pedido(SEED.pedidoYaVendido, SEED.localNorte, SEED.ESTADO_ACTIVO),
    pedido(SEED.pedidoSinStock, SEED.localNorte, SEED.ESTADO_ACTIVO),
    pedido(SEED.pedidoClamp, SEED.localNorte, SEED.ESTADO_ACTIVO),
  ]);
  await db.insert(t30MProductoPedido).values([
    { idPedido: SEED.pedidoNormal, idProducto: SEED.prodAgua, cantidad: "2.000", precio: 1000, porcenDesc: 0, precioNeto: 1000 },
    { idPedido: SEED.pedidoNormal, idProducto: SEED.prodJugo, cantidad: "1.000", precio: 500, porcenDesc: 0, precioNeto: 500 },
    { idPedido: SEED.pedidoEspec, idProducto: SEED.prodEspec, cantidad: "1.000", precio: 1000, porcenDesc: 10, precioNeto: 1000 },
    { idPedido: SEED.pedidoInterno, idProducto: SEED.prodAgua, cantidad: "3.000", precio: 1000, porcenDesc: 0, precioNeto: 1000 },
    { idPedido: SEED.pedidoPorciones, idProducto: SEED.prodLeche, cantidad: "1.000", precio: 800, porcenDesc: 0, precioNeto: 800 },
    { idPedido: SEED.pedidoYaVendido, idProducto: SEED.prodAgua, cantidad: "1.000", precio: 1000, porcenDesc: 0, precioNeto: 1000 },
    { idPedido: SEED.pedidoSinStock, idProducto: SEED.prodSinStock, cantidad: "1.000", precio: 1000, porcenDesc: 0, precioNeto: 1000 },
    { idPedido: SEED.pedidoClamp, idProducto: SEED.prodJugo, cantidad: "20.000", precio: 500, porcenDesc: 0, precioNeto: 500 },
  ]);
  // pedidoYaVendido already has a non-anulada venta
  await db.insert(t40MVenta).values({
    idVenta: 900, idListaPrecio: 1, idUsuarioVenta: SEED.usuarioVendedor, numDoctoEmitido: 0, idTipoDoctoEmitido: 1,
    rutEmpresa: SEED.empresaTarget, rutCliente: SEED.cliente, idLocalCliente: SEED.localNorte, idPedido: SEED.pedidoYaVendido,
    fechaVenta: NOW, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: SEED.ESTADO_FINALIZADO, precioTotal: 1190,
  });

  const teardown = async () => {
    await pool.end();
    const c = await mysql.createConnection(ROOT);
    await c.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await c.end();
  };
  return { db, pool, teardown };
}

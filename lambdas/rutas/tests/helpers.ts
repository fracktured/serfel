import { fileURLToPath } from "node:url";
import mysql, { type Pool } from "mysql2/promise";
import {
  createDb,
  migrateSchemaOnly,
  type Db,
  t99PEstado,
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
  t40MRuta,
  t40MRutaLocalCliente,
  t40MVenta,
  t40MProductoVenta,
  t30MPedido,
  t30MProductoPedido,
  t20MPorcion,
} from "@serfel/db";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const MIGRATIONS = fileURLToPath(
  new URL("../../../packages/db/migrations", import.meta.url)
);
const NOW = "2026-01-01 00:00:00";

export const SEED = {
  usuarioAdmin: 1,
  usuarioVendedor: 2,
  tipoAdmin: 1,
  tipoVendedor: 2,
  empresa: 76000000,
  cliente: 55000000,
  marca: 1,
  tipoBebidas: 1,
  tipoLacteos: 2,
  um: 1,
  prodAgua: 1,
  prodLeche: 2,
  rutaNorte: 1,
  rutaSur: 2,
  rutaVieja: 3,
  localNorte: 500,
  localSur: 501,
  ESTADO_FINALIZADO: 3,
  pedidoUno: 1,
  pedidoDos: 2,
  pedidoAnulado: 3,
  ESTADO_PEDIDO_VIGENTE: 1,
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
    { idEstado: SEED.ESTADO_FINALIZADO, nomEstado: "Finalizado", descEstado: "Finalizado" },
  ]);
  await db.insert(t10PTipoUsuario).values([
    { idTipoUsuario: SEED.tipoAdmin, nomTipoUsuario: "Admin", descTipoUsuario: "Administrador" },
    { idTipoUsuario: SEED.tipoVendedor, nomTipoUsuario: "Vendedor", descTipoUsuario: "Vendedor" },
  ]);
  await db.insert(t10MUsuario).values([
    { idUsuario: SEED.usuarioAdmin, rutUsuario: 11111111, dvUsuario: "1", nomUsuario: "Admin", apellPatUsuario: "T", apellMatUsuario: "T", password: "unused", idTipoUsuario: SEED.tipoAdmin, direccionUsuario: "-", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
    { idUsuario: SEED.usuarioVendedor, rutUsuario: 22222222, dvUsuario: "2", nomUsuario: "Vend", apellPatUsuario: "T", apellMatUsuario: "T", password: "unused", idTipoUsuario: SEED.tipoVendedor, direccionUsuario: "-", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
  ]);
  await db.insert(t40MListaPrecio).values({ idListaPrecio: 1, nomListaPrecio: "GENERAL", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 });
  await db.insert(t10PTipoDocto).values({ idTipoDocto: 1, nomTipoDocto: "FACTURA", descTipoDocto: "Factura" });
  await db.insert(t10MEmpresa).values({
    rutEmpresa: SEED.empresa, dvEmpresa: "0", razonSocial: "SERFEL", nomFantasia: "SERFEL", direccionEmpresa: "-",
    idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1, giro: "-", codActividadEconomica: 1,
    comuna: "-", ciudad: "-", rutRepresentanteLegal: 1, dvRepresentanteLegal: "0", fechaAprobacionSii: "2026-01-01", numAprobacionSii: 1,
  });
  await db.insert(t10MCliente).values({
    rutCliente: SEED.cliente, dvCliente: "0", razonSocial: "CLIENTE", idListaPrecio: 1,
    idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1,
  });
  await db.insert(t10MLocalCliente).values([
    { idLocalCliente: SEED.localNorte, rutCliente: SEED.cliente, nomLocalCliente: "Local Norte", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
    { idLocalCliente: SEED.localSur, rutCliente: SEED.cliente, nomLocalCliente: "Local Sur", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
  ]);
  await db.insert(t20PMarca).values({ idMarca: SEED.marca, nomMarca: "MARCA" });
  await db.insert(t20PTipoProducto).values([
    { idTipoProducto: SEED.tipoBebidas, nomTipoProducto: "BEBIDAS", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
    { idTipoProducto: SEED.tipoLacteos, nomTipoProducto: "LACTEOS", idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
  ]);
  await db.insert(t20PUnidadMedida).values({ idUm: SEED.um, nomUm: "UNI" });
  await db.insert(t20MProducto).values([
    { idProducto: SEED.prodAgua, nomProducto: "Agua", descProducto: "", codBarraProducto: "", idTipoProducto: SEED.tipoBebidas, idMarca: SEED.marca, idUm: SEED.um, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1, codSerfel: 100, impuesto: 0, usaPorciones: 0 },
    { idProducto: SEED.prodLeche, nomProducto: "Leche", descProducto: "", codBarraProducto: "", idTipoProducto: SEED.tipoLacteos, idMarca: SEED.marca, idUm: SEED.um, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1, codSerfel: 200, impuesto: 0, usaPorciones: 1 },
  ]);
  await db.insert(t40MRuta).values([
    { idRuta: SEED.rutaNorte, nomRuta: "Ruta Norte", idUsuario: SEED.usuarioAdmin, numDia: 1, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
    { idRuta: SEED.rutaSur, nomRuta: "Ruta Sur", idUsuario: SEED.usuarioAdmin, numDia: 2, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 1 },
    { idRuta: SEED.rutaVieja, nomRuta: "Ruta Vieja", idUsuario: SEED.usuarioAdmin, numDia: 3, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado: 0 },
  ]);
  await db.insert(t40MRutaLocalCliente).values([
    { idRuta: SEED.rutaNorte, idLocalCliente: SEED.localNorte },
    { idRuta: SEED.rutaSur, idLocalCliente: SEED.localSur },
  ]);

  const venta = (idVenta: number, idLocalCliente: number, entregado: number, idEstado: number, precioTotal: number) => ({
    idVenta, idListaPrecio: 1, idUsuarioVenta: SEED.usuarioAdmin, numDoctoEmitido: idVenta,
    idTipoDoctoEmitido: 1, rutEmpresa: SEED.empresa, rutCliente: SEED.cliente, idLocalCliente,
    fechaVenta: NOW, entregado, idUsuarioMod: SEED.usuarioAdmin, ultFechaMod: NOW, idEstado, precioTotal,
  });
  await db.insert(t40MVenta).values([
    venta(1, SEED.localNorte, 0, SEED.ESTADO_FINALIZADO, 1000), // matches
    venta(2, SEED.localSur, 0, SEED.ESTADO_FINALIZADO, 2000), // matches
    venta(3, SEED.localNorte, 1, SEED.ESTADO_FINALIZADO, 9999), // entregado -> excluded
    venta(4, SEED.localNorte, 0, 1, 8888), // not finalized -> excluded
  ]);
  await db.insert(t40MProductoVenta).values([
    { idVenta: 1, idProducto: SEED.prodAgua, cantidad: "2.000", precio: 500, porcenDesc: 0 },
    { idVenta: 1, idProducto: SEED.prodLeche, cantidad: "1.000", precio: 800, porcenDesc: 10 },
    { idVenta: 2, idProducto: SEED.prodAgua, cantidad: "3.000", precio: 500, porcenDesc: 0 },
    { idVenta: 3, idProducto: SEED.prodAgua, cantidad: "99.000", precio: 500, porcenDesc: 0 },
    { idVenta: 4, idProducto: SEED.prodAgua, cantidad: "88.000", precio: 500, porcenDesc: 0 },
  ]);
  await db.insert(t20MPorcion).values({
    idProducto: SEED.prodLeche, fecha: NOW, grupo: 1, numero: 5, cantidad: "1.000",
    idVenta: 1, idUsuario: SEED.usuarioAdmin, idEstado: 1,
  });

  const pedido = (idPedido: number, idLocalCliente: number, idEstado: number, precioTotal: number) => ({
    idPedido, fechaPedido: NOW, idLocalCliente, idListaPrecio: 1, idEstado, precioTotal, idUsuario: SEED.usuarioAdmin,
  });
  await db.insert(t30MPedido).values([
    pedido(SEED.pedidoUno, SEED.localNorte, SEED.ESTADO_PEDIDO_VIGENTE, 1500), // matches
    pedido(SEED.pedidoDos, SEED.localSur, SEED.ESTADO_PEDIDO_VIGENTE, 2500), // matches
    pedido(SEED.pedidoAnulado, SEED.localNorte, 0, 7777), // id_estado != 1 -> excluded
  ]);
  await db.insert(t30MProductoPedido).values([
    { idPedido: SEED.pedidoUno, idProducto: SEED.prodAgua, cantidad: "4.000", precio: 500, porcenDesc: 0 },
    { idPedido: SEED.pedidoUno, idProducto: SEED.prodLeche, cantidad: "2.000", precio: 800, porcenDesc: 10 },
    { idPedido: SEED.pedidoDos, idProducto: SEED.prodAgua, cantidad: "1.000", precio: 500, porcenDesc: 0 },
    { idPedido: SEED.pedidoAnulado, idProducto: SEED.prodAgua, cantidad: "50.000", precio: 500, porcenDesc: 0 },
  ]);

  const teardown = async () => {
    await pool.end();
    const c = await mysql.createConnection(ROOT);
    await c.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await c.end();
  };
  return { db, pool, teardown };
}

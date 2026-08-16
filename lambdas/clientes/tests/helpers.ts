import { fileURLToPath } from "node:url";
import mysql, { type Pool } from "mysql2/promise";
import {
  createDb, migrateSchemaOnly, type Db,
  t99PEstado, t10PTipoUsuario, t10MUsuario, t40MListaPrecio, t10MCliente,
  t10MLocalCliente, t10PTipoDocto, t10MEmpresa, t40MRuta, t40MRutaLocalCliente,
  t40MVenta, t40MNotaCredito, t40PFormaPago,
} from "@serfel/db";

const ROOT = { host: "127.0.0.1", port: 3307, user: "root", password: "serfel" };
const MIGRATIONS = fileURLToPath(new URL("../../../packages/db/migrations", import.meta.url));

export const SEED = {
  idAdmin: 1,
  tipoAdmin: 1,
  tipoVendedor: 2,
  idListaPrecio: 1,
  idTipoDocto: 1,
  /** matches t10MLocalCliente.idFormaPago's schema default (7). */
  idFormaPago: 7,
  idVendedor: 30, // active user, id_tipo_usuario = 2 (Vendedor)
  rutEmpresa: 1,
  /** client with routes (Mon+Wed) + a venta + a nota de crédito, used for derived columns. */
  rutClienteConVenta: 5000000,
  idLocalConVenta: 10,
  idEstadoPendiente: 2,
} as const;

export async function setupTestDb(dbName: string): Promise<{ db: Db; pool: Pool; teardown: () => Promise<void> }> {
  const conn = await mysql.createConnection(ROOT);
  await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await conn.query(`CREATE DATABASE \`${dbName}\``);
  await conn.end();

  const { db, pool } = createDb(
    { host: ROOT.host, port: ROOT.port, username: ROOT.user, password: ROOT.password, dbname: dbName },
    { ssl: false },
  );
  await migrateSchemaOnly(db, MIGRATIONS);

  const now = "2026-01-01 00:00:00";

  await db.insert(t99PEstado).values([
    { idEstado: 0, nomEstado: "Inactivo", descEstado: "Inactivo" },
    { idEstado: 1, nomEstado: "Activo", descEstado: "Activo" },
    { idEstado: SEED.idEstadoPendiente, nomEstado: "Pendiente", descEstado: "Pendiente de pago" },
  ]);
  await db.insert(t10PTipoUsuario).values([
    { idTipoUsuario: SEED.tipoAdmin, nomTipoUsuario: "Admin", descTipoUsuario: "Administrador" },
    { idTipoUsuario: SEED.tipoVendedor, nomTipoUsuario: "Vendedor", descTipoUsuario: "Vendedor" },
  ]);
  await db.insert(t10MUsuario).values([{
    idUsuario: SEED.idAdmin, rutUsuario: 11111111, dvUsuario: "1", nomUsuario: "Admin",
    apellPatUsuario: "Uno", apellMatUsuario: "X", password: "seed", idTipoUsuario: SEED.tipoAdmin,
    telefonoUsuario: "1", direccionUsuario: "-", emailUsuario: "admin@serfel.cl", numUsuario: 0,
    idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1,
  }]);
  await db.insert(t10MUsuario).values([{
    idUsuario: SEED.idVendedor, rutUsuario: 22222222, dvUsuario: "2", nomUsuario: "Vera",
    apellPatUsuario: "Vendedora", apellMatUsuario: "Test", password: "seed", idTipoUsuario: SEED.tipoVendedor,
    telefonoUsuario: "2", direccionUsuario: "-", emailUsuario: "vera@serfel.cl", numUsuario: 0,
    idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1,
  }]);
  await db.insert(t40MListaPrecio).values({
    idListaPrecio: SEED.idListaPrecio, nomListaPrecio: "Base",
    idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1,
  });
  await db.insert(t10PTipoDocto).values({
    idTipoDocto: SEED.idTipoDocto, nomTipoDocto: "Factura", descTipoDocto: "Factura",
  });
  await db.insert(t40PFormaPago).values({
    idFormaPago: SEED.idFormaPago, nomFormaPago: "CREDITO", descFormaPago: "Pago a crédito",
  });
  await db.insert(t10MEmpresa).values({
    rutEmpresa: SEED.rutEmpresa, dvEmpresa: "9", razonSocial: "Empresa Test",
    nomFantasia: "Empresa Test", direccionEmpresa: "Calle 1", idUsuarioMod: SEED.idAdmin,
    ultFechaMod: now, idEstado: 1, giro: "Ventas", codActividadEconomica: 0,
    comuna: "Santiago", ciudad: "Santiago", rutRepresentanteLegal: SEED.rutEmpresa,
    dvRepresentanteLegal: "9", fechaAprobacionSii: "2026-01-01", numAprobacionSii: 1,
  });

  // Client with derived data: routes on Mon (num_dia 1) and Wed (num_dia 3),
  // two facturas (max num_docto_emitido 1050), and a nota de crédito (num 77).
  await db.insert(t10MCliente).values({
    rutCliente: SEED.rutClienteConVenta, dvCliente: "K", razonSocial: "Cliente Con Venta SpA",
    idListaPrecio: SEED.idListaPrecio, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1,
  });
  await db.insert(t10MLocalCliente).values({
    idLocalCliente: SEED.idLocalConVenta, rutCliente: SEED.rutClienteConVenta,
    nomLocalCliente: "Local Principal", idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1,
  });
  await db.insert(t40MRuta).values([
    { idRuta: 1, nomRuta: "Ruta Lunes", idUsuario: SEED.idAdmin, numDia: 1, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1 },
    { idRuta: 2, nomRuta: "Ruta Miércoles", idUsuario: SEED.idAdmin, numDia: 3, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1 },
    { idRuta: 3, nomRuta: "Ruta Inactiva Martes", idUsuario: SEED.idAdmin, numDia: 2, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 0 },
  ]);
  await db.insert(t40MRutaLocalCliente).values([
    { idRuta: 1, idLocalCliente: SEED.idLocalConVenta },
    { idRuta: 2, idLocalCliente: SEED.idLocalConVenta },
    { idRuta: 3, idLocalCliente: SEED.idLocalConVenta }, // inactive route: must NOT count
  ]);
  await db.insert(t40MVenta).values([
    { idListaPrecio: SEED.idListaPrecio, idUsuarioVenta: SEED.idAdmin, precioTotal: 1000,
      numDoctoEmitido: 1000, idTipoDoctoEmitido: SEED.idTipoDocto, rutEmpresa: SEED.rutEmpresa,
      rutCliente: SEED.rutClienteConVenta, idLocalCliente: SEED.idLocalConVenta,
      fechaVenta: now, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1 },
    { idListaPrecio: SEED.idListaPrecio, idUsuarioVenta: SEED.idAdmin, precioTotal: 2000,
      numDoctoEmitido: 1050, idTipoDoctoEmitido: SEED.idTipoDocto, rutEmpresa: SEED.rutEmpresa,
      rutCliente: SEED.rutClienteConVenta, idLocalCliente: SEED.idLocalConVenta,
      fechaVenta: now, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 1 },
    // Annulled venta with a higher docto number: must NOT count (id_estado = 0).
    { idListaPrecio: SEED.idListaPrecio, idUsuarioVenta: SEED.idAdmin, precioTotal: 999,
      numDoctoEmitido: 9999, idTipoDoctoEmitido: SEED.idTipoDocto, rutEmpresa: SEED.rutEmpresa,
      rutCliente: SEED.rutClienteConVenta, idLocalCliente: SEED.idLocalConVenta,
      fechaVenta: now, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: 0 },
    // Pending venta (id_estado = 2) → blocks deactivation. Docto below the max so
    // it doesn't change ultFactura (both are counted since id_estado > 0).
    { idListaPrecio: SEED.idListaPrecio, idUsuarioVenta: SEED.idAdmin, precioTotal: 500,
      numDoctoEmitido: 900, idTipoDoctoEmitido: SEED.idTipoDocto, rutEmpresa: SEED.rutEmpresa,
      rutCliente: SEED.rutClienteConVenta, idLocalCliente: SEED.idLocalConVenta,
      fechaVenta: now, idUsuarioMod: SEED.idAdmin, ultFechaMod: now, idEstado: SEED.idEstadoPendiente },
  ]);
  // idVenta is auto-increment; the factura with num_docto 1050 is the 2nd insert (idVenta 2).
  await db.insert(t40MNotaCredito).values({
    idNotaCredito: 1, idVenta: 2, numNotaCredito: 77, idTipoDoctoEmitido: SEED.idTipoDocto,
    rutEmpresa: SEED.rutEmpresa, idUsuario: SEED.idAdmin, fechaNotaCredito: now,
    idEstado: 1, esNotaCredElectronica: 1, idUsuarioMod: SEED.idAdmin, ultFechaMod: now,
  });

  const teardown = async () => {
    await pool.end();
    const c = await mysql.createConnection(ROOT);
    await c.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await c.end();
  };
  return { db, pool, teardown };
}

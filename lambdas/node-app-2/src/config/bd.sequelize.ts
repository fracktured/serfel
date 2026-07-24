import { Options, Sequelize } from 'sequelize';
import { logger } from './winston'
import { ProductoVenta } from '../model/producto.venta.model';
import { Ruta } from '../model/ruta.model';
import { Local } from '../model/local.model';
import { Marca } from '../model/marca.model';
import { Porcion } from '../model/porcion.model';
import { Producto } from '../model/producto.model';
import { RutaLocal } from '../model/ruta.local.model';
import { UM } from '../model/um.model';
import { Venta } from '../model/venta.model';
import { Usuario } from '../model/usuario.model';

import { Pedido } from '../model/pedido.model';
import { Cliente } from '../model/cliente.model';

const config: Options = {
   username: process.env.DB_USER,
   password: process.env.DB_PWD,
   database: process.env.DB_NAME,
   host: process.env.DB_HOST,
   dialect: "mysql",
   //logging: msg => logger.info(msg)
   logging: false
};


const sequelize = new Sequelize(config.database!, config.username!, config.password, config);

/*
const ProductoVentaRepo = ProductoVenta.doInit(sequelize);
const RutaRepo = Ruta.doInit(sequelize);
const MarcaRepo = Marca.doInit(sequelize);
const PorcionRepo = Porcion.doInit(sequelize);
const ProductoRepo = Producto.doInit(sequelize);
const RutaLocalRepo = RutaLocal.doInit(sequelize);
const UMRepo = UM.doInit(sequelize);
const VentaRepo = Venta.doInit(sequelize);*/
const LocalRepo = Local.doInit(sequelize);
const UsuarioRepo = Usuario.doInit(sequelize);
const PedidoRepo = Pedido.doInit(sequelize);
const ClienteRepo = Cliente.doInit(sequelize);

/*
ProductoVenta.belongsTo(Venta, {
  as: 'venta',
  foreignKey: 'idVenta'
});
Venta.hasMany(ProductoVenta, {
  as: 'prodsVenta',
  foreignKey: 'idVenta'
});
ProductoVenta.belongsTo(Producto, {
  as: 'producto',
  foreignKey: 'idProducto'
});
Producto.hasMany(ProductoVenta, {
  as: 'prodVentas',
  foreignKey: 'idProducto'
});
RutaLocal.belongsTo(Local, {
  as: 'local',
  foreignKey: 'idLocal'
});
Local.hasMany(RutaLocal, {
  as: 'rutas',
  foreignKey: 'idLocal'
});
Venta.belongsTo(Local, {
  as: 'local',
  foreignKey: 'idLocal'
});
Local.hasMany(Venta, {
  as: 'ventas',
  foreignKey: 'idLocal'
});
Producto.belongsTo(Marca, {
  as: 'marca',
  foreignKey: 'idMarca'
});
Marca.hasMany(Producto, {
  as: 'productos',
  foreignKey: 'idMarca'
});
Producto.belongsTo(UM, {
  as: 'um',
  foreignKey: 'idUM'
});
UM.hasMany(Producto, {
  as: 'productos',
  foreignKey: 'idUM'
});
Porcion.belongsTo(Producto, {
  as: 'producto',
  foreignKey: 'idProducto'
});
Producto.hasMany(Porcion, {
  as: 'porciones',
  foreignKey: 'idProducto'
});
*/
Pedido.belongsTo(Local, {
   as: 'local',
   foreignKey: 'idLocal'
});
Local.hasMany(Pedido, {
   as: 'ventas',
   foreignKey: 'idLocal'
});
Pedido.belongsTo(Usuario, {
   as: 'vendedor',
   foreignKey: 'idUsuario'
});
Usuario.hasMany(Pedido, {
   as: 'pedidos',
   foreignKey: 'idUsuario'
});
Local.belongsTo(Cliente, {
   as: 'cliente',
   foreignKey: 'rutCliente'
});
Cliente.hasMany(Local, {
   as: 'locales',
   foreignKey: 'rutCliente'
});

export {
   sequelize,
   /*ProductoVentaRepo,
   RutaRepo,*/
   LocalRepo,
   /*MarcaRepo,
   PorcionRepo,
   ProductoRepo,
   RutaLocalRepo,
   UMRepo,
   VentaRepo,*/
   UsuarioRepo,
   PedidoRepo
};
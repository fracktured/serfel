export interface PorcionModel {
  idPorcion: number;
  idProducto: number;
	fecha: Date;
  grupo: number;
  numero: number;
	cantidad: number;
	idVenta: number;
  venta: any;
  idUsuario: number;
	idEstado: number;
}

export interface PorcionCreateModel {
  idProducto: number;
  numero: number;
	cantidad: number;
}

export interface PorcionUpdateModel extends PorcionCreateModel {
  factura: number;
  estado: number;
}
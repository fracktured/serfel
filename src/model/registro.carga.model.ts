import { ProductoVenta } from "./producto.venta.model";

export interface RegistroPorcion {
  numero: number
}

export interface RegistroProducto {
  codSerfel: number,
  nomProducto: string,
  um: {
    nomUM: string
  },
  porciones: RegistroPorcion[]
}

export interface RegistroCarga extends ProductoVenta {
  //idProducto: number,
  sumCantidad: number,
  subtotal: number,
  producto: RegistroProducto
}
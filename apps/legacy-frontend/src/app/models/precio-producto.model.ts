export class PrecioProductoModel {
    public idListaPrecio: number;
    public idProducto: number;
    public nomProducto: string;
    public nomMarca: string;
    public nomUM: string;
    public cantidadStock: number;
    public cantidadPedida: number;
    public codSerfel: number;
    public precioNeto: number;
    public precio: number;
    public maxPorcenDesc: number;
    public cantTramo1?: number;
    public maxPorcenTramo1?: number;
    public cantTramo2?: number;
    public maxPorcenTramo2?: number;
    public cantTramo3?: number;
    public maxPorcenTramo3?: number;

    public idPedido: number;
    public cantidad: number;
    public porcenDesc: number;


    constructor() {}
}

export class LocalClienteModel{

    constructor(public idLocalCliente: number,
                public idListaPrecio: number,
                public rutCliente: number,
                public digitoVerificadorCliente: string,
                public razonSocial: string,
                public nomLocalCliente: string,
                public direccionLocal: string,
                public telefonoLocal: number,
                public nombreContacto: string,
                public apellidoPaternoContacto: string,
                public apellidoMaternoContacto: string,
                public telefonoContacto: number,
                public cantidadPedidos: number,
                public permiteDeudaVenta: boolean,
                public permiteTopeMensualVenta: boolean,
                public topeVenta: number,
                public bloqueado: boolean,
                public motivoBloqueo: string,
                public idFormaPago: number,
                public idRuta: number){}
}

// id_local_cliente: "220"
// id_lista_precio: "1"
// rut_cliente: "4639446"
// dv_cliente: "1"
// razon_social: "VALDERRAMA ARANCIBIA EMMA PASCUALA"
// nom_local_cliente: "INGLATERRA 799 VILLA HERMOSA"
// direccion_local_cliente: "INGLATERRA 799 VILLA HERMOSA"
// telefono_local_cliente: "414968"
// nom_contacto: ""
// apell_pat_contacto: ""
// apell_mat_contacto: ""
// telefono_contacto: ""
// pedidos: "3"
// permite_venta_deuda: "0"
// permite_venta_tope_mensual: "0"
// tope_venta: "0"
// motivo_bloqueo: ""
// bloqueado: false

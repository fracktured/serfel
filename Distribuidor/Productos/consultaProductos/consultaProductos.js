/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Funciones de pagina de lista de locales de        *
 *        cliente                                           *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("button").button();
    
    $("#datosProducto").hide();
});

function consultarProducto() {
    if($("#codSerfel").val() == "") {
        $("#popUpErrorMensaje").html("Debe ingresar un Código de Producto para continuar.");
        $("#popUpError").dialog("open");
    } else {
        $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            url     : "Productos/consultaProductos/obtInfoProducto.php",
            data    : {
                codSerfel: $("#codSerfel").val()
            },
            success: function(json) {
                if(json.codSerfel == "") {
                    $("#popUpErrorMensaje").html("El Código ingresado no se encuentra en el Sistema.");
                    $("#popUpError").dialog("open");
                } else {
                    $("#auxIdProducto").val(json.idProducto);
                    $("#txtCodSerfel").html(json.codSerfel);
                    $("#txtNomProducto").html(json.nomProd);
                    $("#txtNomMarca").html(json.nomMarca);
                    $("#txtNomUM").html(json.nomUM);
                    $("#txtTipoProdPadre").html(json.tipoProdPadre);
                    $("#txtTipoProd").html(json.tipoProd);
                    $("#txtCostoUltCompra").html(json.costoProm);
                    $("#txtIVACostoUltCompra").html(json.IVAcostoProm);
                    $("#txtCostoUltCompraConIVA").html(json.costoPromConIVA);
                    $("#txtCantidad").html(json.cantidad);
                    $("#txtCostoTotalStock").html(json.costoStock);
                    $("#txtPrecioNetoVenta").html(json.precioNetoVenta);
                    $("#txtIVAPrecioNetoVenta").html(json.IVAprecioVenta);
                    $("#txtPrecioVentaCliente").html(json.precioVenta);
                    $("#txtFechaUltCompra").html(json.ultFechaCompra);
                    $("#txtPorcenMargen").html(json.porcenMargen);
                    $("#txtValorMargen").html(json.valorMargen);
                    $("#txtRutProveedorUltCompra").html(json.rutProveedor);
                    $("#txtRazonSocialProveedorUltCompra").html(json.razonSocial);
                    
                    if(json.impuesto > 0) {
                        $("#txtNomImpAdic").html(json.nomImpuesto);
                        $("#txtImpAdicPrecioNetoVenta").html(json.precioImpAdic);
                        $("#txtPorcImpAdic").html(json.porcenImp);
                        $("#filaImpuesto").show();
                    } else {
                        $("#filaImpuesto").hide();
                    }
                    $("#datosProducto").show();
                }
            },
            error: function() {alert("Error desconocido");}
        });
        
    }
}
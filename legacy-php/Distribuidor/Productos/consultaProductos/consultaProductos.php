<?php
require_once 'Clases/Constantes/UsuarioCONST.php';
require_once 'popUps/popUpError.php';
require_once 'popUps/popUp.php';

if($_SESSION["usuario"]->getIdTipoUsuario() == UsuarioCONST::ADMINISTRADOR) { ?>
                        
<script type="text/javascript">
    $(function() {
        $("#puContenedor").dialog({
            autoOpen: false,
            modal   : true,
            width: 500,
            heigth: 300,
            buttons : {
                "Modificar": function() {
                    confirmModificarStock();
                }
            }
        });
        $("#btnModCantidad").click(loadModificarStock);
    });
    
    function loadModificarStock() {
        $("#puContenedor").load(
                "VistaParcial/Stock/vpModStock.php", 
                {
                    idProducto: $("#auxIdProducto").val()
                },
                function( response, status, xhr ) {
                    if ( status == "error" ) {
                        alert("consultaProductos:modCantidadStock \n " + xhr.status + " " + xhr.statusText);
                    }
                });
                
        $("#puContenedor").dialog("open");
    }
</script>

<?php 
}
?>

<div id="consultaProductos" class="">
    <form action="javascript:consultarProducto()">
        <h1>Ingrese Código Producto
            <input type="text" id="codSerfel" name="codSerfel" value="" />
            <button id="consultarProducto">Consultar Producto</button>
        </h1>
    </form>
    <input type="hidden" id="auxIdProducto" name="auxIdProducto" value="" />
    
    <div id="datosProducto">
        <h3 style="font-size: 1.1em">
            <table>
                <tr>
                    <td>Codigo</td>
                    <td>:</td>
                    <td><span id="txtCodSerfel"></span></td>
                    <td style="width: 50px;"></td>
                    <td>Nombre</td>
                    <td>:</td>
                    <td><span id="txtNomProducto"></span></td>
                </tr>
                <tr>
                    <td>Marca</td>
                    <td>:</td>
                    <td><span id="txtNomMarca"></span></td>
                    <td></td>
                    <td>UM</td>
                    <td>:</td>
                    <td><span id="txtNomUM"></span></td>
                </tr>
                <tr>
                    <td>Tipo Producto Padre</td>
                    <td>:</td>
                    <td><span id="txtTipoProdPadre"></span></td>
                    <td></td>
                    <td>Tipo Producto</td>
                    <td>:</td>
                    <td><span id="txtTipoProd"></span></td>
                </tr>
                <tr>
                    <td>Costo</td>
                    <td>:</td>
                    <td><span id="txtCostoUltCompra"></span></td>
                    <td></td>
                    <td>Fecha Ult. Compra</td>
                    <td>:</td>
                    <td><span id="txtFechaUltCompra"></span></td>
                </tr>
                <tr>
                    <td>IVA Costo</td>
                    <td>:</td>
                    <td><span id="txtIVACostoUltCompra"></span></td>
                    <td></td>
                    <td>Cantidad Stock</td>
                    <td>:</td>
                    <td>
                        <span id="txtCantidad"></span>
                        <?php if($_SESSION["usuario"]->getIdTipoUsuario() == UsuarioCONST::ADMINISTRADOR) { ?>
                        <input type="button" id="btnModCantidad" name="btnModCantidad" value="Modificar" />
                        <?php } ?>
                    </td>
                </tr>
                <tr>
                    <td>Costo c/IVA</td>
                    <td>:</td>
                    <td><span id="txtCostoUltCompraConIVA"></span></td>
                    <td></td>
                    <td>Costo Total Stock</td>
                    <td>:</td>
                    <td><span id="txtCostoTotalStock"></span></td>
                </tr>
                <tr>
                    <td>Precio Neto Venta</td>
                    <td>:</td>
                    <td><span id="txtPrecioNetoVenta"></span></td>
                    <td></td>
                    <td>Proveedor Ult. Compra</td>
                    <td>:</td>
                    <td><span id="txtRutProveedorUltCompra"></span></td>
                </tr>
                <tr>
                    <td>IVA Precio Venta</td>
                    <td>:</td>
                    <td><span id="txtIVAPrecioNetoVenta"></span></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td><span id="txtRazonSocialProveedorUltCompra"></span></td>
                </tr>
                <tr id="filaImpuesto">
                    <td><span id="txtNomImpAdic"></span></td>
                    <td>:</td>
                    <td><span id="txtImpAdicPrecioNetoVenta"></span></td>
                    <td></td>
                    <td>% Impuesto</td>
                    <td>:</td>
                    <td><span id="txtPorcImpAdic"></span></td>
                </tr>
                <tr>
                    <td>Precio Venta Cliente</td>
                    <td>:</td>
                    <td><span id="txtPrecioVentaCliente"></span></td>
                </tr>
                <tr>
                    <td>% Margen Utilidad</td>
                    <td>:</td>
                    <td><span id="txtPorcenMargen"></span></td>
                    <td></td>
                    <td>Valor Margen</td>
                    <td>:</td>
                    <td><span id="txtValorMargen"></span></td>
                </tr>
            </table>
        </h3>
    </div>
</div>

<div id="puContenedor">
    
</div>
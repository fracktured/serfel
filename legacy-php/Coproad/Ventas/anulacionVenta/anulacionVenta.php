<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");
include("Clases/Venta.php");
require_once 'popUps/popUp.php';

    $lista = new Lista();
    $listaEmpresa = $lista->getListaEmpresas();
    
?>

<div id="terminalVentas">
    <form action="javascript:agregarProducto()">
        <input type="hidden" id="idVenta" value="" />
        <input type="hidden" id="rutEmpresa" value="" />
        <input type="hidden" id="idVenta" value="" />
        
        <h1>
            <table>
                <tr>
                    <td>
                        <div id="datosFactura">
                            Seleccione Empresa:
                            <select id="cmbEmpresa">
                                <?php
                                    foreach($listaEmpresa as $empresa) {
                                        echo "<option value='" . $empresa->getRutEmpresa() . "'>" . $empresa->getRazonSocial() . "</option>";
                                    }
                                ?>
                            </select>
                            <br />

                            Ingrese N° de Factura
                            <input type="text" id="numFactura" value="" />
                            <div id="aceptarNumFactura">Aceptar</div>
                        </div>
                        
                        <div id="datosVenta">
                            Empresa: <span id="datosEmpresa"></span>
                            <br />
                            Factura: <span id="spanNumFactura"></span>
                            <br />
                            Precio Total: <span id="spanPrecioTotal"></span>
                            <br />
                            Fecha Venta: <span id="fechaVenta"></span>
                            <br />
                            Vendedor: <span id="nomVendedor"></span>
                            <br />
                            Cliente: <span id="datosCliente"></span>
                            <br />
                            Local Cliente: <span id="datosLocalCliente"></span>
                            <br />
                            Forma de Pago: <span id="nomFormaPago"></span>
                            <br />
                        </div>
                    </td>
                </tr>
                <tr id="filaAnular">
                    <td style="text-align: right"><div id="anularVenta">Anular Venta</div></td>
                </tr>
            </table>
        </h1>
    </form>
    <br />

</div>

<div id="popUpElim" title="Anulación de Venta">
    <input type="hidden" id="idVentaAnul" value="" />
    
    <p id="popUpElimMensaje" class="popUp">
        ¿Está seguro que desea anular la Venta?
        <div class="advertencia">
            <b>Advertencia: De hacerlo se restituirá el Stock y se liberará el número de Factura.</b>
        </div>
    </p>
</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<div id="popUpAdvertencia" title="Advertencia">
    <p id="popUpAdvertenciaMensaje" class="popUp"></p>
</div>

<?php include("popUps/popUpError.php"); ?>
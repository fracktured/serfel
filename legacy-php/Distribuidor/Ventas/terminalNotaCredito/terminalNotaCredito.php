<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");
//include("Clases/Venta.php");
include("Clases/Negocio/VentaNEG.php");
require_once 'Clases/Negocio/EmpresaNEG.php';
require_once 'Clases/Factory/HTMLFactory.php';

    $lista = new Lista();
    //$listaEmpresa = $lista->getListaEmpresas();
    $listaMotivos = $lista->getListaMotivosNotaCredito("");

    $oEmpresaNEG = new EmpresaNEG("");
    $listEmpresaSI = $oEmpresaNEG->listEmpresaSI();
    
    $oVentaNEG = new VentaNEG("");
    $idVenta = filter_input(INPUT_GET, "idVenta");
    $oVentaDTO = $oVentaNEG->obtVenta($idVenta);
    //print_r($oVenta);
    $nNumFactura = "";
    $nRutEmpresa = "";
    if ( $oVentaDTO->oVenta <> null ) {
        $nNumFactura = $oVentaDTO->oVenta->num_docto_emitido;
        $nRutEmpresa = $oVentaDTO->oVenta->rut_empresa;
    }
    $oHTMLFactory = new HTMLFactory();
?>

<div id="terminalVentas">
    <form action="javascript:agregarProducto()">
        <input type="hidden" id="idVenta" value="<?php echo $idVenta; ?>" />
        <input type="hidden" id="rutEmpresa" value="" />
        
        <h1>
            <table>
                <tr>
                    <td>
                        <div id="datosFactura">
                            Seleccione Empresa:
                            <?php echo $oHTMLFactory->generarSelect($listEmpresaSI, "cmbEmpresa", $nRutEmpresa); ?>
                            <br />

                            Ingrese N° de Factura
                            <input type="text" id="numFactura" value="<?php echo $nNumFactura; ?>" />
                            <div id="aceptarNumFactura">Aceptar</div>
                        </div>
                        
                        <div id="datosVenta">
                            Empresa: <span id="datosEmpresa"></span>
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
                            Seleccione Motivo:
                            <select id="cmbMotivo">
                                <?php
                                    foreach($listaMotivos as $motivo) {
                                        echo "<option value='" . $motivo["idMotivo"] . "'>" . $motivo["nomMotivo"] . "</option>";
                                    }
                                ?>
                            </select>
                            <br />
                            Código Producto: <input type="text" class="" id="idProducto" value="" />
                            <button id="agregarProducto">Agregar Producto</button>
                            <div id="buscarProducto">Buscar Producto</div>
                        </div>
                    </td>
                    <td><div id="filaTotales">
                            <table align="right" width="100%">
                                <tr>
                                    <td></td>
                                    <td align="right" style="vertical-align: top; width: 100px;">Factura&nbsp;</td>
                                    <td style="vertical-align: top">:&nbsp;</td>
                                    <td style="vertical-align: top; text-align: right"><span id="filaTotalesNumFactura"></span></td>
                                </tr>
                                <tr>
                                    <td colspan="2" align="right" style="vertical-align: top">Nota de Crédito&nbsp;</td>
                                    <td style="vertical-align: top">:&nbsp;</td>
                                    <td style="vertical-align: top"><input type="text" id="numNotaCredito" value="" style="text-align: right; width: 100px;" /></td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td align="right" style="vertical-align: top">Fecha Nota&nbsp;</td>
                                    <td style="vertical-align: top">:&nbsp;</td>
                                    <td style="vertical-align: top"><input type="text" id="fechaNota" value="" style="text-align: right" readonly /></td>
                                </tr>
                                <tr id="filaSubTotal">
                                    <td width="50px"></td>
                                    <td align="right">SubTotal</td>
                                    <td>:</td>
                                    <td style="text-align: right;">
                                        <input type="hidden" id="valorSubTotal" value="" />
                                        <div id="subTotal"></div></td>
                                </tr>
                                <tr id="filaSubTotalIva">
                                    <td></td>
                                    <td align="right">IVA</td>
                                    <td>:</td>
                                    <td align="right">
                                        <input type="hidden" id="valorIva" value="" />
                                        <div id="subTotalIva"></div></td>
                                </tr>
                                <tr id="filaSubTotalIaba">
                                    <td></td>
                                    <td align="right">IABA</td>
                                    <td>:</td>
                                    <td align="right">
                                        <input type="hidden" id="valorIaba" value="" />
                                        <div id="subTotalIaba"></div></td>
                                </tr>
                                <tr id="filaSubTotalEspec">
                                    <td></td>
                                    <td align="right">ESPEC</td>
                                    <td>:</td>
                                    <td align="right">
                                        <input type="hidden" id="valorEspec" value="" />
                                        <div id="subTotalEspec"></div></td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td align="right">TOTAL</td>
                                    <td>:</td>
                                    <td align="right">
                                        <input type="hidden" id="valorTotal" value="" />
                                        <div id="total"></div></td>
                                </tr>
                                <tr>
                                    <td colspan="4">&nbsp;</td>
                                </tr>
                                <tr>
                                    <td colspan="4" align="right">
                                        <div id="realizarGuiaCredito">Realizar Nota de Crédito</div></td>
                                </tr>
                            </table>
                        </div></td>
                </tr>
            </table>
        </h1>
    </form>
    <br />

    <div id="detalleVenta">
        
    </div>
</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<div id="popUpAdvertencia" title="Advertencia">
    <p id="popUpAdvertenciaMensaje" class="popUp"></p>
</div>

<?php include("popUps/popUpError.php"); ?>
<?php include("popUps/popUpBuscarProducto.php"); ?>
<?php include("popUps/popUpBuscarPedido.php"); ?>
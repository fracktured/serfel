<?php
//error_reporting(E_ALL);
//ini_set('display_errors', '1');
include("Globales/funciones.php");
include_once("popUps/popUpError.php");
include_once("popUps/popUpExito.php");
require_once 'Clases/Controlador/VentaCTRL.php';
require_once 'Clases/Factory/HTMLFactory.php';
require_once 'Clases/Constantes/TipoDoctoCONST.php';

$oHTMLFactory = new HTMLFactory();
$oModel = VentaCTRL::listVentas();

$oVentaFB = $oModel->oVentaFB;
?>

<div id="divCobranzas">
    <form id="formFiltros" action="SisDist.php?act=listVentas" method="POST" class="form-container">
        <div class="form-grid">
            <div class="form-group">
                <label for="cmbTipoDocto">Tipo Docto:</label>
                <?php echo $oHTMLFactory->generarSelect($oModel->listTipoDoctoSI, "cmbTipoDocto", $oVentaFB->idTipoDocto, "form-control"); ?>
            </div>
            <div class="form-group">
                <label for="cmbVendedores">Vendedor:</label>
                <?php echo $oHTMLFactory->generarSelect($oModel->vendedoresSI, "cmbVendedores", $oVentaFB->idVendedor, "form-control"); ?>
            </div>
            <div class="form-group"></div>

            <div class="form-group">
                <label for="txtFechaDesde">Fecha desde:</label>
                <input type="text" id="txtFechaDesde" value="<?php echo $oVentaFB->cFechaDesde; ?>" name="txtFechaDesde" class="form-control" />
            </div>
            <div class="form-group">
                <label for="txtFechaHasta">Fecha hasta:</label>
                <input type="text" id="txtFechaHasta" value="<?php echo $oVentaFB->cFechaHasta; ?>" name="txtFechaHasta" class="form-control" />
            </div>
            <div class="form-group"></div>

            <div class="form-group">
                <label for="txtNumFacturaDesde">Num Factura desde:</label>
                <input type="text" value="<?php echo $oVentaFB->iNumFacturaDesde; ?>" name="txtNumFacturaDesde" class="form-control" />
            </div>
            <div class="form-group">
                <label for="txtNumFacturaHasta">Num Factura hasta:</label>
                <input type="text" value="<?php echo $oVentaFB->iNumFacturaHasta; ?>" name="txtNumFacturaHasta" class="form-control" />
            </div>
            <div class="button-container">
                <input type="submit" value="Filtrar" id="btnFiltrar" name="btnFiltrar" class="btn-submit" />
            </div>
        </div>
    </form>
</div>

<div id="listVentas" class="">
    <div align="right">
        <form id="formBotonConcatenarPDFs" action="javascript:concatenarPDFs()">
            <input type="submit" value="Descargar seleccionadas" id="btnDescargarConcatenados" name="btnDescargarConcatenados" />
        </form>
        <form id="formConcatenarPDFs" method="POST" action="FacturaElectronica/concatenarPDFs.php" target="VentanaDescarga">
            <input type="hidden" value="" id="ventas" name="ventas" />
        </form>
        <a id='linkSeleccionar' href='javascript:seleccionarTodos()'>Seleccionar Todos</a>
    </div>
    <table id="tablaVentas" cellpadding="0" cellspacing="0" border="0" class="display">
        <thead>
            <tr>
                <th>Rut Empresa</th>
                <th>Vendedor</th>
                <th>Factura</th>
                <th>Razon Social Cliente</th>
                <th>Venta</th>
                <th>Notas Crédito</th>
                <th>AV</th>
                <th>F1</th>
                <th>F2</th>
                <th>FE</th>
                <th>FED</th>
                <th>D</th>
            </tr>
        </thead>
        <tbody>
        <?php
            foreach($oModel->listVenta as $oRegListVenta) {
                //$oVentaNDTO = new VentaNDTO();
                //$oEmpresa = new Empresa();
                //$oVenta = new Venta();
                //$oEmpresa = $oVentaNDTO->oEmpresa;
                //$oVenta = $oVentaNDTO->oVenta;
                //$oCliente = $oVentaNDTO->oCliente;
                
                echo "<tr>
                          <input type='hidden' id='" . $oRegListVenta->rut_empresa . "-Rut'>
                          <td>" . $oRegListVenta->obtRutCompletoEmpresa() . "</td>
                          <td>" . $oRegListVenta->nomVendedor . "</td>
                          <td align='center'>" . $oRegListVenta->num_docto_emitido . "</td>
                          <td>" . $oRegListVenta->razon_social_cliente . "</td>
                          <td align='right'>" . getFormatoDineroEntero($oRegListVenta->precio_total)  . "</td>
                          <td align='right'>" . getFormatoDineroEntero($oRegListVenta->iMontoTotalNC)  . "</td>";
                
                if($oRegListVenta->id_tipo_docto_emitido == TipoDoctoCONST::FACTURA && $oRegListVenta->entregado == 0) {
                    echo "<td class='linkElim'>
                              <a class='linkElim' href='javascript:anularVenta(" . $oRegListVenta->id_venta . ")'></a></td>";
                } else {
                    echo "<td></td>";
                }
                
                echo     "<td class='linkLista'>
                              <a class='linkLista' href='Ventas/Reportes/generarFactura.php?numFactura=" . $oRegListVenta->num_docto_emitido 
                                                                                        . "&rutEmpresa=" . $oRegListVenta->rut_empresa . "&imp=1' 
                                                   title='Ver Factura 1'></a></td>
                          <td class='linkLista'>
                              <a class='linkLista' href='Ventas/Reportes/generarFactura.php?numFactura=" . $oRegListVenta->num_docto_emitido 
                                                                                        . "&rutEmpresa=" . $oRegListVenta->rut_empresa . "&imp=2' 
                                                   title='Ver Factura 2'></a></td>";
                          //<td class='linkLista'>
                          //    <a class='linkLista' href='javascript:verNotasCredito(" . $venta->getIdVenta() . ")' 
                          //                         title='Ver Notas de Crédito'></a></td>
                
                if($oRegListVenta->id_tipo_docto_emitido == TipoDoctoCONST::FACTURA_ELECTRONICA) {
                    echo "<td class='linkTicket'>"
                            . "<a class='linkTicket' href='javascript:verPDF(" . $oRegListVenta->id_venta . ");'></a>"
                        . "</td>"
                        . "<td class='linkDescarga'>"
                            . "<a class='linkDescarga' href='javascript:descargarPDF(" . $oRegListVenta->id_venta . ");'></a>"
                        . "</td>";
                } else {
                    echo "<td class='linkCirculo'>"
                            . "<a class='linkCirculo' href='javascript:crearFacturaElectronica(" . $oRegListVenta->id_venta . ");'></a>"
                        . "</td>"
                        . "<td class='linkDescarga'>"
                            . "<a class='linkDescarga' href='javascript:crearYDescargarFacturaElectronica(" . $oRegListVenta->id_venta . ");'></a>"
                        . "</td>";
                }
                echo    "<td><input type='checkbox' id='chk-" . $oRegListVenta->id_venta . "' /></td>";
                echo "</tr>";
            }
        ?>
        </tbody>
    </table>
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
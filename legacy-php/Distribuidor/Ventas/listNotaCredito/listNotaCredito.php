<?php
require_once 'Clases/Controlador/GeneralCTRL.php';
require_once 'Clases/Controlador/NotaCreditoCTRL.php';
require_once "Globales/funciones.php";
require_once "popUps/popUpError.php";
require_once "popUps/popUpExito.php";

//error_reporting(E_ALL);
//ini_set('display_errors', '1');

$oNotaCreditoCTRL = new NotaCreditoCTRL("", false);
$listNotaCreditoDTO = $oNotaCreditoCTRL->listNotaCredito();

?>

<div id="listVentas" class="">
    
    <table id="tablaVentas" cellpadding="0" cellspacing="0" border="0" class="display">
        <thead>
            <tr>
                <th>Rut Empresa</th>
                <th>Razon Social</th>
                <th>Nota Crédito</th>
                <th>Factura</th>
                <th>Razon Social Cliente</th>
                <th>Total Venta</th>
                <th>Total NC</th>
                <!--<th>ANC</th>-->
                <th>NC</th>
                <th>NCE</th>
                <th>NDE</th>
            </tr>
        </thead>
        <tbody>
        <?php
            foreach($listNotaCreditoDTO as $oNotaCreditoDTO) {
                $oVenta       = $oNotaCreditoDTO->oVenta;
                $oCliente     = $oNotaCreditoDTO->oCliente;
                $oEmpresa     = $oNotaCreditoDTO->oEmpresa;
                $oNotaCredito = $oNotaCreditoDTO->oNotaCredito;
                $oNotaDebito  = $oNotaCreditoDTO->oNotaDebito;
                
                echo "<tr>
                          <td>" . $oEmpresa->obtRutCompleto() . "</td>
                          <td>" . $oEmpresa->razon_social . "</td>
                          <td align='center'>" . $oNotaCredito->num_nota_credito . "</td>
                          <td align='center'>" . $oVenta->num_docto_emitido . "</td>
                          <td>" . $oCliente->razon_social . "</td>
                          <td align='right'>" . getFormatoDineroEntero($oVenta->precio_total)  . "</td>
                          <td align='right'>" . getFormatoDineroEntero($oNotaCredito->precio_total)  . "</td>
                          <td class='linkLista'>"
                            . "<a class='linkLista' href='javascript:window.open(\"Ventas/Reportes/generarNotaCredito.php?numNotaCredito=" . $oNotaCredito->num_nota_credito . "&rutEmpresa=" . $oEmpresa->rut_empresa . "\")'></a>"
                        . "</td>";
                
                if($oNotaCredito->id_folio > 0) {
                    echo "<td class='linkTicket'>"
                            . "<a class='linkTicket' href='javascript:verPDFNotaCredito(" . $oNotaCredito->id_nota_credito . ");'></a>"
                        . "</td>";
                } else if($oVenta->id_folio > 0) {
                    echo "<td class='linkCirculo'>"
                            . "<a class='linkCirculo' href='javascript:crearNotaCreditoElectronica(" . $oNotaCredito->id_nota_credito . ");'></a>"
                        . "</td>";
                } else {
                    echo "<td></td>";
                }
                
                if($oNotaDebito != null) {
                    echo "<td class='linkTicket'>"
                            . "<a class='linkTicket' href='javascript:verPDFNotaDebito(" . $oNotaDebito->id_nota_debito . ");'></a>"
                        . "</td>";
                } else if($oNotaCredito->id_folio > 0) {
                    echo "<td class='linkCirculo'>"
                            . "<a class='linkCirculo' href='javascript:crearNotaDebitoElectronica(" . $oNotaDebito->id_nota_debito . ");'></a>"
                        . "</td>";
                } else {
                    echo "<td></td>";
                }
                
                echo "</tr>";
            }
        ?>
        </tbody>
    </table>
</div>

<div id="popUpElim" title="Anulación de Nota de Crédito">
    <input type="hidden" id="idVentaAnul" value="" />
    
    <p id="popUpElimMensaje" class="popUp">
        ¿Está seguro que desea anular la Nota de Crédito?
        <div class="advertencia">
            <b>Advertencia: De hacerlo se disminuirá el Stock y se liberará el número de Nota de Crédito.</b>
        </div>
    </p>
</div>
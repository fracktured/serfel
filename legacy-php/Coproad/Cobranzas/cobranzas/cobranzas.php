<?php
require_once 'Clases/Constantes/EstadoPagoCONST.php';
require_once 'Clases/Controlador/CobranzaCTRL.php';
require_once 'Clases/Factory/HTMLFactory.php';
require_once 'Clases/Util/FechaUtil.php';
require_once 'Globales/funciones.php';
require_once 'popUps/popUp.php';
//error_reporting(E_ALL);

$oHTMLFactory = new HTMLFactory();
$oModel = CobranzaCTRL::cobranzas();
?>

<div id="divCobranzas">
    <form id="formFiltros" action="SisDist.php?act=cobranzas" method="POST" class="form-container">
        <div class="form-grid">
            <div class="form-group">
                <label for="cmbRuta">Ruta:</label>
                <?php echo $oHTMLFactory->generarSelect($oModel->listRutaSI, "cmbRuta", $oModel->idRuta, "form-control"); ?>
            </div>
            <div class="form-group">
                <label for="cmbEstadoPago">Estado Pago:</label>
                <?php echo $oHTMLFactory->generarSelect($oModel->listEstadoPagoSI, "cmbEstadoPago", $oModel->idEstadoPago, "form-control"); ?>
            </div>
            <div class="form-group">
                <label for="cmbTipoDocto">Condición de Pago:</label>
                <?php echo $oHTMLFactory->generarSelect($oModel->listTipoDoctoSI, "cmbTipoDocto", $oModel->idTipoDocto, "form-control"); ?>
            </div>

            <div class="form-group">
                <label for="rut">RUT:</label>
                <input type="text" id="rut" name="rutCliente" class="form-control" value="<?php echo $oModel->cRutCliente; ?>" placeholder="Ej: 12345678-9">
            </div>
            <div class="form-group">
                <label for="nombre">Nombre:</label>
                <input type="text" id="nombre" name="nombre" class="form-control" value="<?php echo $oModel->cRazonSocialCliente; ?>" placeholder="Ingrese nombre">
            </div>
            <div class="form-group"></div>

            <div class="form-group">
                <label for="fechaDesde">Fecha Desde:</label>
                <input type="date" id="fechaDesde" name="fechaDesde" value="<?php echo $oModel->cFechaDesde; ?>" class="form-control">
            </div>
            <div class="form-group">
                <label for="fechaHasta">Fecha Hasta:</label>
                <input type="date" id="fechaHasta" name="fechaHasta" value="<?php echo $oModel->cFechaHasta; ?>" class="form-control">
            </div>
            <div class="button-container">
                <input type="submit" value="Filtrar" id="btnFiltrar" name="btnFiltrar" class="btn-submit" />
            </div>
        </div>
    </form>
</div>

<div id="detalleCobranzas">
    <input type="button" value="Pagar Completas" id="btnPagarCompletas" name="btnPagarCompletas" />
    <div align="right">
        <a id='linkSeleccionar' href='javascript:seleccionarTodos()'>Seleccionar Todos</a>
    </div>
    <table id="tablaCobranzas" cellpadding="0" cellspacing="0" border="0" class="display">
        <thead>
            <tr>
                <th>Rut Empresa</th>
                <th>Rut Cliente</th>
                <th>Razon Social Cliente</th>
                <th>Condición Pago</th>
                <th>Factura</th>
                <th>Fecha</th>
                <th>Venta</th>
                <th>Por Pagar</th>
                <th>Pagos</th>
                <th>S</th>
            </tr>
        </thead>
        <tbody>
        <?php
            foreach($oModel->listVenta as $oRegListVenta) {
                $iMontoPorPagar = $oRegListVenta->precio_total - $oRegListVenta->iMontoTotalNC - $oRegListVenta->iMontoTotalPago;
                //style="text-align=righ;"
                //<input type='hidden' id='" . $oRegListVenta->rut_empresa . "-Rut'>
                echo "<tr>";
                echo    "<td>" . $oRegListVenta->obtRutCompletoEmpresa() . "</td>";
                echo    "<td>" . $oRegListVenta->obtRutCompletoCliente() . "</td>";
                echo    "<td>" . $oRegListVenta->razon_social_cliente . "</td>";
                echo    "<td>" . $oRegListVenta->nom_forma_pago . "</td>";
                echo    "<td align='center'>" . $oRegListVenta->num_docto_emitido . "</td>";
                echo    "<td align='center'>" . FechaUtil::aLocal($oRegListVenta->fecha_venta, 'Y-m-d') . "</td>";
                echo    "<td align='right'>" . getFormatoDineroEntero($oRegListVenta->precio_total)  . "</td>";
                echo    "<td align='right'>" . getFormatoDineroEntero($iMontoPorPagar)  . "</td>";

                if ( $oRegListVenta->id_estado_pago == EstadoPagoCONST::PAGO_COMPLETO ) {
                    echo "<td class='linkTicket'>";
                    echo    "<a class='linkTicket' href='javascript:verPagos(" . $oRegListVenta->id_venta . ");'></a>";
                    echo "</td>";
                    echo "<td></td>";
                } else {
                    echo "<td class='linkCirculo'>";
                    echo    "<a class='linkCirculo' href='javascript:verPagos(" . $oRegListVenta->id_venta . ");'></a>";
                    echo "</td>";
                    echo "<td><input type='checkbox' id='chk-" . $oRegListVenta->id_venta . "' /></td>";
                }

                echo "</tr>";
            }
        ?>
        </tbody>
    </table>
</div>

<div id="puPagos"></div>

<?php include("popUps/popUpError.php"); ?>
<?php include("popUps/popUpExito.php"); ?>

<?php
require_once 'Clases/Constantes/EstadoPagoCONST.php';
require_once 'Clases/Controlador/CobranzaCTRL.php';
require_once 'Clases/Factory/HTMLFactory.php';
require_once 'Clases/Util/FechaUtil.php';
require_once 'Globales/funciones.php';
require_once 'popUps/popUp.php';

$oHTMLFactory = new HTMLFactory();
$oModel = CobranzaCTRL::informeCobranzas();
?>

<div id="divCobranzas">
    <form id="formFiltros" action="javascript:imprimirCobranzas()" class="form-container">
        <div class="form-grid">
            <div class="form-group">
                <label for="cmbRuta">Ruta:</label>
                <?php echo $oHTMLFactory->generarSelect($oModel->listRutaSI, "cmbRuta", $oModel->idRuta, "form-control"); ?>
            </div>
            <div class="form-group">
                <label for="cmbEstadoPago">Estado Pago:</label>
                <?php echo $oHTMLFactory->generarSelect($oModel->listEstadoPagoSI, "cmbEstadoPago", $oModel->idEstadoPago, "form-control"); ?>
            </div>
            <div class="form-group"></div>

            <div class="form-group">
                <label for="rut">RUT:</label>
                <input type="text" id="rut" name="rut" class="form-control" value="<?php echo $oModel->cRutCliente; ?>" placeholder="Ej: 12345678-9">
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
                <input type="submit" value="Imprimir informe" id="btnImprimir" name="btnImprimir" class="btn-submit" />
            </div>
        </div>
    </form>
</div>
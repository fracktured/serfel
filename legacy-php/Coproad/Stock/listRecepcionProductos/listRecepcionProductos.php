<?php
require_once 'Clases/Controlador/RecepcionCTRL.php';
require_once 'Clases/Factory/HTMLFactory.php';
//error_reporting(E_ALL);

$oHTMLFactory = new HTMLFactory();
$oModel = RecepcionCTRL::recepciones();
?>

<div id="divCobranzas">
    <form id="formFiltros" action="SisDist.php?act=listRecepcionProductos" method="POST" class="form-container">
        <div class="form-grid">
            <div class="form-group">
                <label for="rut">RUT:</label>
                <input type="text" id="rutProveedor" name="rutProveedor" class="form-control" value="<?php echo $oModel->cRutProveedor; ?>" placeholder="Ej: 12345678-9">
            </div>
            <div class="form-group">
                <label for="nombre">Nombre:</label>
                <input type="text" id="nombre" name="nombre" class="form-control" value="<?php echo $oModel->cRazonSocialProveedor; ?>" placeholder="Ingrese nombre">
            </div>
            <div class="form-group">
                <label for="cmbTipoPago">Condición de Pago:</label>
                <?php echo $oHTMLFactory->generarSelect($oModel->listTipoDoctoSI, "cmbTipoPago", $oModel->idTipoPago, "form-control"); ?>
            </div>

            <div class="form-group">
                <label for="nombre">N° Factura desde:</label>
                <input type="text" id="facturaDesde" name="facturaDesde" class="form-control" value="<?php echo $oModel->iFacturaDesde; ?>" placeholder="Ingrese n° factura">
            </div>
            <div class="form-group">
                <label for="nombre">N° Factura hasta:</label>
                <input type="text" id="facturaHasta" name="facturaHasta" class="form-control" value="<?php echo $oModel->iFacturaHasta; ?>" placeholder="Ingrese n° factura">
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

<div id="listBodegas" class="">
    <table id="tablaBodegas" border="0" class="display">
        <thead>
            <tr>
                <th>Fecha Docto</th>
                <th>Rut Proveedor</th>
                <th>Razon Social</th>
                <th>Tipo Docto</th>
                <th>Numero Docto</th>
                <th>Tipo Pago</th>
                <th>L</th>
                <th>NC</th>
            </tr>
        </thead>
        <tbody>
        <?php
            foreach($oModel->recepciones as $oRecepcionNDTO) {
                echo "<tr>";
                echo    "<td>" . $oRecepcionNDTO->oRecepcion->fecha_emision_docto . "</td>";
                echo    "<td>" . $oRecepcionNDTO->oProveedor->obtRutCompleto() . "</td>";
                echo    "<td>" . $oRecepcionNDTO->oProveedor->razon_social . "</td>";
                echo    "<td>" . $oRecepcionNDTO->oTipoDocto->nom_tipo_docto . "</td>";
                echo    "<td>" . $oRecepcionNDTO->oRecepcion->num_docto . "</td>";
                if ( $oRecepcionNDTO->oRecepcion->id_tipo_pago == 0 ) {
                    echo "<td align='center'><a href='javascript:ingPago(" . $oRecepcionNDTO->oRecepcion->id_recepcion . ")' title='Ver Recepcion'>Sin Pago</a> </td>";
                } else {
                    echo "<td align='center'>" . $oRecepcionNDTO->oTipoPago->nom_tipo_docto . "</td>";
                }
                echo "<td class='linkDet'><a class='linkDet' href='javascript:detRecepcion(" . $oRecepcionNDTO->oRecepcion->id_recepcion . ")' title='Ver Recepcion'></a> </td>";
                echo "<td class='linkDet'><a class='linkDet' href='javascript:window.open(\"SisDist.php?act=crearNotaCreditoCompra&idRecepcion=" . $oRecepcionNDTO->oRecepcion->id_recepcion . "\")' title='Crear Nota Crédito'></a>";
                echo "</td></tr>";
                $i++;
            }
        ?>
        </tbody>
    </table>
</div>

<div id="popRecepcion" title="" style="width: 800px">
    <br/>

    <table>
        <tr>
            <td>Proveedor</td>
            <td>:</td>
            <td> <span id="razonSocial"> </td>
            <td style="width: 10px"></td>
            <td>Rut</td>
            <td>:</td>
            <td> <span id="rutCompleto"> </td>
        </tr>
        <tr>
            <td>Documento</td>
            <td>:</td>
            <td> <span id="nomTipoDocto"> </td>
            <td style="width: 10px"></td>
            <td>Numero</td>
            <td>:</td>
            <td> <span id="numDocto"> </td>
        </tr>
        <tr>
            <td>Fecha Emision</td>
            <td>:</td>
            <td> <span id="fechaEmisionDocto"> </td>
            <td style="width: 10px"></td>
            <td>Bodega Recepcion</td>
            <td>:</td>
            <td> <span id="nomBodega"> </td>
        </tr>
        <tr>
            <td>Tipo Pago</td>
            <td>:</td>
            <td> <span id="nomTipoPago"> </td>
        </tr>
    </table>
    <br/>
    
    <table>
        <tr>
            <td>Observacion</td>
            <td style="width: 10px"></td>
            <td>:</td>
            <td colspan="5"> <span id="observacion"> </td>
        </tr>
    </table>
    <br/><br/>

    <table id="tablaProductos" border="0" class="display">
        <thead>
            <tr>
                <th>Cod Prod</th>
                <th>Nombre Producto</th>
                <th>Marca</th>
                <th>UM</th>
                <th>Cantidad</th>
                <th>Valor</th>
            </tr>
        </thead>
    </table>
</div>

<div id="popPago" title="" style="width: 800px">
    <br/>

    <table>
        <tr>
            <td>Proveedor</td>
            <td>:</td>
            <td> <span id="razonSocialPago"> </td>
            <td style="width: 10px"></td>
            <td>Rut</td>
            <td>:</td>
            <td> <span id="rutCompletoPago"> </td>
        </tr>
        <tr>
            <td>Documento</td>
            <td>:</td>
            <td> <span id="nomTipoDoctoPago"> </td>
            <td style="width: 10px"></td>
            <td>Numero</td>
            <td>:</td>
            <td> <span id="numDoctoPago"> </td>
        </tr>
        <tr>
            <td>Fecha Emision</td>
            <td>:</td>
            <td> <span id="fechaEmisionDoctoPago"> </td>
            <td style="width: 10px"></td>
            <td>Bodega Recepcion</td>
            <td>:</td>
            <td> <span id="nomBodegaPago"> </td>
        </tr>
    </table>
    <br/><br/>

    <table>
        <tr>
            <td>Tipo Pago</td>
            <td style="width: 10px"></td>
            <td>:</td>
            <td><?php echo $oHTMLFactory->generarSelect($oModel->listTipoDoctoSI, "cmbTipoDocto", $oModel->idTipoDocto); ?></td>
        </tr>
        <tr>
            <td>Observacion</td>
             <td style="width: 10px"></td>
            <td>:</td>
            <td colspan="5"> <textarea name="observacionPago" id="observacionPago" style="width:400px;height: 50px" maxlength="200"></textarea> </td>
        </tr>
    </table>
</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<?php require_once "popUps/popUpError.php"; ?>
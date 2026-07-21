<?php
require_once 'Clases/Controlador/GeneralCTRL.php';
require_once 'Clases/Controlador/FacturacionElectronica/SubirLibroCVCTRL.php';
require_once 'Clases/Constantes/FacturacionCLCONST.php';
require_once 'Clases/Factory/HTMLFactory.php';
require_once 'Clases/Util/FormatoUtil.php';
require_once "popUps/popUpError.php";
require_once "popUps/popUpExito.php";
//error_reporting(E_ALL);
//ini_set('display_errors', '1');
$oHTMLFactory = new HTMLFactory();
$oFormatoUtil = new FormatoUtil();

$COMPRA = FacturacionCLCONST::TIPO_OPER_LIBRO_COMPRA;
$VENTA = FacturacionCLCONST::TIPO_OPER_LIBRO_VENTA;

$oSubirLibroCVCTRL = new SubirLibroCVCTRL("", FALSE);
$oSubirLibroCVDTO = $oSubirLibroCVCTRL->generarLibroCV();

$cTipoLibro = $oSubirLibroCVDTO->cTipoLibro;
$cFechaDesde = $oSubirLibroCVDTO->cFechaDesde;
$cFechaHasta = $oSubirLibroCVDTO->cFechaHasta;
$oEmpresa = $oSubirLibroCVDTO->oEmpresa;
?>

<script type="text/javascript">
    $(document).ready(function() {
        $("#puSubirLibro").dialog({
            autoOpen: false,
            modal   : true,
            buttons : {
                "Ok": function() {
                    $(this).dialog("close");
                    doSubirLibro();
                }
            }
        });

        $("#txtFechaDesde").datepicker({
            changeMonth: true,
            changeYear : true,
            yearRange  : '1980:2060',
            dateFormat : 'dd/mm/yy',
            onSelect   : function() {
                $("#txtFechaHasta").datepicker("destroy");

                $("#txtFechaHasta").datepicker({
                    changeMonth: true,
                    changeYear : true,
                    yearRange  : '1980:2060',
                    dateFormat : 'dd/mm/yy',
                    minDate: $("#txtFechaDesde").val()
                });

                $("#txtFechaHasta").val("");
            }
        });

        if($("#cTipoLibro").val() != "") {
            $("#txtAñoPeriodo").numeric();

            $("#tablaLibro").dataTable({
                "bJQueryUI": true,
                "sPaginationType": "full_numbers",
                "bLengthChange": true,
                "bFilter": true,
                "bSort": true,
                "bInfo": false,
                "bAutoWidth": true,
                "oLanguage": {
                    "sLengthMenu": "Mostrando _MENU_ resultados por página",
                    "sZeroRecords": "No se han encontrado resultados",
                    "sInfo": "Mostrando desde _START_ hasta _END_ de un total de _TOTAL_ registros",
                    "sInfoEmpty": "Mostrando desde 0 hasta 0 de un total de 0 registros",
                    "sInfoFiltered": "(Filtrado de un total de _MAX_ registros)",
                    "sSearch": "Buscar"
                }
            });
        }

    });

    function confirmSubirLibro() {
        $("#puSubirLibro").dialog("open");
    }

    function doSubirLibro() {
        $.ajax({
            data: $("#subirLibroCVForm").serialize(),
            type    : "POST",
            dataType: "json",
            url     : "Ajax/FacturacionElectronica/ajaxSubirLibroCV.php",
            success : function(oJson) {
                $("#" + oJson.cPopUp).dialog({title: "Subir Libro"});
                $("#" + oJson.cPopUp + "Mensaje").html(oJson.cMensaje);
                $("#" + oJson.cPopUp).dialog("open");
            },
            error: function(xhr, status, error) {
                var err = JSON.parse(xhr.responseText);
                alert("subirLibroCV:doSubirLibro\n" + err.Message);
            }
        });
    }
</script>

<div id="subirLibroCVContenedor">

    <form id="generarLibroCVForm" action="SisDist.php?act=subirLibroCV" method="POST">
        <div id="tabs">
            Tipo Libro
            <select id="cmbTipoLibro" name="cmbTipoLibro">
                <option value="<?php echo $COMPRA ?>"><?php echo $COMPRA; ?></option>
                <option value="<?php echo $VENTA ?>"><?php echo $VENTA; ?></option>
            </select>
            
            Empresa 
            <?php $oHTMLFactory->generarSelect($oSubirLibroCVDTO->listEmpresaSI, "cmbEmpresa"); ?>
            <br />
                
            Fecha desde <input id="txtFechaDesde" name="txtFechaDesde" type="text" value="<?php echo $cFechaDesde; ?>" required="required" />
            Fecha hasta <input id="txtFechaHasta" name="txtFechaHasta" type="text" value="<?php echo $cFechaHasta; ?>" required="required" />
                
            <input type="submit" name="cmdGenerar" value="Generar" />
        </div>
    </form>
    <br /><br />
    
    <?php
    if($oSubirLibroCVDTO->iTotalDoctos > 0) {
    ?>
    
    <fieldset id='fsResumenVentas' style='padding: 15px'>
        <h2>Resumen Libro de Venta <?php echo $cFechaDesde; ?> a <?php echo $cFechaHasta; ?></h2>
        <h3>Empresa: <?php echo $oEmpresa->obtRutCompleto() . " " . $oEmpresa->razon_social; ?></h3>
        <br /><br />
        
        <form id="subirLibroCVForm" action="javascript:confirmSubirLibro();">
            <input id="cTipoLibro" name="cTipoLibro" type="hidden" value="<?php echo $cTipoLibro; ?>" />
            <input id="iRutEmpresa" name="iRutEmpresa" type="hidden" value="<?php echo $oEmpresa->rut_empresa; ?>" />
            <input id="cFechaDesde" name="cFechaDesde" type="hidden" value="<?php echo $cFechaDesde; ?>" />
            <input id="cFechaHasta" name="cFechaHasta" type="hidden" value="<?php echo $cFechaHasta; ?>" />
            
            Periodo:
            <?php $oHTMLFactory->generarSelect($oSubirLibroCVDTO->listMesesSI, "cmbMesPeriodo"); ?>
            <input id="txtAñoPeriodo" name="txtAñoPeriodo" type="text" value="<?php echo date("Y"); ?>" required="required" />

            <input type="submit" name="cmdSubir" value="Subir Libro" />
        </form>
        
    <?php    
        if($oModel->cTipoLibro == $COMPRA) {
            require_once 'VistaParcial/FacturacionElectronica/vpResumenRecepciones.php';
        } else if($oModel->cTipoLibro == $VENTA) {
            require_once 'VistaParcial/FacturacionElectronica/vpResumenVentas.php';
        }
    ?>
        
    </fieldset>
    
    <?php
    }
    ?>

</div>

<div id="puSubirLibro" title="Subir Libro">
    <p id="puSubirLibroMsg" class="popUp">
        ¿Está seguro que desea Subir el Libro <?php echo $cTipoLibro; ?>?
    </p>
</div>
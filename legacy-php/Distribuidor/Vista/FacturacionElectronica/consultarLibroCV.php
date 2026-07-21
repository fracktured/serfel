<?php
require_once 'Clases/Controlador/FacturacionElectronica/LibroCVCTRL.php';
require_once 'Clases/Constantes/FacturacionCLCONST.php';
require_once 'Clases/Factory/HTMLFactory.php';
require_once "popUps/popUp.php";
require_once 'popUps/popUpCargando.php';
//error_reporting(E_ALL);
//ini_set('display_errors', '1');
$oHTMLFactory = new HTMLFactory();

$COMPRA = FacturacionCLCONST::TIPO_OPER_LIBRO_COMPRA;
$VENTA = FacturacionCLCONST::TIPO_OPER_LIBRO_VENTA;

$oLibroCVCTRL = new LibroCVCTRL("", FALSE);
$oModel = $oLibroCVCTRL->consultarLibroCV();

$oEmpresa = $oModel->oEmpresa;
?>

<script type="text/javascript">
    $(document).ready(function() {
        $("#popUpCargando").dialog("open");
    
        $("#puEliminarLibro").dialog({
            autoOpen: false,
            modal   : true,
            buttons : {
                "Ok": function() {
                    $(this).dialog("close");
                    doEliminarLibro();
                }
            }
        });

        $("#txtAñoPeriodo").numeric();

        <?php
            if($oModel->cTipoLibro == $COMPRA) {
                echo "iniTablaRecepciones();";
            } else if($oModel->cTipoLibro == $VENTA) {
                echo "iniTablaVentas();";
            }
            
        ?>
                
        $("#popUpCargando").dialog("close");
    });
    
    function confirmEliminarLibro() {
        $("#puEliminarLibro").dialog("open");
    }
    
    function doEliminarLibro() {
        $("#popUpCargando").dialog("open");

        $.ajax({
            data: $("#frmEliminarLibroCV").serialize(),
            type    : "POST",
            dataType: "json",
            url     : "Ajax/FacturacionElectronica/ajaxEliminarLibroCV.php",
            success : function(oJson) {
                $("#popUpCargando").dialog("close");

                $("#popUp").dialog({
                    autoOpen: false,
                    modal   : true,
                    buttons : {
                        "Ok": function() {
                            if(oJson.bReload) {
                                location.reload();
                            } else {
                                $(this).dialog("close");
                            }
                        }
                    }
                });

                $("#popUp").dialog({title: "Eliminar Libro Compra"});
                $("#popUpMsg").html(oJson.cMensaje);
                $("#popUp").dialog("open");
            },
            error: function(xhr, status, error) {
                $("#popUpCargando").dialog("close");

                var err = JSON.parse(xhr.responseText);
                alert("consultarLibroCV:doEliminarLibro \n" + err.Message);
            }
        });
    }
</script>

<div id="subirLibroCVContenedor">

    <form id="generarLibroCVForm" action="SisDist.php?act=consultarLibroCV" method="POST">
        <div id="tabs">
            Tipo Libro
            <select id="cmbTipoLibro" name="cmbTipoLibro">
                <option value="<?php echo $COMPRA ?>"><?php echo $COMPRA; ?></option>
                <option value="<?php echo $VENTA ?>"><?php echo $VENTA; ?></option>
            </select>
            
            Empresa 
            <?php $oHTMLFactory->generarSelect($oModel->listEmpresaSI, "cmbEmpresa", $oEmpresa->rut_empresa); ?>
            <br />
                
            Periodo:
            <?php $oHTMLFactory->generarSelect($oModel->listMesesSI, "cmbMesPeriodo", $oModel->iMesPeriodo); ?>
            <input id="txtAñoPeriodo" name="txtAñoPeriodo" type="text" value="<?php echo $oModel->iAñoPeriodo; ?>" required="required" />
                
            <input type="submit" name="cmdGenerar" value="Generar" />
        </div>
    </form>
    <br /><br />
    
    <?php
    if($oModel->iTotalDoctos > 0) {
    ?>
    
    <fieldset id='fsResumenVentas' style='padding: 15px'>
        <h2>Resumen Libro de Venta Periodo <?php echo $oModel->cPeriodo; ?></h2>
        <h3>Empresa: <?php echo $oEmpresa->obtRutCompleto() . " " . $oEmpresa->razon_social; ?></h3>
        <br /><br />
        
        <form id="frmEliminarLibroCV" action="javascript:confirmEliminarLibro()">
            <input id="cTipoLibro" name="cTipoLibro" type="hidden" value="<?php echo $oModel->cTipoLibro; ?>" />
            <input id="iRutEmpresa" name="iRutEmpresa" type="hidden" value="<?php echo $oEmpresa->rut_empresa; ?>" />
            <input id="cPeriodo" name="cPeriodo" type="hidden" value="<?php echo $oModel->cPeriodo; ?>" />

            <input type="submit" name="cmdEliminar" value="Eliminar Libro" />
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

<div id="puEliminarLibro" title="Eliminar Libro">
    <p id="puEliminarLibroMsg" class="popUp">
        ¿Está seguro que desea Eliminar el Libro <?php echo $oModel->cTipoLibro; ?> del periodo <?php echo $oModel->cPeriodo; ?>?
    </p>
</div>
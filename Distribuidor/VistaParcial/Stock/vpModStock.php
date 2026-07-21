<?php
require_once '../../Clases/Controlador/StockCTRL.php';
require_once '../../Clases/Util/FormatoUtil.php';

$oCTRL = new StockCTRL("../../");
$oModel = $oCTRL->consultarStock();

$oProducto = $oModel->oProducto;
$oStock = $oModel->oStock;
//action="javascript:confirmModificarStock();"
?>

<script type="text/javascript">
    $(function() {
        $("#puConfirmModificarStock").dialog({
            autoOpen: false,
            modal   : true,
            buttons : {
                "Ok": function() {
                    $(this).dialog("close");
                    doModificarStock();
                }
            }
        });

        $("#txtCantidad").numeric();
    });
    
    function confirmModificarStock() {
        $("#puConfirmModificarStock").dialog("open");
    }
    
    function doModificarStock() {
        $("#popUpCargando").dialog("open");

        $.ajax({
            data: $("#frmModStock").serialize(),
            type    : "POST",
            dataType: "json",
            url     : "Ajax/Stock/ajaxModStock.php",
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

                $("#popUp").dialog({title: "Modificar Stock"});
                $("#popUpMsg").html(oJson.cMensaje);
                $("#popUp").dialog("open");
            },
            error: function(xhr, status, error) {
                $("#popUpCargando").dialog("close");

                var err = JSON.parse(xhr.responseText);
                alert("consultarLibroCV:doModificarStock \n " + err.Message);
            }
        });
    }
</script>


<form id="frmModStock" name="frmModCantidad">
    <input type="hidden" id="idProducto" name="idProducto" value="<?php echo $oProducto->id_producto; ?>" />
    
    <table>
        <tr>
            <td>Código Serfel</td>
            <td>:</td>
            <td><?php echo $oProducto->cod_serfel; ?></td>
        </tr>
        <tr>
            <td>Producto</td>
            <td>:</td>
            <td><?php echo $oProducto->nom_producto; ?></td>
        </tr>
        <tr>
            <td>Cantidad Stock</td>
            <td>:</td>
            <td><?php echo FormatoUtil::formatoEnteroConDecimal($oStock->cantidad); ?></td>
        </tr>
        <tr>
            <td>Nueva Cantidad Stock</td>
            <td>:</td>
            <td><input type="text" id="txtCantidad" name="txtCantidad" value="" /></td>
        </tr>
    </table>
</form>

<div id="puConfirmModificarStock">
    <p id="puConfirmModificarStockMsg" class="popUp">
        ¿Está seguro que desea Modificar la cantidad a <?php echo $oProducto->nom_producto; ?>?
    </p>
</div>
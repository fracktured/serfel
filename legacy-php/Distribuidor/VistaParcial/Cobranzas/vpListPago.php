<?php
require_once '../../Clases/Controlador/PagoCTRL.php';
require_once '../../Clases/Util/FormatoUtil.php';
require_once '../../Clases/Factory/HTMLFactory.php';

$oHTMLFactory = new HTMLFactory();
$oModel = PagoCTRL::ajaxListPago();
?>

<script type="text/javascript">
    $(function() {
        $("#tablaPagos").dataTable({
            "bJQueryUI": true,
            "sPaginationType": "full_numbers",
            "bLengthChange": true,
            "bFilter": true,
            "bSort": true,
            "bInfo": false,
            "bAutoWidth": false,
            "oLanguage": {
                "sLengthMenu": "Mostrando _MENU_ resultados por página",
                "sZeroRecords": "No se han encontrado resultados",
                "sInfo": "Mostrando desde _START_ hasta _END_ de un total de _TOTAL_ registros",
                "sInfoEmpty": "Mostrando desde 0 hasta 0 de un total de 0 registros",
                "sInfoFiltered": "(Filtrado de un total de _MAX_ registros)",
                "sSearch": "Buscar"
            }
        });

        $("#puPagos").dialog({
            autoOpen: false,
            modal: true,
            width: 925,
            heigth: 350,
            buttons: {
                "Salir": function() {
                    $(this).dialog('close');
                }
            }
        });
        
        $("#btnEliminarPagos").button();
        $("#btnEliminarPagos").click(eliminarPagos);
        $("#puPagos").dialog("open");
    });

    function notaCredito() {
        var idVenta = <?php echo $oModel->idVenta; ?>;
        window.open("SisDist.php?act=terminalNotaCredito&idVenta=" + idVenta);
    }
    
    function ingresarPago() {
        if ( $("#nMonto").val() > $("#iTotalXPagar").val() ) {
            alert("Monto del pago no puede ser mayor al total por pagar");
            return;
        }

        if ( $("#nMonto").val() <= 0 ) {
            alert("Monto debe ser mayor a cero");
            return;
        }
        var idVenta = <?php echo $oModel->idVenta; ?>;
        var acepto = confirm(String.fromCharCode(191) + "Esta seguro que desea ingresar el pago?");

        if (acepto) {
            $("#popUpCargando").dialog("open");

            $.ajax({
                data    : $("#frmIngPago").serialize(),
                type    : "POST",
                dataType: "json",
                url     : "Ajax/Pago/ajaxIngPago.php",
                success : function(oJson) {
                    $("#popUpCargando").dialog("close");

                    $("#popUp").dialog({
                        autoOpen: false,
                        modal   : true,
                        buttons : {
                            "Ok": function() {
                                $(this).dialog("close");
                            }
                        }
                    }).bind("dialogclose", function(event) {
                        $("#puPagos").dialog("close");
                        verPagos(idVenta);
                    });

                    $("#popUp").dialog({title: "Ingresar pago"});
                    $("#popUpMsg").html(oJson.cMensaje);
                    $("#popUp").dialog("open");
                },
                error: function(xhr, status, error) {
                    $("#popUpCargando").dialog("close");

                    var err = JSON.parse(xhr.responseText);
                    console.log("vpListPago:ingresarPago \n " + err.Message)
                    alert("vpListPago:ingresarPago \n " + err.Message);
                }
            });
        }
    }

    function eliminarPago(idPago) {
        var idVenta = <?php echo $oModel->idVenta; ?>;
        var acepto = confirm(String.fromCharCode(191) + "Esta seguro que desea eliminar el pago?");

        if (acepto) {
            $("#popUpCargando").dialog("open");

            $.ajax({
                data : {
                    idVenta: idVenta,
                    idPago: idPago
                },
                type    : "POST",
                dataType: "json",
                url     : "Ajax/Pago/ajaxElimPago.php",
                success : function(oJson) {
                    $("#popUpCargando").dialog("close");

                    $("#popUp").dialog({
                        autoOpen: false,
                        modal   : true,
                        buttons : {
                            "Ok": function() {
                                $(this).dialog("close");
                            }
                        }
                    }).bind("dialogclose", function(event) {
                        $("#puPagos").dialog("close");
                        verPagos(idVenta);
                    });

                    $("#popUp").dialog({title: "Eliminar pago"});
                    $("#popUpMsg").html(oJson.cMensaje);
                    $("#popUp").dialog("open");
                },
                error: function(xhr, status, error) {
                    $("#popUpCargando").dialog("close");

                    var err = JSON.parse(xhr.responseText);
                    console.log("vpListPago:eliminarPago \n " + err.Message)
                    alert("vpListPago:eliminarPago \n " + err.Message);
                }
            });
        }
    }

    function eliminarPagos() {
        var idVenta = <?php echo $oModel->idVenta; ?>;
        var acepto = confirm(String.fromCharCode(191) + "Esta seguro que desea eliminar los pagos registrados?");

        if (acepto) {
            $("#popUpCargando").dialog("open");

            $.ajax({
                data: {
                    idVenta: idVenta
                },
                type: "POST",
                dataType: "json",
                url: "Ajax/Pago/ajaxEliminarPagos.php",
                //url: "../SerfelWeb/PagoREST/eliminarPagos",
                success: function(oJson) {
                    $("#popUpCargando").dialog("close");

                    $("#popUp").dialog({
                        autoOpen: false,
                        modal: true,
                        buttons: {
                            "Ok": function() {
                                $(this).dialog("close");
                            }
                        }
                    }).bind("dialogclose", function(event) {
                        $("#puPagos").dialog("close");
                        verPagos(idVenta);
                    });

                    $("#popUp").dialog({ title: "Eliminar Pagos" });
                    $("#popUpMsg").html(oJson.cMensaje);
                    $("#popUp").dialog("open");
                },
                error: function(xhr, status, error) {
                    $("#popUpCargando").dialog("close");

                    var err = JSON.parse(xhr.responseText);
                    console.log("vpListPago:eliminarPagos \n " + err.Message)
                    alert("vpListPago:eliminarPagos \n " + err.Message);
                }
            });
        }
    }
</script>

<h2>Pagos factura N° <?php echo $oModel->numFactura; ?></h2>
<form id="frmResumen" action="javascript:notaCredito();">
    <!--
    <input type="hidden" name="idVenta" value="< ?php echo $oModel->idVenta; ?>" />
    <input type="hidden" name="iTotalXPagar" value="< ?php echo $oModel->iTotalXPagar; ?>" />
    -->
    <h1>
        Total pagado: <?php echo FormatoUtil::formatoDinero($oModel->iTotalPagado); ?>
        <span style="margin-left: 10px;">
            Por pagar: <?php echo FormatoUtil::formatoDinero($oModel->iTotalXPagar); ?>
        </span>
        <span style="margin-left: 10px;">
            <input type="submit" id="btnNotaCredito" value="Nota Crédito" />
        </span>
    </h1>
</form>
<br />

<form id="frmIngPago" action="javascript:ingresarPago();" method="POST">
    <input type="hidden" name="idVenta" value="<?php echo $oModel->idVenta; ?>" />
    <h1>
        Monto <input type="number" id="nMonto" name="nMonto" style="width: 100px;" value="" />
        <span style="margin-left: 10px;">
            Forma Pago <?php echo $oHTMLFactory->generarSelect($oModel->listTipoDoctoSI, "cmbFormaPago", 7); ?>
        </span>
        <span style="margin-left: 10px;">
            Obs <input type="text" id="tObservaciones" name="tObservaciones" value="" />
        </span>
        <input type="submit" value="Agregar" id="btnAgregarPago" name="btnAgregarPago" style="width: 130px;" />
    </h1>
</form>

<table id="tablaPagos" cellpadding="0" cellspacing="0" border="0" class="display">
    <thead>
        <tr>
            <th>Fecha</th>
            <th>Monto</th>
            <th>Forma Pago</th>
            <th>Observaciones</th>
            <th>Eliminar</th>
        </tr>
    </thead>
    <tbody>
    <?php
        foreach($oModel->listPago as $oPago) {
                echo "<tr>";
                echo    "<td align='center'>" . $oPago->fecha . "</td>";
                echo    "<td align='right'>" . FormatoUtil::formatoDinero($oPago->monto) . "</td>";
                echo    "<td align='center'>" . $oPago->nom_forma_pago . "</td>";
                echo    "<td>" . $oPago->observaciones . "</td>";
                echo    "<td class='linkElim' align='center'>";
                echo        "<a class='linkElim' href='javascript:eliminarPago(" . $oPago->id_pago . ");'></a>";
                echo    "</td>";
                echo "</tr>";
        }
    ?>
    </tbody>
</table>
<br />
<input type="button" value="Eliminar Todas" id="btnEliminarPagos" name="btnEliminarPagos" />
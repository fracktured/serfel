$(document).ready(function() {
    iniPopUpError();
    iniPopUpExito();

    $("#btnPagarCompletas").button();
    $("#btnPagarCompletas").click(marcarPagadosCompletos);

    $("#tablaCobranzas").dataTable({
        "bJQueryUI": true,
        "sPaginationType": "full_numbers",
        "bLengthChange": true,
        "bFilter": true,
        "bSort": true,
        "bInfo": false,
        "bAutoWidth": false,
        "aLengthMenu": [[10, 25, 50, 100, 1000], [10, 25, 50, 100, 1000]],
        "oLanguage": {
            "sLengthMenu": "Mostrando _MENU_ resultados por página",
            "sZeroRecords": "No se han encontrado resultados",
            "sInfo": "Mostrando desde _START_ hasta _END_ de un total de _TOTAL_ registros",
            "sInfoEmpty": "Mostrando desde 0 hasta 0 de un total de 0 registros",
            "sInfoFiltered": "(Filtrado de un total de _MAX_ registros)",
            "sSearch": "Buscar"
        }
    });
});

function verPagos(idVenta) {
    $("#puPagos").load(
        "VistaParcial/Cobranzas/vpListPago.php", {
            idVenta: idVenta
        },
        function(response, status, xhr) {
            if (status == "error") {
                alert("cobranzas:verPagos \n " + xhr.status + " " + xhr.statusText);
            }
        }
    );
}

function seleccionarTodos() {
    $.each($("#tablaCobranzas").find("input"), function() {
        $("#" + this.id).attr("checked", "true");
    });

    $("#linkSeleccionar").text("Deseleccionar Todos");
    $("#linkSeleccionar").attr("href", "javascript:deseleccionarTodos()");
}

function deseleccionarTodos() {
    $.each($("#tablaCobranzas").find("input"), function() {
        $("#" + this.id).removeAttr("checked");
    });

    $("#linkSeleccionar").text("Seleccionar Todos");
    $("#linkSeleccionar").attr("href", "javascript:seleccionarTodos()");
}

function marcarPagadosCompletos() {
    var datos = [];
    var ventas = [];
    var i = 0;

    $.each($("#tablaCobranzas").find("input"), function() {
        if ($("#" + this.id).attr("checked")) {
            datos = this.id.split("-");

            ventas[i] = datos[1];
            i++;
        }
    });

    if (i == 0) {
        $("#popUpErrorMensaje").html("Debe seleccionar al menos una Venta de la lista.");
        $("#popUpError").dialog("open");
    } else {
        var acepto = confirm(String.fromCharCode(191) + "Esta seguro que desea pagar completas las " + i + " Ventas seleccionadas?");

        if (acepto) {
            $.ajax({
                data: {
                    ventas: ventas
                },
                type: "POST",
                dataType: "json",
                url: "Ajax/Pago/ajaxPagarCompletas.php",
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
                        location.reload();
                    });

                    $("#popUp").dialog({ title: "Pagar completas" });
                    $("#popUpMsg").html(oJson.cMensaje);
                    $("#popUp").dialog("open");
                },
                error: function(xhr, status, error) {
                    $("#popUpCargando").dialog("close");

                    var err = JSON.parse(xhr.responseText);
                    console.log("cobranzas:marcarPagadosCompletos \n " + err.Message);
                    alert("cobranzas:marcarPagadosCompletos \n " + err.Message);
                }
            });
        }
    }
}
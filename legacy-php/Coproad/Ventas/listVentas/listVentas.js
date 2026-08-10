$(document).ready(function() {
    iniPopUpError();
    iniPopUpExito();

    $("#txtFechaDesde").datepicker({
        changeMonth: true,
        changeYear: true,
        yearRange: '1980:2060',
        dateFormat: 'dd/mm/yy',
        onSelect: function() {
            $("#txtFechaHasta").datepicker("destroy");

            $("#txtFechaHasta").datepicker({
                changeMonth: true,
                changeYear: true,
                yearRange: '1980:2060',
                dateFormat: 'dd/mm/yy',
                minDate: $("#txtFechaDesde").val()
            });

            $("#txtFechaHasta").val("");
        }
    });

    $("#tablaVentas").dataTable({
        "bJQueryUI": true,
        "sPaginationType": "full_numbers",
        "bLengthChange": true,
        "bFilter": true,
        "bSort": true,
        "bInfo": false,
        "bAutoWidth": true,
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

    $("#popUpElim").dialog({
        bgiframe: true,
        resizable: false,
        autoOpen: false,
        modal: true,
        overlay: {
            backgroundColor: '#000',
            opacity: 0.5
        },
        buttons: {
            'Cancelar': function() {
                $(this).dialog('close');
                $("#idVentaAnul").val("");
            },
            'Anular Venta': function() {
                anularVentaBD($("#idVentaAnul").val());
                $(this).dialog('close');
            }
        }
    });
});

function anularVenta(idVenta) {
    $("#idVentaAnul").val(idVenta);

    $("#popUpElim").dialog("open");
}

function anularVentaBD(idVenta) {
    $.ajax({
        data: {
            idVenta: idVenta
        },
        type: "POST",
        dataType: "json",
        url: "Ajax/Venta/ajaxAnularVenta.php",
        success: function(json) {

            if (json.bReload) {
                $("#popUpExitoMensaje").html("La Venta ha sido anulada.");
                $("#popUpExito").dialog({
                    autoOpen: false,
                    modal: true,
                    buttons: {
                        "Ok": function() {
                            $(this).dialog('close');
                            $("#btnFiltrar").click();
                        }
                    }
                });
                $("#popUpExito").dialog("open");
            } else if (json.resultado == -1) {
                $("#popUpErrorMensaje").html("La Venta no puede ser anulada porque ya fue entregada.");
                $("#popUpError").dialog("open");
            }
            $("#idVentaAnul").val("");
        },
        error: function() { alert("Error desconocido"); }
    });
}

function recargarPagina() {
    //$("#formFiltros").submit();
    $('#btnFiltrar').trigger('click');
}

function verPDF(idVenta) {
    window.open("FacturaElectronica/verPDF.php?idVenta=" + idVenta);
}

function descargarPDF(idVenta) {
    window.open("FacturaElectronica/descargarPDF.php?idVenta=" + idVenta);
}

function crearFacturaElectronica(idVenta) {
    setTimeout(recargarPagina, 5000);
    window.open("FacturaElectronica/crearFacturaElectronica.php?idVenta=" + idVenta);
}

function crearYDescargarFacturaElectronica(idVenta) {
    setTimeout(recargarPagina, 5000);
    window.open("FacturaElectronica/crearYDescargarFacturaElectronica.php?idVenta=" + idVenta);
}

function concatenarPDFs() {
    var datos = [];
    var ventas = "";
    var i = 0;

    $.each($("#tablaVentas").find("input"), function() {
        if ($("#" + this.id).attr("checked")) {
            datos = this.id.split("-");

            ventas += datos[1] + "-";
        }
    });

    if (ventas == "") {
        $("#popUpErrorMensaje").html("Debe seleccionar al menos una Venta de la lista.");
        $("#popUpError").dialog("open");
    } else {
        $("#ventas").val(ventas);
        window.open('', 'VentanaDescarga');
        $("#formConcatenarPDFs").submit();
    }
}

function seleccionarTodos() {
    $("input[type=checkbox]").attr("checked", "true");

    $("#linkSeleccionar").text("Deseleccionar Todos");
    $("#linkSeleccionar").attr("href", "javascript:deseleccionarTodos()");
}

function deseleccionarTodos() {
    $("input[type=checkbox]").removeAttr("checked");

    $("#linkSeleccionar").text("Seleccionar Todos");
    $("#linkSeleccionar").attr("href", "javascript:seleccionarTodos()");
}
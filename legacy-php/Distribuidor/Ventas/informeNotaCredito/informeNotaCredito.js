/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 24-02-2012                                        *
 * Desc : Funciones de pagina de terminal de Ventas         *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("#genInforme").button();
    
    $("#fechaIni").datepicker({
        changeMonth: true,
        changeYear : true,
        yearRange  : '1980:2060',
        dateFormat : 'dd/mm/yy',
        onSelect   : function() {
            $("#fechaFin").datepicker("destroy");
            
            $("#fechaFin").datepicker({
                changeMonth: true,
                changeYear : true,
                yearRange  : '1980:2060',
                dateFormat : 'dd/mm/yy',
                minDate: $("#fechaIni").val()
            });
            
            $("#fechaFin").val("");
        }
    });
});

function vaciarFechaIni() {
    $("#fechaIni").val("");
}

function vaciarFechaFin() {
    $("#fechaFin").val("");
}

function genInformeNotaCredito() {
    window.open("Ventas/informeNotaCredito/obtInformeNotaCredito.php?fechaIni=" + convertirAFechaBD($("#fechaIni").val()) +
                                                                   "&fechaFin=" + convertirAFechaBD($("#fechaFin").val()));
    /*
    $.ajax({
        async   : true,
        type    : "POST",
        dataType: "json",
        url     : "Ventas/informeNotaCredito/obtInformeNotaCredito.php",
        data    : {
            fechaIni: convertirAFechaBD($("#fechaIni").val()),
            fechaFin: convertirAFechaBD($("#fechaFin").val())
        },
        success: function(json) {
            $("#detalleVenta").find("div").remove();
            $("#detalleVenta").find("br").remove();

            if(!json.autorizado) {
                $("#popUpErrorMensaje").html("Ud. no tiene permisos para este módulo.");
                $("#popUpError").dialog("open");
            } else {
                var tabla = "<br />" +
                            "<table id='tablaInformeNotaCredito' cellpadding='0' cellspacing='0' border='0' class='display'>" +
                                "<thead>" +
                                    "<tr>" +
                                        "<th>Rut Vendedor    </th>" +
                                        "<th>Nombre Vendedor</th>" +
                                        "<th>Cant Notas</th>" +
                                        "<th>Precio Total   </th>" +
                                    "</tr>" +
                                "</thead>" +
                                "<tbody>";

                $.each(json.informe, function() {
                    tabla += "<tr>" +
                                 "<td align='center'>" + this.rut_completo + "</td>" +
                                 "<td>" + this.nom_usuario  + "</td>" +
                                 "<td align='center'>" + this.cant_notas  + "</td>" +
                                 "<td align='center'>" + formatoDinero(this.precio_total) + "</td>" +
                             "</tr>";
                });

                tabla +=    "</tbody>" +
                        "</table>" +
                        "<br />";

                $("#detalleVenta").append(tabla);

                $("#tablaInformeNotaCredito").dataTable({
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
        },
        error: function() {alert("Error desconocido");}
    });
    */
}
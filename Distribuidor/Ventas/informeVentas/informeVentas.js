/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 24-02-2012                                        *
 * Desc : Funciones de pagina de terminal de Ventas         *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("#genInformeVenta").button();
    
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

function genInformeVentas() {
    windows.open("Ventas/informeVentas/obtInformeVenta.php?fechaIni=" + convertirAFechaBD($("#fechaIni").val()) + 
                                                         "&fechaFin=" + convertirAFechaBD($("#fechaFin").val()));
    /*
    $.ajax({
        async   : true,
        type    : "POST",
        dataType: "json",
        url     : "Ventas/informeVentas/obtInformeVenta.php",
        data    : {
            //idFormaPago  : $("#cmbFormaPago").val(),
            //idTipoCliente: $("#cmbTipoCliente").val(),
            fechaIni     : convertirAFechaBD($("#fechaIni").val()),
            fechaFin     : convertirAFechaBD($("#fechaFin").val())
        },
        success: function(json) {
            $("#detalleVenta").find("table").remove();

            if(!json.autorizado) {
                $("#popUpErrorMensaje").html("Ud. no tiene permisos para este módulo.");
                $("#popUpError").dialog("open");
            } else if(json.suma_total == "") {
                $("#popUpErrorMensaje").html("No existen Ventas para esos parametros.");
                $("#popUpError").dialog("open");
            }
        },
        error: function() {alert("Error desconocido");}
    });
    */
}
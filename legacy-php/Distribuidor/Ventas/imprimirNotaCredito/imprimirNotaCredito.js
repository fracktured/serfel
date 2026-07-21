/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 24-02-2012                                        *
 * Desc : Funciones de pagina de terminal de Ventas         *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("#datosVenta").hide();
    $("#filaTotales").hide();
    
    $("button").button();
    
    $("#numNotaCredito").numeric();
    
    $("#popUpAdvertencia").dialog({
        autoOpen: false,
        modal   : true,
        buttons : {
            'Ok': function() { 
                $(this).dialog('close');
            }
        }
    });
    
    $("#popUpExito").dialog({
        autoOpen: false,
        modal   : true,
        buttons : {
            "Ver Nota de Crédito": function() { 
                //document.location.href = "Reporte/hola.pdf";
                document.location = "Ventas/Reportes/generarNotaCredito.php?numNotaCredito=" + $("#numNotaCredito").val() + "&rutEmpresa=" + $("#rutEmpresa").val();
            },
            "Ok" : function() { 
                document.location.href = "SisDist.php?act=terminalNotaCredito";
            }
        },
        close   : function() { //document.location = "Ventas/Globales/generarFactura.php?numFactura=" + $("#numFactura").val(); 
            
        }
    });
    
    $("#idProducto").focus();
});

function generarFactura() {
    if($("#numNotaCredito").val() == "") {
        $("#popUpErrorMensaje").html("Debe ingresar un Número de Nota de Crédito para continuar.");
        $("#popUpError").dialog("open");
    } else {
        var numNotaCredito = parseInt($("#numNotaCredito").val());
        $("#numNotaCredito").val(numNotaCredito);
        
        $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            url     : "Ventas/Globales/obtInfoNotaCredito.php",
            data    : {
                rutEmpresa: $("#cmbEmpresa").val(),
                numNotaCredito: numNotaCredito
            },
            success: function(json) {
                if(json.resultado == 1) {
                    document.location = "Ventas/Reportes/generarNotaCredito.php?numNotaCredito=" + numNotaCredito + "&rutEmpresa=" + $("#cmbEmpresa").val();
                } else if(json.resultado == 0) {
                    $("#popUpErrorMensaje").html("No se encuentra Nota de Crédito registrada para esa Empresa y ese Número de Nota.");
                    $("#popUpError").dialog("open");
                }
            },
            error: function() {alert("Error desconocido");}
        });
    }
}
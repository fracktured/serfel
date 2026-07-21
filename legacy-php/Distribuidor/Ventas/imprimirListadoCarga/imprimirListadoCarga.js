/*************************************************/
/* Autor: ccastro                                */
/* Fecha: 12/08/2010                             */
/*************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("button").button();
});

function imprimirListadoCarga() {
    var datos;
    var rutas = "";
    var i = 0;
    $.each($("#divImprimirRutario").find("input"), function() {
        if($("#" + this.id).attr("checked")) {
            datos = this.id.split("-");
                    
            rutas += datos[1] + "-";
            i++;
        }
    });
        
    if(i == 0) {
        $("#popUpErrorMensaje").html("Debe escoger una Ruta al menos.");
        $("#popUpError").dialog("open");
    } else {
        location.href = "Ventas/Reportes/generarListadoCarga.php?rutas=" + rutas + "&i=" + i;
    }
}
/*************************************************/
/* Autor: ccastro                                */
/* Fecha: 12/08/2010                             */
/*************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("button").button();
    $("#imprimirListadoCarga").button();
    $("#imprimirListadoCarga").click(imprimirListadoCarga);
});

function imprimirRutario() {
    location.href = "Ventas/Reportes/generarRutario.php?idRuta=" + $("#cmbListaRutas").val();
}

function imprimirListadoCarga() {
    location.href = "Ventas/Reportes/generarListadoCarga.php?idRuta=" + $("#cmbListaRutas").val();
}
function imprimirCobranzas() {
    window.open("Reportes/Cobranzas/informeCobranza.php"
        + "?idRuta=" + $("#cmbRuta").val() 
        + "&idEstadoPago=" + $("#cmbEstadoPago").val()
        + "&rutCliente=" + $("#rut").val()
        + "&nombre=" + $("#nombre").val()
        + "&fechaDesde=" + $("#fechaDesde").val()
        + "&fechaHasta=" + $("#fechaHasta").val()
    );
}
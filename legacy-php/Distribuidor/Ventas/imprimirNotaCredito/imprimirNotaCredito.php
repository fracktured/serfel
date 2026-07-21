<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");
include("Clases/Venta.php");

    $lista = new Lista();
    $listaEmpresa = $lista->getListaEmpresas();
    
?>

<div id="terminalVentas">
    <form action="javascript:generarFactura()">
        <input type="hidden" id="idVenta" value="" />
        <input type="hidden" id="rutEmpresa" value="" />
        
        <h1>
            <div id="datosFactura">
                Seleccione Empresa:
                <select id="cmbEmpresa">
                <?php
                    foreach($listaEmpresa as $empresa) {
                        echo "<option value='" . $empresa->getRutEmpresa() . "'>" . $empresa->getRazonSocial() . "</option>";
                    }
                ?>
                </select>
                <br />

                Ingrese N° de Nota Crédito
                <input type="text" id="numNotaCredito" value="" />
                <button id="aceptarNumFactura">Aceptar</button>
            </div>
        </h1>
    </form>
    <br />
</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<div id="popUpAdvertencia" title="Advertencia">
    <p id="popUpAdvertenciaMensaje" class="popUp"></p>
</div>

<?php include("popUps/popUpError.php"); ?>
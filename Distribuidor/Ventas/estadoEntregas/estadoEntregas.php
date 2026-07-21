<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");

    $lista = new Lista();
    $listaRutas = $lista->getListaNomRutas("");
?>

<div id="divEstadoEntregas">
    <form action="javascript:desplegarEstadoEntregas()">
        <input type="hidden" id="idRuta" value="" />
        <input type="hidden" id="entregado" value="" />
        
        <h1>Seleccione una Ruta:
            <select id="cmbListaRutas" name="cmbListaBodegas">
            <?php
                foreach($listaRutas as $ruta) {
                    echo "<option value='" . $ruta->getIdRuta() . "'>" . $ruta->getNomRuta() . "</option>";
                }
            ?>
            </select>
            <select id="cmbEstadoEntrega">
                <option value="0">No Entregados</option>
                <option value="1">Entregados</option>
            </select>
            <button id="desplegarEstadoEntregas">Desplegar Estado Entregas</button></h1>
    </form>
    <br />
</div>

<div id="detalleEstadoEntregas">
    
</div>

<?php include("popUps/popUpError.php"); ?>
<?php include("popUps/popUpExito.php"); ?>
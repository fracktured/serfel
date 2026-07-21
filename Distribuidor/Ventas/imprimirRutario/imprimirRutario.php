<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");

    $lista = new Lista();
    $listaRutas = $lista->getListaNomRutas("");
?>

<div id="divImprimirRutario">
    <form action="javascript:imprimirRutario()">
        <h1>Seleccione una Ruta:
            <select id="cmbListaRutas" name="cmbListaBodegas">
            <?php
                foreach($listaRutas as $ruta) {
                    echo "<option value='" . $ruta->getIdRuta() . "'>" . $ruta->getNomRuta() . "</option>";
                }
            ?>
            </select>
            <button id="imprimirRutario">Imprimir Rutario</button></h1>
    </form>
    <br />
</div>

<?php include("popUps/popUpError.php"); ?>
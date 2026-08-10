<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");

    $lista = new Lista();
    $listaRutas = $lista->getListaNomRutas("");
?>

<div id="divImprimirRutario">
    <form action="javascript:imprimirListadoCarga()">
        <h1>Seleccione las Rutas a generar:
            <br /><br />
            
            <?php
                foreach($listaRutas as $ruta) {
                    echo "<input type='checkbox' id='check-" . $ruta->getIdRuta() . "' /> " . $ruta->getNomRuta();
                    echo "<br />";
                }
            ?>
            
            <button id="imprimirListadoCarga">Imprimir Listado de Carga</button></h1>
    </form>
    <br />
</div>

<?php include("popUps/popUpError.php"); ?>
<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");

    $lista = new Lista();
    $listaBod = $lista->getListaBodega("");
    $numBodegas = $lista->getTotalRegistros();
?>

<div id="listaExistencias">
    <form action="javascript:desplegarExistencias()">
        <h1>Seleccione una Bodega a mostrar:
            <select id="cmbListaBodegas" name="cmbListaBodegas">
                <?php
                    $i = 0;
                    while($i <= $numBodegas) {
                        echo "<option value='" . $listaBod[$i]->getIdBodega() . "'>" . $listaBod[$i]->getNomBodega() . "</option>";
                        $i++;
                    }
                ?>
            </select>
            <input type="checkbox" id="stockCritico" style="width: 20px" />Stock Crítico&nbsp;&nbsp;&nbsp;
            <button id="despExistencias">Desplegar Existencias</button></h1>
    </form>
    <br />

    <div id="detalleExistencias">
        
    </div>
</div>

<?php include("popUps/popUpError.php"); ?>
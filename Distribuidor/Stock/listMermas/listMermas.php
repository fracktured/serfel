<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");

    $lista = new Lista();
    
    $listaBod = $lista->getListaBodega("");
    $numBodegas = $lista->getTotalRegistros();
?>

<div id="listaMermas">
    <form action="javascript:despMermas()">
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
            <button id="despMermas">Desplegar Mermas</button></h1>
    </form>
    <br />

    <div id="detalleMermas">
        
    </div>
</div>

<div id="popUpElim" title="Eliminar esta Merma">
    <input type="hidden" id="idProdElim" value="" />
    <input type="hidden" id="idBodElim" value="" />
    <input type="hidden" id="fechaElim" value="" />
    
    <p id="popUpElimMensaje" class="popUp">
        ¿Está seguro que desea eliminar esta Merma?
    </p>
</div>

<div id="popUpIngMod" title="Ingreso de Mermas">
    <input type="hidden" id="idBodegaMod" value="" />
    <input type="hidden" id="idProductoMod" value="" />

    <table width="100%">
        <tr>
            <td>Nombre Bodega</td>
            <td>:</td>
            <td><b><span id="spanNomBodegaMod"></span></b></td>
        </tr>
        <tr>
            <td>Nombre Producto</td>
            <td>:</td>
            <td><b><span id="spanNomProductoMod"></span></b></td>
        </tr>
        <tr>
            <td>Cantidad</td>
            <td>:</td>
            <td><input type="text" size="15" id="cantidad" name="cantidad" value="" /></td>
        </tr>
        <tr>
            <td>Motivo</td>
            <td>:</td>
            <td><input type="text" size="15" id="motivo" name="motivo" /></td>
        </tr>
    </table>
</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<?php include("popUps/popUpError.php"); ?>
<?php include("popUps/popUpBuscarProducto.php"); ?>
<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");

    $lista = new Lista();
    $listaBod = $lista->getListaBodega("");
    $numBodegas = $lista->getTotalRegistros();
?>

<div id="listaNivelStock">
    <form action="javascript:despNivelStock()">
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
            <button id="despNivelStock">Desplegar Lista de Niveles</button></h1>
    </form>
    <br />

    <div id="detalleNivelStock">
        
    </div>
</div>

<div id="popUpElim" title="Eliminar esta Definición">
    <input type="hidden" id="idProdElim" value="" />
    <input type="hidden" id="idBodElim" value="" />
    
    <p id="popUpElimMensaje" class="popUp">
        ¿Está seguro que desea eliminar esta Alerta de Stock?
        <div class="advertencia">
            <b>Advertencia: De hacerlo ya no podrá ver las alertas en la consulta de Stock.</b>
        </div>
    </p>
</div>

<div id="popUpIngMod" title="Ingreso de Niveles de Productos">
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
            <td>Mínimo</td>
            <td>:</td>
            <td><input type="text" size="15" id="minimo" name="minimo" value="" /></td>
        </tr>
        <tr>
            <td>Punto de Orden</td>
            <td>:</td>
            <td><input type="text" size="15" id="puntoOrden" name="puntoOrden" /></td>
        </tr>
        <tr>
            <td>Meses Antes de Vencer</td>
            <td>:</td>
            <td><input type="text" size="15" id="meses" name="meses" /></td>
        </tr>
    </table>
</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<?php include("popUps/popUpError.php"); ?>
<?php include("popUps/popUpBuscarProducto.php"); ?>
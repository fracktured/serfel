<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");

$lista = new Lista();
$listaTipoProd = $lista->getListaTipoProducto("", 0, 0);

$listaPadre = new Lista();
$listaTipoProdPadre = $listaPadre->getListaTipoProducto("", 0, 1);
?>

<div id="listProductos" class="">

    <button id="ingTipoProducto">Ingresar Nuevo Tipo Producto</button>
    <br /><br />

    <table id="tablaProductos" cellpadding="0" cellspacing="0" border="0" class="display">
        <thead>
            <tr>
                <th>Nombre</th>
                <th>Descripcion</th>
                <th>Familia</th>
                <th>M</th>
                <th>E</th>
            </tr>
        </thead>
        <tbody>
            <?php
            $i = 0;
            while ($i <= $lista->getTotalRegistros()) {
                echo "<tr>
                          <input type='hidden' id='" . $listaTipoProd[$i]->getId_tipo_producto() . "-TipProd'
                                               value='" . $listaTipoProd[$i]->getNom_tipo_producto() . "'>
                          <td>" . $listaTipoProd[$i]->getNom_tipo_producto() . "</td>
                          <td>" . $listaTipoProd[$i]->getDesc_tipo_producto() . "</td>
                          <td>" . $listaTipoProd[$i]->getNombreFamilia(). "</td>
                          <td class='linkMod'>
                              <a class='linkMod' href='javascript:modTipoProducto(" . $listaTipoProd[$i]->getId_tipo_producto() . ")'
                                                 title='Modificar'></a></td>
                          <td class='linkElim'>
                              <a class='linkElim' href='javascript:elimProducto(" . $listaTipoProd[$i]->getId_tipo_producto() . ")'
                                                  title='Eliminar'></a></td>
                      </tr>";
                $i++;
            }
            ?>
        </tbody>
    </table>
</div>

<div id="popUpElim" title="Eliminación de Tipo Producto">
    <input type="hidden" id="idTipoProductoElim" value="" />

    <p id="popUpElimMensaje" class="popUp">
        ¿Está seguro que desea eliminar a <b><span id="nomProductoElim"></span></b>?
    <div class="advertencia">
        <b>Advertencia: Elininar Tipo Producto.</b>
    </div>
</div>

<div id="popUpIngMod" title="Ingreso Tipo Producto">
    <input type="hidden" id="idTipoProducto" value="" />

    <table width="100%">
        <tr>
            <td>Nombre</td>
            <td>:</td>
            <td><span id="spanNombre"></span><input type="text" id="nombre"  name="nombre" maxlength="50" /></td>
        </tr>
        <tr>
            <td>Descripcion</td>
            <td>:</td>
            <td colspan="5"><input type="text" class="inputLargo" id="descripcion" name="descripcion" maxlength="50" /></td>
        </tr>
        <tr>
            <td>Familia</td>
            <td>:</td>
            <td colspan="5">
                <select id="nivel1" name="cmbNivel1">
                     <option value='0'>Sin Familia</option>
                    <?php
                    $i = 0;
                    while ($i <= $listaPadre->getTotalRegistros()) {
                        echo "                         
                         <option value='".$listaTipoProdPadre[$i]->getId_tipo_producto()."'>".$listaTipoProdPadre[$i]->getNom_tipo_producto()."</option>";
                        $i++;
                    }
                    ?>
                </select>
            </td>
        </tr>
    </table>
</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<?php include("popUps/popUpError.php"); ?>
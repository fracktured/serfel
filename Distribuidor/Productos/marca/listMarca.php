<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");

$lista = new Lista();
$listaMarca = $lista->getListaMarca("");
?>

<div id="listProductos" class="">

    <button id="ingMarca">Ingresar Nueva Marca</button>
    <br /><br />

    <table id="tablaMarca" cellpadding="0" cellspacing="0" border="0" class="display">
        <thead>
            <tr>
                <th>Nombre</th>
                <th>Descripcion</th>
                <th>M</th>
                <th>E</th>
            </tr>
        </thead>
        <tbody>
            <?php
            $i = 0;
            while ($i <= $lista->getTotalRegistros()) {
                echo "<tr>
                          <input type='hidden' id='" . $listaMarca[$i]->getId_marca() . "-Marca'
                                               value='" . $listaMarca[$i]->getNom_marca() . "'>
                          <td>" . $listaMarca[$i]->getNom_marca() . "</td>
                          <td>" . $listaMarca[$i]->getDesc_marca() . "</td>
                          <td class='linkMod'>
                              <a class='linkMod' href='javascript:modMarca(" . $listaMarca[$i]->getId_marca() . ")'
                                                 title='Modificar'></a></td>
                          <td class='linkElim'>
                              <a class='linkElim' href='javascript:elimMarca(" . $listaMarca[$i]->getId_marca() . ")'
                                                  title='Eliminar'></a></td>
                      </tr>";
                $i++;
            }
            ?>
        </tbody>
    </table>
</div>

<div id="popUpElim" title="Eliminación de Unidad Medida">
    <input type="hidden" id="idMarcaElim" value="" />

    <p id="popUpElimMensaje" class="popUp">
        ¿Está seguro que desea eliminar a <b><span id="nomMarcaElim"></span></b>?
    <div class="advertencia">
        <b>Advertencia: Elininar Unidad Medida.</b>
    </div>
</div>

<div id="popUpIngMod" title="Ingreso Unidad Medida">
    <input type="hidden" id="idMarca" value="" />

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
    </table>
</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<?php include("popUps/popUpError.php"); ?>
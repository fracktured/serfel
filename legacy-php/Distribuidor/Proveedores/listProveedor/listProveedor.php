<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");

    $lista = new Lista();
    $listaProv = $lista->getListaProveedores();
?>

<div id="listProveedores" class="">
    
    <button id="ingProveedor">Ingresar Nuevo Proveedor</button>
    <br /><br />
    
    <table id="tablaProveedor" cellpadding="0" cellspacing="0" border="0" class="display">
        <thead>
            <tr>
                <th>Rut</th>
                <th>Razon Social</th>
                <th>Nombre Fantasía</th>
                <th>Dirección</th>
                <th>M</th>
                <th>E</th>
            </tr>
        </thead>
        <tbody>
        <?php
            $i = 0;
            while($i <= $lista->getTotalRegistros()) {
                echo "<tr>
                          <input type='hidden' id='" . $listaProv[$i]->getRutProveedor() . "-RazSoc' 
                                               value='" . $listaProv[$i]->getRazonSocial() ."'>
                          <td>" . $listaProv[$i]->getRutCompleto()        . "</td>
                          <td>" . $listaProv[$i]->getRazonSocial()        . "</td>
                          <td>" . $listaProv[$i]->getNomFantasia()        . "</td>
                          <td>" . $listaProv[$i]->getDireccionProveedor() . "</td>
                          <td class='linkMod'>
                              <a class='linkMod' href='javascript:modProveedor(" . $listaProv[$i]->getRutProveedor() . ")' 
                                                 title='Modificar'></a></td>
                          <td class='linkElim'>
                              <a class='linkElim' href='javascript:elimProveedor(" . $listaProv[$i]->getRutProveedor() . ")' 
                                                  title='Eliminar'></a></td>
                      </tr>";
                $i++;
            }
        ?>
        </tbody>
    </table>
</div>

<div id="popUpElim" title="Eliminación de Proveedor">
    <input type="hidden" id="rutProvElim" value="" />
    
    <p id="popUpElimMensaje" class="popUp">
        ¿Está seguro que desea eliminar a <b><span id="nomProveedorElim"></span></b>?
        <div class="advertencia">
            <b>Advertencia: De hacerlo ya no podrá realizar más recepciones a nombre de este Proveedor.</b>
        </div>
    </p>
</div>

<div id="popUpIngMod" title="Ingreso de Proveedores">
    <input type="hidden" id="rutProvIngMod" value="" />

    <table width="100%">
        <tr>
            <td>Rut</td>
            <td>:</td>
            <td><span id="spanRutProv"></span><input type="text" id="rut" name="rut" maxlength="50" /></td>
        </tr>
        <tr>
            <td>Razon Social</td>
            <td>:</td>
            <td colspan="5"><input type="text" class="inputLargo" id="razonSocial" name="razonSocial" maxlength="50" /></td>
        </tr>
        <tr>
            <td>Nombre Fantasía</td>
            <td>:</td>
            <td colspan="5"><input type="text" class="inputLargo" id="nomFantasia" name="nomFantasia" maxlength="50" /></td>
        </tr>
        <tr>
            <td>Dirección</td>
            <td>:</td>
            <td colspan="5"><input type="text" class="inputLargo" id="direProv" name="direProv" maxlength="200" /></td>
        </tr>
        <tr>
            <td>Giro</td>
            <td>:</td>
            <td><input type="text" id="giroProv" name="giroProv" maxlength="100" /></td>
        </tr>
        <tr>
            <td>Telefono (1)</td>
            <td>:</td>
            <td><input type="text" id="fono1" name="fono1" maxlength="15" /></td>
            <td class="espacioBlancoHorizontal"></td>
            <td>Telefono (2)</td>
            <td>:</td>
            <td><input type="text" id="fono2" name="fono2" maxlength="15" /></td>
        </tr>
        <tr>
            <td>Email</td>
            <td>:</td>
            <td colspan="5"><input type="text" class="inputLargo" id="emailProv" name="emailProv" maxlength="50" /></td>
        </tr>
        <tr>
            <td>Condición de Pago</td>
            <td>:</td>
            <td><input type="text" id="condPago" name="condPago" maxlength="50" /></td>
            <td></td>
            <td>Glosa Pago</td>
            <td>:</td>
            <td><input type="text" id="glosaPago" name="glosaPago" maxlength="50" /></td>
        </tr>
        <tr>
            <td>Vendedor</td>
            <td>:</td>
            <td colspan="5"><input type="text" class="inputLargo" id="nomVendedor" name="nomVendedor" maxlength="200" /></td>
        </tr>
        <tr>
            <td>Telefono Vendedor</td>
            <td>:</td>
            <td><input type="text" id="fonoVendedor" name="fonoVendedor" maxlength="15" /></td>
            <td></td>
            <td>Email Vendedor</td>
            <td>:</td>
            <td><input type="text" id="emailVendedor" name="emailVendedor" maxlength="50" /></td>
        </tr>
        <tr>
            <td>Observaciones</td>
            <td>:</td>
            <td colspan="5"><input type="text" class="inputLargo" id="observaciones" name="observaciones" maxlength="200" /></td>
        </tr>
    </table>
</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<?php include("popUps/popUpError.php"); ?>
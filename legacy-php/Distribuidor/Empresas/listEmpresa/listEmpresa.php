<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");

    $lista = new Lista();
    $listaEmp = $lista->getListaEmpresas();
?>

<div id="listEmpresas" class="">
    
    <button id="ingEmpresa">Ingresar Nueva Empresa</button>
    <br /><br />
    
    <table id="tablaEmpresas" cellpadding="0" cellspacing="0" border="0" class="display">
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
                          <input type='hidden' id='" . $listaEmp[$i]->getRutEmpresa() . "-RazSoc' 
                                               value='" . $listaEmp[$i]->getRazonSocial() ."'>
                          <td>" . $listaEmp[$i]->getRutCompleto()      . "</td>
                          <td>" . $listaEmp[$i]->getRazonSocial()      . "</td>
                          <td>" . $listaEmp[$i]->getNomFantasia()      . "</td>
                          <td>" . $listaEmp[$i]->getDireccionEmpresa() . "</td>
                          <td class='linkMod'>
                              <a class='linkMod' href='javascript:modEmpresa(" . $listaEmp[$i]->getRutEmpresa() . ")' 
                                                 title='Modificar'></a></td>
                          <td class='linkElim'>
                              <a class='linkElim' href='javascript:elimEmpresa(" . $listaEmp[$i]->getRutEmpresa() . ")' 
                                                  title='Eliminar'></a></td>
                      </tr>";
                $i++;
            }
        ?>
        </tbody>
    </table>
</div>

<div id="popUpElim" title="Eliminación de Empresas">
    <input type="hidden" id="rutEmpElim" value="" />
    
    <p id="popUpElimMensaje" class="popUp">
        ¿Está seguro que desea eliminar a <b><span id="nomEmpresaElim"></span></b>?
        <div class="advertencia">
            <b>Advertencia: De hacerlo ya no podrá emitir más facturas a nombre de esta Empresa.</b>
        </div>
    </p>
</div>

<div id="popUpIngMod" title="Ingreso de Empresas">
    <input type="hidden" id="rutEmpIngMod" value="" />

    <table width="100%">
        <tr>
            <td>Rut</td>
            <td>:</td>
            <td><span id="spanRutEmp"></span><input type="text" id="rut" name="rut" maxlength="50" /></td>
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
            <td colspan="5"><input type="text" class="inputLargo" id="direEmp" name="direEmp" maxlength="200" /></td>
        </tr>
    </table>
</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<?php include("popUps/popUpError.php"); ?>
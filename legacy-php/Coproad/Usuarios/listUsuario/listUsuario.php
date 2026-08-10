<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");

    $lista = new Lista();
    $listaUsu = $lista->getListaUsuarios();
?>

<div id="listUsuarios" class="">
    
    <button id="ingUsuario">Ingresar Nuevo Usuario</button>
    <br /><br />
    
    <table id="tablaUsuarios" cellpadding="0" cellspacing="0" border="0" class="display">
        <thead>
            <tr>
                <th>Rut</th>
                <th>Ap. Paterno</th>
                <th>Ap. Materno</th>
                <th>Nombres</th>
                <th>Telefono</th>
                <th>Email</th>
                <th>Tipo Usuario</th>
                <th>Fecha Ult. Act. Productos</th>
                <th>M</th>
                <th>E</th>
            </tr>
        </thead>
        <tbody>
        <?php
            $i = 0;
            while($i <= $lista->getTotalRegistros()) {
                echo "<tr>
                          <input type='hidden' id='" . $listaUsu[$i]->getIdUsuario() . "-NomCom' 
                                               value='" . $listaUsu[$i]->getNomCompleto() ."'>
                          <td>" . $listaUsu[$i]->getRutCompleto()                    . "</td>
                          <td>" . $listaUsu[$i]->getApellPatUsuario()                . "</td>
                          <td>" . $listaUsu[$i]->getApellMatUsuario()                . "</td>
                          <td>" . $listaUsu[$i]->getNomUsuario()                     . "</td>
                          <td align='center'>" . $listaUsu[$i]->getTelefonoUsuario() . "</td>
                          <td>" . $listaUsu[$i]->getEmailUsuario()                   . "</td>
                          <td align='center'>" . $listaUsu[$i]->getNomTipoUsuario()  . "</td>
                          <td align='center'>" . $listaUsu[$i]->getFechaActProductos()  . "</td>
                          <td class='linkMod' >
                              <a class='linkMod' href='javascript:modUsuario("  . $listaUsu[$i]->getIdUsuario() . ")' 
                                                 title='Modificar'></a></td>
                          <td class='linkElim'>
                              <a class='linkElim' href='javascript:elimUsuario(" . $listaUsu[$i]->getIdUsuario() . ")' 
                                                  title='Eliminar'></a></td>
                      </tr>";
                $i++;
            }
        ?>
        </tbody>
    </table>
</div>

<div id="popUpElim" title="Eliminacion de Usuarios">
    <input type="hidden" id="idUsuarioElim" value="" />
    
    <p id="popUpElimMensaje" class="popUp">
        ¿Está seguro que desea eliminar a <span id="nomUsuarioElim"></span>?
    </p>
</div>

<div id="popUpMod" title="Modificacion de Usuarios">
    <input type="hidden" id="idUsuarioMod" value="" />

    <table width="100%">
        <tr>
            <td>N° Usuario</td>
            <td>:</td>
            <td><input type="text" id="numero" name="numero" maxlength="2" /></td>
        </tr>
        <tr>
            <td>Rut</td>
            <td>:</td>
            <td><span id="rutUsu"></span></td>
            <td class="espacioBlancoHorizontal"></td>
            <td>Tipo Usuario</td>
            <td>:</td>
            <td><select class="inputLargo" id="cmbTipoUsu" name="cmbTipoUsu">
                    <option value="1">Administrador</option>
                    <option value="2">Vendedor</option>
                </select></td>
        </tr>
        <tr>
            <td>Apellido Paterno</td>
            <td>:</td>
            <td><input type="text" id="paterno" name="paterno" maxlength="30" /></td>
            <td></td>
            <td>Apellido Materno</td>
            <td>:</td>
            <td><input type="text" class="inputLargo" id="materno" name="materno" maxlength="30" /></td>
        </tr>
        <tr>
            <td>Nombres</td>
            <td>:</td>
            <td><input type="text" id="nombres" name="nombres" maxlength="50" /></td>
        </tr>
        <tr>
            <td>Telefono</td>
            <td>:</td>
            <td><input type="text" id="fonoUsu" name="fonoUsu" maxlength="15" /></td>
            <td></td>
            <td>Email</td>
            <td>:</td>
            <td><input type="text" class="inputLargo" id="emailUsu" name="emailUsu" maxlength="50" /></td>
        </tr>
        <tr>
            <td>Dirección</td>
            <td>:</td>
            <td colspan="5"><input type="text" class="inputLargo" id="direUsu" name="direUsu" maxlength="200" /></td>
        </tr>
        <tr>
            <td>Contraseña</td>
            <td>:</td>
            <td><input type="password" id="passwordUsu" name="passwordUsu" maxlength="50" /></td>
            <td colspan="4">*Dejar vacio para no modificar</td>
        </tr>
        <tr>
            <td>Reingresar Contraseña</td>
            <td>:</td>
            <td><input type="password" id="rePasswordUsu" name="rePasswordUsu" maxlength="50" /></td>
        </tr>
    </table>
</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<?php include("popUps/popUpError.php"); ?>
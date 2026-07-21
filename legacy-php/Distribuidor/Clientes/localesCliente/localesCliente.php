<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");
include("Clases/Cliente.php");
include("Clases/LocalCliente.php");

    if(isset($_GET["rutCliente"])) $cliente = new Cliente($_GET["rutCliente"]);
    else $cliente = new Cliente();

    $lista = new Lista();
    $listaTipoPago = $lista->getListaTipoPago("");
    $numTiposPago = $lista->getTotalRegistros();
    
    $listaVendedores = $lista->getListaVendedores();
    $numVendedores   = $lista->getTotalRegistros();
?>

<div id="listLocalCliente" class="">
    <input type="hidden" id="rutCliente" value="<?php echo $cliente->getRutCliente() ?>" />
    
    <h2><?php echo $cliente->getRutCompleto(). " " . $cliente->getNomFantasia() ?></h2>
    
    <button id="ingLocalCliente">Ingresar Nuevo Local de Cliente</button>
    <br /><br />
    
    <table id="tablaLocalClientes" cellpadding="0" cellspacing="0" border="0" class="display">
        <thead>
            <tr>
                <th>Nº</th>
                <th>Nombre Local</th>
                <th>Telefono</th>
                <!--<th>Email</th>-->
                <th>Contacto</th>
                <th>Fono Contacto</th>
                <th>Giro</th>
                <th>Vendedor</th>
                <!--<th>Email Contacto</th>-->
                <th>M</th>
                <th>E</th>
            </tr>
        </thead>
        <tbody>
        <?php
            $locales = $cliente->getLocales();
            
            $i = 0;
            while($i <= $cliente->getTotalLocales() && $cliente->getTotalLocales() > -1) {
                $vendedor = new Usuario($locales[$i]->getIdVendedor());
                echo "<tr>
                          <input type='hidden' id='" . $locales[$i]->getIdLocalCliente() . "-NomLoc' 
                                               value='" . $locales[$i]->getNomLocalCliente() ."'>
                          <td>" . $locales[$i]->getIdLocalCliente()                      . "</td>
                          <td>" . $locales[$i]->getNomLocalCliente()                     . "</td>
                          <td align='center'>" . $locales[$i]->getTelefonoLocalCliente() . "</td>" .
                          //<td align='center'>" . $locales[$i]->getEmailLocalCliente()    . "</td>
                         "<td>" . $locales[$i]->getNomCompletoContacto()                 . "</td>
                          <td align='center'>" . $locales[$i]->getTelefonoContacto()     . "</td>
                          <td align='center'>" . $locales[$i]->getGiro()                 . "</td>
                          <td align='center'>" . $vendedor->getNomCompleto()             . "</td>" .
                          //<td align='center'>" . $locales[$i]->getEmailContacto()        . "</td>
                         "<td class='linkMod'>
                              <a class='linkMod' href='javascript:modLocalCliente(" . $locales[$i]->getIdLocalCliente() . ")' 
                                                 title='Modificar'></a></td>
                          <td class='linkElim'>
                              <a class='linkElim' href='javascript:elimLocalCliente(" . $locales[$i]->getIdLocalCliente() . ")' 
                                                  title='Eliminar'></a></td>
                      </tr>";
                $i++;
            }
        ?>
        </tbody>
    </table>
</div>

<div id="popUpElim" title="Eliminación de Local de Cliente">
    <input type="hidden" id="idLocalClienteElim" value="" />
    
    <p id="popUpElimMensaje" class="popUp">
        ¿Está seguro que desea eliminar a <b><span id="nomLocalClienteElim"></span></b>?
        <div class="advertencia">
            <b>Advertencia: De hacerlo se quitara este local de las rutas de los Vendedores.</b>
        </div>
    </p>
</div>

<div id="popUpIngMod" title="Ingreso de Locales de Cliente">
    <input type="hidden" id="idLocalClienteIngMod" value="" />

    <table width="100%">
        <tr>
            <td>Nombre Local</td>
            <td>:</td>
            <td colspan="5"><input type="text" class="inputLargo" id="nomLocalCliente" name="nomLocalCliente" maxlength="200" /></td>
        </tr>
        <tr>
            <td>Dirección</td>
            <td>:</td>
            <td colspan="5"><input type="text" class="inputLargo" id="direLocalClie" name="direLocalClie" maxlength="200" /></td>
        </tr>
        <tr>
            <td>Telefono Local</td>
            <td>:</td>
            <td><input type="text" id="fonoLocalClie" name="fonoLocalClie" maxlength="15" /></td>
            <td class="espacioBlancoHorizontal"></td>
            <td>Email Local</td>
            <td>:</td>
            <td><input type="text" class="inputLargo" id="emailLocalClie" name="emailLocalClie" maxlength="50" /></td>
        </tr>
        <tr>
            <td>Giro</td>
            <td>:</td>
            <td colspan="5"><input type="text" id="giro" name="giro" maxlength="30" class="inputLargo" /></td>
        </tr>
        <tr>
            <td>Nombre Contacto</td>
            <td>:</td>
            <td><input type="text" id="nomContacto" name="nomContacto" maxlength="50" /></td>
        </tr>
        <tr>
            <td>Apell. Pat. Contacto</td>
            <td>:</td>
            <td><input type="text" id="apellPatContacto" name="apellPatContacto" maxlength="30" /></td>
            <td></td>
            <td>Apell. Mat. Contacto</td>
            <td>:</td>
            <td><input type="text" id="apellMatContacto" name="apellMatContacto" maxlength="30" /></td>
        </tr>
        <tr>
            <td>Telefono Contacto</td>
            <td>:</td>
            <td><input type="text" id="fonoContacto" name="fonoContacto" maxlength="15" /></td>
            <td></td>
            <td>Email Contacto</td>
            <td>:</td>
            <td><input type="text" class="inputLargo" id="emailContacto" name="emailContacto" maxlength="50" /></td>
        </tr>
        <tr>
            <td>Permite venta sobre tope</td>
            <td>:</td>
            <td><input type="checkbox" id="chkTopeVenta" name="chkTopeVenta" /></td>
        </tr>
        <tr>
            <td>Tope Venta</td>
            <td>:</td>
            <td><input type="text" id="topeVenta" name="topeVenta" value="" /></td>
            <td></td>
            <td>Tope Crédito</td>
            <td>:</td>
            <td><input type="text" id="topeCredito" name="topeCredito" value="" /></td>
        </tr>
        <tr>
            <td>Vendedor</td>
            <td>:</td>
            <td><span id="nomVendedor"></span>
                <select id="cmbVendedor">
                <?php
                    $i = 0;
                    while($i <= $numVendedores) {
                        echo "<option value='" . $listaVendedores[$i]->getIdUsuario() . "'>" . 
                                  $listaVendedores[$i]->getNomCompleto() . "</option>";
                        $i++;
                    }
                ?>
                </select></td>
            <td></td>
            <td>Forma de Pago</td>
            <td>:</td>
            <td><select id="cmbFormaPago">
                <?php
                    $i = 0;
                    while($i <= $numTiposPago) {
                        echo "<option value='" . $listaTipoPago[$i]->getIdTipoDocto() . "'>" . 
                                  $listaTipoPago[$i]->getNomTipoDocto() . "</option>";
                        $i++;
                    }
                ?>
                </select></td>
        </tr>
        <tr>
            <td>Comuna</td>
            <td>:</td>
            <td><input type="text" id="comuna" name="comuna" maxlength="20" /></td>
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
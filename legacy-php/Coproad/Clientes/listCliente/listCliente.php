<?php
require_once 'Clases/Controlador/ClienteCTRL.php';
require_once 'Clases/Factory/HTMLFactory.php';
require_once 'Clases/Util/FechaUtil.php';
require_once 'Globales/funciones.php';
require_once 'popUps/popUp.php';
//error_reporting(E_ALL);

$oHTMLFactory = new HTMLFactory();
$oModel = ClienteCTRL::clientes();
?>

<div id="divFiltros">
    <form id="formFiltros" action="SisDist.php?act=listCliente" method="POST" class="form-container">
        <div class="form-grid">
            <div class="form-group">
                <label for="rut">RUT:</label>
                <input type="text" id="rut" name="rutCliente" class="form-control" value="<?php echo $oModel->cRutCliente; ?>" placeholder="Ej: 12345678-9">
            </div>
            <div class="form-group">
                <label for="nombre">Nombre:</label>
                <input type="text" id="nombre" name="nombre" class="form-control" value="<?php echo $oModel->cRazonSocialCliente; ?>" placeholder="Ingrese nombre">
            </div>
            <div class="form-group">
                <label for="direccion">Dirección:</label>
                <input type="text" id="direccion" name="direccion" value="<?php echo $oModel->cDireccion; ?>" class="form-control">
            </div>

            <div class="form-group"></div>
            <div class="form-group"></div>
            <div class="button-container">
                <input type="submit" value="Filtrar" id="btnFiltrar" name="btnFiltrar" class="btn-submit" />
            </div>
        </div>
    </form>
</div>

<div id="listClientes" class="">
    <button id="ingCliente">Ingresar Nuevo Cliente</button>
    <br /><br />
    
    <table id="tablaClientes" cellpadding="0" cellspacing="0" border="0" class="display">
        <thead>
            <tr>
                <th>Rut</th>
                <th>Razon Social</th>
                <th>L</th>
                <th>M</th>
                <th>M</th>
                <th>J</th>
                <th>V</th>
                <th>Ult. Factura</th>
                <th>Ult. Nota Crédito</th>
                <!--<th>Nombre Fantasía</th>
                <th>Telefono</th>
                <th>Email</th>-->
                <th>L</th>
                <th>M</th>
                <th>E</th>
            </tr>
        </thead>
        <tbody>
        <?php
            $cTdTicket = "<td class='linkTicket'><a class='linkTicket'>a</a></td>";
            $cTdEmpty = "<td></td>";

            foreach($oModel->clientes as $oRegListCliente) {
                echo "<tr>";
                echo     "<input type='hidden' id='" . $oRegListCliente->rut_cliente . "-RazSoc' value='" . $oRegListCliente->razon_social ."'>";
                echo     "<td>" . $oRegListCliente->obtRutCompletoCliente() . "</td>";
                echo     "<td>" . $oRegListCliente->razon_social . "</td>";

                if ($oRegListCliente->lunes == 1) echo $cTdTicket;
                else echo $cTdEmpty;
                if ($oRegListCliente->martes == 2) echo $cTdTicket;
                else echo $cTdEmpty;
                if ($oRegListCliente->miercoles == 3) echo $cTdTicket;
                else echo $cTdEmpty;
                if ($oRegListCliente->jueves == 4) echo $cTdTicket;
                else echo $cTdEmpty;
                if ($oRegListCliente->viernes == 5) echo $cTdTicket;
                else echo $cTdEmpty;

                echo     "<td align='center'>" . $oRegListCliente->ult_factura . "</td>";
                echo     "<td align='center'>" . $oRegListCliente->ult_nota_credito . "</td>";
                echo     "<td class='linkLista'>";
                echo         "<a class='linkLista' href='SisDist.php?act=localesCliente&rutCliente=" . $oRegListCliente->rut_cliente . "' title='Ver Locales'></a>";
                echo     "</td>";
                echo     "<td class='linkMod'>";
                echo         "<a class='linkMod' href='javascript:modCliente(" . $oRegListCliente->rut_cliente . ")' title='Modificar'></a>";
                echo     "</td>";
                echo     "<td class='linkElim'>";
                echo         "<a class='linkElim' href='javascript:elimCliente(" . $oRegListCliente->rut_cliente . ")' title='Eliminar'></a>";
                echo     "</td>";
                echo "</tr>";
            }
        ?>
        </tbody>
    </table>
</div>

<div id="popUpElim" title="Eliminacion de Clientes">
    <input type="hidden" id="rutClienteElim" value="" />
    
    <p id="popUpElimMensaje" class="popUp">
        ¿Está seguro que desea eliminar a <span id="nomClienteElim"></span>?
        <div class="advertencia">
            <b>Advertencia: De hacerlo se quitaran sus locales de las rutas de los Vendedores.</b>
        </div>
    </p>
</div>

<div id="popUpMod" title="Modificacion de Clientes">
    <input type="hidden" id="rutClienteMod" value="" />

    <table width="100%">
        <tr>
            <td>Rut</td>
            <td>:</td>
            <td><span id="rutClie"></span></td>
            <td class="espacioBlancoHorizontal"></td>
            <td>Lista de Precios</td>
            <td>:</td>
            <td><select id="cmbListaPrecio" name="cmbListaPrecio">
                <?php
                    foreach ($oModel->listasPrecio as $lp)
                        echo "<option value='" . $lp->id_lista_precio . "'>" . $lp->nom_lista_precio . "</option>";
                ?>
                </select></td>
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
            <td>Telefono</td>
            <td>:</td>
            <td><input type="text" id="fonoClie" name="fonoClie" maxlength="15" /></td>
            <td class="espacioBlancoHorizontal"></td>
            <td>Email</td>
            <td>:</td>
            <td><input type="text" class="inputLargo" id="emailClie" name="emailClie" maxlength="50" /></td>
        </tr>
        <tr>
            <td>Dirección</td>
            <td>:</td>
            <td colspan="5"><input type="text" class="inputLargo" id="direClie" name="direClie" maxlength="200" /></td>
        </tr>
        <tr>
            <td>Permite venta con deuda</td>
            <td>:</td>
            <td><input type="checkbox" id="chkVentaCDeuda" name="chkVentaCDeuda" /></td>
        </tr>
    </table>
</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<?php include("popUps/popUpError.php"); ?>
<?php
require_once 'Clases/Controlador/ProductoCTRL.php';
require_once 'Clases/Factory/HTMLFactory.php';
error_reporting(E_ALL);

$oHTMLFactory = new HTMLFactory();
$oModel = ProductoCTRL::productos();
?>

<div id="divFiltros">
    <form id="formFiltros" action="SisDist.php?act=listProducto" method="POST" class="form-container">
        <div class="form-grid">
            <div class="form-group">
                <label for="codigo">Código:</label>
                <input type="text" id="codigo" name="codigo" class="form-control" value="<?php echo $oModel->codigo; ?>" placeholder="Ej: 311">
            </div>
            <div class="form-group">
                <label for="nombre">Nombre:</label>
                <input type="text" id="nombre" name="nombre" class="form-control" value="<?php echo $oModel->nombre; ?>" placeholder="Ingrese nombre">
            </div>
            <div class="form-group">
                <label for="idMarca">Marca:</label>
                <?php echo $oHTMLFactory->generarSelect($oModel->marcasSI, "idMarca", $oModel->idMarca, "form-control"); ?>
            </div>

            <div class="form-group"></div>
            <div class="form-group"></div>
            <div class="button-container">
                <input type="submit" value="Filtrar" id="btnFiltrar" name="btnFiltrar" class="btn-submit" />
            </div>
        </div>
    </form>
</div>

<div id="listProductos" class="">
    
    <button id="ingProducto">Ingresar Nuevo Producto</button>
    <br /><br />
    
    <table id="tablaProductos" cellpadding="0" cellspacing="0" border="0" class="display">
        <thead>
            <tr>
                <th>Nº</th>
                <th>Nombre Producto</th>
                <th>Marca</th>
                <th>UM</th>
                <th>Familia Padre</th>
                <th>Familia</th>
                <th>M</th>
                <th>E</th>
            </tr>
        </thead>
        <tbody>
        <?php
            foreach($oModel->productos as $producto) {
                echo "<tr>";
                echo     "<input type='hidden' id='" . $producto->id_producto . "-NomProd' value='" . $producto->nom_producto ."'>";
                echo     "<td>" . $producto->cod_serfel  . "</td>";
                echo     "<td>" . $producto->nom_producto . "</td>";
                echo     "<td>" . $producto->nom_marca    . "</td>";
                echo     "<td align='center'>" . $producto->nom_UM . "</td>";
                echo     "<td>" . $producto->familia . "</td>";
                echo     "<td>" . $producto->sub_familia . "</td>";
                echo     "<td class='linkMod'>";
                echo         "<a class='linkMod' href='javascript:modProducto(" . $producto->id_producto . ")' title='Modificar'></a></td>";
                echo     "<td class='linkElim'>";
                echo         "<a class='linkElim' href='javascript:elimProducto(" . $producto->id_producto . ")' title='Eliminar'></a></td>";
                echo "</tr>";
            }
        ?>
        </tbody>
    </table>
</div>

<div id="popUpElim" title="Eliminación de Productos">
    <input type="hidden" id="idProdElim" value="" />
    
    <p id="popUpElimMensaje" class="popUp">
        ¿Está seguro que desea eliminar a <b><span id="nomProdElim"></span></b>?
        <div class="advertencia">
            <b>Advertencia: De hacerlo ya no podrá realizar pedidos de este Producto.</b>
        </div>
    </p>
</div>

<div id="popUpIngMod" title="Ingreso de Productos">
    <input type="hidden" id="idProdIngMod" value="" />

    <table width="100%">
        <tr>
            <td>Código Serfel</td>
            <td>:</td>
            <td><input type="text" id="codSerfel" name="codSerfel" maxlength="5" /></td>
            <td></td>
            <td>Impuesto</td>
            <td>:</td>
            <td><select id="cmbImpuesto">
                    <option value="0">Sin Imp. Adicional</option>
                    <option value="1">ILA 10%</option>
                    <option value="4">ILA 18%</option>
                    <option value="5">ILA 19%</option>
                    <option value="2">ESPEC 12%</option>
                </select></td>
        </tr>
        <tr>
            <td>Nombre</td>
            <td>:</td>
            <td><input type="text" id="nomProd" name="nomProd" maxlength="45" /></td>
            <td class="espacioBlancoHorizontal"></td>
            <td>UM</td>
            <td>:</td>
            <td><select id="cmbUM">
                </select></td>
        </tr>
        <tr>
            <td>Marca</td>
            <td>:</td>
            <td><select id="cmbMarca">
                </select></td>
            <td></td>
            <td>Máx Descuento</td>
            <td>:</td>
            <td><input type="text" id="maxPorcenDesc" value="" /></td>
        </tr>
        <tr>
            <td>Descripción</td>
            <td>:</td>
            <td colspan="5"><input type="text" class="inputLargo" id="descProd" name="descProd" maxlength="200" /></td>
        </tr>
        <tr>
            <td>Código de Barra</td>
            <td>:</td>
            <td colspan="5"><input type="text" class="inputLargo" id="codBarra" name="codBarra" maxlength="200" /></td>
        </tr>
        <tr>
            <td>Familia Padre</td>
            <td>:</td>
            <td><select id="cmbFamPadre" onchange="javascript:cargarComboFamilias('cmbFam', this.value, false)">
                </select></td>
            <td></td>
            <td>Familia</td>
            <td>:</td>
            <td><select id="cmbFam">
                </select></td>
        </tr>
        <tr>
            <td>Es porcionado</td>
            <td>:</td>
            <td><input type="checkbox" id="chkEsPorcionado" name="chkEsPorcionado" /></td>
        </tr>
    </table>
</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<?php include("popUps/popUpError.php"); ?>
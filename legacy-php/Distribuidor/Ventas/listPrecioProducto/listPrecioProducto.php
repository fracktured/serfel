<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");

    $lista = new Lista();
    $listaPrecios = $lista->getListaPrecios("");
    $numListaPrecios = $lista->getTotalRegistros();
?>

<div id="listPrecioProducto">
    <input type="hidden" id="idLista" value="" />

    <form action="javascript:desplegarProductos()">
        <h1><table class="tablaBorde">
                <tr>
                    <td>Seleccione una Lista de Precios a mostrar:</td>
                    <td><select id="cmbListaPrecio" name="cmbListaPrecio" class="selectFormTabla">
                            <?php
                                $i = 0;
                                while($i <= $numListaPrecios) {
                                    echo "<option value='" . $listaPrecios[$i]->getIdListaPrecio() . "'>" . $listaPrecios[$i]->getNomListaPrecio() . "</option>";
                                    $i++;
                                }
                            ?>
                        </select></td>
                    <td><button id="despListaPrecio">Desplegar Lista Precio</button></td>
                    <td class="linkAdd"><a class="linkAdd" href="javascript:agregarLista()" title="Agregar Lista"></a></td>
                    <td class="linkElim"><a class="linkElim" href="javascript:eliminarLista()" title="Eliminar Lista"></a></td>
                </tr>
        </table></h1>
    </form>
</div>

<div id="detallePrecioProducto">
    <fieldset>
        <legend>Asociar Precio de Venta de Productos</legend>
        <br />
        
        <div align="center"><span id="tituloLista"></span></div>
        <br />
        
        <div id="cambioPrecio" align="center">
            <table>
                <tr>
                    <td><input type="radio" id="cambiarPrecio" name="tipoCambio" onclick="javascript:nuevoPrecio()" checked/>Nuevo Precio</td>
                    <td><span style="width: 15px;"></span></td>
                    <td><input type="radio" id="cambiarVariacionDesc" name="tipoCambio" onclick="javascript:nuevoDescuento()" />Máx. % de Descuento</td>
                    <td><span style="width: 15px;"></span></td>
                    <!--
                    <td><input type="radio" id="cambiarVariacionRec" name="tipoCambio" onclick="javascript:nuevoRecargo()" />Nuevo % de Recargo</td>
                    <td><span style="width: 15px;"></span></td>
                    -->
                    <td><input type="radio" id="borrarVariacion" name="tipoCambio" onclick="javascript:borrarPorcentaje()" />Borrar Máx. % Descuento</td>
                </tr>
            </table>
            <br>

            <table>
                <tr id="tablaCambio">
                    <td class="textoPrecio"><span id="textoNuevoPrecio">Nuevo Precio&nbsp;</span></td>
                    <td class="textoPrecio">:&nbsp;</td>
                    <td class="textoPrecio"><span id="signoPeso">$</span><input type="text" id="nuevoPrecio" value="" /><span id="signoPorcen">%</span></td>
                    <td width="25px;"></td>
                    <td colspan="3" align="right">
                        <button id="btnAsociarPrecioProductos">Asociar Precio a Selección</button>
                        <button id="btnAsociarPorcenVariacion"></button></td>
                </tr>
                <tr id="btnBorrarVariacion">
                    <td><button id="btnBorrarVariacion">Borrar Máx. % Descuento</button></td>
                </tr>
            </table>
        </div>
    </fieldset>
    <br />
    
    <div id="divTablaPreciosProducto">
        
    </div>
</div>

<div class="popUp" id="popUpIngListaPrecio" title="Nueva Lista de Precio">
    <table width="100%">
        <tr>
            <td>Ingrese Nombre de la Lista</td>
            <td>:</td>
            <td><input type="text" id="nomNuevaLista" value="" size="15" /></td>
        </tr>
    </table>
</div>

<div id="popUpElimListaPrecio" title="Eliminar Lista de Precio">
    <input type="hidden" id="idListaPrecioElim" value="" />
    
    <p id="popUpElimMensaje" class="popUp">
        ¿Está seguro que desea eliminar la Lista de Precio <b><span id="nomListaPrecioElim"></span></b>?
        <div class="advertencia">
            <b>Advertencia: De hacerlo ya no podrá usar esta Lista de Precios al hacer pedidos.</b>
        </div>
    </p>
</div>

<?php include("popUps/popUpError.php"); ?>
<?php include("popUps/popUpExito.php"); ?>
<?php include("popUps/popUpCargando.php"); ?>
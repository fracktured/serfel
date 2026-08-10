<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");

    $lista = new Lista();
    $listaVendedores = $lista->getListaVendedores();
    $numVendedores   = $lista->getTotalRegistros();
    
    $listaRutas = $lista->getListaNomRutas("");
?>

<div id="listaRutas">
    <form action="javascript:desplegarRutas()">
        <input type="hidden" id="idRuta" />
        <input type="hidden" id="idVendedor" />
        
        <h1><table class="tablaBorde">
                <tr>
                    <td>Seleccione una Ruta:</td>
                    <td><select id="cmbListaRutas" name="cmbListaRutas" class="selectFormTabla">
                         <?php
                             foreach($listaRutas as $ruta) {
                                echo "<option value='" . $ruta->getIdRuta() . "'>" . $ruta->getNomRuta() . "</option>";
                            }
                        ?>
                        </select></td>
                    <td><button id="despRutas">Desplegar Rutas</button></td>
                    <td class="linkAdd"><a class="linkAdd" href="javascript:ingRuta()" title="Agregar Ruta"></a></td>
                    <td class="linkElim"><a class="linkElim" href="javascript:eliminarRuta()" title="Eliminar Ruta"></a></td>
                </tr>
        </table></h1>
    </form>
    <br>

    <div id="detalleRutas">
        
    </div>
</div>

<div class="popUp" id="popUpIngRuta" title="Nueva Ruta">
    <table width="100%">
        <tr>
            <td>Ingrese Nombre de la Ruta</td>
            <td>:</td>
            <td><input type="text" id="nomNuevaRuta" value="" size="15" /><span id="txtNomRuta"></span></td>
        </tr>
        <tr>
            <td>Seleccione un Vendedor</td>
            <td>:</td>
            <td><select id="cmbListaVendedores" name="cmbListaVendedores">
                <?php
                    $i = 0;
                    while($i <= $numVendedores) {
                        echo "<option value='" . $listaVendedores[$i]->getIdUsuario() . "'>" . 
                                  $listaVendedores[$i]->getNomCompleto() . 
                             "</option>";
                        $i++;
                    }
                ?>
                </select></td>
        </tr>
        <tr>
            <td>Seleccione un Día</td>
            <td>:</td>
            <td><select id="cmbDias" name="cmbDias">
                    <option value="1">Lunes</option>
                    <option value="2">Martes</option>
                    <option value="3">Miércoles</option>
                    <option value="4">Jueves</option>
                    <option value="5">Viernes</option>
                    <option value="6">Sábado</option>
                </select></td>
            </tr>
    </table>
</div>

<div id="popUpElimRuta" title="Eliminar Ruta">
    <p id="popUpElimRutaMensaje" class="popUp">
        ¿Está seguro que desea eliminar la Ruta <b><span id="nomRutaElim"></span></b>?
        <div class="advertencia">
            <b>Advertencia: De hacerlo ya no podrá usar esta Ruta al hacer pedidos.</b>
        </div>
    </p>
</div>

<div id="popUpElim" title="Eliminación de Locales de Rutas">
    <input type="hidden" id="idRutaElim" value="" />
    <input type="hidden" id="idLocalElim" value="" />
    
    <p id="popUpElimMensaje" class="popUp">
        ¿Está seguro que desea eliminar a esta Ruta?
    </p>
</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<?php include("popUps/popUpError.php"); ?>
<?php include("popUps/popUpBuscarLocalCliente.php"); ?>
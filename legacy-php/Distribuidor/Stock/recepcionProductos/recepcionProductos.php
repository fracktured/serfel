<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");
include("popUps/popUpBuscarProducto.php");
require_once 'Clases/Controlador/GeneralCTRL.php';
require_once 'Clases/Controlador/RecepcionCTRL.php';
require_once 'Clases/Factory/HTMLFactory.php';

//error_reporting(E_ALL);
//ini_set('display_errors', '1');

$oRecepcionCTRL = new RecepcionCTRL(FALSE);
$oRecepcionDTO = $oRecepcionCTRL->recepcionProductos();

$oHTMLFactory = new HTMLFactory();

$listaPagos = new Lista();
$listaTipoPagos = $listaPagos->getListaTipoPago("");

$listaBodega = new Lista();
$listaBodegas = $listaBodega->getListaBodega("");
?>

<div id="recepcionProductos" class="">

    <br/>

    <table id="selecProveedor">
        <tr>
            <td>Ingrese Rut de Proveedor</td>
            <td>:</td>
            <td>
                <input type="text" id="rutProveedor"  name="rutProveedor" />
            </td>
            <td>
                <button id="ingProveedor">Aceptar</button>
            </td>
        </tr>
    </table>

    <br/>

    <div id="recepcion" class="">
        <table>        
            <tr>
                <td>Proveedor</td>
                <td>:</td>
                <td> <span id="razonSocial"> </td>
                <td style="width: 10px"></td>
                <td>Rut</td>
                <td>:</td>
                <td> <span id="rut"> </td>
            </tr>
            <tr>
                <td>Documento</td>
                <td>:</td>
                <td><?php $oHTMLFactory->generarSelect($oRecepcionDTO->listTipoDoctoCompraSI, "cmbTipoDocumento"); ?></td>
                <td style="width: 10px"></td>
                <td>Numero</td>
                <td>:</td>
                <td><input type="text" id="numDocto"  name="numDocto" maxlength="50" /></td>
            </tr>
            <tr>
                <td>Fecha Emision</td>
                <td>:</td>
                <td> <input type="text" id="fecDoc" name="fecDoc" value="" readonly /> </td>
                <td style="width: 10px"></td>
                <td>Bodega Recepcion</td>
                <td>:</td>
                <td> 
                    <select id="cmbBodega" name="cmbBodega" style="width: 100%" >
                        <?php
                        $i = 0;
                        while ($i <= $listaBodega->getTotalRegistros()) {
                            echo "                         
                         <option value='" . $listaBodegas[$i]->getIdBodega() . "'>" . $listaBodegas[$i]->getNomBodega() . "</option>";
                            $i++;
                        }
                        ?>
                    </select>
                </td>
            </tr>
            <tr>
                <td>Comprador</td>
                <td>:</td>
                <td><?php $oHTMLFactory->generarSelect($oRecepcionDTO->listEmpresaSI, "cmbEmpresa"); ?></td>
                <td style="width: 10px"></td>
                <td>Tipo Pago</td>
                <td>:</td>
                <td> 
                    <select id="cmbTipoPago" name="cmbTipoPago" style="width: 100%" >
                        <option value="0">Sin Pago</option>
                        <?php
                        $i = 0;
                        while ($i <= $listaPagos->getTotalRegistros()) {
                            echo "                         
                         <option value='" . $listaTipoPagos[$i]->getIdTipoDocto() . "'>" . $listaTipoPagos[$i]->getNomTipoDocto() . "</option>";
                            $i++;
                        }
                        ?>
                    </select>
                </td>
            </tr>
            <tr>
                <td>Observacion</td>    
                <td>:</td>    
            </tr>
            <tr>
                <td></td>    
                <td></td>
                <td colspan="6"> <textarea name="observacion" id="observacion" style="width:400px;height: 50px" maxlength="200"></textarea> </td>                
            </tr>
        </table>

        <br/>

        <table style="width: 100%">
            <tr>
                <td><button id="agregarProducto">Agregar Producto</button></td>
                <td style="font-size: 18px; text-align: right;">Total Neto: <span id="txtTotalNeto">$ 0</span></td>
            </tr>
        </table>

        <br/>

        <table id="listaProductos" class="listaProductos" align="center">
            <tr>
                <th style="width: 6%">COD PROD</th>
                <th style="width: 25%">NOMBRE PRODUCTO</th>
                <th style="width: 15%">MARCA</th>
                <th style="width: 10%">U./E.</th>
                <th style="width: 10%">CANTIDAD</th>    
                <th style="width: 10%">CANT RECEPCION</th>
                <th style="width: 10%">VALOR NETO</th>    
                <th style="width: 10%"></th>
            </tr>
        </table>

        <br/><br/>

        <table>
            <tr>
                <td><button id="cancelar">Cancelar</button></td>
                <td><button id="recepcionar">Recepcionar</button></td>
            </tr>
        </table>

    </div>

</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<div id="popUpAdvertencia" title="">
    <p id="popUpAdvertenciaMensaje" class="popUp"></p>
</div>

<?php include("popUps/popUpError.php"); ?>
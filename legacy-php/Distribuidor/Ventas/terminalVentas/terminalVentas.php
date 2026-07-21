<?php
include("Coneccion/coneccion.php");
include("Clases/Lista.php");
include("Clases/Venta.php");
require_once __DIR__.'/../../Clases/Constantes/UsuarioCONST.php';

    $lista = new Lista();
    $listaTipoPago = $lista->getListaTipoPago("");
    $numTiposPago = $lista->getTotalRegistros();
    
    //$listaEmpresa = $lista->getListaEmpresas();
    //$numEmpresas = $lista->getTotalRegistros();
    
    $listaVendedores = $lista->getListaVendedores();
    $numVendedores   = $lista->getTotalRegistros();
    
    $bPuedeCambiarDesc = FALSE;
    if($_SESSION["usuario"]->getIdTipoUsuario() == UsuarioCONST::ADMINISTRADOR) {
        $bPuedeCambiarDesc = TRUE;
    }
    //$venta = new Venta();
?>

<div id="terminalVentas">
    <form action="javascript:agregarProducto()">
        <input type="hidden" id="bPuedeCambiarDesc" value="<?php echo $bPuedeCambiarDesc; ?>" />
        <input type="hidden" id="rutEmpresa" value="" />
        <input type="hidden" id="idLocalCliente" value="" />
        <!--<input type="hidden" id="IVA" value="<?php //echo $venta->getIva() ?>" />-->
        
        <h1>
            <table>
                <tr>
                    <td>
                        Ingrese Empresa:
                        <input type="text" id="idEmpresa" value="" onchange="javascript:cambiarEmpresa(this.value)" />
                        <span id="nomEmpresa"></span>
                        <br />
                        
                        Ingrese Rut Cliente
                        <input type="text" id="rutCliente" value="" onchange="javascript:cambiarCliente(this.value)" />
                        <div id="buscarLocalCliente">Buscar Local Cliente</div>
                        <br />
                        
                        <div id="cliente">
                            Cliente: <span id="datosCliente"></span>
                            <br />
                            Local Cliente:
                            <select id="cmbLocalCliente">
                                
                            </select>
                            <br />
                            Seleccionar Forma de Pago:
                            <select id="cmbFormaPago">
                            <?php
                                $i = 0;
                                while($i <= $numTiposPago) {
                                    echo "<option value='" . $listaTipoPago[$i]->getIdTipoDocto() . "'>" . 
                                              $listaTipoPago[$i]->getNomTipoDocto() . "</option>";
                                    $i++;
                                }
                            ?>
                            </select>
                            <br />
                                
                            Seleccione Vendedor:
                            <select id="cmbListaVendedores" name="cmbListaVendedores">
                            <?php
                                $i = 0;
                                while($i <= $numVendedores) {
                                    echo "<option value='" . $listaVendedores[$i]->getIdUsuario() . "'>" . 
                                              $listaVendedores[$i]->getNomCompleto() . "</option>";
                                    $i++;
                                }
                            ?>
                            </select>
                            <br />
                            
                            Observaciones:
                            <input type="text" id="txtObservaciones" name="txtObservaciones" value="" />
                            <br />
                        </div>
                        <br />

                        Código Producto: <input type="text" class="" id="idProducto" value="" />
                        <button id="agregarProducto">Agregar Producto</button>
                        <div id="buscarProducto">Buscar Producto</div>
                    </td>
                    <td><div id="filaTotales">
                            <table align="right">
                                <tr>
                                    <td></td>
                                    <td align="right" style="vertical-align: top">Factura&nbsp;</td>
                                    <td style="vertical-align: top">:&nbsp;</td>
                                    <td style="vertical-align: top"><input type="text" id="numFactura" value="" style="text-align: right" /></td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td align="right" style="vertical-align: top">Fecha Venta&nbsp;</td>
                                    <td style="vertical-align: top">:&nbsp;</td>
                                    <td style="vertical-align: top"><input type="text" id="fechaVenta" value="" style="text-align: right" readonly /></td>
                                </tr>
                                <tr id="filaSubTotal">
                                    <td width="50px"></td>
                                    <td align="right">SubTotal</td>
                                    <td>:</td>
                                    <td style="text-align: right;">
                                        <input type="hidden" id="valorSubTotal" value="" />
                                        <div id="subTotal"></div></td>
                                </tr>
                                <tr id="filaSubTotalIva">
                                    <td></td>
                                    <td align="right">IVA</td>
                                    <td>:</td>
                                    <td align="right">
                                        <input type="hidden" id="valorIva" value="" />
                                        <div id="subTotalIva"></div></td>
                                </tr>
                                <tr id="filaSubTotalIaba">
                                    <td></td>
                                    <td align="right">IABA</td>
                                    <td>:</td>
                                    <td align="right">
                                        <input type="hidden" id="valorIaba" value="" />
                                        <div id="subTotalIaba"></div></td>
                                </tr>
                                <tr id="filaSubTotalEspec">
                                    <td></td>
                                    <td align="right">ESPEC</td>
                                    <td>:</td>
                                    <td align="right">
                                        <input type="hidden" id="valorEspec" value="" />
                                        <div id="subTotalEspec"></div></td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td align="right">TOTAL</td>
                                    <td>:</td>
                                    <td align="right">
                                        <input type="hidden" id="valorTotal" value="" />
                                        <div id="total"></div></td>
                                </tr>
                                <tr>
                                    <td colspan="4">&nbsp;</td>
                                </tr>
                                <tr>
                                    <td colspan="4" align="right">
                                        <div id="realizarVenta">Realizar Venta</div></td>
                                </tr>
                            </table>
                        </div></td>
                </tr>
            </table>
        </h1>
    </form>
    <br />

    <div id="detalleVenta">
        
    </div>
</div>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>

<div id="popUpAdvertencia" title="Advertencia">
    <p id="popUpAdvertenciaMensaje" class="popUp"></p>
</div>

<?php include("popUps/popUpError.php"); ?>
<?php include("popUps/popUpBuscarProducto.php"); ?>
<?php include("popUps/popUpBuscarLocalCliente.php"); ?>
<?php include("popUps/popUpCargando.php"); ?>
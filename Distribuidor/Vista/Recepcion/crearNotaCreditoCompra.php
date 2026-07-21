<?php
require_once 'Clases/Factory/HTMLFactory.php';
require_once "popUps/popUp.php";
require_once 'popUps/popUpCargando.php';
require_once 'Clases/Controlador/RecepcionCTRL.php';
require_once 'Clases/Util/FormatoUtil.php';

//$oModel = new RecepcionNDTO();
$oCTRL = new RecepcionCTRL(FALSE);
$oModel = $oCTRL->obtRecepcion();

$oRecepcion = new Recepcion();
$oProveedor = new Proveedor();
$oRecepcion = $oModel->oRecepcion;
$oTipoDocto = $oModel->oTipoDocto;
$oEmpresa = $oModel->oEmpresa;
$oProveedor = $oModel->oProveedor;

?>

<script>
    $(function() {
        $("#puCrearNCCompra").dialog({
            autoOpen: false,
            modal   : true,
            buttons : {
                "Ok": function() {
                    $(this).dialog("close");
                    doCrearNCCompra();
                }
            }
        });
        
        $(".clsCantidad").numeric();
    });
    
    
    function cambioCantidad(oInputCantidadNC) {
        var idProducto = oInputCantidadNC.id.split("-")[1];
        var fCantCompra = parseFloat($("#fCantCompraProducto-" + idProducto).val());
        var fCantNC = parseFloat(oInputCantidadNC.value);
        //console.log(idProducto + " - " + fCantCompra + " - " + fCantNC);
        if (fCantNC < 0) {
            $(oInputCantidadNC.id).val(0);
        } else if (fCantNC > fCantCompra) {
            alert("La cantidad no puede ser superior a la comprada.");
            $(oInputCantidadNC.id).val(0);
        } else {
            cambioSubTotal(idProducto);
        }
    }
    
    
    function cambioSubTotal(idProducto) {
        var fCantNC = parseFloat($("#txtCantProducto-" + idProducto).val());
        var fPrecioNC = parseFloat($("#txtPrecioProducto-" + idProducto).val());
        var fPrecioCompra = parseFloat($("#fPrecioCompraProducto-" + idProducto).val());
        var fSubTotal = 0;
        
        if (fPrecioNC < 0) {
            fPrecioNC = 0;
            $("#txtPrecioProducto-" + idProducto).val(0);
        }
        
        if (fCantNC > 0) {
            fSubTotal = fCantNC * fPrecioCompra;
        } else if (fPrecioNC > 0) {
            //fSubTotal = fCantNC
        }
        
        $("#lblSubTotal-" + idProducto).html(formatoDinero(fSubTotal));
    }
    
    
    function confirmCrearNCCompra() {
        $("#puCrearNCCompra").dialog("open");
    }


    function doCrearNCCompra() {
        $.ajax({
            data: $("#frmCrearNotaCreditoCompra").serialize(),
            type    : "POST",
            dataType: "json",
            url     : "Ajax/Recepcion/ajaxCrearNCCompra.php",
            success : function(oJson) {
                $("#" + oJson.cPopUp).dialog({title: "Crear Nota Crédito Compra"});
                $("#" + oJson.cPopUp + "Mensaje").html(oJson.cMensaje);
                $("#" + oJson.cPopUp).dialog("open");
            },
            error: function(xhr, status, error) {
                var err = JSON.parse(xhr.responseText);
                alert("crearNotaCreditoCompra:doCrearNCCompra\n" + err.Message);
            }
        });
    }
</script>

<div id="crearNotaCreditoCompraContenedor">
    
    <fieldset id="fsRecepcion" style="padding: 15px">
        <legend></legend>
        
        <table>
            <tr>
                <td>Número Documento</td>
                <td><b><?php echo $oRecepcion->num_docto; ?></b></td>
            </tr>
            <tr>
                <td>Proveedor</td>
                <td><b><?php echo "[" . $oProveedor->obtRutCompleto() . "] $oProveedor->razon_social"; ?></b></td>
            </tr>
        </table>
    </fieldset>
    <br /><br />

    <form id="frmCrearNotaCreditoCompra" action="">
        <input type="hidden" id="idRecepcion" name="idRecepcion" value="<?php echo $oRecepcion->id_recepcion; ?>" />
        
        <table id="tblProductoRecepcion" class="listaProductos">
            <thead>
                <tr>
                    <th>N</th>
                    <th>Nombre Producto</th>
                    <th>Marca</th>
                    <th>UM</th>
                    <!--<th>Cantidad Recibida</th>-->
                    <th>Cantidad Compra</th>
                    <th>Cantidad Nota</th>
                    <th>Precio Compra</th>
                    <th>Precio Nota</th>
                    <th>SubTotal Compra</th>
                    <th>SubTotal Nota</th>
                </tr>
            </thead>
            <tbody>
                <?php
                foreach($oModel->listProductoRecepcionNDTO as $oProductoRecepcionNDTO) {
                    //$oProductoRecepcionNDTO = new ProductoRecepcionNDTO();
                    //$oProducto = new Producto();
                    //$oMarca = new Marca();
                    //$oUM = new UnidadMedida();
                    //$oProductoRecepcion = new ProductoRecepcion();
                    $oProductoRecepcion = $oProductoRecepcionNDTO->oProductoRecepcion;
                    $oProducto = $oProductoRecepcionNDTO->oProducto;
                    $oMarca = $oProductoRecepcionNDTO->oMarca;
                    $oUM = $oProductoRecepcionNDTO->oUM;
                    $fSubTotal = $oProductoRecepcion->cantidad * $oProductoRecepcion->valor;
                    
                    echo "<tr>";
                    echo     "<input type='hidden' id='fCantCompraProducto-$oProducto->id_producto' value='$oProductoRecepcion->cantidad' />";
                    echo     "<input type='hidden' id='fPrecioCompraProducto-$oProducto->id_producto' value='$oProductoRecepcion->valor' />";
                    
                    echo     "<td>$oProducto->cod_serfel</td>";
                    echo     "<td>$oProducto->nom_producto</td>";
                    echo     "<td>$oMarca->nom_marca</td>";
                    echo     "<td>$oUM->nom_UM</td>";
                    echo     "<td>" . FormatoUtil::formatoEnteroConDecimal($oProductoRecepcion->cantidad) . "</td>";
                    echo     "<td><input type='text' id='txtCantProducto-$oProducto->id_producto' name='txtCantProducto-$oProducto->id_producto' value='0' ";
                    echo                "class='clsCantidad' onchange='javascript:cambioCantidad(this);' /></td>";
                    echo     "<td>" . FormatoUtil::formatoDinero($oProductoRecepcion->valor) . "</td>";
                    echo     "<td><input type='text' id='txtPrecioProducto-$oProducto->id_producto' name='txtPrecioProducto-$oProducto->id_producto' value='0' ";
                    echo                "class='clsCantidad' onchange='javascript:cambioSubTotal();' /></td>";
                    echo     "<td>" . FormatoUtil::formatoDinero($fSubTotal) . "</td>";
                    echo     "<td><span id='lblSubTotal-$oProducto->id_producto'>$ 0</span></td>";
                    echo "</tr>";
                }
                ?>
            </tbody>
        </table>
    </form>
    <br /><br />
</div>

<div id="puCrearNCCompra" title="Crear Nota Crédito Compra">
    <p id="puCrearNCCompraMsg" class="popUp">
        ¿Está seguro que desea crear la Nota de Crédito de Compra N° ?
    </p>
</div>
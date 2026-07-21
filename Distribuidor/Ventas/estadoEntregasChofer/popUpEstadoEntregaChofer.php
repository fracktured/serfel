<?php
require_once '../../Clases/Controlador/EstadoEntregaChoferCTRL.php';
require_once "../../Globales/funciones.php";

    $estEntChoferCTRL = new EstadoEntregaChoferCTRL("../../");
    $estEntChoferDTO = $estEntChoferCTRL->popUpEstadoEntregaChofer();
    
    $venta = $estEntChoferDTO->venta;
?>

<div id="popUpEstadoEntrega" title="">
    <input type="hidden" id="idVenta" value="<?php echo $venta->id_venta; ?>" />
    <input type="hidden" id="rutEmpresa" value="<?php echo $venta->rut_empresa; ?>" />
    <input type="hidden" id="numFactura" value="<?php echo $venta->num_docto_emitido; ?>" />
    
    <select id="cmbMotivoDevolucion" style="display: none">
        <?php
            foreach ($estEntChoferDTO->listaMotivoDevolucion as $motDev) {
                echo "<option value='" . $motDev->id_motivo_devolucion . "'>" . $motDev->nom_motivo_devolucion . "</option>";
            }
        ?>
    </select>

    <table width="100%">
        <?php
            if($estEntChoferDTO->esVerEstado) {
                echo "<tr>";
                echo "    <td>Estado</td>";
                echo "    <td>:</td>";
                echo "    <td>" . $estEntChoferDTO->estado->nom_estado . "</td>";
                echo "</tr>";
            }
        ?>
        <tr>
            <td>Forma Pago</td>
            <td>:</td>
            <td>
                <select id="cmbFormaPago">
                    <?php
                        foreach($estEntChoferDTO->listaTipoPago as $tipoPago) {
                            $selected = "";
                            if($tipoPago->getIdTipoDocto() == $venta->id_forma_pago) {
                                $selected = "selected";
                            }

                            echo "<option value='" . $tipoPago->getIdTipoDocto() . "' " . $selected . ">" . $tipoPago->getNomTipoDocto() . "</option>";
                        }
                    ?>
                </select>
            </td>
        </tr>
    </table>
    <br /><br />
    
    <div id="btnAgregarDevolucion">Agregar Producto devuelto</div>
    <br /><br />
    
    <table id="tblProdDevueltos" class='listaProductos'>
        <thead>
            <tr>
                <th>N</th>
                <th>Nombre Producto</th>
                <th>Marca</th>
                <th>UM</th>
                <th>Cantidad Venta</th>
                <th>Cantidad</th>
                <th>Motivo Devolución</th>
                <th>% Desc</th>
                <th>Precio Neto</th>
                <th>SubTotal</th>
                <th>Quitar</th>
            </tr>
        </thead>
        <tbody id="tblProdDevueltosBody">
            <?php
                foreach($estEntChoferDTO->prodDevNDTOs as $prodDevNDTO) {
                    $producto = $prodDevNDTO->producto;
                    $prodVenta = $prodDevNDTO->productoVenta;
                    $precioProducto = $prodDevNDTO->precioProducto;
                    $prodDevolucion = $prodDevNDTO->productoDevolucion;
                    
                    echo "<tr id='fila-" . $producto->getIdProducto() . "'>";
                    echo "    <input type='hidden' id='cantDisp-" . $producto->getIdProducto() . "' value='" . $prodVenta->getCantidad() . "' />";
                    echo "    <input type='hidden' id='precioVenta-" . $producto->getIdProducto() . "' value='" . $precioProducto->precioVenta . "' />";
                    echo "    <input type='hidden' id='porcen-" . $producto->getIdProducto() . "' value='" . $prodVenta->getPorcenDesc() . "' />";
                    echo "    <input type='hidden' id='precio-" . $producto->getIdProducto() . "' value='" . $prodVenta->getPrecio() . "' />";
                    
                    echo "    <td>" . $producto->getCodSerfel() . "</td>";
                    echo "    <td align='left'>" . $producto->getNomProducto() . "</td>";
                    echo "    <td>" . $producto->getNomMarca() . "</td>";
                    echo "    <td>" . $producto->getNomUM() . "</td>";
                    echo "    <td align='center'>" . $prodVenta->getCantidad() . "</td>";
                    echo "    <td><input type='text' id='cant-" . $producto->getIdProducto() . "' value='" . $prodDevolucion->cantidad . "' class='cantVenta'
                                         onchange='javascript:cambioCantidad(" . $producto->getIdProducto() . ", parseFloat(this.value))' /></td>";
                    
                    // Select motivo devolucion
                    echo "    <td>";
                    echo "        <select id='motDev-" . $producto->getIdProducto() . "'>";
                    foreach ($estEntChoferDTO->listaMotivoDevolucion as $motDev) {
                        $selected = "";
                        if($motDev->id_motivo_devolucion == $prodDevolucion->id_motivo_devolucion) {
                            $selected = "selected";
                        }
                            
                        echo "<option value='" . $motDev->id_motivo_devolucion . "' " . $selected . ">" . $motDev->nom_motivo_devolucion . "</option>";
                    }
                    echo "        </select>";
                    echo "    </td>";
                    
                    echo "    <td>" . $prodVenta->getPorcenDesc() . "%</td>";
                    echo "    <td>" . $prodVenta->getPrecio() . "</td>";
                    echo "    <td><span id='total-" . $producto->getIdProducto() . "' name='" . $prodVenta->getPrecio() . "'>" 
                                        . getFormatoDineroEntero($precioProducto->precioVentaFinal * $prodDevolucion->cantidad) . "</span></td>";
                    echo "    <td></td>";
                    echo "</tr>";
                }
            ?>
        </tbody>
    </table>
    
</div>
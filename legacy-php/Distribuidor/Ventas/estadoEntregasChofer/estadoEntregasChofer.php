<?php
require_once 'Clases/Controlador/EstadoEntregaChoferCTRL.php';
require_once "Globales/funciones.php";

    $estEntChoferCTRL = new EstadoEntregaChoferCTRL("");
    $estEntChoferDTO = $estEntChoferCTRL->estadoEntregasChofer();
?>

<div id="divEstadoEntregas">
    <form action="SisDist.php?act=estadoEntregasC" method="POST">
        <input type="hidden" id="idRuta" value="<?php echo $idRuta; ?>" />
        
        <h1>Seleccione una Ruta:
            <select id="cmbListaRutas" name="cmbListaRutas">
            <?php
                foreach($estEntChoferDTO->listaRutas as $ruta) {
                    $selected = "";
                    if($estEntChoferDTO->idRuta == $ruta->getIdRuta()) {
                        $selected = "selected";
                    }
                        
                    echo "<option value='" . $ruta->getIdRuta() . "' " . $selected . ">" . $ruta->getNomRuta() . "</option>";
                }
            ?>
            </select>
            
            Fecha Entrega <input type="text" id="fechaEntrega" name="fechaEntrega" value="<?php echo $estEntChoferDTO->fechaVenta; ?>" readonly="readonly" />
            
            <button id="desplegarEstadoEntregas">Desplegar Estado Entregas</button></h1>
    </form>
    <br />
</div>

<div id="detalleEstadoEntregas">
<?php
    if($estEntChoferDTO->estEntChoferNDTOs != null) {
        echo "<table id='tablaEntregasC' class='display' align='center'>";
        echo     "<thead>";
        echo         "<tr>";
        echo             "<th>Rut Empresa</th>";
        echo             "<th>Rut Cliente</th>";
        echo             "<th>Razon Social Cliente</th>";
        echo             "<th>Factura</th>";
        echo             "<th>Precio Total</th>";
        echo             "<th>Forma Pago</th>";
        echo             "<th>S</th>";
        echo         "</tr>";
        echo     "</thead>";
        echo     "<tbody>";
        
        foreach($estEntChoferDTO->estEntChoferNDTOs as $estEntChoferNDTO) {
            $venta = $estEntChoferNDTO->venta;
            $cliente = $estEntChoferNDTO->cliente;
            
            if($venta->entregado == 1) {
                $classLink = "linkTicket";
            } else {
                $classLink = "linkCirculo";
            }
            
            echo     "<tr>";
            echo         "<td align='center'>" . $venta->rut_empresa . "</td>";
            echo         "<td align='center'>" . $cliente->obtRutCompleto() . "</td>";
            echo         "<td>" . $cliente->razon_social . "</td>";
            echo         "<td align='center'>" . $venta->num_docto_emitido . "</td>";
            echo         "<td align='center'>" . getFormatoDineroEntero($venta->precio_total) . "</td>";
            echo         "<td align='center'>" . $estEntChoferNDTO->formaPago->getNomTipoDocto() . "</td>";
            echo         "<td class='" . $classLink . "'>
                              <a class='" . $classLink . "' href='javascript:popUpEstadoEntregaChofer(" . $venta->id_venta . ")' title='Ver entrega'></a></td>";
            echo     "</tr>";
        }
        
        echo     "</tbody>";
        echo "</table>";
    }
?>
</div>

<div id="popUpEstadoEntregaContainer" title=""></div>

<?php include("popUps/popUpError.php"); ?>
<?php include("popUps/popUpExito.php"); ?>
<?php include("popUps/popUpBuscarProducto.php"); ?>
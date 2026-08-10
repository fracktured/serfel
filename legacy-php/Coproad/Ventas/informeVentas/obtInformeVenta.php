<?php
//error_reporting(E_ALL);
//ini_set('display_errors', '1');
ini_set('memory_limit', '256M');

include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Venta.php");
include("../../Globales/funciones.php");

    header("Content-type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    header("Content-Disposition:  filename=\"Informes/Informe Ventas " . gmdate("d-m-Y_his") . ".xls\";");
    session_start();
        
    if($_POST["fechaIni"] != "") { 
        $arrayFecha = explode("/", $_POST["fechaIni"]);
        $fechaIni = $arrayFecha[2] . "-" . $arrayFecha[1] . "-" . $arrayFecha[0];
    } else $fechaIni = "";
        
    if($_POST["fechaFin"] != "") { 
        $arrayFecha = explode("/", $_POST["fechaFin"]);
        $fechaFin = $arrayFecha[2] . "-" . $arrayFecha[1] . "-" . $arrayFecha[0];
    } else $fechaFin = "";
        
    $venta = new Venta("../../");
    $venta->genInformeVentas($fechaIni, $fechaFin);
        
    $productos = $venta->getProductos();
        
?>

<head>
    <meta content="es" http-equiv="Content-Language">
    <meta content="text/html; charset=utf-8" http-equiv="Content-Type">
</head>

<table border="1">
    <thead>
        <tr>
            <th>Tipo Docto</th>
            <th>Factura</th>
            <th>Id Producto</th>
            <th>Nombre Producto</th>
            <th>Cantidad</th>
            <th>Precio Unitario</th>
            <th>Sub Total</th>
            <th>Año Venta</th>
            <th>Mes Venta</th>
            <th>Dia Venta</th>
            <th>Familia Padre</th>
            <th>Familia Hija</th>
            <th>Marca</th>
            <th>UM</th>
            <th>Forma de Pago</th>
            <th>Rut Cliente</th>
            <th>DV Cliente</th>
            <th>Razon Social</th>
            <th>Nombre Fantasia</th>
            <th>Nombre Local</th>
            <th>Dia Ruta</th>
            <th>Vendedor</th>
            <th>Rut Empresa</th>
            <th>DV Empresa</th>
            <th>Razon Social Empresa</th>
        </tr>
    </thead>
    <tbody>
        <?php
            $i = 0;
            while($i <= $venta->getTotalRegistros()) {
                echo "<tr>
                          <td>" . $productos[$i]["nom_docto_emitido"] . "</td>
                          <td>" . $productos[$i]["nun_factura"] . "</td>
                          <td>" . $productos[$i]["cod_serfel"] . "</td>
                          <td>" . $productos[$i]["nom_producto"] . "</td>
                          <td>" . getCantEntera($productos[$i]["cantidad"]) . "</td>
                          <td>" . $productos[$i]["precio_unitario"] . "</td>
                          <td align='right'>" . getCantEntera($productos[$i]["sub_total"]) . "</td>
                          <td>" . $productos[$i]["ano_venta"] . "</td>
                          <td>" . $productos[$i]["mes_venta"] . "</td>
                          <td>" . $productos[$i]["dia_venta"] . "</td>
                          <td>" . $productos[$i]["familia_padre"] . "</td>
                          <td>" . $productos[$i]["familia_hija"] . "</td>
                          <td>" . $productos[$i]["marca"] . "</td>
                          <td>" . $productos[$i]["UM"] . "</td>
                          <td>" . $productos[$i]["forma_pago"] . "</td>
                          <td>" . $productos[$i]["rut_cliente"] . "</td>
                          <td>" . $productos[$i]["dv_cliente"] . "</td>
                          <td>" . $productos[$i]["razon_social"] . "</td>
                          <td>" . $productos[$i]["nom_fantasia"] . "</td>
                          <td>" . $productos[$i]["nom_local_cliente"] . "</td>
                          <td>" . $productos[$i]["dia_ruta"] . "</td>
                          <td>" . $productos[$i]["vendedor"] . "</td>
                          <td>" . $productos[$i]["empresa"]->getRutEmpresa() . "</td>
                          <td>" . $productos[$i]["empresa"]->getDVEmpresa() . "</td>
                          <td>" . $productos[$i]["empresa"]->getRazonSocial() . "</td>
                      </tr>";
                $i++;
            }
        ?>
    </tbody>
</table>
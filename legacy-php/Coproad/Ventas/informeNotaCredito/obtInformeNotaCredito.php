<?php
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Venta.php");
include("../../Globales/excelwriter.inc.php");  
include("../../Globales/funciones.php");

    header("Content-type: application/vnd.ms-excel");
    header("Content-Disposition:  filename=\"Informes/Informe Nota Credito " . gmdate("d-m-Y_his") . ".xls\";");
    session_start();

    //if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $json["autorizado"] = "true";
        /*
        if($_POST["fechaIni"] != "") { 
            $arrayFecha = explode("/", $_POST["fechaIni"]);
            $fechaIni = $arrayFecha[2] . "-" . $arrayFecha[1] . "-" . $arrayFecha[0];
        } else $fechaIni = "";
        
        if($_POST["fechaFin"] != "") { 
            $arrayFecha = explode("/", $_POST["fechaFin"]);
            $fechaFin = $arrayFecha[2] . "-" . $arrayFecha[1] . "-" . $arrayFecha[0];
        } else $fechaFin = "";
        */
        $venta = new Venta("../../");
        
        $productos = $venta->genInformeNotaCredito($_GET["fechaIni"], $_GET["fechaFin"]);
        
        
        //$json["informe"] = $venta->genInformeNotaCredito($_POST["fechaIni"], $_POST["fechaFin"]);
        
    //} else $json["autorizado"] = false;
    
    //echo json_encode($json);
?>

<head>
    <meta content="es" http-equiv="Content-Language">
    <meta content="text/html; charset=utf-8" http-equiv="Content-Type">
</head>

<table border="1">
    <thead>
        <tr>
            <th>Factura</th>
            <th>Nota Credito</th>
            <th>Id Producto</th>
            <th>Nombre Producto</th>
            <th>Cantidad</th>
            <th>Precio Unitario</th>
            <th>Sub Total</th>
            <th>Año Venta</th>
            <th>Mes Venta</th>
            <th>Dia Venta</th>
            <th>Año Nota Credito</th>
            <th>Mes Nota Credito</th>
            <th>Dia Nota Credito</th>
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
            <th>Rut Vendedor</th>
            <th>Vendedor</th>
            <th>Rut Empresa</th>
            <th>DV Empresa</th>
            <th>Razon Social Empresa</th>
        </tr>
    </thead>
    <tbody>
        <?php
            $i = 0;
            while($i < $venta->getTotalRegistros()) {
                echo "<tr>
                          <td>" . $productos[$i]["nun_factura"] . "</td>
                          <td>" . $productos[$i]["nun_nota_credito"] . "</td>
                          <td>" . $productos[$i]["cod_serfel"] . "</td>
                          <td>" . $productos[$i]["nom_producto"] . "</td>
                          <td>" . getCantEntera($productos[$i]["cantidad"]) . "</td>
                          <td>" . $productos[$i]["precio_unitario"] . "</td>
                          <td align='right'>" . getCantEntera($productos[$i]["sub_total"]) . "</td>
                          <td>" . $productos[$i]["ano_venta"] . "</td>
                          <td>" . $productos[$i]["mes_venta"] . "</td>
                          <td>" . $productos[$i]["dia_venta"] . "</td>
                          <td>" . $productos[$i]["ano_nota_credito"] . "</td>
                          <td>" . $productos[$i]["mes_nota_credito"] . "</td>
                          <td>" . $productos[$i]["dia_nota_credito"] . "</td>
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
                          <td>" . $productos[$i]["rut_comp_vend"] . "</td>
                          <td>" . $productos[$i]["nom_comp_vend"] . "</td>
                          <td>" . $productos[$i]["empresa"]->getRutEmpresa() . "</td>
                          <td>" . $productos[$i]["empresa"]->getDVEmpresa() . "</td>
                          <td>" . $productos[$i]["empresa"]->getRazonSocial() . "</td>
                      </tr>";
                $i++;
            }
        ?>
    </tbody>
</table>
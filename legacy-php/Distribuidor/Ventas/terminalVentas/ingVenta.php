<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Validación de ingreso de locales de clientes      *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Venta.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $rutEmpresa     = $_POST["rutEmpresa"];
        $idVendedor     = $_POST["idVendedor"];
        $numDoctoEmit   = $_POST["numDoctoEmit"];
        $idLocalCliente = $_POST["idLocalCliente"];
        $idFormaPago    = $_POST["idFormaPago"];
        $producto       = $_POST["producto"];
        $cantidad       = $_POST["cantidad"];
        $descuento      = $_POST["descuento"];
        $iva            = $_POST["iva"];
        $iaba           = $_POST["iaba"];
        $espec          = $_POST["espec"];
        $subTotal       = $_POST["subTotal"];
        $precioTotal    = $_POST["precioTotal"];
        $cantProd       = $_POST["cantProd"];
        
        $arrayFecha = explode("/", $_POST["fechaVenta"]);
        $fechaVenta = $arrayFecha[2] . "-" . $arrayFecha[1] . "-" . $arrayFecha[0];
        
        //echo $rutEmpresa . " - " . $idVendedor . " - " . $numDoctoEmit . " - " . $idLocalCliente . " - " . $idFormaPago . " - " . $cantProd;

        if($numDoctoEmit == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "numDocto";
        } else {
            $venta = new Venta("../../");

            $json["resultado"] = $venta->ingVenta($rutEmpresa, $idVendedor, $numDoctoEmit, $idLocalCliente, $idFormaPago,
                                                  $producto, $cantidad, $descuento, $iva, $iaba, $espec, $subTotal, 
                                                  $precioTotal, $cantProd, $fechaVenta, $_SESSION["usuario"]->getIdUsuario());
            
            
        }

        echo json_encode($json);
    }
?>
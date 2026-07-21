<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Usuario *
 ************************************************************/
include_once("../../Coneccion/coneccion.php");
include_once("../../Clases/Venta.php");
include_once("../../Clases/Usuario.php");
include_once("../../Globales/funciones.php");

    if(isset($_POST["rutEmpresa"]) && isset($_POST["numFactura"]) && isset($_POST["idProducto"])) {
        
        if(isset($_POST["tipoId"])) $tipoId = $_POST["tipoId"];
        else $tipoId = "idProducto";
        
        $venta = new Venta("../../", $_POST["numFactura"], $_POST["rutEmpresa"]);
        
        $producto = $venta->getProductoVenta($_POST["idProducto"], $tipoId);
        
        if($producto != "") {
            $json["idProducto"]       = $producto->getIdProducto();
            $json["codSerfel"]        = $producto->getCodSerfel();
            $json["nomProd"]          = $producto->getNomProducto();
            $json["nomMarca"]         = $producto->getNomMarca();
            $json["nomUM"]            = $producto->getNomUM();
            $json["cantVenta"]        = $producto->getCantidadDisponible();
            $json["precioNetoEntero"] = $producto->getPrecioNeto();
            $json["precioNeto"]       = getFormatoDineroEntero($producto->getPrecioNeto());
            $json["precioEntero"]     = $producto->getPrecioVenta();
            $json["precioVenta"]      = getFormatoDineroEntero($producto->getPrecioVenta());
            $json["porcenDesc"]       = $producto->getPorcenDesc();
            $json["iaba"]             = $producto->getImpIaba();
            $json["espec"]            = $producto->getImpEspec();
            $json["iva"]              = $producto->getIva();
            $json["resultado"]        = 1;
        } else {
            $json["resultado"] = 0;
        }

        echo json_encode($json);
    }
?>

<?php

/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Usuario *
 ************************************************************/
//error_reporting(E_ALL);
//ini_set('display_errors', '1');
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Venta.php");
include("../../Clases/NotaCredito.php");
include("../../Clases/Fecha.php");
require_once __DIR__.'/../../Globales/funciones.php';

    if(isset($_POST["rutEmpresa"]) && isset($_POST["numFactura"])) {
        $venta = new Venta("../../", $_POST["numFactura"], $_POST["rutEmpresa"]);
        $fecha = new Fecha();
        $json = [];
        if($venta->getIdVenta() > 0) {
            $json["idVenta"]            = $venta->getIdVenta();
            $json["rutCompletoEmpresa"] = $venta->getEmpresa()->getRutCompleto();
            $json["razonSocialEmpresa"] = $venta->getEmpresa()->getRazonSocial();
            $json["nomVendedor"]        = $venta->getVendedor()->getNomCompleto();
            $json["rutCompletoCliente"] = $venta->getLocalCliente()->getRutCompleto();
            $json["razonSocialCliente"] = $venta->getLocalCliente()->getRazonSocial();
            $json["nomLocalCliente"]    = $venta->getLocalCliente()->getNomLocalCliente();
            $json["dirLocalCliente"]    = $venta->getLocalCliente()->getDireccionLocalCliente();
            $json["nomFormaPago"]       = $venta->getNomFormaPago();
            $json["fechaVenta"]         = $venta->getDiaVenta() . " de " . $fecha->getNomMes($venta->getMesVenta()) . " del " 
                                                    . $venta->getAnoVenta();
            
            $json["precioTotal"]        = $venta->getTotal();
            
            $notaCredito = new NotaCredito("../../");
            $json["numNotaCredito"] = $notaCredito->obtNuevoNumNotaCredito($_POST["rutEmpresa"]);
            
            $json["resultado"] = 1;
        } else {
            $json["resultado"] = 0;
        }

        echo json_encode(utf8ize($json));
    }
?>

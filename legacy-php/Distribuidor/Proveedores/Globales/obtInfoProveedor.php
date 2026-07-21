<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del         *
 *        Proveedor                                         *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Proveedor.php");

    if(isset($_POST["rutProveedor"])) {
        $proveedor = new Proveedor($_POST["rutProveedor"]);

        $json["rut_completo"]   = $proveedor->getRutCompleto();
        $json["razon_social"]   = $proveedor->getRazonSocial();
        $json["nom_fantasia"]   = $proveedor->getNomFantasia();
        $json["direccion"]      = $proveedor->getDireccionProveedor();
        $json["giro"]           = $proveedor->getGiro();
        $json["fono1"]          = $proveedor->getFono1();
        $json["fono2"]          = $proveedor->getFono2();
        $json["email"]          = $proveedor->getEmail();
        $json["cond_pago"]      = $proveedor->getCondPago();
        $json["glosa_pago"]     = $proveedor->getGlosaPago();
        $json["nom_vendedor"]   = $proveedor->getNomVendedor();
        $json["fono_vendedor"]  = $proveedor->getFonoVendedor();
        $json["email_vendedor"] = $proveedor->getEmailVendedor();
        $json["observaciones"]  = $proveedor->getObservaciones();
        $json["rut"]            = $proveedor->getRutProveedor();
        $json["dv"]             = $proveedor->getDVProveedor();
        $json["estado"]         = $proveedor->getEstado();

        echo json_encode($json);
    }
?>

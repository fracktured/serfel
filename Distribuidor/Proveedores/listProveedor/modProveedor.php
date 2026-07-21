<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Validación de modificación de Proveedores         *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Proveedor.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $rutProveedor  = $_POST["rutProveedor"];
        $razonSocial   = $_POST["razonSocial"];
        $nomFantasia   = $_POST["nomFantasia"];
        $direProveedor = $_POST["direProveedor"];
        $giroProveedor  = $_POST["giroProveedor"];
        $fono1          = $_POST["fono1"];
        $fono2          = $_POST["fono2"];
        $emailProveedor = $_POST["emailProveedor"];
        $condPago       = $_POST["condPago"];
        $glosaPago      = $_POST["glosaPago"];
        $nomVendedor    = $_POST["nomVendedor"];
        $fonoVendedor   = $_POST["fonoVendedor"];
        $emailVendedor  = $_POST["emailVendedor"];
        $observaciones  = $_POST["observaciones"];

        if($razonSocial == "" || $nomFantasia == "" || $direProveedor == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else if($rutProveedor == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "inesperado";
        } else {
            $proveedor = new Proveedor();

            $json["resultado"] = $proveedor->modProveedor($rutProveedor, $razonSocial, $nomFantasia, $direProveedor,
                                                          $giroProveedor, $fono1, $fono2, $emailProveedor, $condPago,
                                                          $glosaPago, $nomVendedor, $fonoVendedor, $emailVendedor,
                                                          $observaciones, $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>

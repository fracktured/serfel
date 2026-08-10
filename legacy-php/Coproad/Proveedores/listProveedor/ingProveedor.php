<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Validación de ingreso de locales de clientes      *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Proveedor.php");
include("../../Globales/funciones.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $rutProveedor   = $_POST["rutProveedor"];
        $razonSocial    = $_POST["razonSocial"];
        $nomFantasia    = $_POST["nomFantasia"];
        $direProveedor  = $_POST["direProveedor"];
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

        if(!validaRut($rutProveedor)) {
            $json["resultado"] = -2;
            $json["tipoError"] = "rut";
        } else if($razonSocial == "" || $nomFantasia == "" || $direProveedor == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else {
            $proveedor = new Proveedor();

            $json["resultado"] = $proveedor->ingProveedor($rutProveedor, $razonSocial, $nomFantasia, $direProveedor,
                                                          $giroProveedor, $fono1, $fono2, $emailProveedor, $condPago,
                                                          $glosaPago, $nomVendedor, $fonoVendedor, $emailVendedor,
                                                          $observaciones, $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>
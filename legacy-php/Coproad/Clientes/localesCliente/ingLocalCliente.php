<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Validación de ingreso de locales de clientes      *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/LocalCliente.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $rutCliente       = $_POST["rutCliente"];
        $nomLocalCliente  = $_POST["nomLocalCliente"];
        $direLocalClie    = $_POST["direLocalClie"];
        $fonoLocalClie    = $_POST["fonoLocalClie"];
        $emailLocalClie   = $_POST["emailContacto"];
        $nomContacto      = $_POST["nomContacto"];
        $apellPatContacto = $_POST["apellPatContacto"];
        $apellMatContacto = $_POST["apellMatContacto"];
        $fonoContacto     = $_POST["fonoContacto"];
        $emailContacto    = $_POST["emailLocalClie"];
        $topeVenta        = $_POST["topeVenta"];
        $topeCredito      = $_POST["topeCredito"];
        $idVendedor       = $_POST["idVendedor"];
        $idFormaPago      = $_POST["idFormaPago"];
        $observaciones    = $_POST["observaciones"];
        $chkTopeVenta     = $_POST["chkTopeVenta"];

        if($emailLocalClie != "" && filter_var($emailLocalClie, FILTER_VALIDATE_EMAIL) == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "email";
        } else if($emailContacto != "" && filter_var($emailContacto, FILTER_VALIDATE_EMAIL) == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "email";
        } else if($nomLocalCliente == "" || $direLocalClie == "" || $_POST["comuna"] == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else if($rutCliente == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "inesperado";
        } else {
            $localCliente = new LocalCliente();

            $json["resultado"] = $localCliente->ingLocalCliente($rutCliente, $nomLocalCliente, $direLocalClie, 
                                                                $fonoLocalClie, $emailLocalClie, $nomContacto, 
                                                                $apellPatContacto, $apellMatContacto, $fonoContacto, 
                                                                $emailContacto, $topeVenta, $topeCredito, $idVendedor,
                                                                $idFormaPago, $observaciones, $_POST["giro"], $_POST["comuna"], $chkTopeVenta, 
                                                                $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>
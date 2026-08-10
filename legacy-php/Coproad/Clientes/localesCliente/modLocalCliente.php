<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
Local * Desc : Validación de modificación de locales de clientes *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/LocalCliente.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $idLocalCliente   = $_POST["idLocalCliente"];
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
        $chkTopeVenta     = $_POST["chkTopeVenta"];

        if($emailLocalClie != "" && filter_var($emailLocalClie, FILTER_VALIDATE_EMAIL) == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "email";
        } else if($emailContacto != "" && filter_var($emailContacto, FILTER_VALIDATE_EMAIL) == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "email";
        } else if($nomLocalCliente == "" || $direLocalClie == "" || $fonoLocalClie == "" || $_POST["comuna"] == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else if($rutCliente == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "inesperado";
        } else {
            $localCliente = new LocalCliente();
            
            $json["resultado"] = $localCliente->modLocalCliente($idLocalCliente, $nomLocalCliente, $direLocalClie, 
                                                                $fonoLocalClie, $emailLocalClie, $nomContacto, 
                                                                $apellPatContacto, $apellMatContacto, $fonoContacto, 
                                                                $emailContacto, $_POST["topeVenta"], $_POST["topeCredito"], 
                                                                $_POST["idFormaPago"], $_POST["comuna"], $_POST["observaciones"],
                                                                $_POST["giro"], $chkTopeVenta, $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>

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

    if ($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        if ( ($_POST["emailLocalClie"] != "" && filter_var($_POST["emailLocalClie"], FILTER_VALIDATE_EMAIL) == "")
                || ($_POST["emailContacto"] != "" && filter_var($_POST["emailContacto"], FILTER_VALIDATE_EMAIL) == "") ) {
            $json["resultado"] = -2;
            $json["tipoError"] = "email";
        } elseif ( $_POST["nomLocalCliente"] == ""
                || $_POST["direLocalClie"] == ""
                || $_POST["fonoLocalClie"] == ""
                || $_POST["comuna"] == "" ) {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } elseif ($_POST["rutCliente"] == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "inesperado";
        } else {
            $localCliente = new LocalCliente();
            
            $json["resultado"] = $localCliente->modLocalCliente($_POST, $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }

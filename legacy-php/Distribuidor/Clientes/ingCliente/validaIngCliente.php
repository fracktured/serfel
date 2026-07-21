<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 29-12-2011                                        *
 * Desc : Validación de registro de clientes                *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Cliente.php");
include("../../Globales/funciones.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $rut         = $_POST["rut"];
        $razonSocial = $_POST["razonSocial"];
        $nomFantasia = $_POST["nomFantasia"];
        $fonoClie    = $_POST["fonoClie"];
        $direClie    = $_POST["direClie"];
        //$comuna      = $_POST["comuna"];
        $emailClie   = $_POST["emailClie"];

        if(!validaRut($rut)) {
            $json["resultado"] = -2;
            $json["tipoError"] = "rut";
        } else if($emailClie != "" && filter_var($emailClie, FILTER_VALIDATE_EMAIL) == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "email";
        } else if($razonSocial == "" || $nomFantasia == "" || $direClie == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else {
            $cliente = new Cliente();

            $json["resultado"] = $cliente->ingCliente($rut, $razonSocial, $nomFantasia, 1, $fonoClie, $direClie, $emailClie, $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>

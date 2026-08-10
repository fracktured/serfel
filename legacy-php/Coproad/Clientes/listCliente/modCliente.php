<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Validación de modificación de usuarios            *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Cliente.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $rutCliente  = $_POST["rutCliente"];
        $razonSocial = $_POST["razonSocial"];
        $nomFantasia = $_POST["nomFantasia"];
        $fonoClie    = $_POST["fonoClie"];
        $direClie    = $_POST["direClie"];
        //$comuna      = $_POST["comuna"];
        $emailClie   = $_POST["emailClie"];
        $chkVentaCDeuda     = $_POST["chkVentaCDeuda"];

        if($emailClie != "" && filter_var($emailClie, FILTER_VALIDATE_EMAIL) == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "email";
        } else if($razonSocial == "" || $nomFantasia == "" || $direClie == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else {
            $cliente = new Cliente();

            $json["resultado"] = $cliente->modCliente($rutCliente, $razonSocial, $nomFantasia, $fonoClie, $direClie,
                                                      $emailClie, $_POST["idListaPrecio"], $chkVentaCDeuda, $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>

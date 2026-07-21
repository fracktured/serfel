<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 12-08-2011                                        *
 * Desc : Validación de registro de usuarios                *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Globales/funciones.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $numero        = $_POST["numero"];
        $rut           = $_POST["rut"];
        $nombres       = $_POST["nombres"];
        $paterno       = $_POST["paterno"];
        $materno       = $_POST["materno"];
        $emailUsu      = $_POST["emailUsu"];
        $fonoUsu       = $_POST["fonoUsu"];
        $direUsu       = $_POST["direUsu"];
        $passwordUsu   = $_POST["passwordUsu"];
        $rePasswordUsu = $_POST["rePasswordUsu"];
        $idTipoUsu     = $_POST["idTipoUsu"];

        if(!validaRut($rut)) {
            $json["resultado"] = -2;
            $json["tipoError"] = "rut";
        } else if(filter_var($emailUsu, FILTER_VALIDATE_EMAIL) == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "email";
        } else if($nombres == "" || $paterno == "" || $fonoUsu == "" || $direUsu == "" || $idTipoUsu == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else if(strlen($passwordUsu) < 6) {
            $json["resultado"] = -2;
            $json["tipoError"] = "largoPass";
        } else if($passwordUsu != $rePasswordUsu) {
            $json["resultado"] = -2;
            $json["tipoError"] = "distintaPass";
        } else {
            $usuario = new Usuario();

            $json["resultado"] = $usuario->ingUsuario($rut, $nombres, $paterno, $materno, $passwordUsu, $idTipoUsu, $fonoUsu, $direUsu,
                                                      $emailUsu, $numero, $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>

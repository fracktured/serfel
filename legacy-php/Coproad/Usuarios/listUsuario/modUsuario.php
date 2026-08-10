<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Validación de modificación de usuarios            *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $idUsuario = $_POST["idUsuario"];
        $numero    = $_POST["numero"];
        $nombres   = $_POST["nombres"];
        $paterno   = $_POST["paterno"];
        $materno   = $_POST["materno"];
        $emailUsu  = $_POST["emailUsu"];
        $fonoUsu   = $_POST["fonoUsu"];
        $direUsu   = $_POST["direUsu"];
        $idTipoUsu = $_POST["idTipoUsu"];
        $passwordUsu   = $_POST["passwordUsu"];
        $rePasswordUsu = $_POST["rePasswordUsu"];

        if(filter_var($emailUsu, FILTER_VALIDATE_EMAIL) == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "email";
        } else if($nombres == "" || $paterno == "" || $fonoUsu == "" || $direUsu == "" || $idTipoUsu == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else if($passwordUsu != "" && strlen($passwordUsu) < 6) {
            $json["resultado"] = -2;
            $json["tipoError"] = "largoPass";
        } else if($passwordUsu != "" && $passwordUsu != $rePasswordUsu) {
            $json["resultado"] = -2;
            $json["tipoError"] = "distintaPass";
        } else {
            $usuario = new Usuario();

            $json["resultado"] = $usuario->modUsuario($idUsuario, $nombres, $paterno, $materno, $idTipoUsu, $fonoUsu,
                                                      $direUsu, $emailUsu, $numero, $passwordUsu, $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>

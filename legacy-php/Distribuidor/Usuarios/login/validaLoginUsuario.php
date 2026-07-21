<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-11-2011                                        *
 * Desc : Validación de logueo de usuarios                  *
 ************************************************************/
//error_reporting(E_ALL);
//ini_set('display_errors', '1');
//error_reporting(0);
//ini_set('display_errors', 0);
//error_reporting(E_ALL ^ (E_NOTICE | E_WARNING | E_DEPRECATED));
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
require_once '../../Clases/Constantes/UsuarioCONST.php';

    $rut  = $_POST["rut"];
    $pass = $_POST["pass"];

    $usuario = new Usuario($rut, $pass);

    if($usuario->getEstado() == 1 && 
            ($usuario->getIdTipoUsuario() == UsuarioCONST::ADMINISTRADOR || $usuario->getIdTipoUsuario() == UsuarioCONST::SECRETARIO)) {
        session_start();

        $_SESSION["usuario"] = $usuario;
    }

    $json["resultado"] = $usuario->getEstado();

    echo json_encode($json);
?>

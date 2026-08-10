<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-11-2011                                        *
 * Desc : Validación de logueo de usuarios                  *
 ************************************************************/
//error_reporting(E_ALL);
error_reporting(0);
//ini_set('display_errors', '1');
include("../../Coneccion/coneccion.php");
require_once "../../Clases/Usuario.php";
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

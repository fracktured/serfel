<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 26-12-2011                                        *
 * Desc : Eliminacion de Usuarios                           *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");

    session_start();

    if(isset($_POST["idUsuario"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $usuario = new Usuario();
    
        $json["resultado"] = $usuario->elimUsuario($_POST["idUsuario"], $_SESSION["usuario"]->getIdUsuario());

        echo json_encode($json);
    }
?>

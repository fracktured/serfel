<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 26-12-2011                                        *
 * Desc : Eliminacion de Usuarios                           *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Cliente.php");

    session_start();

    if(isset($_POST["rutCliente"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $cliente = new Cliente();
    
        $json["resultado"] = $cliente->elimCliente($_POST["rutCliente"], $_SESSION["usuario"]->getIdUsuario());

        echo json_encode($json);
    }
?>

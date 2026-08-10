<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 26-12-2011                                        *
 * Desc : Eliminacion de Usuarios                           *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/LocalCliente.php");

    session_start();

    if(isset($_POST["idLocalCliente"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $localCliente = new LocalCliente();
    
        $json["resultado"] = $localCliente->elimLocalCliente($_POST["idLocalCliente"], $_SESSION["usuario"]->getIdUsuario());

        echo json_encode($json);
    }
?>

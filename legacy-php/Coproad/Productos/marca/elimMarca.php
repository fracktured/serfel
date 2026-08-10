<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 26-12-2011                                        *
 * Desc : Eliminacion de Usuarios                           *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Marca.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $marca = new Marca();
        $json["resultado"] = $marca->elimMarca($_POST["idMarca"]);
        echo json_encode($json);
    }
?>

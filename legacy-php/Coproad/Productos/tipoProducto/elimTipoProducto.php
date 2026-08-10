<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 26-12-2011                                        *
 * Desc : Eliminacion de Usuarios                           *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/TipoProducto.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $tipoProducto = new TipoProducto();    
        $json["resultado"] = $tipoProducto->elimTipoProducto($_POST["idTipoProducto"]);
        echo json_encode($json);
    }
?>

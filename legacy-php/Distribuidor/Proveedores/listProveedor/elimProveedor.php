<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 26-12-2011                                        *
 * Desc : Eliminacion de Usuarios                           *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Proveedor.php");

    session_start();

    if(isset($_POST["rutProveedor"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $proveedor = new Proveedor();
    
        $json["resultado"] = $proveedor->elimProveedor($_POST["rutProveedor"], $_SESSION["usuario"]->getIdUsuario());

        echo json_encode($json);
    }
?>
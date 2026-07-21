<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 26-12-2011                                        *
 * Desc : Eliminacion de Usuarios                           *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Producto.php");

    session_start();

    if(isset($_POST["idProducto"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $producto = new Producto();
    
        $json["resultado"] = $producto->elimProducto($_POST["idProducto"], $_SESSION["usuario"]->getIdUsuario());

        echo json_encode($json);
    }
?>

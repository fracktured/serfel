<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 26-12-2011                                        *
 * Desc : Eliminacion de Usuarios                           *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Stock.php");

    session_start();

    if(isset($_POST["idProducto"]) && isset($_POST["idBodega"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $stock = new Stock();
    
        $json["resultado"] = $stock->elimNivelStock($_POST["idBodega"], $_POST["idProducto"], $_SESSION["usuario"]->getIdUsuario());

        echo json_encode($json);
    }
?>

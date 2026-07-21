<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 26-12-2011                                        *
 * Desc : Eliminacion de Usuarios                           *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Merma.php");

    session_start();

    if(isset($_POST["idProducto"]) && isset($_POST["idBodega"]) && isset($_POST["fechaMerma"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $merma = new Merma();
    
        $json["resultado"] = $merma->elimMerma($_POST["idBodega"], $_POST["idProducto"], $_POST["fechaMerma"], 
                                               $_SESSION["usuario"]->getIdUsuario());

        echo json_encode($json);
    }
?>

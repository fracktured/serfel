<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 26-12-2011                                        *
 * Desc : Eliminacion de Usuarios                           *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/ListaPrecio.php");

    session_start();

    if(isset($_POST["idListaPrecio"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $listaPrecio = new ListaPrecio();
    
        $json["resultado"] = $listaPrecio->elimListaPrecio($_POST["idListaPrecio"], $_SESSION["usuario"]->getIdUsuario());

        echo json_encode($json);
    }
?>

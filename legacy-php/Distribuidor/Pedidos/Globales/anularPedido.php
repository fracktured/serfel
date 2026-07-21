<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 26-12-2011                                        *
 * Desc : Eliminacion de Usuarios                           *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Pedido.php");

    session_start();

    if(isset($_POST["idPedido"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $pedido = new Pedido();
    
        $json["resultado"] = $pedido->anularPedido($_POST["idPedido"], $_SESSION["usuario"]->getIdUsuario());

        echo json_encode($json);
    }
?>

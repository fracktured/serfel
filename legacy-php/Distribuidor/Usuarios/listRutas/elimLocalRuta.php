<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 26-12-2011                                        *
 * Desc : Eliminacion de Usuarios                           *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Ruta.php");

    session_start();

    if(isset($_POST["idLocal"]) && isset($_POST["idRuta"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $ruta = new Ruta();
    
        $json["resultado"] = $ruta->elimLocalRuta($_POST["idLocal"], $_POST["idRuta"], $_SESSION["usuario"]->getIdUsuario());

        echo json_encode($json);
    }
?>

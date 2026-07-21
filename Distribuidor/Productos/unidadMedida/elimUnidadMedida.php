<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 26-12-2011                                        *
 * Desc : Eliminacion de Usuarios                           *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/UnidadMedida.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $unidadMedida = new UnidadMedida();
        $json["resultado"] = $unidadMedida->elimUnidadMedida($_POST["idUnidadMedida"]);
        echo json_encode($json);
    }
?>

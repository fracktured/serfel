<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Validación de modificación de locales de clientes *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/UnidadMedida.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {

        $idUnidadMedida  = $_POST["idUnidadMedida"];
        $descripcion = $_POST["descripcion"];

        if($descripcion == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        }  else {

            $unidadMedida = new UnidadMedida();

            $json["resultado"] = $unidadMedida->modUnidadMedida($idUnidadMedida, $descripcion);
        }

        echo json_encode($json);
    }
?>
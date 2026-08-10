<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Validación de modificación de locales de clientes *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Marca.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {

        $idMarca  = $_POST["idMarca"];
        $descripcion = $_POST["descripcion"];

        if($descripcion == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        }  else {

            $marca = new Marca();

            $json["resultado"] = $marca->modMarca($idMarca, $descripcion);
        }

        echo json_encode($json);
    }
?>
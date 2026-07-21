<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Validación de modificación de locales de clientes *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/TipoProducto.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {

        $idTipoProducto  = $_POST["idTipoProducto"];
        $descripcion = $_POST["descripcion"];
        $nivel1 = $_POST["nivel1"];

        if($descripcion == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        }  else {

            $tipoProducto = new TipoProducto();

            $json["resultado"] = $tipoProducto->modTipoProducto($idTipoProducto, $descripcion, $nivel1, $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>

<?php

/* * **********************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Validación de ingreso de locales de clientes      *
 * ********************************************************** */
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/TipoProducto.php");
include("../../Globales/funciones.php");

session_start();

if ($_SESSION["usuario"]->getIdTipoUsuario() == 1) {

    $nombre = $_POST["nombre"];
    $descripcion = $_POST["descripcion"];
    $nivel1 = $_POST["nivel1"];

    if ($nombre == "" || $descripcion == "") {
        $json["resultado"] = -2;
        $json["tipoError"] = "vacios";
    } else {
        $tipoProducto = new TipoProducto();
        $json["resultado"] = $tipoProducto->ingTipoProducto($nombre, $descripcion, $nivel1, $_SESSION["usuario"]->getIdUsuario());
    }
    echo json_encode($json);
}
?>
<?php

/* * **********************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Validación de ingreso de locales de clientes      *
 * ********************************************************** */
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/UnidadMedida.php");
include("../../Globales/funciones.php");

session_start();

if ($_SESSION["usuario"]->getIdTipoUsuario() == 1) {

    $nombre = $_POST["nombre"];
    $descripcion = $_POST["descripcion"];

    if ($nombre == "" || $descripcion == "") {
        $json["resultado"] = -2;
        $json["tipoError"] = "vacios";
    } else {
        $undiadMedida = new UnidadMedida();
        $json["resultado"] = $undiadMedida->ingUnidaMedida($nombre, $descripcion);
    }
    echo json_encode($json);
}
?>
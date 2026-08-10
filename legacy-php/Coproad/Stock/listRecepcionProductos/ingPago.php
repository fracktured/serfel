<?php

/* * **********************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Validación de ingreso de locales de clientes      *
 * ********************************************************** */
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Recepcion.php");
include("../../Globales/funciones.php");

session_start();

if ($_SESSION["usuario"]->getIdTipoUsuario() == 1) {

    $idRecepcion = $_POST["idRecepcion"];
    $idTipoPago = $_POST["idTipoPago"];
    $observacion = $_POST["observacion"];

    if ($idRecepcion == "") {
        $json["resultado"] = -2;
    } else {
        $recepcion = new Recepcion();
        $json["resultado"] = $recepcion->ingPago($idRecepcion, $idTipoPago,$observacion);
    }
    echo json_encode($json);
}
?>
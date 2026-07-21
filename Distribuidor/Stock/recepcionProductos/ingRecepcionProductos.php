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

    $idTipoDocumento = $_POST["idTipoDocumento"];
    $idBodega = $_POST["idBodega"];
    $rutProveedor = $_POST["rutProveedor"];
    $rutEmpresa = $_POST["rutEmpresa"];
    $fecDoc = $_POST["fecDoc"];
    $numDocto = $_POST["numDocto"];

    $idTipoPago = $_POST["idTipoPago"];
    $observacion = $_POST["observacion"];

    $idProducto = $_POST["idProducto"];
    $cantidad = $_POST["cantidad"];
    $cantidadRecep = $_POST["cantidadRecep"];
    $valor = $_POST["valor"];
    $largo = $_POST["largo"];

    $recepcion = new Recepcion();
    $json["resultado"] = $recepcion->ingRecepcion($idTipoDocumento, $idBodega, $rutProveedor, $fecDoc, $numDocto, 
                                                  $_SESSION["usuario"]->getIdUsuario(), $idProducto, $cantidad, $valor, 
                                                  $largo, $idTipoPago, $observacion, $rutEmpresa, $cantidadRecep);

    echo json_encode($json);
}
?>
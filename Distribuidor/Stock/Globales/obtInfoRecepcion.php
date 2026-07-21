<?php

/* * **********************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Usuario *
 * ********************************************************** */
include("../../Coneccion/coneccion.php");
include("../../Clases/Recepcion.php");

if (isset($_POST["idRecepcion"])) {

    $recepcion = new Recepcion($_POST["idRecepcion"]);

    $json["rutCompleto"] = $recepcion->getRutCompleto();
    $json["razonSocial"] = $recepcion->getRazonSocial();
    $json["fechaEmisionDocto"] = $recepcion->getFechaEmisionDocto();
    $json["nomTipoDocto"] = $recepcion->getNomTipoDocto();
    $json["numDocto"] = $recepcion->getNumDocto();
    $json["nomBodega"] = $recepcion->getNomBodega();
    $json["nomTipoPago"] = $recepcion->getNomTipoPago();
    $json["observacion"] = $recepcion->getObservacion();
    $json["idTipoPago"] = $recepcion->getIdTipoPago();

    echo json_encode($json);
}
?>

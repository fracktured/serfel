<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Validación de ingreso de locales de clientes      *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Merma.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $idBodega   = $_POST["idBodega"];
        $idProducto = $_POST["idProducto"];
        $cantidad   = $_POST["cantidad"];
        $motivo     = $_POST["motivo"];

        if($idBodega == "" || $idProducto == "" || $cantidad == "" || $motivo == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else {
            $merma = new Merma();
            
            if($cantidad < 0) $cantidad *= -1;

            $json["resultado"] = $merma->ingMerma($idBodega, $idProducto, $cantidad, $motivo, 
                                                  $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>
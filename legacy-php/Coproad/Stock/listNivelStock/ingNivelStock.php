<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Validación de ingreso de locales de clientes      *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Stock.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $idBodega   = $_POST["idBodega"];
        $idProducto = $_POST["idProducto"];
        $minimo     = $_POST["minimo"];
        $puntoOrden = $_POST["puntoOrden"];
        $meses      = $_POST["meses"];

        if($idBodega == "" || $idProducto == "" || $minimo == "" || $puntoOrden == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else {
            if($meses == "") $meses = 0;
            
            $stock = new Stock();

            $json["resultado"] = $stock->ingNivelStock($idBodega, $idProducto, $minimo, $puntoOrden, $meses,
                                                       $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>
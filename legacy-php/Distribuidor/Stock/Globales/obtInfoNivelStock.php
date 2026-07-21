<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Usuario *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Stock.php");

    if(isset($_POST["idProducto"]) && isset($_POST["idBodega"])) {
        $stock = new Stock($_POST["idProducto"], $_POST["idBodega"], "nivelStock");

        $json["nom_producto"] = $stock->getNomProducto();
        $json["nom_bodega"]   = $stock->getNomBodega();
        $json["minimo"]       = $stock->getMinimo();
        $json["punto_orden"]  = $stock->getPuntoOrden();
        $json["meses"]        = $stock->getMeses();

        echo json_encode($json);
    }
?>

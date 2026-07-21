<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Usuario *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Bodega.php");

    if(isset($_POST["idBodega"])) {

        $bodega = new Bodega($_POST["idBodega"]);

        $json["nombre"] = $bodega->getNomBodega();
        $json["descripcion"] = $bodega->getDescBodega();
        $json["tipoBodega"] = $bodega->getIdTipoBodega();

        echo json_encode($json);
    }
?>


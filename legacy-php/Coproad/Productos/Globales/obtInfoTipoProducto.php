<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Usuario *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/TipoProducto.php");

    if(isset($_POST["idTipoProducto"])) {

        $tipoProducto = new TipoProducto($_POST["idTipoProducto"]);

        $json["nombre"] = $tipoProducto->getNom_tipo_producto();
        $json["descripcion"] = $tipoProducto->getDesc_tipo_producto();
        $json["nivel1"] = $tipoProducto->getNivel_1();
        $json["nivel2"]    = $tipoProducto->getNivel_2();

        echo json_encode($json);
    }
?>

<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Usuario *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Marca.php");

    if(isset($_POST["idMarca"])) {

        $marca = new Marca($_POST["idMarca"]);

        $json["nombre"] = $marca->getNom_marca();
        $json["descripcion"] = $marca->getNom_marca();

        echo json_encode($json);
    }
?>

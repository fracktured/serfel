<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Usuario *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/UnidadMedida.php");

    if(isset($_POST["idUnidadMedida"])) {

        $unidadMedida = new UnidadMedida($_POST["idUnidadMedida"]);

        $json["nombre"] = $unidadMedida->getNom_UM();
        $json["descripcion"] = $unidadMedida->getDesc_UM();

        echo json_encode($json);
    }
?>

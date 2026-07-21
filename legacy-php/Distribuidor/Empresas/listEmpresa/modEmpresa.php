<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Validación de modificación de locales de clientes *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Empresa.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $rutEmpresa  = $_POST["rutEmpresa"];
        $razonSocial = $_POST["razonSocial"];
        $nomFantasia = $_POST["nomFantasia"];
        $direEmpresa = $_POST["direEmpresa"];

        if($razonSocial == "" || $nomFantasia == "" || $direEmpresa == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else if($rutEmpresa == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "inesperado";
        } else {
            $empresa = new Empresa();

            $json["resultado"] = $empresa->modEmpresa($rutEmpresa, $razonSocial, $nomFantasia, $direEmpresa, 
                                                      $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>

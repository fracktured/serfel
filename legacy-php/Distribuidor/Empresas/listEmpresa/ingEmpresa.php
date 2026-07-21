<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Validación de ingreso de locales de clientes      *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Empresa.php");
include("../../Globales/funciones.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $rutEmpresa  = $_POST["rutEmpresa"];
        $razonSocial = $_POST["razonSocial"];
        $nomFantasia = $_POST["nomFantasia"];
        $direEmpresa = $_POST["direEmpresa"];

        if(!validaRut($rutEmpresa)) {
            $json["resultado"] = -2;
            $json["tipoError"] = "rut";
        } else if($razonSocial == "" || $nomFantasia == "" || $direEmpresa == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else {
            $empresa = new Empresa();

            $json["resultado"] = $empresa->ingEmpresa($rutEmpresa, $razonSocial, $nomFantasia, $direEmpresa, 
                                                      $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>
<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Validación de ingreso de locales de clientes      *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Ruta.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {

        $ruta = new Ruta();
        
        $json["resultado"] = $ruta->ingLocalRuta($_POST["idLocal"], $_POST["idRuta"], $_POST["idVendedor"], $_SESSION["usuario"]->getIdUsuario());

        echo json_encode($json);
    }
?>
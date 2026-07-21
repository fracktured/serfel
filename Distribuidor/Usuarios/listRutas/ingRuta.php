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
        $nomRuta = $_POST["nomNuevaRuta"];

        if($nomRuta == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else {
            $ruta = new Ruta();

            $json["resultado"] = $ruta->ingRuta($nomRuta, $_POST["idVendedor"], $_POST["numDia"], $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>
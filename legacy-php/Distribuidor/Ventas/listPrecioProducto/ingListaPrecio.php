<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Validación de ingreso de locales de clientes      *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/ListaPrecio.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $nomListaPrecio = $_POST["nomListaPrecio"];

        if($nomListaPrecio == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else {
            $listaPrecio = new ListaPrecio();

            $json["resultado"] = $listaPrecio->ingListaPrecio($nomListaPrecio, $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>
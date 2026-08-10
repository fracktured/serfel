<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Validación de ingreso de locales de clientes      *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Venta.php");
require_once __DIR__.'/../../Clases/Constantes/UsuarioCONST.php';

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == UsuarioCONST::ADMINISTRADOR
            || $_SESSION["usuario"]->getIdTipoUsuario() == UsuarioCONST::SECRETARIO) {
        $ventas    = $_POST["ventas"];
        $entregado = $_POST["entregado"];

        $venta = new Venta("../../");

        foreach($ventas as $idVenta) {
            $venta->cambiarEstadoEntrega($idVenta, $entregado, $_SESSION["usuario"]->getIdUsuario());
        }
        $json["resultado"] = 1;

        echo json_encode($json);
    }
?>
<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Validación de ingreso de locales de clientes      *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/PrecioProducto.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $porcenVariacion = $_POST["porcenVariacion"];
        $productos       = $_POST["productos"];
        $totalProductos  = $_POST["totalProductos"];
        $idListaPrecio   = $_POST["idListaPrecio"];

        if($totalProductos == "" || $porcenVariacion == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else {
            $precioProducto = new PrecioProducto("../../");

            $i = 0;
            while($i <= $totalProductos) {
                $precioProducto->ingPorcenDesc($idListaPrecio, $productos[$i], $porcenVariacion, $_SESSION["usuario"]->getIdUsuario());
                $i++;
            }
            $json["resultado"] = 1;
        }

        echo json_encode($json);
    }
?>
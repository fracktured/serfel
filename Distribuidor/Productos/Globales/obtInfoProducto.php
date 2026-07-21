<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Usuario *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/TipoProducto.php");
include("../../Clases/Producto.php");
include("../../Clases/Venta.php");

    if(isset($_POST["idProducto"])) {
        $venta = new Venta();
        $producto = new Producto($_POST["idProducto"]);

        $json["codSerfel"]  = $producto->getCodSerfel();
        $json["nomProd"]    = $producto->getNomProducto();
        $json["idMarca"]    = $producto->getIdMarca();
        $json["nomMarca"]   = $producto->getNomMarca();
        $json["idUM"]       = $producto->getIdUM();
        $json["nomUM"]      = $producto->getNomUM();
        $json["descProd"]   = $producto->getDescProducto();
        $json["codBarra"]   = $producto->getCodBarraProducto();
        $json["idTipoProd"] = $producto->getIdTipoProducto();
        $json["estado"]     = $producto->getEstado();
        $json["maxPorDesc"] = $producto->getMaxPorcenDesc();
        $json["idImp"]      = $producto->getImpuesto();
        $json["impAdic"]    = $venta->getImpuesto($producto->getImpuesto());
        $json["usa_porciones"] = $producto->usa_porciones;

        echo json_encode($json);
    }
?>

<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Usuario *
 ************************************************************/
include_once("../../Coneccion/coneccion.php");
include_once("../../Clases/TipoProducto.php");
include_once("../../Clases/PrecioProducto.php");
include_once("../../Clases/Recepcion.php");
include_once("../../Clases/Fecha.php");
include_once("../../Globales/funciones.php");

    if(isset($_POST["codSerfel"])) {
        $precioProducto = new PrecioProducto("../../", 1, $_POST["codSerfel"], "codSerfel");
        $venta = new Venta("../../");
        $fecha = new Fecha();
        $recepcion = new Recepcion();
        $recepcion->genInfoUltCompraProducto($precioProducto->getIdProducto());
        
        $ivaVenta = $precioProducto->getPrecioNeto() * $venta->getIva() / 100;
        $ivaCosto = $precioProducto->getCostoProm() * $venta->getIva() / 100;
        
        $json["idProducto"]      = $precioProducto->getIdProducto();
        $json["codSerfel"]       = $precioProducto->getCodSerfel();
        $json["nomProd"]         = $precioProducto->getNomProducto();
        //$json["idMarca"]       = $producto->getIdMarca();
        $json["nomMarca"]        = $precioProducto->getNomMarca();
        $json["nomUM"]           = $precioProducto->getNomUM();
        $json["tipoProdPadre"]   = $precioProducto->getTipoProducto()->getNombreFamilia();
        $json["tipoProd"]        = $precioProducto->getTipoProducto()->getNom_tipo_producto();
        $json["costoProm"]       = getFormatoDinero($precioProducto->getCostoProm());
        $json["IVAcostoProm"]    = getFormatoDinero($ivaCosto);
        $json["costoPromConIVA"] = getFormatoDinero(round($ivaCosto + $precioProducto->getCostoProm()));
        $json["cantidad"]        = getCantConPuntosYDecimales($precioProducto->getCantidadStock());
        $json["costoStock"]      = getFormatoDinero($precioProducto->getCantidadStock() * $precioProducto->getCostoProm());
        $json["precioNetoVenta"] = getFormatoDineroEntero($precioProducto->getPrecioNeto());
        $json["IVAprecioVenta"]  = getFormatoDinero($ivaVenta);
        $json["precioVenta"]     = getFormatoDineroEntero(round($precioProducto->getPrecioVenta()));
        $json["impuesto"]        = $precioProducto->getImpuesto();
        $json["ultFechaCompra"]  = $fecha->getFormatoFecha($precioProducto->getUltFechaCompra());
        $json["rutProveedor"]    = $recepcion->getRutCompleto();
        $json["razonSocial"]     = $recepcion->getRazonSocial();
        
        $margen = $precioProducto->getPrecioNeto() - $precioProducto->getCostoProm();
        $json["valorMargen"]     = getFormatoDinero($margen);
        $json["porcenMargen"]    = getCantConPuntosYDecimales($margen / $precioProducto->getPrecioNeto() * 100) . "%";
        
        if($precioProducto->getImpuesto() == 1)      $json["nomImpuesto"] = "IABA";
        else if($precioProducto->getImpuesto() == 2) $json["nomImpuesto"] = "HARINA";
            
        if($precioProducto->getImpuesto() > 0) {
            $impAdic = $venta->getImpuesto($precioProducto->getImpuesto());
            $json["porcenImp"]     = $impAdic . "%";
            $json["precioImpAdic"] = getFormatoDinero($precioProducto->getPrecioNeto() * $impAdic / 100);
        }
        //$json["estado"]        = $precioProducto->getProducto()->getEstado();

        echo json_encode($json);
    }
?>

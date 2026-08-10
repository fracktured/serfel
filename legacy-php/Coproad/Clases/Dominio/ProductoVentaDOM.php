<?php

require_once __DIR__ . '/../Constantes/BodegaCONST.php';
require_once __DIR__ . '/../DAO/ProductoVentaDAO.php';
require_once __DIR__ . '/../Dominio/StockDOM.php';

/**
 * Description of ProductoVentaDOM
 *
 * @author ccastro
 */
class ProductoVentaDOM {
    
    
    /**
     * Reduce el Stock de los productos de la venta
     * 
     * @param PDO $oPDO
     * @param int $idVenta
     */
    public static function reducirStock($oPDO, $idVenta) {
        $listProductoVenta = ProductoVentaDAO::listProductoVenta($oPDO, $idVenta);
        foreach ($listProductoVenta as $oProductoVenta) {
            $oStock = StockDAO::obtStock($oPDO, BodegaCONST::BODEGA_CENTRAL, $oProductoVenta->id_producto);
            if($oStock) {
                $oStock->cantidad -= $oProductoVenta->cantidad;
            }

            StockDOM::modStock($oPDO, $oStock);
        }
    }
    
    
    /**
     * Devuelve el Stock de los productos de la venta
     * 
     * @param PDO $oPDO
     * @param int $idVenta
     */
    public static function restituirStock($oPDO, $idVenta) {
        $listProductoVenta = ProductoVentaDAO::listProductoVenta($oPDO, $idVenta);
        foreach ($listProductoVenta as $oProductoVenta) {
            $oStock = StockDAO::obtStock($oPDO, BodegaCONST::BODEGA_CENTRAL, $oProductoVenta->id_producto);
            if($oStock) {
                $oStock->cantidad += $oProductoVenta->cantidad;
            }

            StockDOM::modStock($oPDO, $oStock);
        }
    }
    
}

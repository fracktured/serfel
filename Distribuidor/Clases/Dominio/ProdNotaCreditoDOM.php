<?php
require_once __DIR__ . '/../Constantes/BodegaCONST.php';
require_once __DIR__ . '/../DAO/ProdNotaCreditoDAO.php';
require_once __DIR__ . '/../Dominio/StockDOM.php';

/**
 * Description of ProdNotaCreditoDOM
 *
 * @author ccastro
 */
class ProdNotaCreditoDOM {
    
    
    /**
     * Reduce el Stock de los productos de la nota de crédito
     * 
     * @param PDO $oPDO
     * @param int $idNotaCredito
     */
    public static function reducirStock($oPDO, $idNotaCredito) {
        $listProdNotaCredito = ProdNotaCreditoDAO::listProductoNotaCredito($oPDO, $idNotaCredito);
        foreach ($listProdNotaCredito as $oProdNotaCredito) {
            $oStock = StockDAO::obtStock($oPDO, BodegaCONST::BODEGA_CENTRAL, $oProdNotaCredito->id_producto);
            $oStock->cantidad -= $oProdNotaCredito->cantidad;

            StockDOM::modStock($oPDO, $oStock);
        }
    }
    
    
    /**
     * Devuelve el Stock de los productos de la nota de crédito
     * 
     * @param PDO $oPDO
     * @param int $idNotaCredito
     */
    public static function restituirStock($oPDO, $idNotaCredito) {
        $listProdNotaCredito = ProdNotaCreditoDAO::listProductoNotaCredito($oPDO, $idNotaCredito);
        foreach ($listProdNotaCredito as $oProdNotaCredito) {
            $oStock = StockDAO::obtStock($oPDO, BodegaCONST::BODEGA_CENTRAL, $oProdNotaCredito->id_producto);
            $oStock->cantidad += $oProdNotaCredito->cantidad;

            StockDOM::modStock($oPDO, $oStock);
        }
    }
    
}

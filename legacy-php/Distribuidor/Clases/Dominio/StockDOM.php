<?php

require_once __DIR__ . '/../DAO/StockDAO.php';
require_once __DIR__ . '/../POJO/Stock.php';

/**
 * Description of StockDOM
 *
 * @author ccastro
 */
class StockDOM {


    /**
     * Modifica Stock. 
     * Si no existe registro, se inserta el nuevo valor.
     * 
     * @param PDO $oPDO
     * @param Stock $oStock
     */
    public static function modStock($oPDO, $oStock) {
        $oAuxStock = StockDAO::obtStock($oPDO, $oStock->id_bodega, $oStock->id_producto);
        
        // Log de los valores de $oAuxStock y $oStock
        error_log("StockDOM::modStock - oAuxStock: " . print_r($oAuxStock, true));
        error_log("StockDOM::modStock - oStock: " . print_r($oStock, true));
        
        if($oAuxStock == null) {
            StockDAO::ingStock($oPDO, $oStock);
        } else {
            StockDAO::modStock($oPDO, $oStock);
        }
    }
    
}

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
        
        if($oAuxStock == null) {
            StockDAO::ingStock($oPDO, $oStock);
        } else {
            StockDAO::modStock($oPDO, $oStock);
        }
    }
    
}

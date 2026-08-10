<?php

require_once __DIR__ . '/../POJO/Stock.php';

/**
 * Description of StockDAO
 *
 * @author christian
 */
class StockDAO {
    
    
    /**
     * Retorna Stock según PK
     * 
     * @param PDO $oPDO
     * @param int $idBodega
     * @param int $idProducto
     * @return Stock
     */
    public static function obtStock($oPDO, $idBodega, $idProducto) {
        $cSql = 
            "SELECT * 
             FROM 50_m_stock 
             WHERE id_bodega = :id_bodega
               AND id_producto = :id_producto";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_bodega', $idBodega, PDO::PARAM_INT);
        $oStmt->bindParam(':id_producto', $idProducto, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'Stock');

        $oStock = null;
        foreach ($rs as $o) {
            $oStock = $o;
        }

        return $oStock;
    }
    
    
    /**
     * Inserta Stock
     * 
     * @param PDO $oPDO
     * @param Stock $oStock
     * @return PDO
     */
    public static function ingStock($oPDO, $oStock) {
        $cSql = 
            "INSERT INTO 50_m_stock (id_bodega, id_producto, cantidad)
                VALUES (:id_bodega, :id_producto, :cantidad)";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_bodega', $oStock->id_bodega, PDO::PARAM_INT);
        $oStmt->bindParam(':id_producto', $oStock->id_producto, PDO::PARAM_INT);
        $oStmt->bindParam(':cantidad', $oStock->cantidad, PDO::PARAM_STR);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }
    
    
    /**
     * Modifica Stock
     * 
     * @param PDO $oPDO
     * @param Stock $oStock
     * @return PDO
     */
    public static function modStock($oPDO, $oStock) {
        $cSql = 
            "UPDATE 50_m_stock 
                SET cantidad = :cantidad
            WHERE id_bodega = :id_bodega
              AND id_producto = :id_producto";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_bodega', $oStock->id_bodega, PDO::PARAM_INT);
        $oStmt->bindParam(':id_producto', $oStock->id_producto, PDO::PARAM_INT);
        $oStmt->bindParam(':cantidad', $oStock->cantidad, PDO::PARAM_STR);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }
}

?>

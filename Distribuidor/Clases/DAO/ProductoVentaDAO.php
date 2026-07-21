<?php

require_once __DIR__ . '/../POJO/ProductoVenta.php';

/**
 * Description of ProductoVentaDAO
 *
 * @author ccastro
 */
class ProductoVentaDAO {
    
    
    /**
     * Ingresa ProductoVenta
     *  
     * @param PDO $oPDO
     * @param ProductoVenta $oProductoVenta
     */
    public static function ingProductoVenta($oPDO, $oProductoVenta) {
        $cSql = 
            "INSERT INTO 40_m_producto_venta (id_venta,
                                              id_producto,
                                              cantidad,
                                              precio,
                                              porcen_desc,
                                              precio_neto)
             VALUES (:id_venta,
                     :id_producto,
                     :cantidad,
                     :precio,
                     :porcen_desc,
                     :precio_neto)";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_venta', $oProductoVenta->id_venta, PDO::PARAM_INT);
        $oStmt->bindParam(':id_producto', $oProductoVenta->id_producto, PDO::PARAM_INT);
        $oStmt->bindParam(':cantidad', $oProductoVenta->cantidad, PDO::PARAM_STR);
        $oStmt->bindParam(':precio', $oProductoVenta->precio, PDO::PARAM_INT);
        $oStmt->bindParam(':porcen_desc', $oProductoVenta->porcen_desc, PDO::PARAM_INT);
        $oStmt->bindParam(':precio_neto', $oProductoVenta->precio_neto, PDO::PARAM_INT);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }



    public static function obtProductoVenta($db, $idVenta, $idProducto) {
        $query = "SELECT * FROM 40_m_producto_venta WHERE id_venta = " . $idVenta . " AND id_producto = " . $idProducto;
        
        $resDB = mysql_query($query, $db) or die(mysql_error());
                
        $i = 0;
        $producto = null;
        while ($filaDB = mysql_fetch_assoc($resDB)) {
            $producto = new ProductoVenta($filaDB["id_venta"], $filaDB["id_producto"], $filaDB["cantidad"], $filaDB["precio"], 
                                          $filaDB["porcen_desc"], $filaDB["precio_neto"]);
        }
        
        return $producto;
    }
    
    
    /**
     * Retorna lista ProductoVenta según idVenta.
     * 
     * @param PDO $oPDO
     * @param int $idVenta
     * @return Array ProductoVenta
     */
    public static function listProductoVenta($oPDO, $idVenta) {
        $cSql = 
            "SELECT * 
             FROM 40_m_producto_venta 
             WHERE id_venta = :id_venta";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_venta', $idVenta, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'ProductoVenta');

        return $rs;
    }
}

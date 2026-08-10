<?php

/**
 * Description of ProductoRecepcionDAO
 *
 * @author ccastro
 */
class ProductoRecepcionDAO {
    
    public static function listProductoRecepcion($oPDO, $idRecepcion) {
        require_once __DIR__ . '/../POJO/ProductoRecepcion.php';
        
        $cSql = "SELECT * 
                 FROM 50_m_producto_recepcion
                 WHERE id_recepcion = :id_recepcion";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(":id_recepcion", $idRecepcion, PDO::PARAM_INT);
        $oStmt->execute();
        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'ProductoRecepcion');

        return $rs;
    }
    
}
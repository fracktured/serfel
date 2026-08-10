<?php

/**
 * Description of ProductoDevolucionDAO
 *
 * @author ccastro
 */
class ProductoDevolucionDAO {
    private $rutaRelativa = "";
    
    public function __construct($rutaRelativa) {
        $this->rutaRelativa = $rutaRelativa;
        
        include_once $this->rutaRelativa . "Clases/POJO/ProductoDevolucion.php";
    }
    
    
    private function setearProductoDevolucion($filaDB) {
        $pd = new ProductoDevolucion();
        $pd->id_venta    = $filaDB["id_venta"];
        $pd->id_producto = $filaDB["id_producto"];
        $pd->
        $pd->cantidad    = $filaDB["cantidad"];
        $pd->id_usuario  = $filaDB["id_usuario"];
        
        return $pd;
    }
    
    public function obtProductoDevolucion($db, $idVenta, $idProducto) {
        $query = "SELECT * FROM 40_m_producto_devolucion WHERE id_venta = " . $idVenta . " AND id_producto = " . $idProducto;
        
        $resDB = mysql_query($query, $db) or die(mysql_error());
                
        $i = 0;
        $productoDevolucion = null;
        while ($filaDB = mysql_fetch_assoc($resDB)) {
            $productoDevolucion = $this->setearProductoDevolucion($filaDB);
        }
        
        return $productoDevolucion;
    }
    
    
    /**
     * Devuelve listado de productos devueltos de venta
     * 
     * @param PDO $db
     * @param int $idVenta
     * @return Array ProductoDevolucion
     */
    public function listProductosDevolucion($db, $idVenta) {
        $sql = 
            "SELECT * 
             FROM 40_m_producto_devolucion 
             WHERE id_venta   = :id_venta";

        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id_venta', $idVenta, PDO::PARAM_INT);
        $stmt->execute();

        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'ProductoDevolucion');

        return $rs;
    }
    
    
    /**
     * Ingreso completo del registro
     * 
     * @param PDO $db
     * @param ProductoDevolucion $pd
     * @return string
     */
    public function ingProductoDevolucion($db, $pd) {
        $sql = 
            "INSERT INTO 40_m_producto_devolucion (id_venta, 
                                                   id_producto,
                                                   id_motivo_devolucion,
                                                   cantidad,
                                                   id_usuario)
                VALUES (:id_venta,
                        :id_producto,
                        :id_motivo_devolucion,
                        :cantidad,
                        :id_usuario)";
        
        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id_venta',             $pd->id_venta,             PDO::PARAM_INT);
        $stmt->bindParam(':id_producto',          $pd->id_producto,          PDO::PARAM_INT);
        $stmt->bindParam(':id_motivo_devolucion', $pd->id_motivo_devolucion, PDO::PARAM_INT);
        $stmt->bindParam(':cantidad',             $pd->cantidad,             PDO::PARAM_STR);
        $stmt->bindParam(':id_usuario',           $pd->id_usuario,           PDO::PARAM_INT);
        $stmt->execute();
        
        return $db->lastInsertId();
    }
}

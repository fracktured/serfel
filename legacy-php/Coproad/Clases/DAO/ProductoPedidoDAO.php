<?php
require_once __DIR__.'/../Constantes/EstadoCONST.php';
require_once __DIR__.'/../POJO/RegListProductoPedido.php';

/**
 * Description of ProductoPedidoDAO
 *
 * @author ccastro
 */
class ProductoPedidoDAO {
    
    /**
     * Ingresa ProductoPedido
     *  
     * @param PDO $oPDO
     * @param ProductoPedido $oProductoPedido
     */
    public static function ingProductoPedido($oPDO, $oProductoPedido) {
        $cSql = 
            "INSERT INTO 30_m_producto_pedido (
                id_pedido,
                id_producto,
                cantidad,
                precio,
                porcen_desc,
                precio_neto)
             VALUES (
                :id_pedido,
                :id_producto,
                :cantidad,
                :precio,
                :porcen_desc,
                :precio_neto
            )";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_pedido', $oProductoPedido->id_pedido, PDO::PARAM_INT);
        $oStmt->bindParam(':id_producto', $oProductoPedido->id_producto, PDO::PARAM_INT);
        $oStmt->bindParam(':cantidad', $oProductoPedido->cantidad, PDO::PARAM_STR);
        $oStmt->bindParam(':precio', $oProductoPedido->precio, PDO::PARAM_INT);
        $oStmt->bindParam(':porcen_desc', $oProductoPedido->porcen_desc, PDO::PARAM_INT);
        $oStmt->bindParam(':precio_neto', $oProductoPedido->precio_neto, PDO::PARAM_INT);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }


    /**
     * Elimina todos los registros de ProductoPedido de un pedido
     * 
     * @param PDO $oPDO
     * @param int $idPedido
     * @return int rowCount
     */
    public static function delProductosPedido($oPDO, $idPedido) {
        $cSql = 
            "DELETE FROM 30_m_producto_pedido WHERE id_pedido = :id_pedido";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_pedido', $idPedido, PDO::PARAM_INT);
        $oStmt->execute();

        return $oStmt->rowCount();
    }
    
    
    /**
     * Retorna listado de ProductoPedido
     * 
     * @param PDO $oPDO
     * @return Array RegListProductoPedido
     */
    public static function listProductoPedidoComoRegListProductoPedido($oPDO, $idPedido) {
        $cSql = 
            "SELECT pe.id_lista_precio,
                    ppe.id_pedido,
                    ppe.id_producto,
                    p.nom_producto,
                    m.nom_marca,
                    um.nom_UM,
                    COALESCE((  SELECT SUM(cantidad)
                                FROM 50_m_stock s
                                WHERE s.id_producto = p.id_producto ), 0) AS cantidad_stock,
                    COALESCE((  SELECT SUM(ppe2.cantidad)
                                FROM 30_m_producto_pedido ppe2
                                    INNER JOIN 30_m_pedido pe2 ON ppe2.id_pedido = pe2.id_pedido AND pe2.id_estado = :id_estado_activo
                                WHERE ppe2.id_producto = p.id_producto ), 0) AS cantidad_pedida,
                    p.cod_serfel,
                    ppe.cantidad,
                    ppe.precio,
                    ppe.porcen_desc,
                    ppe.precio_neto,
                    pp.max_porcen_desc,
                    pp.cant_tramo1,
                    pp.max_porcen_tramo1,
                    pp.cant_tramo2,
                    pp.max_porcen_tramo2,
                    pp.cant_tramo3,
                    pp.max_porcen_tramo3
             FROM 30_m_producto_pedido ppe
                 INNER JOIN 20_m_producto p ON ppe.id_producto = p.id_producto
                 INNER JOIN 20_p_marca m ON p.id_marca = m.id_marca
                 INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM
                 INNER JOIN 30_m_pedido pe ON ppe.id_pedido = pe.id_pedido
                 INNER JOIN 40_m_precio_producto pp ON pe.id_lista_precio = pp.id_lista_precio AND ppe.id_producto = pp.id_producto
             WHERE ppe.id_pedido = :id_pedido";

        $idEstadoActivo = EstadoCONST::ACTIVO;
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_estado_activo', $idEstadoActivo, PDO::PARAM_INT);
        $oStmt->bindParam(':id_pedido', $idPedido, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'RegListProductoPedido');

        return $rs;
    }
            
}

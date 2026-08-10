<?php
require_once __DIR__.'/../Constantes/EstadoCONST.php';
require_once __DIR__.'/../POJO/PrecioProducto.php';
require_once __DIR__.'/../POJO/RegListPrecioProducto.php';

/**
 * Description of PrecioProductoDAO
 *
 * @author ccastro
 */
class PrecioProductoDAO {
    

    /**
     * Retorna PrecioProducto según id
     * 
     * @param PDO $oPDO
     * @param PrecioProducto $oPrecioProductoBuscar
     * @return PrecioProducto
     */
    public static function selectXId($oPDO, $oPrecioProductoBuscar) {
        $cSql = 
            "SELECT * 
             FROM 40_m_precio_producto
             WHERE id_lista_precio = :id_lista_precio
               AND id_producto = :id_producto";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_lista_precio', $oPrecioProductoBuscar->id_lista_precio, PDO::PARAM_INT);
        $oStmt->bindParam(':id_producto', $oPrecioProductoBuscar->id_producto, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'PrecioProducto');

        $oPrecioProducto = null;
        foreach ($rs as $o) {
            $oPrecioProducto = $o;
        }

        return $oPrecioProducto;
    }

    /**
     * Ingresa nuevo precio producto
     */
    public static function insertar($oPDO, $oPrecioProducto) {
        $cSql = 
            "INSERT INTO 30_m_pedido (
                                id_pedido,
                                fecha_pedido,
                                id_local_cliente,
                                dia_ruta,
                                id_forma_pago,
                                tiempo,
                                precio_total,
                                id_usuario,
                                id_lista_precio,
                                id_estado)
             VALUES ( 
                :id_pedido,
                NOW(),
                :id_local_cliente,
                :dia_ruta,
                :id_forma_pago,
                0,
                :precio_total,
                :id_usuario,
                :id_lista_precio,
                :id_estado
            )";

        $idEstadoActivo = EstadoCONST::ACTIVO;
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_pedido', $oPedido->id_pedido, PDO::PARAM_INT);
        $oStmt->bindParam(':id_local_cliente', $oPedido->id_local_cliente, PDO::PARAM_INT);
        $oStmt->bindParam(':dia_ruta', $oPedido->dia_ruta, PDO::PARAM_INT);
        $oStmt->bindParam(':id_forma_pago', $oPedido->id_forma_pago, PDO::PARAM_INT);
        $oStmt->bindParam(':precio_total', $oPedido->precio_total, PDO::PARAM_INT);
        $oStmt->bindParam(':id_usuario', $oPedido->id_usuario, PDO::PARAM_INT);
        $oStmt->bindParam(':id_lista_precio', $oPedido->id_lista_precio, PDO::PARAM_INT);
        $oStmt->bindParam(':id_estado', $idEstadoActivo, PDO::PARAM_INT);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }
    
    
    
    /**
     * Retorna listado de Precios Producto
     * 
     * @param PDO $oPDO
     * @return Array RegListPrecioProducto
     */
    public static function listPrecioProducto($oPDO, $idListaPrecio) {
        $cSql = 
            "SELECT pp.id_lista_precio,
                    pp.id_producto,
                    p.nom_producto,
                    m.nom_marca,
                    um.nom_UM,
                    COALESCE((  SELECT SUM(cantidad)
                                FROM 50_m_stock s
                                WHERE s.id_producto = p.id_producto ), 0) AS cantidad_stock,
                    COALESCE((  SELECT SUM(ppe.cantidad)
                                FROM 30_m_producto_pedido ppe
                                    INNER JOIN 30_m_pedido pe ON ppe.id_pedido = pe.id_pedido AND pe.id_estado = :id_estado_activo
                                WHERE ppe.id_producto = p.id_producto ), 0) AS cantidad_pedida,
                    p.cod_serfel,
                    pp.precio_neto,
                    pp.precio,
                    pp.max_porcen_desc
             FROM 40_m_precio_producto pp
                 INNER JOIN 20_m_producto p ON pp.id_producto = p.id_producto
                 INNER JOIN 20_p_marca m ON p.id_marca = m.id_marca
                 INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM
             WHERE p.id_estado = :id_estado_activo
               AND pp.id_lista_precio = :id_lista_precio";

        /*
        ,
                    pp.cant_tramo1,
                    pp.max_porcen_tramo1,
                    pp.cant_tramo2,
                    pp.max_porcen_tramo2,
                    pp.cant_tramo3,
                    pp.max_porcen_tramo3
        */

        $idEstadoActivo = EstadoCONST::ACTIVO;
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_estado_activo', $idEstadoActivo, PDO::PARAM_INT);
        $oStmt->bindParam(':id_lista_precio', $idListaPrecio, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'RegListPrecioProducto');

        return $rs;
    }
            
}

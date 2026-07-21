<?php
require_once __DIR__.'/../Constantes/EstadoCONST.php';
require_once __DIR__.'/GeneralDAO.php';
require_once __DIR__.'/../POJO/Pedido.php';
require_once __DIR__.'/../FiltroBusqueda/PedidoFB.php';

/**
 * Description of PedidoDAO
 *
 * @author ccastro
 */
class PedidoDAO {

    /**
     * Obtiene nuevo ID
     */
    public static function obtNuevoIdPedido($oPDO) {
        $cSql = 
            "SELECT MAX(id_pedido) + 1 as nuevo_id 
             FROM 30_m_pedido";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->execute();
        $idNuevo = $oStmt->fetchColumn();
        
        return $idNuevo;
    }

    /**
     * Ingresa nuevo pedido
     */
    public static function ingPedido($oPDO, $oPedido) {
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
     * Retorna Pedido según id.
     * 
     * @param PDO $oPDO
     * @param int $idPedido
     * @return Pedido
     */
    public static function obtPedido($oPDO, $idPedido) {
        return GeneralDAO::obtPOJO($oPDO, $idPedido, SisDistCONST::POJO_PEDIDO);
    }
    
    
    /**
     * Modifica Pedido
     * 
     * @param PDO $oPDO
     * @param Pedido $oPedido
     * @return int
     */
    public static function modPedido($oPDO, $oPedido) {
        $cNomTabla = SisDistCONST::TABLA_PEDIDO;
        /*
    public $id_local_cliente;
    public $dia_ruta;
    public $tiempo;
    public $id_lista_precio;
         */
        
        $cSql = 
            "UPDATE $cNomTabla
                SET id_estado = :id_estado,
                    id_forma_pago = :id_forma_pago,
                    precio_total = :precio_total,
                    id_usuario = :id_usuario
            WHERE id_pedido = :id_pedido";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_estado', $oPedido->id_estado, PDO::PARAM_INT);
        $oStmt->bindParam(':id_forma_pago', $oPedido->id_forma_pago, PDO::PARAM_INT);
        $oStmt->bindParam(':precio_total', $oPedido->precio_total, PDO::PARAM_INT);
        $oStmt->bindParam(':id_usuario', $oPedido->id_usuario, PDO::PARAM_INT);
        $oStmt->bindParam(':id_pedido', $oPedido->id_pedido, PDO::PARAM_INT);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }
    
    
    /**
     * Anula Pedido
     * 
     * @param PDO $oPDO
     * @param Pedido $oPedido
     * @return int
     */
    public static function anulaPedido($oPDO, $oPedido) {
        $cSql = 
            "UPDATE 30_m_pedido
                SET id_estado = :id_estado,
                    id_usuario = :id_usuario
            WHERE id_pedido = :id_pedido";

        $idEstadoInactivo = EstadoCONST::INACTIVO;
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_estado', $idEstadoInactivo, PDO::PARAM_INT);
        $oStmt->bindParam(':id_usuario', $oPedido->id_usuario, PDO::PARAM_INT);
        $oStmt->bindParam(':id_pedido', $oPedido->id_pedido, PDO::PARAM_INT);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }


    /**
     * Devuelve lista de Pedido según filtros con un máximo de 5000 registros
     * 
     * @param PDO $oPDO
     * @param VentaFB $oPedidoFB
     * @return Array Pedido
     */
    public static function listPedidos($oPDO, $oPedidoFB) {
        $cSql = 
           "SELECT  id_pedido, 
                    fecha_pedido, 
                    id_local_cliente, 
                    dia_ruta,
                    id_forma_pago,
                    tiempo,
                    precio_total, 
                    id_usuario,
                    id_lista_precio,
                    id_estado
            FROM 30_m_pedido 
            WHERE (:id_estado = " . SisDistCONST::ID_FILTRO_TODOS . " OR id_estado = :id_estado)
              AND (:id_usuario = " . SisDistCONST::ID_FILTRO_TODOS . " OR id_usuario = :id_usuario)
              AND (:fecha_desde = '' OR fecha_pedido >= :fecha_desde)
              AND (:fecha_hasta = '' OR fecha_pedido <= :fecha_hasta)
            LIMIT 5000";
        //print_r($oVentaFB);
        //echo $cSql;
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(":id_estado", $oPedidoFB->idEstado, PDO::PARAM_INT);
        $oStmt->bindParam(":id_usuario", $oPedidoFB->idUsuario, PDO::PARAM_INT);
        $oStmt->bindParam(":fecha_desde", $oPedidoFB->cFechaDesde, PDO::PARAM_STR);
        $oStmt->bindParam(":fecha_hasta", $oPedidoFB->cFechaHasta, PDO::PARAM_STR);
        $oStmt->execute();
        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'Pedido');

        return $rs;
    }
    
}

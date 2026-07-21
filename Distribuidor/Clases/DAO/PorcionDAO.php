<?php
require_once __DIR__.'/../POJO/Porcion.php';
require_once __DIR__.'/../Constantes/EstadoCONST.php';

class PorcionDAO {

    /**
     * Devuelve Porciones para venta
     * 
     * @param PDO $oPDO
     * @param int $idProducto
     * @return Array Porcion
     */
    public static function findPorcionesParaVenta($oPDO, $idProducto, $registros) {
        $sql = 
           "SELECT  *
            FROM 20_m_porcion
            WHERE id_producto = :id_producto
            AND id_estado = 1
            ORDER BY grupo ASC, numero ASC
            LIMIT :registros";

        $stmt = $oPDO->prepare($sql);
        $stmt->bindParam(':id_producto', $idProducto, PDO::PARAM_INT);
        $stmt->bindParam(':registros', $registros, PDO::PARAM_INT);
        //$parametros = [];
        //$parametros += [ ':id_producto' => $idProducto ];
        //$parametros += [ ':registros' => $registros ];
        $stmt->execute();
        
        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'Porcion');

        return $rs;
    }

    /**
     * Asigna Porcion a Venta
     * 
     * @param PDO $oPDO
     * @param Porcion $porcion
     * @return int
     */
    public static function asignar($oPDO, $porcion) {
        $cSql = 
            "UPDATE 20_m_porcion
                SET id_venta = :id_venta,
                    id_estado = :id_estado,
                    id_usuario = :id_usuario
            WHERE id_porcion = :id_porcion";

        $idEstadoAsignado = EstadoCONST::ASIGNADO;
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_venta', $porcion->id_venta, PDO::PARAM_INT);
        $oStmt->bindParam(':id_estado', $idEstadoAsignado, PDO::PARAM_INT);
        $oStmt->bindParam(':id_usuario', $porcion->id_usuario, PDO::PARAM_INT);
        $oStmt->bindParam(':id_porcion', $porcion->id_porcion, PDO::PARAM_INT);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }

}

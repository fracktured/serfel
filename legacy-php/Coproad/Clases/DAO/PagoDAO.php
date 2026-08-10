<?php
require_once __DIR__.'/../POJO/Pago.php';

/**
 * Description of PagoDAO
 *
 * @author ccastro
 */
class PagoDAO {


    /**
     * Devuelve lista de Pagos
     * 
     * @param PDO $oPDO
     * @param int $idVenta
     * @return Array TipoDocto
     */
    public static function listarXVenta($oPDO, $idVenta) {
        $cSql = 
           "SELECT  p.*, 
                    d.nom_tipo_docto as 'nom_forma_pago'
            FROM 60_m_pago p
                INNER JOIN 10_p_tipo_docto d on p.id_forma_pago = d.id_tipo_docto
            WHERE p.id_venta = :id_venta";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_venta', $idVenta, PDO::PARAM_INT);
        $oStmt->execute();
        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'Pago');

        return $rs;
    }

    /**
     * Ingresa nuevo pago
     */
    public static function ingPago($oPDO, $oPago) {
        $cSql = 
            "INSERT INTO 60_m_pago (
                id_venta,
                fecha,
                monto,
                id_forma_pago,
                observaciones)
             VALUES ( 
                :id_venta,
                NOW(),
                :monto,
                :id_forma_pago,
                :observaciones
            )";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_venta', $oPago->id_venta, PDO::PARAM_INT);
        $oStmt->bindParam(':monto', $oPago->monto, PDO::PARAM_INT);
        $oStmt->bindParam(':id_forma_pago', $oPago->id_forma_pago, PDO::PARAM_INT);
        $oStmt->bindParam(':observaciones', $oPago->observaciones, PDO::PARAM_STR);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }

    /**
     * Elimina Pago
     * 
     * @param PDO $oPDO
     * @param int $idPago
     */
    public static function elimPago($oPDO, $idPago) {
        $cSql = 
           "DELETE FROM 60_m_pago WHERE id_pago = :id_pago";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_pago', $idPago, PDO::PARAM_INT);
        $oStmt->execute();

        return $oStmt->rowCount();
    }

    /**
     * Elimina todos los pagos de una venta
     */
    public static function elimPagoXVenta($oPDO, $idVenta) {
        $cSql = 
           "DELETE FROM 60_m_pago WHERE id_venta = :id_venta";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_venta', $idVenta, PDO::PARAM_INT);
        $oStmt->execute();

        return $oStmt->rowCount();
    }
    
}

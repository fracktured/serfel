<?php
require_once __DIR__ . '/../POJO/NotaCreditoCompra.php';

/**
 * Description of NotaCreditoCompraDAO
 *
 * @author ccastro
 */
class NotaCreditoCompraDAO {
    
    
    /**
     * Ingresa nueva Nota de Crédito de Compra.
     * Retorna ID de Nota ingresada.
     * 
     * @param PDO $oPDO
     * @param NotaCreditoCompra $oNotaCreditoCompra
     * @return int
     */
    public static function ingNotaCreditoCompra($oPDO, $oNotaCreditoCompra) {
        $cSql = 
            "INSERT INTO 40_m_nota_credito_compra (id_recepcion, num_nc_compra, fecha_nc_compra, 
                                                   id_tipo_docto, iva, iaba, 
                                                   espec, subtotal, precio_total, 
                                                   id_usuario, id_estado, url_PDF, cod_ref_nde)
                VALUES (:id_recepcion, :num_nc_compra, :fecha_nc_compra, 
                        :id_tipo_docto, :iva, :iaba, 
                        :espec, :subtotal, :precio_total, 
                        :id_usuario, :id_estado, :url_PDF, :cod_ref_nde)";

        //$oNotaCreditoCompra = new NotaCreditoCompra();
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_recepcion', $oNotaCreditoCompra->id_recepcion, PDO::PARAM_INT);
        $oStmt->bindParam(':num_nc_compra', $oNotaCreditoCompra->num_nc_compra, PDO::PARAM_INT);
        $oStmt->bindParam(':fecha_nc_compra', $oNotaCreditoCompra->fecha_nc_compra, PDO::PARAM_STR);
        $oStmt->bindParam(':id_tipo_docto', $oNotaCreditoCompra->id_tipo_docto, PDO::PARAM_INT);
        $oStmt->bindParam(':iva', $oNotaCreditoCompra->iva, PDO::PARAM_INT);
        $oStmt->bindParam(':iaba', $oNotaCreditoCompra->iaba, PDO::PARAM_INT);
        $oStmt->bindParam(':espec', $oNotaCreditoCompra->espec, PDO::PARAM_INT);
        $oStmt->bindParam(':subtotal', $oNotaCreditoCompra->subtotal, PDO::PARAM_INT);
        $oStmt->bindParam(':precio_total', $oNotaCreditoCompra->precio_total, PDO::PARAM_INT);
        $oStmt->bindParam(':id_usuario', $oNotaCreditoCompra->id_usuario, PDO::PARAM_INT);
        $oStmt->bindParam(':id_estado', $oNotaCreditoCompra->id_estado, PDO::PARAM_INT);
        $oStmt->bindParam(':url_PDF', $oNotaCreditoCompra->url_PDF, PDO::PARAM_STR);
        $oStmt->bindParam(':cod_ref_nde', $oNotaCreditoCompra->cod_ref_nde, PDO::PARAM_INT);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }
    
}

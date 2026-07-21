<?php
require_once __DIR__ . '/../POJO/NotaCredito.php';

/**
 * Description of NotaCreditoDAO
 *
 * @author ccastro
 */
class NotaCreditoDAO {
    
    
    /**
     * Retorna nuevo id_nota_credito
     * 
     * @param PDO $oPDO
     * @return int
     */
    public static function obtNuevoIdNotaCredito($oPDO) {
        $cSql = "SELECT MAX(id_nota_credito) as max_id_nota_credito FROM 40_m_nota_credito";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->execute();
        $idMax = $oStmt->fetchColumn();
        
        return $idMax + 1;
    }
    
    
    /**
     * Inserta nueva Nota Credito y retorna su id
     * 
     * @param PDO $oPDO
     * @param NotaCredito $oNotaCredito
     * @return int
     */
    public static function ingNotaCredito($oPDO, $oNotaCredito) {
        $cSql = 
            "INSERT INTO 40_m_nota_credito (id_nota_credito,
                                            id_venta,
                                            num_nota_credito,
                                            id_tipo_docto_emitido,
                                            rut_empresa,
                                            iva,
                                            iaba,
                                            espec,
                                            sub_total,
                                            precio_total,
                                            id_usuario,
                                            fecha_nota_credito,
                                            id_motivo,
                                            id_estado)
             VALUES (:id_nota_credito,
                     :id_venta,
                     :num_nota_credito,
                     :id_tipo_docto_emitido,
                     :rut_empresa,
                     :iva,
                     :iaba,
                     :espec,
                     :sub_total,
                     :precio_total,
                     :id_usuario,
                     :fecha_nota_credito,
                     :id_motivo,
                     :id_estado)";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_nota_credito', $oNotaCredito->id_nota_credito, PDO::PARAM_INT);
        $oStmt->bindParam(':id_venta', $oNotaCredito->id_venta, PDO::PARAM_INT);
        $oStmt->bindParam(':num_nota_credito', $oNotaCredito->num_nota_credito, PDO::PARAM_INT);
        $oStmt->bindParam(':id_tipo_docto_emitido', $oNotaCredito->id_tipo_docto_emitido, PDO::PARAM_INT);
        $oStmt->bindParam(':rut_empresa', $oNotaCredito->rut_empresa, PDO::PARAM_INT);
        $oStmt->bindParam(':iva', $oNotaCredito->iva, PDO::PARAM_INT);
        $oStmt->bindParam(':iaba', $oNotaCredito->iaba, PDO::PARAM_INT);
        $oStmt->bindParam(':espec', $oNotaCredito->espec, PDO::PARAM_INT);
        $oStmt->bindParam(':sub_total', $oNotaCredito->sub_total, PDO::PARAM_INT);
        $oStmt->bindParam(':precio_total', $oNotaCredito->precio_total, PDO::PARAM_INT);
        $oStmt->bindParam(':id_usuario', $oNotaCredito->id_usuario, PDO::PARAM_INT);
        $oStmt->bindParam(':fecha_nota_credito', $oNotaCredito->fecha_nota_credito, PDO::PARAM_STR);
        $oStmt->bindParam(':id_motivo', $oNotaCredito->id_motivo, PDO::PARAM_INT);
        $oStmt->bindParam(':id_estado', $oNotaCredito->id_estado, PDO::PARAM_INT);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }
    
    
    /**
     * Retorna NotaCredito según id.
     * 
     * @param PDO $oPDO
     * @param int $idNotaCredito
     * @return NotaCredito
     */
    public static function obtNotaCredito($oPDO, $idNotaCredito) {
        $sql = 
            "SELECT * 
             FROM 40_m_nota_credito 
             WHERE id_nota_credito = :id_nota_credito";

        $stmt = $oPDO->prepare($sql);
        $stmt->bindParam(':id_nota_credito', $idNotaCredito, PDO::PARAM_INT);
        $stmt->execute();

        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'NotaCredito');

        $oNotaCredito = null;
        foreach ($rs as $nc) {
            $oNotaCredito = $nc;
        }

        return $oNotaCredito;
    }
    
    
    /**
     * Devuelve lista de NotaCredito según filtros con un máximo de 5000 registros
     * 
     * @param PDO $oPDO
     * @param NotaCreditoFB $oNotaCreditoFB
     * @return Array NotaCredito
     */
    public static function listNotaCredito($oPDO, $oNotaCreditoFB) {
        require_once __DIR__ . '/../Util/FechaUtil.php';
        
        $cFechaDesdeBD = FechaUtil::deFechaJQueryABD($oNotaCreditoFB->cFechaDesde);
        $cFechaHastaBD = FechaUtil::deFechaJQueryABD($oNotaCreditoFB->cFechaHasta);
        
        $cSql = "SELECT * 
                 FROM 40_m_nota_credito
                 WHERE id_estado = 3 
                   AND (:fecha_desde = '' OR fecha_nota_credito >= :fecha_desde)
                   AND (:fecha_hasta = '' OR fecha_nota_credito <= :fecha_hasta)
                   AND (:nota_credito_desde = " . SisDistCONST::ID_FILTRO_TODOS . " OR num_nota_credito >= :nota_credito_desde)
                   AND (:nota_credito_hasta = " . SisDistCONST::ID_FILTRO_TODOS . " OR num_nota_credito <= :nota_credito_hasta)
                   AND (:rut_empresa = " . SisDistCONST::ID_FILTRO_TODOS . " OR rut_empresa = :rut_empresa)
                   AND (:id_tipo_docto_emitido = " . SisDistCONST::ID_FILTRO_TODOS . " OR id_tipo_docto_emitido = :id_tipo_docto_emitido)
                 ORDER BY id_nota_credito DESC
                 LIMIT 1000";
        //print_r($oVentaFB);
        //echo $cSql;
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(":fecha_desde", $cFechaDesdeBD, PDO::PARAM_STR);
        $oStmt->bindParam(":fecha_hasta", $cFechaHastaBD, PDO::PARAM_STR);
        $oStmt->bindParam(":nota_credito_desde", $oNotaCreditoFB->iNumNotaCreditoDesde, PDO::PARAM_INT);
        $oStmt->bindParam(":nota_credito_hasta", $oNotaCreditoFB->iNumNotaCreditoHasta, PDO::PARAM_INT);
        $oStmt->bindParam(":rut_empresa", $oNotaCreditoFB->iRutEmpresa, PDO::PARAM_INT);
        $oStmt->bindParam(":id_tipo_docto_emitido", $oNotaCreditoFB->idTipoDocto, PDO::PARAM_INT);
        $oStmt->execute();
        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'NotaCredito');

        return $rs;
    }
    
    
    public static function modNotaCredito($oPDO, $oNotaCredito) {
        
        /*
    public $id_venta;
    public $rut_empresa;
    public $iva;
    public $iaba;
    public $espec;
    public $sub_total;
    public $id_motivo;
    public $id_usuario;
    public $precio_total;
         */
        
        $cSql = 
            "UPDATE 40_m_nota_credito
                SET num_nota_credito = :num_nota_credito,
                    id_tipo_docto_emitido = :id_tipo_docto_emitido,
                    fecha_nota_credito = :fecha_nota_credito,
                    id_usuario_mod = :id_usuario_mod,
                    ult_fecha_mod  = NOW(),
                    id_estado      = :id_estado,
                    url_PDF_original = :url_PDF_original,
                    url_PDF_cedible = :url_PDF_cedible,
                    id_folio = :id_folio
            WHERE id_nota_credito = :id_nota_credito";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':num_nota_credito', $oNotaCredito->num_nota_credito, PDO::PARAM_INT);
        $oStmt->bindParam(':id_tipo_docto_emitido', $oNotaCredito->id_tipo_docto_emitido, PDO::PARAM_INT);
        $oStmt->bindParam(':fecha_nota_credito', $oNotaCredito->fecha_nota_credito, PDO::PARAM_STR);
        $oStmt->bindParam(':id_usuario_mod', $oNotaCredito->id_usuario_mod, PDO::PARAM_INT);
        $oStmt->bindParam(':id_estado', $oNotaCredito->id_estado, PDO::PARAM_INT);
        $oStmt->bindParam(':url_PDF_original', $oNotaCredito->url_PDF_original, PDO::PARAM_STR);
        $oStmt->bindParam(':url_PDF_cedible', $oNotaCredito->url_PDF_cedible, PDO::PARAM_STR);
        $oStmt->bindParam(':id_folio', $oNotaCredito->id_folio, PDO::PARAM_INT);
        $oStmt->bindParam(':id_nota_credito', $oNotaCredito->id_nota_credito, PDO::PARAM_INT);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }
    
    
    /**
     * Retorna el próximo número de folio electrónico según rut empresa
     * 
     * @param PDO $oPDO
     * @param int $iRutEmpresa
     * @return int
     */
    public static function obtNuevoFolio($oPDO, $iRutEmpresa) {
        $cSql = 
                "SELECT MAX(id_folio) as max_folio 
                 FROM 40_m_nota_credito 
                 WHERE rut_empresa = :rut_empresa";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(":rut_empresa", $iRutEmpresa, PDO::PARAM_INT);
        $oStmt->execute();
        $idMaxFolio = $oStmt->fetchColumn();
        
        return $idMaxFolio + 1;
    }
    
    
    /**
     * Obtiene monto total de Notas de Crédito
     * 
     * @param PDO $oPDO
     * @param int $idVenta
     * @return type
     */
    public static function obtMontoTotalNotaCredito($oPDO, $idVenta) {
        $cSql = "SELECT SUM(precio_total) as monto_total FROM 40_m_nota_credito WHERE id_venta = :id_venta";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_venta', $idVenta, PDO::PARAM_INT);
        $oStmt->execute();
        $iMontoTotal = $oStmt->fetchColumn();
        
        return $iMontoTotal;
    }
}

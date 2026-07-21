<?php

/**
 * Description of NotaDebitoDAO
 *
 * @author ccastro
 */
class NotaDebitoDAO {
    
    private $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;

        include_once $this->cRutaRelativa . "Clases/POJO/NotaDebito.php";
    }
    // </editor-fold>
    
    
    /**
     * Retorna NotaDebito según id.
     * 
     * @param PDO $oPDO
     * @param int $idNotaDebito
     * @return NotaDebito
     */
    public function obtNotaDebito($oPDO, $idNotaDebito) {
        $sql = 
            "SELECT * 
             FROM 40_m_nota_debito 
             WHERE id_nota_debito = :id_nota_debito";

        $oStmt = $oPDO->prepare($sql);
        $oStmt->bindParam(':id_nota_debito', $idNotaDebito, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'NotaDebito');

        $oNotaDebito = null;
        foreach ($rs as $nd) {
            $oNotaDebito = $nd;
        }

        return $oNotaDebito;
    }
    
    
    /**
     * Ingreso completo del registro
     * 
     * @param PDO $oPDO
     * @param NotaDebito $nd
     * @return string
     */
    public function ingNotaDebito($oPDO, $nd) {
        $sql = 
            "INSERT INTO 40_m_nota_debito (id_nota_credito,
                                           num_nota_debito_elect,
                                           rut_empresa,
                                           iva,
                                           iaba,
                                           espec,
                                           subtotal,
                                           id_usuario,
                                           fecha_nota_debito,
                                           precio_total,
                                           id_estado,
                                           url_PDF,
                                           cod_ref_nde)
                VALUES (:id_nota_credito,
                        0,
                        :rut_empresa,
                        :iva,
                        :iaba,
                        :espec,
                        :subtotal,
                        :id_usuario,
                        NOW(),
                        :precio_total,
                        3,
                        '',
                        0)";
        
        $stmt = $oPDO->prepare($sql);
        $stmt->bindParam(':id_nota_credito', $nd->id_nota_credito, PDO::PARAM_INT);
        $stmt->bindParam(':rut_empresa', $nd->rut_empresa, PDO::PARAM_INT);
        $stmt->bindParam(':iva', $nd->iva, PDO::PARAM_INT);
        $stmt->bindParam(':iaba', $nd->iaba, PDO::PARAM_INT);
        $stmt->bindParam(':espec', $nd->espec, PDO::PARAM_INT);
        $stmt->bindParam(':subtotal', $nd->subtotal, PDO::PARAM_INT);
        $stmt->bindParam(':id_usuario', $nd->id_usuario, PDO::PARAM_INT);
        $stmt->bindParam(':precio_total', $nd->precio_total, PDO::PARAM_INT);
        $stmt->execute();
        
        return $oPDO->lastInsertId();
    }
    
    
    /**
     * Retorna NotaDebito según idNotaCredito.
     * 
     * @param PDO $oPDO
     * @param int $idNotaCredito
     * @return NotaDebito
     */
    public function obtNotaDebitoXIdNC($oPDO, $idNotaCredito) {
        $sql = 
            "SELECT * 
             FROM 40_m_nota_debito 
             WHERE id_nota_credito = :id_nota_credito";

        $stmt = $oPDO->prepare($sql);
        $stmt->bindParam(':id_nota_credito', $idNotaCredito, PDO::PARAM_INT);
        $stmt->execute();

        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'NotaDebito');

        $oNotaDebito = null;
        foreach ($rs as $nd) {
            $oNotaDebito = $nd;
        }

        return $oNotaDebito;
    }
    
    
    /**
     * Marca una ND como ND electronica, además de guardar el valor de la url de descarga del PDF
     * 
     * @param PDO $oPDO
     * @param int $idNotaDebito
     * @param int $idFolio
     * @param String $cUrlPDF
     * @param int $idUsuario
     * @return int
     */
    public function marcarComoNDElectronica($oPDO, $idNotaDebito, $idFolio, $cUrlPDF) {
        $cSql = 
            "UPDATE 40_m_nota_debito
                SET url_PDF  = :url_PDF,
                    id_folio = :id_folio
            WHERE id_nota_debito = :id_nota_debito";

        $stmt = $oPDO->prepare($cSql);
        $stmt->bindParam(':id_nota_debito', $idNotaDebito, PDO::PARAM_INT);
        $stmt->bindParam(':url_PDF', $cUrlPDF, PDO::PARAM_STR);
        $stmt->bindParam(':id_folio', $idFolio, PDO::PARAM_INT);
        $stmt->execute();

        return $oPDO->lastInsertId();
    }
    
    
    /**
     * Retorna el próximo número de folio electrónico
     * 
     * @param PDO $oPDO
     * @return int
     */
    public static function obtNuevoFolio($oPDO) {
        $cSql = "SELECT MAX(id_folio) as max_folio FROM 40_m_nota_debito";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->execute();
        $idMaxFolio = $oStmt->fetchColumn();
        
        return $idMaxFolio + 1;
    }
}

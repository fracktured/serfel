<?php

/**
 * Description of MotivoNotaCreditoDAO
 *
 * @author ccastro
 */
class MotivoNotaCreditoDAO {
    
    private $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;

        require_once $this->cRutaRelativa . "Clases/POJO/MotivoNotaCredito.php";
    }
    // </editor-fold>
    
    
    /**
     * Retorna MotivoNotaCredito según id.
     * 
     * @param PDO $oPDO
     * @param int $idMotivoNotaCredito
     * @return MotivoNotaCredito
     */
    public function obtMotivoNotaCredito($oPDO, $idMotivoNotaCredito) {
        $sql = 
            "SELECT * 
             FROM 40_m_motivo_nota_credito 
             WHERE id_motivo = :id_motivo";

        $stmt = $oPDO->prepare($sql);
        $stmt->bindParam(':id_motivo', $idMotivoNotaCredito, PDO::PARAM_INT);
        $stmt->execute();

        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'MotivoNotaCredito');

        $oMotivoNotaCredito = null;
        foreach ($rs as $nc) {
            $oMotivoNotaCredito = $nc;
        }

        return $oMotivoNotaCredito;
    }
}

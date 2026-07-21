<?php

/**
 * Description of TipoDoctoDAO
 *
 * @author ccastro
 */
class TipoDoctoDAO {
    
    private $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSRUCTORES">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;


        require_once $this->cRutaRelativa . 'Clases/POJO/TipoDocto.php';
    }
    // </editor-fold>

    
    /**
     * Retorna TipoDocto según PK
     * 
     * @param PDO $oPDO
     * @param int $idTipoDocto
     * @return TipoDocto
     */
    public function obtTipoDocto($oPDO, $idTipoDocto) {
        $cSql = 
            "SELECT * 
             FROM 10_p_tipo_docto 
             WHERE id_tipo_docto = :id_tipo_docto";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_tipo_docto', $idTipoDocto, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'TipoDocto');

        $oTipoDocto = null;
        foreach ($rs as $td) {
            $oTipoDocto = $td;
        }

        return $oTipoDocto;
    }


    /**
     * Devuelve lista de Formas de Pago
     * 
     * @param PDO $oPDO
     * @return Array TipoDocto
     */
    public static function listFormaPago($oPDO) {
        $cSql = 
           "SELECT
                id_tipo_docto,
                nom_tipo_docto,
                desc_tipo_docto
            FROM 10_p_tipo_docto
            WHERE id_tipo_docto IN (3, 4, 5, 6, 7, 8)
            ORDER BY nom_tipo_docto";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->execute();
        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'TipoDocto');

        return $rs;
    }
    
}

<?php

/**
 * Description of ImpuestoDAO
 *
 * @author ccastro
 */
class ImpuestoDAO {
    
    private $cRutaRelativa = "";
    
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;
        
        include_once $this->cRutaRelativa . "Clases/POJO/Impuesto.php";
    }
    
    
    /**
     * Retorna Impuesto según id.
     * 
     * @param PDO $db
     * @param int $idImpuesto
     * @return Impuesto
     */
    public function obtImpuesto($db, $idImpuesto) {
        $sql = 
            "SELECT * 
             FROM 99_p_impuesto 
             WHERE id_impuesto = :id_impuesto";

        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id_impuesto', $idImpuesto, PDO::PARAM_INT);
        $stmt->execute();

        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'Impuesto');

        $oImpuesto = null;
        foreach ($rs as $i) {
            $oImpuesto = $i;
        }

        return $oImpuesto;
    }
    
}

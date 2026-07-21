<?php

/**
 * Description of MotivoDevolucionDAO
 *
 * @author ccastro
 */
class MotivoDevolucionDAO {
    
    private $rutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($rutaRelativa) {
        $this->rutaRelativa = $rutaRelativa;


        include_once $this->rutaRelativa . "Clases/POJO/MotivoDevolucion.php";
    }
    // </editor-fold>
    
    
    /**
     * Devuelve listado de motivos de devolucion
     * 
     * @param PDO $db
     * @return Array MotivoDevolucion
     */
    public function listMotivosDevolucion($db) {
        $sql = 
            "SELECT * 
             FROM 40_m_motivo_devolucion";

        $stmt = $db->prepare($sql);
        $stmt->execute();

        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'MotivoDevolucion');

        return $rs;
    }
}

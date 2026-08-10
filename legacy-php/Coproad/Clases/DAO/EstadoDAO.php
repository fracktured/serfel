<?php
require_once __DIR__ . '/../POJO/Estado.php';

/**
 * Description of EstadoDAO
 *
 * @author ccastro
 */
class EstadoDAO {
    
    
    /**
     * Retorna Estado según id.
     * 
     * @param PDO $oPDO
     * @param int $idEstado
     * @return Empresa
     */
    public static function obtEstado($oPDO, $idEstado) {
        $sql = 
            "SELECT * 
             FROM 99_p_estado 
             WHERE id_estado = :id_estado";
        
        $stmt = $oPDO->prepare($sql);
        $stmt->bindParam(':id_estado', $idEstado, PDO::PARAM_INT);
        $stmt->execute();
        
        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'Estado');
        
        $estado = null;
        foreach($rs as $e) {
            $estado = $e;
        }
        
        return $estado;
    }
    
}

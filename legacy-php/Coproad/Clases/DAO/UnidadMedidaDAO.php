<?php

/**
 * Description of UnidadMedidaDAO
 *
 * @author ccastro
 */
class UnidadMedidaDAO {
    
    /**
     * Retorna UnidadMedida según id.
     * 
     * @param PDO $oPDO
     * @param int $idUM
     * @return UnidadMedida
     */
    public static function obtUnidadMedida($oPDO, $idUM) {
        require_once __DIR__ . '/GeneralDAO.php';
        require_once __DIR__ . '/../POJO/UnidadMedida.php';
        
        return GeneralDAO::obtPOJO($oPDO, $idUM, SisDistCONST::POJO_UNIDAD_MEDIDA);
    }
    
}

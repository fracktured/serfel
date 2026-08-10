<?php
require_once __DIR__ . '/GeneralDAO.php';
require_once __DIR__ . '/../POJO/Marca.php';
require_once __DIR__ . '/../Constantes/SisDistCONST.php';

/**
 * Description of MarcaDAO
 *
 * @author ccastro
 */
class MarcaDAO {
    
    /**
     * Retorna Marca según id.
     * 
     * @param PDO $oPDO
     * @param int $idMarca
     * @return Marca
     */
    public static function obtMarca($oPDO, $idMarca) {
        return GeneralDAO::obtPOJO($oPDO, $idMarca, SisDistCONST::POJO_MARCA);
    }

    public static function lista($oPDO) {
        $cSql = "SELECT * FROM 20_p_marca ORDER BY nom_marca";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->execute();
        return $oStmt->fetchALL(PDO::FETCH_CLASS, 'Marca');
    }
    
}

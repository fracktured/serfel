<?php

/**
 * Description of EmpresaDAO
 *
 * @author ccastro
 */
class EmpresaDAO {
    
    private $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;

        require_once $this->cRutaRelativa . "Clases/POJO/Empresa.php";
    }
    // </editor-fold>
    
    
    /**
     * Retorna Empresa según rut.
     * 
     * @param PDO $oPDO
     * @param int $rutEmpresa
     * @return Empresa
     */
    public function obtEmpresa($oPDO, $rutEmpresa) {
        $sql = 
            "SELECT * 
             FROM 10_m_empresa 
             WHERE rut_empresa = :rut_empresa";

        $stmt = $oPDO->prepare($sql);
        $stmt->bindParam(':rut_empresa', $rutEmpresa, PDO::PARAM_INT);
        $stmt->execute();

        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'Empresa');

        $oEmpresa = null;
        foreach ($rs as $e) {
            $oEmpresa = $e;
        }

        return $oEmpresa;
    }
    
    
    /**
     * Retorna lista de Empresa
     * 
     * @param PDO $oPDO
     * @return Array Empresa
     */
    public function listEmpresa($oPDO) {
        $cSql = 
            "SELECT * 
             FROM 10_m_empresa";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'Empresa');

        return $rs;
    }
}

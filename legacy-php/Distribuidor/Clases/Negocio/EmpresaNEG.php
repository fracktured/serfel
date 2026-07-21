<?php

/**
 * Description of EmpresaNEG
 *
 * @author ccastro
 */
class EmpresaNEG {
    
    protected $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;

        require_once $this->cRutaRelativa . "Clases/Conexion/Conexion.php";
        require_once $this->cRutaRelativa . 'Clases/DAO/EmpresaDAO.php';
    }
    // </editor-fold>
    
    
    /**
     * Retorna Empresa según Rut
     * 
     * @param int $iRutEmpresa
     * @return Empresa
     */
    public function obtEmpresa($iRutEmpresa) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oEmpresaDAO = new EmpresaDAO($this->cRutaRelativa);
        $oEmpresa = $oEmpresaDAO->obtEmpresa($oPDO, $iRutEmpresa);
        
        return $oEmpresa;
    }
    
    /**
     * Retorna listado de Empresa
     * 
     * @return Array Empresa
     */
    public function listEmpresa() {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oEmpresaDAO = new EmpresaDAO($this->cRutaRelativa);
        $listEmpresa = $oEmpresaDAO->listEmpresa($oPDO);
        
        return $listEmpresa;
    }
    
    
    /**
     * Retorna listado SelectItem Empresa
     * 
     * @return Array SelectItem
     */
    public function listEmpresaSI() {
        require_once $this->cRutaRelativa . 'Clases/Factory/DTO/SelectItem.php';
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oEmpresaDAO = new EmpresaDAO($this->cRutaRelativa);
        $listEmpresa = $oEmpresaDAO->listEmpresa($oPDO);
        
        $i = 0;
        $listEmpresaSI = Array();
        foreach($listEmpresa as $oEmpresa) {
            $listEmpresaSI[$i] = new SelectItem($oEmpresa->rut_empresa, $oEmpresa->razon_social);
            $i++;
        }
        
        return $listEmpresaSI;
    }
    
}

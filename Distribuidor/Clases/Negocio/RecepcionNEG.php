<?php

/**
 * Description of RecepcionNEG
 *
 * @author ccastro
 */
class RecepcionNEG {
    
    
    private $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct() {
        require_once __DIR__ . "/../Conexion/Conexion.php";
        require_once __DIR__ . "/../DAO/RecepcionDAO.php";
        require_once __DIR__ . '/../NegDTO/RecepcionNDTO.php';
        require_once __DIR__ . "/../DAO/TipoDoctoDAO.php";
        require_once __DIR__ . '/../DAO/EmpresaDAO.php';
        require_once __DIR__ . '/../DAO/ProveedorDAO.php';
        require_once __DIR__ . '/../Dominio/RecepcionDOM.php';
        require_once __DIR__ . '/../NegDTO/ProductoRecepcionNDTO.php';
    }
    // </editor-fold>
    
    
    /**
     * Crea lista de RecepcionNDTO según lista de Recepcion
     * 
     * @param Array Recepcion $listRecepciones
     * @return Array RecepcionNDTO
     */
    protected function crearListRecepcionNDTO($oPDO, $listRecepciones) {
        $oTipoDoctoDAO = new TipoDoctoDAO($this->cRutaRelativa);
        $oEmpresaDAO = new EmpresaDAO($this->cRutaRelativa);
        $oProveedorDAO = new ProveedorDAO($this->cRutaRelativa);
        
        $i = 0;
        $listRecepcionNDTO = [];
        foreach($listRecepciones as $oRecepcion) {
            $oRecepcionNDTO = new RecepcionNDTO();
            $oRecepcionNDTO->oRecepcion = $oRecepcion;
            $oRecepcionNDTO->oTipoDocto = $oTipoDoctoDAO->obtTipoDocto($oPDO, $oRecepcion->id_tipo_docto);
            $oRecepcionNDTO->oTipoPago = $oTipoDoctoDAO->obtTipoDocto($oPDO, $oRecepcion->id_tipo_pago);
            $oRecepcionNDTO->oEmpresa = $oEmpresaDAO->obtEmpresa($oPDO, $oRecepcion->rut_empresa);
            $oRecepcionNDTO->oProveedor = $oProveedorDAO->obtProveedor($oPDO, $oRecepcion->rut_proveedor);
            $listRecepcionNDTO[$i] = $oRecepcionNDTO;
            $i++;
        }
        
        return $listRecepcionNDTO;
    }
    
    
    /**
     * Retorna RecepcionNDTO según id.
     * Si el parametro $bConProductos es TRUE, retorna en RecepcionNDTO el campo listProductoRecepcionNDTO cargado.
     * 
     * @param int $idRecepcion
     * @return RecepcionNDTO
     */
    public function obtRecepcion($idRecepcion, $bConProductos = false) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oRecepcionDAO = new RecepcionDAO($this->cRutaRelativa);
        $oTipoDoctoDAO = new TipoDoctoDAO($this->cRutaRelativa);
        $oEmpresaDAO = new EmpresaDAO($this->cRutaRelativa);
        $oProveedorDAO = new ProveedorDAO($this->cRutaRelativa);
        
        $oRecepcion = $oRecepcionDAO->obtRecepcion($oPDO, $idRecepcion);
        
        $oRecepcionNDTO = new RecepcionNDTO();
        $oRecepcionNDTO->oRecepcion = $oRecepcion;
        $oRecepcionNDTO->oTipoDocto = $oTipoDoctoDAO->obtTipoDocto($oPDO, $oRecepcion->id_tipo_docto);
        $oRecepcionNDTO->oEmpresa   = $oEmpresaDAO->obtEmpresa($oPDO, $oRecepcion->rut_empresa);
        $oRecepcionNDTO->oProveedor = $oProveedorDAO->obtProveedor($oPDO, $oRecepcion->rut_proveedor);
        
        if($bConProductos) {
            $oRecepcionNDTO->listProductoRecepcionNDTO = RecepcionDOM::listProductoRecepcion($oPDO, $idRecepcion);
        }
        
        return $oRecepcionNDTO;
    }
    
    
    /**
     * Retorna lista de Recepciones según filtros
     * 
     * @param RecepcionFB $oRecepcionFB
     * @return Array RecepcionNDTO
     */
    public function listRecepciones($oRecepcionFB) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oRecepcionDAO = new RecepcionDAO($this->cRutaRelativa);
        $listRecepciones = $oRecepcionDAO->listRecepciones($oPDO, $oRecepcionFB);
        
        return $this->crearListRecepcionNDTO($oPDO, $listRecepciones);
    }
    
    
    /**
     * Retorna lista de Recepciones en Libro CV Facturacion.cl
     * 
     * @param string $cPeriodo
     * @param int $iRutEmpresa
     * @return Array RecepcionNDTO
     */
    public function listRecepcionesEnLibroCV($cPeriodo, $iRutEmpresa) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oRecepcionDAO = new RecepcionDAO($this->cRutaRelativa);
        $listRecepciones = $oRecepcionDAO->listRecepcionesEnLibroCV($oPDO, $cPeriodo, $iRutEmpresa);
        $listRecepcionNDTO = $this->crearListRecepcionNDTO($oPDO, $listRecepciones);
        
        return $listRecepcionNDTO;
    }
    
    
    /**
     * Crea resumen de Recepciones desde listado
     * 
     * @param Array RecepcionNDTO $listRecepcionNDTO
     * @return ResumenDoctosNDTO
     */
    public function crearResumenRecepciones($listRecepcionNDTO) {
        require_once __DIR__ . '/../NegDTO/ResumenDoctosNDTO.php';
        
        $oResumenRecepcionNDTO = new ResumenDoctosNDTO();
        foreach($listRecepcionNDTO as $oRecepcionNDTO) {
            $oRecepcion = $oRecepcionNDTO->oRecepcion;
            $oResumenRecepcionNDTO->iTotalIVA += $oRecepcion->iva;
            $oResumenRecepcionNDTO->iTotalNeto += $oRecepcion->total_neto;
            $oResumenRecepcionNDTO->iTotalDoctos++;
        }
        
        return $oResumenRecepcionNDTO;
    }
    
    
    /**
     * Marca Recepciones como subidas al LibroCV
     * 
     * @param string $cFechaDesde
     * @param string $cFechaHasta
     * @param int $iRutEmpresa
     * @param string $cPeriodo
     * @return boolean
     */
    public function marcarRecepcionesEnLibroCV($cFechaDesde, $cFechaHasta, $iRutEmpresa, $cPeriodo) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oRecepcionDAO = new RecepcionDAO($this->cRutaRelativa);
        $oRecepcionDAO->marcarRecepcionesEnLibroCV($oPDO, $cFechaDesde, $cFechaHasta, $iRutEmpresa, $cPeriodo);
        
        return true;
    }
    
    
    /**
     * Desmarca Recepcion como subida al LibroCV
     * 
     * @param int $idRecepcion
     * @return boolean
     */
    public function desmarcarRecepcionEnLibroCV($idRecepcion, $idUsuario) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oRecepcionDAO = new RecepcionDAO($this->cRutaRelativa);
        $oRecepcionDAO->desmarcarRecepcionEnLibroCV($oPDO, $idRecepcion, $idUsuario);
        
        return true;
    }
}

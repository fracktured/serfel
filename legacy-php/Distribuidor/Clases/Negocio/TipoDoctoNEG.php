<?php
require_once __DIR__ . '/../Conexion/Conexion.php';
require_once __DIR__ . '/../Constantes/TipoDoctoCONST.php';
require_once __DIR__ . '/../DAO/TipoDoctoDAO.php';

/**
 * Description of TipoDoctoNEG
 *
 * @author ccastro
 */
class TipoDoctoNEG {
    
    protected $cRutaRelativa = "";
    
    
    /**
     * Retorna listado TipoDocto compra
     * 
     * @return Array TipoDocto
     */
    public function listTipoDoctoCompra() {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oTipoDoctoDAO = new TipoDoctoDAO($this->cRutaRelativa);
        $listTipoDoctoCompra = Array();
        $listTipoDoctoCompra[0] = $oTipoDoctoDAO->obtTipoDocto($oPDO, TipoDoctoCONST::FACTURA);
        $listTipoDoctoCompra[1] = $oTipoDoctoDAO->obtTipoDocto($oPDO, TipoDoctoCONST::FACTURA_ELECTRONICA);
        
        return $listTipoDoctoCompra;
    }
    
    
    /**
     * Retorna listado SelectItem TipoDocto compra
     * 
     * @return Array SelectItem
     */
    public function listTipoDoctoCompraSI($bSITodos) {
        require_once __DIR__ . '/../Factory/DTO/SelectItem.php';
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oTipoDoctoDAO = new TipoDoctoDAO($this->cRutaRelativa);
        $listTipoDoctoCompraSI = Array();
  
        $i = 0;
        if($bSITodos) {
            $listTipoDoctoCompraSI[$i] = new SelectItem(SisDistCONST::ID_FILTRO_TODOS, "TODOS");
            $i++;
        }
        $oTipoDoctoF = $oTipoDoctoDAO->obtTipoDocto($oPDO, TipoDoctoCONST::FACTURA);
        $listTipoDoctoCompraSI[$i] = new SelectItem($oTipoDoctoF->id_tipo_docto, $oTipoDoctoF->nom_tipo_docto);
        $i++;
        $oTipoDoctoFE = $oTipoDoctoDAO->obtTipoDocto($oPDO, TipoDoctoCONST::FACTURA_ELECTRONICA);
        $listTipoDoctoCompraSI[$i] = new SelectItem($oTipoDoctoFE->id_tipo_docto, $oTipoDoctoFE->nom_tipo_docto);
        
        return $listTipoDoctoCompraSI;
    }
    
    
    /**
     * Retorna listado SelectItem TipoDocto forma pago
     * 
     * @return Array SelectItem
     */
    public static function listTipoDoctoFormaPagoSI($bSITodos) {
        require_once __DIR__ . '/../Factory/DTO/SelectItem.php';
        require_once __DIR__ . '/../POJO/TipoDocto.php';
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $listTipoDoctoSI = Array();
        $i = 0;
        if($bSITodos) {
            $listTipoDoctoSI[$i] = new SelectItem(SisDistCONST::ID_FILTRO_TODOS, "TODOS");
            $i++;
        }
        foreach( TipoDoctoDAO::listFormaPago($oPDO) as $oTipoDocto ) {
            $listTipoDoctoSI[$i] = new SelectItem($oTipoDocto->id_tipo_docto, $oTipoDocto->nom_tipo_docto);
            $i++;
        }
        
        return $listTipoDoctoSI;
    }
}

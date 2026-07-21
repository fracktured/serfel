<?php

/**
 * Description of NotaDebitoNEG
 *
 * @author ccastro
 */
class NotaDebitoNEG extends GeneralNEG {
    
    private $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;

        require_once $this->cRutaRelativa . "Clases/Conexion/Conexion.php";
    }
    // </editor-fold>
    
    
    public function obtNotaDebito($idNotaDebito) {
        require_once $this->cRutaRelativa . "Clases/DAO/NotaDebitoDAO.php";
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oNotaDebitoDAO = new NotaDebitoDAO($this->cRutaRelativa);
        $oNotaDebito = $oNotaDebitoDAO->obtNotaDebito($oPDO, $idNotaDebito);
        
        return $oNotaDebito;
    }
    
    
    public function crearNotaDebitoCompleta($idNotaCredito, $idUsuario) {
        require_once $this->cRutaRelativa . "Clases/DAO/NotaDebitoDAO.php";
        require_once $this->cRutaRelativa . "Clases/DAO/NotaCreditoDAO.php";
        require_once $this->cRutaRelativa . "Clases/NegDTO/NotaDebitoNDTO.php";
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oNotaDebitoDAO  = new NotaDebitoDAO($this->cRutaRelativa);
        $oNotaDebitoNDTO = new NotaDebitoNDTO();
        
        $oNotaCredito = NotaCreditoDAO::obtNotaCredito($oPDO, $idNotaCredito);
        
        if(is_null($oNotaCredito)) {
            $oNotaDebitoNDTO->bError = true;
            $oNotaDebitoNDTO->cMensaje = "Nota Crédito " . $idNotaCredito . " no existe.";
        }
        
        $oNotaDebito = new NotaDebito();
        $oNotaDebito->id_nota_credito       = $oNotaCredito->id_nota_credito;
        $oNotaDebito->num_nota_debito_elect = 0;
        $oNotaDebito->rut_empresa           = $oNotaCredito->rut_empresa;
        $oNotaDebito->iva                   = $oNotaCredito->iva;
        $oNotaDebito->iaba                  = $oNotaCredito->iaba;
        $oNotaDebito->espec                 = $oNotaCredito->espec;
        $oNotaDebito->subtotal              = $oNotaCredito->sub_total;
        $oNotaDebito->id_usuario            = $idUsuario;
        $oNotaDebito->precio_total          = $oNotaCredito->precio_total;
        
        $idNotaDebito = $oNotaDebitoDAO->ingNotaDebito($oPDO, $oNotaDebito);
        
        if(!is_numeric($idNotaDebito)) {
            $oNotaDebitoNDTO->bError = true;
            $oNotaDebitoNDTO->cMensaje = "Hubo un error al crear la Nota de Débito. " . $idNotaDebito;
        }
        
        $oNotaDebito->id_nota_debito = $idNotaDebito;
        $oNotaDebitoNDTO->bExito = true;
        $oNotaDebitoNDTO->oNotaDebito = $oNotaDebito;
        
        return $oNotaDebitoNDTO;
    }
    
    
    /**
     * Marca una ND como ND electronica, además de guardar el valor de la url de descarga del PDF
     * 
     * @param int $idNotaDebito
     * @param String $cUrlPDF
     * @param Usuario $oUsuario
     * @return NDTO
     */
    public function marcarComoNDElectronica($idNotaDebito, $idNuevoFolio, $cUrlPDF, $oUsuario) {
        require_once $this->cRutaRelativa . "Clases/DAO/NotaDebitoDAO.php";
        require_once $this->cRutaRelativa . "Clases/NegDTO/NDTO.php";
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oNotaDebitoDAO = new NotaDebitoDAO($this->cRutaRelativa);
        $oNotaDebitoDAO->marcarComoNDElectronica($oPDO, $idNotaDebito, $idNuevoFolio, $cUrlPDF);
            
        $pasarAFacElecNDTO = new NDTO();
        $pasarAFacElecNDTO->exito = true;
        $pasarAFacElecNDTO->mensaje = "Marcar confirmada con éxito.";
        
        return $pasarAFacElecNDTO;
    }
    
    
    
    public function obtNuevoFolio() {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        return NotaDebitoDAO::obtNuevoFolio($oPDO);
    }
    
}

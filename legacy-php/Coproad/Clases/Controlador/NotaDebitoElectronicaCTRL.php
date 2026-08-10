<?php


/**
 * Description of NotaDebitoElectronicaCTRL
 *
 * @author ccastro
 */
class NotaDebitoElectronicaCTRL {
    
    private $cRutaRelativa = "";
    private $oUsuario;
    
    
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;
        
        //require_once $this->cRutaRelativa . 'Clases/Constantes/Usuario.php';
        require_once __DIR__ . "/../Usuario.php";
        require_once __DIR__ . '/../Constantes/FacturacionCLCONST.php';
        require_once __DIR__ . "/../WS/FacturacionClWS.php";
        require_once __DIR__ . "/../Negocio/NotaDebitoNEG.php";
        require_once __DIR__ . "/../Negocio/XMLDTEEcertChileNEG.php";
        require_once __DIR__ . "/../Negocio/XMLNotaDebitoElectronicaNEG.php";
        
        // <editor-fold defaultstate="collapsed" desc="PERMISOS">
        session_start();
        $this->oUsuario = $_SESSION["usuario"];
        //if ($this->usuario->getIdTipoUsuario() != Usuario::ADMINISTRADOR) {
            // Envíar a página de Ud. no tiene permisos para ver este contenido.
        //}
        // </editor-fold>
    }
    
    
    /**
     * Controlador de NotaDebitoElectronica/crearNotaDebitoElectronica.php
     * 
     */
    public function crearNotaDebitoElectronica() {
        
        // <editor-fold defaultstate="collapsed" desc="PARAMETROS">
        $idNotaCredito = filter_input(INPUT_GET, "idNotaCredito");
        
        if(!isset($idNotaCredito) || $idNotaCredito <= 0) {
            // Envíar a página de venta inválida
        }
        // </editor-fold>
        
        $oNotaDebitoNEG = new NotaDebitoNEG($this->cRutaRelativa);
        $oNotaDebitoNDTO = $oNotaDebitoNEG->crearNotaDebitoCompleta($idNotaCredito, $this->oUsuario->getIdUsuario());
        $idNuevoFolio = $oNotaDebitoNEG->obtNuevoFolio();
        
        if($oNotaDebitoNDTO->bError) {
            //Hacer algo con el error
        }
        
        $idNotaDebito = $oNotaDebitoNDTO->oNotaDebito->id_nota_debito;
        
        $oNDElecNEG = new XMLNotaDebitoElectronicaNEG($this->cRutaRelativa);
        $cRutaNomArchivo = $oNDElecNEG->crearXMLNotaDebitoElectronica($idNotaDebito, $idNuevoFolio);
        
        $oFacElecCLWS = new FacturacionClWS($this->cRutaRelativa);
        $oFacElecCLWSDTO = $oFacElecCLWS->crearFacturaElectronica($cRutaNomArchivo);
        
        if($oFacElecCLWSDTO->bExito == "True") {
            $oFacElecCLWSDTO = $oFacElecCLWS->obtLinkFacturaElectronica($idNuevoFolio, 
                                                                        FacturacionClWS::C_TIPO_MOV_VENTA, 
                                                                        FacturacionCLCONST::TIPO_DOCTO_NOTA_DEBITO_ELECTRONICA);
            
            $pasarANDElecNDTO = $oNotaDebitoNEG->marcarComoNDElectronica($idNotaDebito, $idNuevoFolio, $oFacElecCLWSDTO->cMensaje, $this->oUsuario);
        
            header ("Location: " . $oFacElecCLWSDTO->cMensaje);
        } else {
            return $oFacElecCLWSDTO;
        }
    }
    
    
    /**
     * Controlador de Ventas/FacturaElectronica/verPDF.php
     * 
     */
    public function verPDF() {
        
        // <editor-fold defaultstate="collapsed" desc="PARAMETROS">
        $idNotaDebito = filter_input(INPUT_GET, "idNotaDebito");
        
        if(!isset($idNotaDebito) || $idNotaDebito <= 0) {
            // Envíar a página de venta inválida
        }
        // </editor-fold>
        
        $oNotaDebitoNEG = new NotaDebitoNEG($this->cRutaRelativa);
        $oNotaDebito = $oNotaDebitoNEG->obtNotaDebito($idNotaDebito);
        
        if($oNotaDebito->url_PDF != "") {
            header ("Location: " . $oNotaDebito->url_PDF);
        } else {
            $oFacElecCLWS = new FacturacionClWS($this->cRutaRelativa);
            $oFacElecCLWSDTO = $oFacElecCLWS->obtLinkFacturaElectronica($idNotaDebito, 
                                                                        FacturacionClWS::C_TIPO_MOV_VENTA, 
                                                                        FacturacionCLCONST::TIPO_DOCTO_NOTA_DEBITO_ELECTRONICA);
            
            $pasarANDElecNDTO = $oNotaDebitoNEG->marcarComoNDElectronica($idNotaDebito, $oFacElecCLWSDTO->cMensaje, $this->oUsuario);

            header ("Location: " . $oFacElecCLWSDTO->cMensaje);
        }
    }
    
}

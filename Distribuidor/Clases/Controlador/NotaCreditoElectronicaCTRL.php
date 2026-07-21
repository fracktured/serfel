<?php


/**
 * Description of NotaCreditoElectronicaCTRL
 *
 * @author ccastro
 */
class NotaCreditoElectronicaCTRL {
    
    private $cRutaRelativa = "";
    private $oUsuario;
    
    
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;
        
        require_once __DIR__ . "/../Usuario.php";
        require_once __DIR__ . '/../Constantes/FacturacionCLCONST.php';
        require_once __DIR__ . '/../WS/FacturacionClWS.php';
        require_once __DIR__ . "/../Negocio/NotaCreditoNEG.php";
        require_once __DIR__ . "/../Negocio/XMLDTEEcertChileNEG.php";
        require_once __DIR__ . "/../Negocio/XMLNotaCreditoElectronicaNEG.php";
        require_once __DIR__ . '/../Util/FileUtil.php';
        require_once __DIR__ . '/../../PDFMerger/PDFMerger.php';
        
        // <editor-fold defaultstate="collapsed" desc="PERMISOS">
        session_start();
        $this->oUsuario = $_SESSION["usuario"];
        //if ($this->usuario->getIdTipoUsuario() != Usuario::ADMINISTRADOR) {
            // Envíar a página de Ud. no tiene permisos para ver este contenido.
        //}
        // </editor-fold>
    }
    
    
    /**
     * Método que imprime en pantalla Notas de Credito concatenadas (1 original + 1 cedible)
     */
    private function imprimirNCConcatenadas($oNotaCredito) {
        //print_r($oNotaCredito);
        $idUsuario = $this->oUsuario->getIdUsuario();
        $cDestinoOri = __DIR__ . "/../../PDF/NC-Ori-" . $oNotaCredito->id_folio . ".pdf";
        $bExisteOri = FileUtil::copiarArchivoDesdeURL($oNotaCredito->url_PDF_original, $cDestinoOri);
            
        //$cDestinoCed = __DIR__ . "/../../PDF/NotaCred_Ced_Usu_" . $idUsuario . ".pdf";
        //$bExisteCed = FileUtil::copiarArchivoDesdeURL($oNotaCredito->url_PDF_cedible, $cDestinoCed);
            
        if ($bExisteOri) {
            $oPDFMerger = new PDFMerger;
            $oPDFMerger->addPDF($cDestinoOri, 'all')
                        //->addPDF($cDestinoCed, 'all')
                        //->addPDF($cDestinoCed, 'all')
                        ->merge('browser', 'NotasCredito_folio_' . $oNotaCredito->id_folio . '.pdf');
        } else {
            echo "Error al descargar PDFs desde servicio de Facturación Electrónica.";
        }
    }
    
    
    /**
     * Controlador de NotaCreditoElectronica/crearNotaCreditoElectronica.php
     * 
     */
    public function crearNotaCreditoElectronica() {
        require_once __DIR__ . '/../Negocio/VentaNEG.php';
        
        // <editor-fold defaultstate="collapsed" desc="PARAMETROS">
        $idNotaCredito = filter_input(INPUT_GET, "idNotaCredito");
        
        if(!isset($idNotaCredito) || $idNotaCredito <= 0) {
            // Envíar a página de venta inválida
        }
        // </editor-fold>
        
        $oNotaCreditoNEG = new NotaCreditoNEG($this->cRutaRelativa);
        $oNotaCredito = $oNotaCreditoNEG->obtNotaCredito($idNotaCredito);
        
        $oVentaNEG = new VentaNEG($this->cRutaRelativa);
        $oVentaNDTO = $oVentaNEG->obtVenta($oNotaCredito->id_venta);
        $oEmpresa = $oVentaNDTO->oEmpresa;
        $oVenta = $oVentaNDTO->oVenta;
        
        if(isset($oNotaCredito) && $oNotaCredito->id_folio > 0) {
            $this->verPDF();
        }
        
        $idNuevoFolio = $oNotaCreditoNEG->obtNuevoFolio($oVenta->rut_empresa);
        
        $oNCElecNEG = new XMLNotaCreditoElectronicaNEG($this->cRutaRelativa);
        $cRutaNomArchivo = $oNCElecNEG->crearXMLNotaCreditoElectronica($idNotaCredito, $idNuevoFolio);
        
        $oFacElecCLWS = new FacturacionClWS($this->cRutaRelativa);
        $oFacElecCLWSDTO = $oFacElecCLWS->procesarDocumento($oEmpresa->obtRutCompleto(), $cRutaNomArchivo);
        
        if($oFacElecCLWSDTO->bExito == "True") {
            $oNotaCredito = $oNotaCreditoNEG->marcarComoNCElectronica($idNotaCredito, $idNuevoFolio, $this->oUsuario);
            $this->imprimirNCConcatenadas($oNotaCredito);
        } else {
            return $oFacElecCLWSDTO;
        }
    }
    
    
    /**
     * Controlador de NotaCreditoElectronica/verPDF.php
     * 
     */
    public function verPDF() {
        
        // <editor-fold defaultstate="collapsed" desc="PARAMETROS">
        $idNotaCredito = filter_input(INPUT_GET, "idNotaCredito");
        
        if(!isset($idNotaCredito) || $idNotaCredito <= 0) {
            // Envíar a página de venta inválida
        }
        // </editor-fold>
        
        $oNotaCreditoNEG = new NotaCreditoNEG($this->cRutaRelativa);
        $oNotaCredito = $oNotaCreditoNEG->obtNotaCredito($idNotaCredito);
        
        if(empty($oNotaCredito->url_PDF_original) || empty($oNotaCredito->url_PDF_cedible)) {
            $oNotaCredito = $oNotaCreditoNEG->marcarComoNCElectronica($idNotaCredito, $oNotaCredito->id_folio, $this->oUsuario);
        }
            
        $this->imprimirNCConcatenadas($oNotaCredito);
    }
    
}

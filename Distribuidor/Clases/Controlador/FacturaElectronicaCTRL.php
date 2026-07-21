<?php

/**
 * Description of FacturaElectronicaCTRL
 *
 * @author ccastro
 */
class FacturaElectronicaCTRL {
    
    private $cRutaRelativa;
    private $oUsuario;
    
    
    public function __construct($cRutaRelativa) {
        error_reporting(E_ALL ^ (E_NOTICE | E_WARNING | E_DEPRECATED));

        $this->cRutaRelativa = $cRutaRelativa;
        //require_once $this->cRutaRelativa . 'Clases/Constantes/Usuario.php';
        require_once __DIR__ . "/../Usuario.php";
        require_once __DIR__ . '/../Constantes/SisDistCONST.php';
        require_once __DIR__ . "/../Negocio/VentaNEG.php";
        require_once __DIR__ . "/../Negocio/XMLDTEEcertChileNEG.php";
        require_once __DIR__ . "/../Negocio/XMLFacturaElectronicaNEG.php";
        require_once __DIR__ . "/../WS/FacturacionClWS.php";
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
     * Método que imprime en pantalla Facturas concatenadas (1 original + 1 cedible)
     */
    private function imprimirFacturasConcatenadas($oVenta, $outputmode) {
        $idUsuario = $this->oUsuario->getIdUsuario();
        $cDestinoOri = __DIR__ . "/../../PDF/FE-Ori-" . $oVenta->id_venta . ".pdf";
        $bExisteOri = FileUtil::copiarArchivoDesdeURL($oVenta->url_PDF_original, $cDestinoOri);
            
        $cDestinoCed = __DIR__ . "/../../PDF/FE-Ced-" . $oVenta->id_venta . ".pdf";
        $bExisteCed = FileUtil::copiarArchivoDesdeURL($oVenta->url_PDF_cedible, $cDestinoCed);
         
        if ($bExisteOri && $bExisteCed) {
            $oPDFMerger = new PDFMerger;
            $oPDFMerger->addPDF($cDestinoOri, 'all')
                        ->addPDF($cDestinoCed, 'all')
                        //->addPDF($cDestinoCed, 'all')
                        ->merge($outputmode, 'Facturas_folio_' . $oVenta->id_folio . '.pdf');
        } else {
            echo "Error al descargar PDFs desde servicio de Facturación Electrónica.";
        }
    }
    
    
    /**
     * Controlador de FacturaElectronica/crearFacturaElectronica.php
     * 
     */
    public function crearFacturaElectronica($outputmode = 'browser') {
        $idVenta = filter_input(INPUT_GET, "idVenta");
        
        if(!isset($idVenta) || $idVenta <= 0) {
            // Envíar a página de venta inválida
        }
        
        $oVentaNEG = new VentaNEG($this->cRutaRelativa);
        $oVentaNDTO = $oVentaNEG->obtVenta($idVenta);
        $oVenta = $oVentaNDTO->oVenta;
        $oEmpresa = $oVentaNDTO->oEmpresa;
        
        if(isset($oVenta) && $oVenta->id_folio > 0) {
            if ( $outputmode == 'browser' ) {
                $this->verPDF();
            } else {
                $this->descargarPDF();
            }
        }
        
        $idNuevoFolio = $oVentaNEG->obtNuevoFolio($oVenta->rut_empresa);
            
        $oFacElecNEG = new XMLFacturaElectronicaNEG($this->cRutaRelativa);
        $cRutaNomArchivo = $oFacElecNEG->crearXMLFacturaElectronica($idVenta, $idNuevoFolio);
        
        // $oFacElecCLWS = new FacturacionClWS($this->cRutaRelativa);
        // $oFacElecCLWSDTO = $oFacElecCLWS->procesarDocumento($oEmpresa->obtRutCompleto(), $cRutaNomArchivo);
        
        // if($oFacElecCLWSDTO->bExito == "True") {
        //     $oVentaNDTO = $oVentaNEG->marcarComoFacturaElectronica($idVenta, $idNuevoFolio, $this->oUsuario);
        //     $this->imprimirFacturasConcatenadas($oVentaNDTO->oVenta, $outputmode);
        // } else {
        //     return $oFacElecCLWSDTO;
        // }
    }
    
    private function obtenerVenta() {
        $idVenta = filter_input(INPUT_GET, "idVenta");
        
        if(!isset($idVenta) || $idVenta <= 0) {
            // Envíar a página de venta inválida
        }
        
        $oVentaNEG = new VentaNEG($this->cRutaRelativa);
        $oVentaNDTO = $oVentaNEG->obtVenta($idVenta);
        $oVenta = $oVentaNDTO->oVenta;
        
        if(empty($oVenta->url_PDF_original) || empty($oVenta->url_PDF_cedible)) {
            $oVentaNDTO = $oVentaNEG->marcarComoFacturaElectronica($idVenta, $oVenta->id_folio, $this->oUsuario);
            $oVenta = $oVentaNDTO->oVenta;
        }
            
        return $oVenta;
    }

    /**
     * Controlador de Ventas/FacturaElectronica/verPDF.php
     * 
     */
    public function verPDF() {
        $oVenta = $this->obtenerVenta();
        $this->imprimirFacturasConcatenadas($oVenta, 'browser');
    }

    /**
     * Controlador de Ventas/FacturaElectronica/descargarPDF.php
     * 
     */
    public function descargarPDF() {
        $oVenta = $this->obtenerVenta();
        $this->imprimirFacturasConcatenadas($oVenta, 'download');
    }

    private function agregarPDF($oPDFMerger, $oVenta) {
        $idUsuario = $this->oUsuario->getIdUsuario();
        $cDestinoOri = __DIR__ . "/../../PDF/FE-Ori-" . $oVenta->id_venta . ".pdf";
        $bExisteOri = FileUtil::copiarArchivoDesdeURL($oVenta->url_PDF_original, $cDestinoOri);
                
        $cDestinoCed = __DIR__ . "/../../PDF/FE-Ced-" . $oVenta->id_venta . ".pdf";
        $bExisteCed = FileUtil::copiarArchivoDesdeURL($oVenta->url_PDF_cedible, $cDestinoCed);
            
        if ($bExisteOri && $bExisteCed) {
            $oPDFMerger
                ->addPDF($cDestinoOri, 'all')
                ->addPDF($cDestinoCed, 'all');        
        }
        
        return $oPDFMerger;
    }
    
    /**
     * Controlador de Ventas/FacturaElectronica/concatenarPDFs.php
     * 
     */
    public function concatenarPDFs() {
        $i = 0;
        $oPDFMerger = new PDFMerger;
        $oVentaNEG = new VentaNEG($this->cRutaRelativa);
        $ventas = filter_input(INPUT_POST, "ventas");
        
        foreach( explode("-", $ventas) as $idVenta ) {
            if ( $idVenta == "" ) {
                break;
            }
            $oVentaNDTO = $oVentaNEG->obtVenta($idVenta);
            $oVenta = $oVentaNDTO->oVenta;
            $oEmpresa = $oVentaNDTO->oEmpresa;
            
            if ( $oVenta->id_folio == 0 ) {
                $idNuevoFolio = $oVentaNEG->obtNuevoFolio($oVenta->rut_empresa);
            
                $oFacElecNEG = new XMLFacturaElectronicaNEG($this->cRutaRelativa);
                $cRutaNomArchivo = $oFacElecNEG->crearXMLFacturaElectronica($idVenta, $idNuevoFolio);

                $oFacElecCLWS = new FacturacionClWS($this->cRutaRelativa);
                $oFacElecCLWSDTO = $oFacElecCLWS->procesarDocumento($oEmpresa->obtRutCompleto(), $cRutaNomArchivo);
                
                if($oFacElecCLWSDTO->bExito == "True") {
                    $oVentaNEG->marcarComoFacturaElectronica($idVenta, $idNuevoFolio, $this->oUsuario);
                    $oPDFMerger = $this->agregarPDF($oPDFMerger, $oVenta);
                    $i++;
                }
            } else {
                $oPDFMerger = $this->agregarPDF($oPDFMerger, $oVenta);
                $i++;
            }
        }
        
        // Si existen documentos
        if ( $i > 0 ) {
            $oPDFMerger->merge('download', 'Facturas_'.$i.'.pdf');
        }
    }
}

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
        
        $oFacElecCLWS = new FacturacionClWS($this->cRutaRelativa);
        $oFacElecCLWSDTO = $oFacElecCLWS->procesarDocumento($oEmpresa->obtRutCompleto(), $cRutaNomArchivo);
        
        if($oFacElecCLWSDTO->bExito == "True") {
            $oVentaNDTO = $oVentaNEG->marcarComoFacturaElectronica($idVenta, $idNuevoFolio, $this->oUsuario);
            $this->imprimirFacturasConcatenadas($oVentaNDTO->oVenta, $outputmode);
        } else {
            return $oFacElecCLWSDTO;
        }
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

    /**
     * Descarga en PARALELO los PDFs (original + cedible) de todas las ventas y
     * los concatena respetando el orden de seleccion. Reemplaza al antiguo
     * agregarPDF() secuencial: con ~100 ventas eran 200 descargas una tras otra
     * y se superaba el timeout de origen de CloudFront (504). Ahora se bajan
     * hasta 10 a la vez (FileUtil::descargarPDFsEnParalelo).
     *
     * @param array $aVentas  Ventas listas para descargar, en orden.
     * @return array  ['merger' => PDFMerger, 'docs' => int ventas agregadas].
     */
    private function agregarPDFsEnParalelo($aVentas) {
        $oPDFMerger = new PDFMerger;

        // Construir la lista de descargas: 1 original + 1 cedible por venta. La
        // key liga cada archivo con su venta para concatenar luego en orden.
        $aJobs = array();
        foreach ($aVentas as $oVenta) {
            $aJobs[] = array(
                'key'      => 'ori-' . $oVenta->id_venta,
                'url'      => $oVenta->url_PDF_original,
                'destBase' => "FE-Ori-" . $oVenta->id_venta . ".pdf",
            );
            $aJobs[] = array(
                'key'      => 'ced-' . $oVenta->id_venta,
                'url'      => $oVenta->url_PDF_cedible,
                'destBase' => "FE-Ced-" . $oVenta->id_venta . ".pdf",
            );
        }

        $aArchivos = FileUtil::descargarPDFsEnParalelo($aJobs);

        // Concatenar en el orden de seleccion; solo se agrega la venta si sus
        // DOS PDFs bajaron (misma condicion que el antiguo agregarPDF).
        $iDocs = 0;
        foreach ($aVentas as $oVenta) {
            $cKeyOri = 'ori-' . $oVenta->id_venta;
            $cKeyCed = 'ced-' . $oVenta->id_venta;
            if (isset($aArchivos[$cKeyOri]) && isset($aArchivos[$cKeyCed])) {
                $oPDFMerger
                    ->addPDF($aArchivos[$cKeyOri], 'all')
                    ->addPDF($aArchivos[$cKeyCed], 'all');
                $iDocs++;
            }
        }

        return array('merger' => $oPDFMerger, 'docs' => $iDocs);
    }
    
    /**
     * Controlador de Ventas/FacturaElectronica/concatenarPDFs.php
     * 
     */
    public function concatenarPDFs() {
        $oVentaNEG = new VentaNEG($this->cRutaRelativa);
        $ventas = filter_input(INPUT_POST, "ventas");

        // Fase 1 (secuencial e inevitable): resolver cada venta y, si aun no
        // tiene folio, emitir la factura electronica en facturacion.cl. Se
        // acumulan en orden las ventas listas para descargar. Estas son
        // escrituras al WS + BD, no se paralelizan.
        $aVentasParaDescargar = array();
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
                    $aVentasParaDescargar[] = $oVenta;
                }
            } else {
                $aVentasParaDescargar[] = $oVenta;
            }
        }

        // Fase 2 (paralela): descargar todos los PDFs a la vez y concatenar.
        $aResultado = $this->agregarPDFsEnParalelo($aVentasParaDescargar);

        // Si existen documentos
        if ( $aResultado['docs'] > 0 ) {
            $aResultado['merger']->merge('download', 'Facturas_'.$aResultado['docs'].'.pdf');
        }
    }
}

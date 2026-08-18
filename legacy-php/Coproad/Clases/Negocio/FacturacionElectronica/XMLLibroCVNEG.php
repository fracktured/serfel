<?php

/**
 * Description of XMLLibroCVNEG
 *
 * @author ccastro
 */
class XMLLibroCVNEG {
    
    protected $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;

        require_once $this->cRutaRelativa . "Clases/Conexion/Conexion.php";
        require_once $this->cRutaRelativa . 'Clases/DAO/EmpresaDAO.php';
        require_once $this->cRutaRelativa . 'Clases/DAO/ImpuestoDAO.php';
        require_once $this->cRutaRelativa . 'Clases/Constantes/FacturacionCLCONST.php';
        require_once $this->cRutaRelativa . 'Clases/Constantes/ImpuestoCONST.php';
        require_once $this->cRutaRelativa . 'Clases/Util/FechaUtil.php';
    }
    // </editor-fold>
    
    
    // <editor-fold defaultstate="collapsed" desc="crearNodoCaratula">
    /**
     * Retorna nodo Caratula
     * 
     * @param DomDocument $oXML
     * @param Empresa $oEmpresa
     * @param string $cPeriodo
     * @param string $cTipoOperacion
     * @return DomDocument
     */
    protected function crearNodoCaratula($oXML, $oEmpresa, $cPeriodo, $cTipoOperacion) {
        $oNodoCaratula = $oXML->createElement("Caratula");
        
        $oNodoTXTRutEmisorLibro = $oXML->createTextNode($oEmpresa->obtRutCompleto());
        $oNodoRutEmisorLibro = $oXML->createElement("RutEmisorLibro");
        $oNodoRutEmisorLibro->appendChild($oNodoTXTRutEmisorLibro);
        
        $oNodoTXTRutEnvia = $oXML->createTextNode($oEmpresa->obtRutCompletoRepLegal());
        $oNodoRutEnvia = $oXML->createElement("RutEnvia");
        $oNodoRutEnvia->appendChild($oNodoTXTRutEnvia);
        
        $oNodoTXTPeriodoTributario = $oXML->createTextNode($cPeriodo);
        $oNodoPeriodoTributario = $oXML->createElement("PeriodoTributario");
        $oNodoPeriodoTributario->appendChild($oNodoTXTPeriodoTributario);
        
        $oNodoTXTFchResol = $oXML->createTextNode(FechaUtil::aFechaYMD($oEmpresa->fecha_aprobacion_SII));
        $oNodoFchResol = $oXML->createElement("FchResol");
        $oNodoFchResol->appendChild($oNodoTXTFchResol);
        
        $oNodoTXTNroResol = $oXML->createTextNode($oEmpresa->num_aprobacion_SII);
        $oNodoNroResol = $oXML->createElement("NroResol");
        $oNodoNroResol->appendChild($oNodoTXTNroResol);
        
        $oNodoTXTTipoOperacion = $oXML->createTextNode($cTipoOperacion);
        $oNodoTipoOperacion = $oXML->createElement("TipoOperacion");
        $oNodoTipoOperacion->appendChild($oNodoTXTTipoOperacion);
        
        $oNodoTXTTipoLibro = $oXML->createTextNode(FacturacionCLCONST::TIPO_LIBRO_MENSUAL);
        $oNodoTipoLibro = $oXML->createElement("TipoLibro");
        $oNodoTipoLibro->appendChild($oNodoTXTTipoLibro);
        
        $oNodoTXTTipoEnvio = $oXML->createTextNode(FacturacionCLCONST::TIPO_ENVIO_TOTAL);
        $oNodoTipoEnvio = $oXML->createElement("TipoEnvio");
        $oNodoTipoEnvio->appendChild($oNodoTXTTipoEnvio);
        
        $oNodoCaratula->appendChild($oNodoRutEmisorLibro);
        $oNodoCaratula->appendChild($oNodoRutEnvia);
        $oNodoCaratula->appendChild($oNodoPeriodoTributario);
        $oNodoCaratula->appendChild($oNodoFchResol);
        $oNodoCaratula->appendChild($oNodoNroResol);
        $oNodoCaratula->appendChild($oNodoTipoOperacion);
        $oNodoCaratula->appendChild($oNodoTipoLibro);
        $oNodoCaratula->appendChild($oNodoTipoEnvio);
        
        return $oNodoCaratula;
    }
    // </editor-fold>
    
    // <editor-fold defaultstate="collapsed" desc="crearNodoTotalesPeriodo">
    /**
     * Retorna nodo TotalesPeriodo
     * 
     * @param DomDocument $oXML
     * @param ResumenDoctoNDTO $oResumenDoctoNDTO
     * @return DomDocument
     */
    protected function crearNodoTotalesPeriodo($oXML, $oResumenDoctoNDTO, $idTipoDocto) {
        $oNodoTotalesPeriodoFC = $oXML->createElement("TotalesPeriodo");
        
        $oNodoTXTTpoDoc = $oXML->createTextNode($idTipoDocto);
        $oNodoTpoDoc = $oXML->createElement("TpoDoc");
        $oNodoTpoDoc->appendChild($oNodoTXTTpoDoc);
        
        $oNodoTXTTotDoc = $oXML->createTextNode($oResumenDoctoNDTO->iTotalDoctos);
        $oNodoTotDoc = $oXML->createElement("TotDoc");
        $oNodoTotDoc->appendChild($oNodoTXTTotDoc);
        
        $oNodoTXTTotMntExe = $oXML->createTextNode(0);
        $oNodoTotMntExe = $oXML->createElement("TotMntExe");
        $oNodoTotMntExe->appendChild($oNodoTXTTotMntExe);
        
        $oNodoTXTTotMntNeto = $oXML->createTextNode($oResumenDoctoNDTO->iTotalNeto);
        $oNodoTotMntNeto = $oXML->createElement("TotMntNeto");
        $oNodoTotMntNeto->appendChild($oNodoTXTTotMntNeto);
        
        $oNodoTXTTotMntIVA = $oXML->createTextNode($oResumenDoctoNDTO->iTotalIVA);
        $oNodoTotMntIVA = $oXML->createElement("TotMntIVA");
        $oNodoTotMntIVA->appendChild($oNodoTXTTotMntIVA);
        
        $oNodoTXTTotIVAProp = $oXML->createTextNode(0);
        $oNodoTotIVAProp = $oXML->createElement("TotIVAProp");
        $oNodoTotIVAProp->appendChild($oNodoTXTTotIVAProp);
        
        $oNodoTXTTotIVATerc = $oXML->createTextNode(0);
        $oNodoTotIVATerc = $oXML->createElement("TotIVATerc");
        $oNodoTotIVATerc->appendChild($oNodoTXTTotIVATerc);
        
        $oNodoTXTTotMntTotal = $oXML->createTextNode($oResumenDoctoNDTO->obtMontoTotal());
        $oNodoTotMntTotal = $oXML->createElement("TotMntTotal");
        $oNodoTotMntTotal->appendChild($oNodoTXTTotMntTotal);
        
        $oNodoTotalesPeriodoFC->appendChild($oNodoTpoDoc);
        $oNodoTotalesPeriodoFC->appendChild($oNodoTotDoc);
        $oNodoTotalesPeriodoFC->appendChild($oNodoTotMntExe);
        $oNodoTotalesPeriodoFC->appendChild($oNodoTotMntNeto);
        $oNodoTotalesPeriodoFC->appendChild($oNodoTotMntIVA);
        $oNodoTotalesPeriodoFC->appendChild($oNodoTotIVAProp);
        $oNodoTotalesPeriodoFC->appendChild($oNodoTotIVATerc);
        $oNodoTotalesPeriodoFC->appendChild($oNodoTotMntTotal);
        
        return $oNodoTotalesPeriodoFC;
    }
    // </editor-fold>
    
    
    /**
     * Retorna nodo EnvioLibro con elementos Detalle de Facturas de compra
     * 
     * @param DomDocument $oXML
     * @param DomDocument $oNodoEnvioLibro
     * @param Array RecepcionNDTO $listRecepcionNDTO
     * @param Impuesto $oImpIVA
     * @return DomDocument
     */
    protected function crearYAgregarNodosDetalleRecepcion($oXML, $oNodoEnvioLibro, $listRecepcionNDTO, $oImpIVA) {
        foreach($listRecepcionNDTO as $oRecepcionNDTO) {
            $oRecepcion = $oRecepcionNDTO->oRecepcion;
            $oProveedor = $oRecepcionNDTO->oProveedor;
                    
            $oNodoDetalle = $oXML->createElement("Detalle");
            
            $oNodoTXTTpoDoc = $oXML->createTextNode(FacturacionCLCONST::TIPO_DOCTO_FACTURA_COMPRA);
            $oNodoTpoDoc = $oXML->createElement("TpoDoc");
            $oNodoTpoDoc->appendChild($oNodoTXTTpoDoc);
            
            $oNodoTXTNroDoc = $oXML->createTextNode($oRecepcion->num_docto);
            $oNodoNroDoc = $oXML->createElement("NroDoc");
            $oNodoNroDoc->appendChild($oNodoTXTNroDoc);
            
            $oNodoTXTTasaImp = $oXML->createTextNode($oImpIVA->valor);
            $oNodoTasaImp = $oXML->createElement("TasaImp");
            $oNodoTasaImp->appendChild($oNodoTXTTasaImp);
            
            $oNodoTXTFchDoc = $oXML->createTextNode(FechaUtil::aLocal($oRecepcion->fecha_emision_docto, 'Y-m-d'));
            $oNodoFchDoc = $oXML->createElement("FchDoc");
            $oNodoFchDoc->appendChild($oNodoTXTFchDoc);
            
            $oNodoTXTRUTDoc = $oXML->createTextNode($oProveedor->obtRutCompleto());
            $oNodoRUTDoc = $oXML->createElement("RUTDoc");
            $oNodoRUTDoc->appendChild($oNodoTXTRUTDoc);
            
            $oNodoTXTRznSoc = $oXML->createTextNode($oProveedor->razon_social);
            $oNodoRznSoc = $oXML->createElement("RznSoc");
            $oNodoRznSoc->appendChild($oNodoTXTRznSoc);
            
            $oNodoTXTMntNeto = $oXML->createTextNode($oRecepcion->total_neto);
            $oNodoMntNeto = $oXML->createElement("MntNeto");
            $oNodoMntNeto->appendChild($oNodoTXTMntNeto);
            
            $oNodoTXTMntIVA = $oXML->createTextNode($oRecepcion->iva);
            $oNodoMntIVA = $oXML->createElement("MntIVA");
            $oNodoMntIVA->appendChild($oNodoTXTMntIVA);
            
            $oNodoTXTMntTotal = $oXML->createTextNode($oRecepcion->monto_total);
            $oNodoMntTotal = $oXML->createElement("MntTotal");
            $oNodoMntTotal->appendChild($oNodoTXTMntTotal);
            
            $oNodoDetalle->appendChild($oNodoTpoDoc);
            $oNodoDetalle->appendChild($oNodoNroDoc);
            $oNodoDetalle->appendChild($oNodoTasaImp);
            $oNodoDetalle->appendChild($oNodoFchDoc);
            $oNodoDetalle->appendChild($oNodoRUTDoc);
            $oNodoDetalle->appendChild($oNodoRznSoc);
            $oNodoDetalle->appendChild($oNodoMntNeto);
            $oNodoDetalle->appendChild($oNodoMntIVA);
            $oNodoDetalle->appendChild($oNodoMntTotal);
            $oNodoEnvioLibro->appendChild($oNodoDetalle);
        }
        
        return $oNodoEnvioLibro;
    }
    
    
    /**
     * Retorna nodo EnvioLibro con elementos Detalle de Facturas de venta
     * 
     * @param DomDocument $oXML
     * @param DomDocument $oNodoEnvioLibro
     * @param Array VentaNDTO $listVentaNDTO
     * @param Impuesto $oImpIVA
     * @return DomDocument
     */
    protected function crearYAgregarNodosDetalleVenta($oXML, $oNodoEnvioLibro, $listVentaNDTO, $oImpIVA) {
        foreach($listVentaNDTO as $oVentaNDTO) {
            $oVentaNDTO = new VentaNDTO();
            $oVenta = new Venta();
            $oCliente = new Cliente();
            $oVenta = $oVentaNDTO->oVenta;
            $oCliente = $oVentaNDTO->oCliente;
                    
            $oNodoDetalle = $oXML->createElement("Detalle");
            
            $oNodoTXTTpoDoc = $oXML->createTextNode(FacturacionCLCONST::TIPO_DOCTO_FACTURA_COMPRA);
            $oNodoTpoDoc = $oXML->createElement("TpoDoc");
            $oNodoTpoDoc->appendChild($oNodoTXTTpoDoc);
            
            $oNodoTXTNroDoc = $oXML->createTextNode($oVenta->num_docto_emitido);
            $oNodoNroDoc = $oXML->createElement("NroDoc");
            $oNodoNroDoc->appendChild($oNodoTXTNroDoc);
            
            $oNodoTXTTasaImp = $oXML->createTextNode($oImpIVA->valor);
            $oNodoTasaImp = $oXML->createElement("TasaImp");
            $oNodoTasaImp->appendChild($oNodoTXTTasaImp);
            
            $oNodoTXTFchDoc = $oXML->createTextNode(FechaUtil::aLocal($oVenta->fecha_venta, 'Y-m-d'));
            $oNodoFchDoc = $oXML->createElement("FchDoc");
            $oNodoFchDoc->appendChild($oNodoTXTFchDoc);
            
            $oNodoTXTRUTDoc = $oXML->createTextNode($oCliente->obtRutCompleto());
            $oNodoRUTDoc = $oXML->createElement("RUTDoc");
            $oNodoRUTDoc->appendChild($oNodoTXTRUTDoc);
            
            $oNodoTXTRznSoc = $oXML->createTextNode($oCliente->razon_social);
            $oNodoRznSoc = $oXML->createElement("RznSoc");
            $oNodoRznSoc->appendChild($oNodoTXTRznSoc);
            
            $oNodoTXTMntNeto = $oXML->createTextNode($oVenta->sub_total);
            $oNodoMntNeto = $oXML->createElement("MntNeto");
            $oNodoMntNeto->appendChild($oNodoTXTMntNeto);
            
            $oNodoTXTMntIVA = $oXML->createTextNode($oVenta->iva);
            $oNodoMntIVA = $oXML->createElement("MntIVA");
            $oNodoMntIVA->appendChild($oNodoTXTMntIVA);
            
            $oNodoTXTMntTotal = $oXML->createTextNode($oVenta->precio_total);
            $oNodoMntTotal = $oXML->createElement("MntTotal");
            $oNodoMntTotal->appendChild($oNodoTXTMntTotal);
            
            $oNodoDetalle->appendChild($oNodoTpoDoc);
            $oNodoDetalle->appendChild($oNodoNroDoc);
            $oNodoDetalle->appendChild($oNodoTasaImp);
            $oNodoDetalle->appendChild($oNodoFchDoc);
            $oNodoDetalle->appendChild($oNodoRUTDoc);
            $oNodoDetalle->appendChild($oNodoRznSoc);
            $oNodoDetalle->appendChild($oNodoMntNeto);
            $oNodoDetalle->appendChild($oNodoMntIVA);
            $oNodoDetalle->appendChild($oNodoMntTotal);
            $oNodoEnvioLibro->appendChild($oNodoDetalle);
        }
        
        return $oNodoEnvioLibro;
    }
    
    
    /**
     * Crea XML Libro de Compra y devuelve objeto XMLLibroCVNDTO.
     * 
     * @param string $cPeriodo
     * @param string $cFechaDesde
     * @param string $cFechaHasta
     * @param int $iRutEmpresa
     * @return XMLLibroCVNDTO
     */
    public function crearXMLLibroCompra($cPeriodo, $cFechaDesde, $cFechaHasta, $iRutEmpresa) {
        require_once $this->cRutaRelativa . 'Clases/Negocio/RecepcionNEG.php';
        require_once $this->cRutaRelativa . 'Clases/Constantes/TipoDoctoCONST.php';
        require_once $this->cRutaRelativa . 'Clases/NegDTO/XMLLibroCVNDTO.php';
        
        $cRutaArchivoXML = $this->cRutaRelativa . "XML/Libros/LC" . $cPeriodo . ".xml";
        
        $oRecepcionNEG = new RecepcionNEG();
        $listRecepcionNDTO = $oRecepcionNEG->listRecepciones($cFechaDesde, $cFechaHasta, 0, 0, $iRutEmpresa, TipoDoctoCONST::FACTURA);
        $oResumenRecepcionNDTO = $oRecepcionNEG->crearResumenRecepciones($listRecepcionNDTO);
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oEmpresaDAO = new EmpresaDAO($this->cRutaRelativa);
        $oEmpresa = $oEmpresaDAO->obtEmpresa($oPDO, $iRutEmpresa);
        
        $oImpuestoDAO = new ImpuestoDAO($this->cRutaRelativa);
        $oImpIVA = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::IVA);
        
        $oXML = new DomDocument("1.0", "ISO-8859-1");
        $oXML->xmlStandalone = true;
        $oXML->formatOutput  = true;
        
        // <editor-fold defaultstate="collapsed" desc="TAG LibroCompraVenta">
        $oNodoLibroCompraVenta = $oXML->createElement("LibroCompraVenta");
        $oNodoLibroCompraVenta->setAttribute("version", "1.0");
        
        $oNodoEnvioLibro = $oXML->createElement("EnvioLibro");
        $oNodoEnvioLibro->setAttribute("ID", "LC" . $cPeriodo);
        
        $oNodoCaratula = $this->crearNodoCaratula($oXML, $oEmpresa, $cPeriodo, FacturacionCLCONST::TIPO_OPER_LIBRO_COMPRA);
        
        // <editor-fold defaultstate="collapsed" desc="TAG ResumenPeriodo">
        $oNodoResumenPeriodo = $oXML->createElement("ResumenPeriodo");
        
        $oNodoTotalesPeriodoFC = $this->crearNodoTotalesPeriodo($oXML, $oResumenRecepcionNDTO, FacturacionCLCONST::TIPO_DOCTO_FACTURA_COMPRA);
        
        $oNodoResumenPeriodo->appendChild($oNodoTotalesPeriodoFC);
        // </editor-fold>
        
        $oNodoEnvioLibro->appendChild($oNodoCaratula);
        $oNodoEnvioLibro->appendChild($oNodoResumenPeriodo);
        
        $oNodoEnvioLibro = $this->crearYAgregarNodosDetalleRecepcion($oXML, $oNodoEnvioLibro, $listRecepcionNDTO, $oImpIVA);
        
        $oNodoLibroCompraVenta->appendChild($oNodoEnvioLibro);
        // </editor-fold>
        
        $oXML->appendChild($oNodoLibroCompraVenta);
        $oXML->save($cRutaArchivoXML);
        
        $oXMLLibroCVNDTO = new XMLLibroCVNDTO();
        $oXMLLibroCVNDTO->cRutaArchivoXML = $cRutaArchivoXML;
        $oXMLLibroCVNDTO->listRecepcionNDTO = $listRecepcionNDTO;
        $oXMLLibroCVNDTO->oResumenRecepcionNDTO = $oResumenRecepcionNDTO;
        
        return $oXMLLibroCVNDTO;
    }
    
    
    /**
     * Crea XML Libro de Venta y devuelve la ruta de este.
     * 
     * @param string $cPeriodo
     * @param string $cFechaDesde
     * @param string $cFechaHasta
     * @param int $iRutEmpresa
     * @return string
     */
    public function crearXMLLibroVenta($cPeriodo, $cFechaDesde, $cFechaHasta, $iRutEmpresa) {
        require_once $this->cRutaRelativa . 'Clases/Negocio/VentaNEG.php';
        require_once $this->cRutaRelativa . 'Clases/Constantes/TipoDoctoCONST.php';
        
        $cRutaNomArchivo = $this->cRutaRelativa . "XML/Libros/LV" . $cPeriodo . ".xml";
        
        $oVentaNEG = new VentaNEG($this->cRutaRelativa);
        $listVentaNDTO = $oVentaNEG->listVentas($cFechaDesde, $cFechaHasta, 0, 0, $iRutEmpresa, TipoDoctoCONST::FACTURA);
        $oResumenVentaNDTO = $oVentaNEG->crearResumenVentas($listVentaNDTO);
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oEmpresaDAO = new EmpresaDAO($this->cRutaRelativa);
        $oEmpresa = $oEmpresaDAO->obtEmpresa($oPDO, $iRutEmpresa);
        
        $oImpuestoDAO = new ImpuestoDAO($this->cRutaRelativa);
        $oImpIVA = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::IVA);
        
        $oXML = new DomDocument("1.0", "ISO-8859-1");
        $oXML->xmlStandalone = true;
        $oXML->formatOutput  = true;
        
        // <editor-fold defaultstate="collapsed" desc="TAG LibroCompraVenta">
        $oNodoLibroCompraVenta = $oXML->createElement("LibroCompraVenta");
        $oNodoLibroCompraVenta->setAttribute("version", "1.0");
        
        $oNodoEnvioLibro = $oXML->createElement("EnvioLibro");
        $oNodoEnvioLibro->setAttribute("ID", "LV" . $cPeriodo);
        
        $oNodoCaratula = $this->crearNodoCaratula($oXML, $oEmpresa, $cPeriodo, FacturacionCLCONST::TIPO_OPER_LIBRO_VENTA);
        
        // <editor-fold defaultstate="collapsed" desc="TAG ResumenPeriodo">
        $oNodoResumenPeriodo = $oXML->createElement("ResumenPeriodo");
        
        $oNodoTotalesPeriodoFC = $this->crearNodoTotalesPeriodo($oXML, $oResumenVentaNDTO, FacturacionCLCONST::TIPO_DOCTO_FACTURA);
        
        $oNodoResumenPeriodo->appendChild($oNodoTotalesPeriodoFC);
        // </editor-fold>
        
        $oNodoEnvioLibro->appendChild($oNodoCaratula);
        $oNodoEnvioLibro->appendChild($oNodoResumenPeriodo);
        
        $oNodoEnvioLibro = $this->crearYAgregarNodosDetalleVenta($oXML, $oNodoEnvioLibro, $listVentaNDTO, $oImpIVA);
        
        $oNodoLibroCompraVenta->appendChild($oNodoEnvioLibro);
        // </editor-fold>
        
        $oXML->appendChild($oNodoLibroCompraVenta);
        $oXML->save($cRutaNomArchivo);
        
        return $cRutaNomArchivo;
    }
    
}

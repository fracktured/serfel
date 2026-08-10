<?php

/**
 * Description of XMLFacturaElectronicaNEG
 *
 * @author ccastro
 */
class XMLFacturaElectronicaNEG extends XMLDTEEcertChileNEG {
    
    
    public function crearXMLFacturaElectronica($idVenta, $idFolio) {
        require_once $this->cRutaRelativa . "Clases/DAO/ProductoVentaDAO.php";
        require_once __DIR__ . '/../Usuario.php';
        
        // The DTE XML is transient: written here, read straight back in
        // FacturacionClWS::procesarDocumento(), base64-encoded, and sent to the
        // WS (the filename never leaves this process). Write it to the system
        // temp dir, which is always writable — the app tree under /var/www is
        // root-owned while Apache runs as www-data, so saving into XML/Facturas/
        // silently failed and the WS received an empty "file" ("no es un XML").
        // uniqid() avoids collisions since Serfel and Coproad share one container.
        $cRutaNomArchivo = sys_get_temp_dir() . "/FacElec_" . $idFolio . "_" . uniqid() . ".xml";
        
        $conexion = new Conexion();
        $oPDO = $conexion->abrirConexion();
        
        //$oVentaDAO = new VentaDAO($this->cRutaRelativa);
        $oVenta = VentaDAO::obtVenta($oPDO, $idVenta);
        $this->oVenta = $oVenta;
        
        $listProdVenta = ProductoVentaDAO::listProductoVenta($oPDO, $idVenta);
        $this->calcMontosImpAdicional($oPDO, $listProdVenta);
        
        $oEmpresaDAO = new EmpresaDAO($this->cRutaRelativa);
        $oEmpresa = $oEmpresaDAO->obtEmpresa($oPDO, $oVenta->rut_empresa);
        
        $oImpuestoDAO = new ImpuestoDAO($this->cRutaRelativa);
        $oImpIva = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::IVA);
        $oImpBebidas = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::IABA);
        $oImpHarina = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::ESPEC);
        
        $oVendedor = new Usuario($oVenta->id_usuario_venta);
        
        $oXML = new DomDocument("1.0", "UTF-8");
        $oXML->xmlStandalone = true;
        $oXML->formatOutput  = true;
        
        // <editor-fold defaultstate="collapsed" desc="TAG DTE">
        $oNodoDTE = $oXML->createElement("DTE");
        $oNodoDTE->setAttribute("version", "1.0");
        
        // <editor-fold defaultstate="collapsed" desc="TAG Documento">
        $cIdDocumento = $this->genIdDocumento($oEmpresa->obtRutCompleto(), FacturacionCLCONST::TIPO_DOCTO_FACTURA_ELECTRONICA, $idFolio);
        $oNodoDocumento = $oXML->createElement("Documento");
        $oNodoDocumento->setAttribute("ID", $cIdDocumento);
        
        // <editor-fold defaultstate="collapsed" desc="TAG Encabezado">
        $oNodoEncabezado = $oXML->createElement("Encabezado");

        $oNodoIdDoc    = $this->crearNodoIdDoc($oXML, FacturacionCLCONST::TIPO_DOCTO_FACTURA_ELECTRONICA, $oVenta->fecha_venta, $idFolio);
        $oNodoEmisor   = $this->crearNodoEmisor($oXML, $oEmpresa);
        $oNodoReceptor = $this->crearNodoReceptor($oXML, $oPDO, $oVenta);
        $oNodoTotales  = $this->crearNodoTotales($oXML, $oVenta, $oImpIva, $oImpBebidas, $oImpHarina);
        $oNodoObservaciones = $oXML->createElement("Observaciones");
        $oNodoObservaciones->appendChild( $oXML->createTextNode($oVenta->observaciones) );
        
        $oNodoEncabezado->appendChild($oNodoIdDoc);
        $oNodoEncabezado->appendChild($oNodoEmisor);
        $oNodoEncabezado->appendChild($oNodoReceptor);
        $oNodoEncabezado->appendChild($oNodoTotales);
        $oNodoEncabezado->appendChild($oNodoObservaciones);
        // </editor-fold>

        
        $oNodoAdicional = $this->crearNodoAdicional($oXML, $oPDO, $oVendedor->getNumUsuario());
        
        $oNodoDocumento->appendChild($oNodoEncabezado);
        $oNodoDocumento = $this->crearNodosDetalle($oXML, $oNodoDocumento, $oPDO, $listProdVenta);
        $oNodoDocumento->appendChild($oNodoAdicional);
        // </editor-fold>
        
        $oNodoDTE->appendChild($oNodoDocumento);
        // </editor-fold>
        
        $oXML->appendChild($oNodoDTE);
        $oXML->save($cRutaNomArchivo);
        
        return $cRutaNomArchivo;
    }
}

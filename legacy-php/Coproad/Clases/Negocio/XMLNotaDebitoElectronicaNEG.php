<?php

/**
 * Description of XMLNotaCreditoElectronicaNEG
 *
 * @author ccastro
 */
class XMLNotaDebitoElectronicaNEG extends XMLDTEEcertChileNEG {
    
    const COD_REF_ANULA_DOC_COMPLETO = 1;
    const COD_REF_CORRIGE_TEXTO_DOC = 2;
    const COD_REF_CORRIGE_MONTOS_DOC = 3;
    
    
    protected function crearNodosReferencia($oXML, $oNodoDocumento, $listProdVenta, $oNotaCredito, $iTipoDocRef, $cRazonRef) {
        $iNumLinea = 1;
        foreach($listProdVenta as $oProductoVenta) {
            $oNodoReferencia = $oXML->createElement("Referencia");
            
            $oNodoTXTNroLinRef = $oXML->createTextNode($iNumLinea);
            $oNodoNroLinRef = $oXML->createElement("NroLinRef");
            $oNodoNroLinRef->appendChild($oNodoTXTNroLinRef);
            
            $oNodoTXTTpoDocRef = $oXML->createTextNode($iTipoDocRef);
            $oNodoTpoDocRef = $oXML->createElement("TpoDocRef");
            $oNodoTpoDocRef->appendChild($oNodoTXTTpoDocRef);
            
            $oNodoTXTFolioRef = $oXML->createTextNode($oNotaCredito->id_folio);
            $oNodoFolioRef = $oXML->createElement("FolioRef");
            $oNodoFolioRef->appendChild($oNodoTXTFolioRef);
            
            $oNodoTXTFchRef = $oXML->createTextNode(FechaUtil::aLocal($oNotaCredito->fecha_nota_credito, 'Y-m-d'));
            $oNodoFchRef = $oXML->createElement("FchRef");
            $oNodoFchRef->appendChild($oNodoTXTFchRef);
            
            $oNodoTXTCodRef = $oXML->createTextNode(XMLNotaDebitoElectronicaNEG::COD_REF_ANULA_DOC_COMPLETO);
            $oNodoCodRef = $oXML->createElement("CodRef");
            $oNodoCodRef->appendChild($oNodoTXTCodRef);
            
            $oNodoTXTRazonRef = $oXML->createTextNode($cRazonRef);
            $oNodoRazonRef = $oXML->createElement("RazonRef");
            $oNodoRazonRef->appendChild($oNodoTXTRazonRef);
            
            $oNodoReferencia->appendChild($oNodoNroLinRef);
            $oNodoReferencia->appendChild($oNodoTpoDocRef);
            $oNodoReferencia->appendChild($oNodoFolioRef);
            $oNodoReferencia->appendChild($oNodoFchRef);
            $oNodoReferencia->appendChild($oNodoCodRef);
            $oNodoReferencia->appendChild($oNodoRazonRef);
            $iNumLinea++;
            
            $oNodoDocumento->appendChild($oNodoReferencia);
        }
        
        return $oNodoDocumento;
    }
    
    
    public function crearXMLNotaDebitoElectronica($idNotaDebito, $idFolio) {
        require_once $this->cRutaRelativa . "Clases/DAO/NotaDebitoDAO.php";
        require_once $this->cRutaRelativa . "Clases/DAO/NotaCreditoDAO.php";
        require_once $this->cRutaRelativa . "Clases/DAO/VentaDAO.php";
        require_once $this->cRutaRelativa . "Clases/DAO/ProdNotaCreditoDAO.php";
        require_once $this->cRutaRelativa . "Clases/Negocio/XMLFacturaElectronicaNEG.php";
        
        // Transient DTE XML — written here, read back in
        // FacturacionClWS::procesarDocumento() and base64-sent to the WS. Use the
        // system temp dir (always writable); the app tree under /var/www is
        // root-owned while Apache runs as www-data, so saving into XML/NotasDebito/
        // silently failed and the WS received an empty file. uniqid() avoids
        // collisions since Serfel and Coproad share one container.
        $cRutaNomArchivo = sys_get_temp_dir() . "/NotaDebElec_" . $idFolio . "_" . uniqid() . ".xml";
        
        $conexion = new Conexion();
        $oPDO = $conexion->abrirConexion();
        
        $oNotaDebitoDAO = new NotaDebitoDAO($this->cRutaRelativa);
        $oNotaDebito = $oNotaDebitoDAO->obtNotaDebito($oPDO, $idNotaDebito);
        
        $oNotaCredito = NotaCreditoDAO::obtNotaCredito($oPDO, $oNotaDebito->id_nota_credito);
        
        //$oVentaDAO = new VentaDAO($this->cRutaRelativa);
        $oVenta = VentaDAO::obtVenta($oPDO, $oNotaCredito->id_venta);
        $this->oVenta = $oVenta;
        
        $listProdNC = ProdNotaCreditoDAO::listProductoNotaCredito($oPDO, $oNotaDebito->id_nota_credito);
        $this->calcMontosImpAdicional($oPDO, $listProdNC);
        
        $oEmpresaDAO = new EmpresaDAO($this->cRutaRelativa);
        $oEmpresa = $oEmpresaDAO->obtEmpresa($oPDO, $oNotaDebito->rut_empresa);
        
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
        $cIdDocumento = $this->genIdDocumento($oEmpresa->obtRutCompleto(), FacturacionCLCONST::TIPO_DOCTO_NOTA_DEBITO_ELECTRONICA, $idFolio);
        $oNodoDocumento = $oXML->createElement("Documento");
        $oNodoDocumento->setAttribute("ID", $cIdDocumento);
        
        // <editor-fold defaultstate="collapsed" desc="TAG Encabezado">
        $oNodoEncabezado = $oXML->createElement("Encabezado");

        $oNodoIdDoc    = $this->crearNodoIdDoc($oXML, FacturacionCLCONST::TIPO_DOCTO_NOTA_DEBITO_ELECTRONICA, $oNotaDebito->fecha_nota_debito, $idFolio);
        $oNodoEmisor   = $this->crearNodoEmisor($oXML, $oEmpresa);
        $oNodoReceptor = $this->crearNodoReceptor($oXML, $oPDO, $oVenta);
        $oNodoTotales  = $this->crearNodoTotales($oXML, $oNotaCredito, $oImpIva, $oImpBebidas, $oImpHarina);
        
        $oNodoEncabezado->appendChild($oNodoIdDoc);
        $oNodoEncabezado->appendChild($oNodoEmisor);
        $oNodoEncabezado->appendChild($oNodoReceptor);
        $oNodoEncabezado->appendChild($oNodoTotales);
        // </editor-fold>
        
        $oNodoAdicional = $this->crearNodoAdicional($oXML, $oPDO, $oVendedor->getNumUsuario());
        
        $oNodoDocumento->appendChild($oNodoEncabezado);
        $oNodoDocumento = $this->crearNodosDetalle($oXML, $oNodoDocumento, $oPDO, $listProdNC);
        $oNodoDocumento->appendChild($oNodoAdicional);
        
        $oNodoDocumento = $this->crearNodosReferencia($oXML, $oNodoDocumento, $listProdNC, $oNotaCredito, FacturacionCLCONST::TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA, "ERROR EN NOTA CREDITO");
        // </editor-fold>
        
        $oNodoDTE->appendChild($oNodoDocumento);
        // </editor-fold>
        
        $oXML->appendChild($oNodoDTE);
        $oXML->save($cRutaNomArchivo);
        
        return $cRutaNomArchivo;
    }
    
}

<?php

/**
 * Description of XMLNotaCreditoElectronicaNEG
 *
 * @author ccastro
 */
class XMLNotaCreditoElectronicaNEG extends XMLDTEEcertChileNEG {
    
    const COD_REF_ANULA_DOC_COMPLETO = 1;
    const COD_REF_CORRIGE_TEXTO_DOC = 2;
    const COD_REF_CORRIGE_MONTOS_DOC = 3;
    
    
    protected function crearNodosReferencia($oXML, $oNodoDocumento, $listProdVenta, $oVenta, $iTipoDocRef, $cRazonRef) {
        $iNumLinea = 1;
        foreach($listProdVenta as $oProductoVenta) {
            $oNodoReferencia = $oXML->createElement("Referencia");
            
            $oNodoTXTNroLinRef = $oXML->createTextNode($iNumLinea);
            $oNodoNroLinRef = $oXML->createElement("NroLinRef");
            $oNodoNroLinRef->appendChild($oNodoTXTNroLinRef);
            
            $oNodoTXTTpoDocRef = $oXML->createTextNode($iTipoDocRef);
            $oNodoTpoDocRef = $oXML->createElement("TpoDocRef");
            $oNodoTpoDocRef->appendChild($oNodoTXTTpoDocRef);
            
            $oNodoTXTFolioRef = $oXML->createTextNode($oVenta->id_folio);
            $oNodoFolioRef = $oXML->createElement("FolioRef");
            $oNodoFolioRef->appendChild($oNodoTXTFolioRef);
            
            $oNodoTXTFchRef = $oXML->createTextNode(FechaUtil::aFechaYMD($oVenta->fecha_venta));
            $oNodoFchRef = $oXML->createElement("FchRef");
            $oNodoFchRef->appendChild($oNodoTXTFchRef);
            
            $oNodoTXTCodRef = $oXML->createTextNode(self::COD_REF_CORRIGE_MONTOS_DOC);
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
    
    
    public function crearXMLNotaCreditoElectronica($idNotaCredito, $idFolio) {
        require_once __DIR__.'/../../Coneccion/coneccion.php';
        require_once $this->cRutaRelativa . "Clases/DAO/NotaCreditoDAO.php";
        require_once $this->cRutaRelativa . "Clases/DAO/ProdNotaCreditoDAO.php";
        require_once $this->cRutaRelativa . "Clases/DAO/MotivoNotaCreditoDAO.php";
        require_once $this->cRutaRelativa . "Clases/Negocio/XMLFacturaElectronicaNEG.php";
        require_once __DIR__ . '/../Usuario.php';
        
        // Transient DTE XML — written here, read back in
        // FacturacionClWS::procesarDocumento() and base64-sent to the WS. Use the
        // system temp dir (always writable); the app tree under /var/www is
        // root-owned while Apache runs as www-data, so saving into XML/NotasCredito/
        // silently failed and the WS received an empty file. uniqid() avoids
        // collisions since Serfel and Coproad share one container.
        $cRutaNomArchivo = sys_get_temp_dir() . "/NotaCredElec_" . $idFolio . "_" . uniqid() . ".xml";
        
        $conexion = new Conexion();
        $oPDO = $conexion->abrirConexion();
        
        $oNotaCredito = NotaCreditoDAO::obtNotaCredito($oPDO, $idNotaCredito);
        
        //$oVentaDAO = new VentaDAO($this->cRutaRelativa);
        $oVenta = VentaDAO::obtVenta($oPDO, $oNotaCredito->id_venta);
        $this->oVenta = $oVenta;
        
        $listProdNC = ProdNotaCreditoDAO::listProductoNotaCredito($oPDO, $idNotaCredito);
        $this->calcMontosImpAdicional($oPDO, $listProdNC);
        
        $oEmpresaDAO = new EmpresaDAO($this->cRutaRelativa);
        $oEmpresa = $oEmpresaDAO->obtEmpresa($oPDO, $oVenta->rut_empresa);
        
        $oImpuestoDAO = new ImpuestoDAO($this->cRutaRelativa);
        $oImpIva = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::IVA);
        $oImpBebidas = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::IABA);
        $oImpHarina = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::ESPEC);
        
        $oMotivoNotaCreditoDAO = new MotivoNotaCreditoDAO($this->cRutaRelativa);
        $oMotivoNotaCredito = $oMotivoNotaCreditoDAO->obtMotivoNotaCredito($oPDO, $oNotaCredito->id_motivo);
        
        $oVendedor = new Usuario($oVenta->id_usuario_venta);
        
        $oXML = new DomDocument("1.0", "UTF-8");
        $oXML->xmlStandalone = true;
        $oXML->formatOutput  = true;
        
        // <editor-fold defaultstate="collapsed" desc="TAG DTE">
        $oNodoDTE = $oXML->createElement("DTE");
        $oNodoDTE->setAttribute("version", "1.0");
        
        // <editor-fold defaultstate="collapsed" desc="TAG Documento">
        $cIdDocumento = $this->genIdDocumento($oEmpresa->obtRutCompleto(), FacturacionCLCONST::TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA, $idFolio);
        $oNodoDocumento = $oXML->createElement("Documento");
        $oNodoDocumento->setAttribute("ID", $cIdDocumento);
        
        // <editor-fold defaultstate="collapsed" desc="TAG Encabezado">
        $oNodoEncabezado = $oXML->createElement("Encabezado");

        $oNodoIdDoc    = $this->crearNodoIdDoc($oXML, FacturacionCLCONST::TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA, $oNotaCredito->fecha_nota_credito, $idFolio);
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
        $oNodoDocumento = $this->crearNodosReferencia($oXML, $oNodoDocumento, $listProdNC, $oVenta, FacturacionCLCONST::TIPO_DOCTO_FACTURA_ELECTRONICA, $oMotivoNotaCredito->nom_motivo);
        $oNodoDocumento->appendChild($oNodoAdicional);
        // </editor-fold>
        
        $oNodoDTE->appendChild($oNodoDocumento);
        // </editor-fold>
        
        $oXML->appendChild($oNodoDTE);
        $oXML->save($cRutaNomArchivo);
        
        return $cRutaNomArchivo;
    }
    
}

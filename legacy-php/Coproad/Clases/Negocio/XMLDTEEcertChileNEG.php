<?php

/**
 * Description of XMLDTEEcertChileNEG
 *
 * @author ccastro
 */
class XMLDTEEcertChileNEG {
    
    protected $cRutaRelativa = "";
    protected $oVenta;
    protected $oCliente;
    protected $oLocalCliente;
    protected $fMontoIla10 = 0;
    protected $fMontoIla18 = 0;
    protected $fMontoIla19 = 0;
    
    
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;
        
        require_once __DIR__.'/../Constantes/FacturacionCLCONST.php';
        require_once $this->cRutaRelativa . "Clases/Conexion/Conexion.php";
        require_once $this->cRutaRelativa . "Clases/DAO/VentaDAO.php";
        require_once $this->cRutaRelativa . "Clases/DAO/ProductoDAO.php";
        require_once __DIR__.'/../DAO/UnidadMedidaDAO.php';
        require_once $this->cRutaRelativa . "Clases/DAO/EmpresaDAO.php";
        require_once $this->cRutaRelativa . "Clases/DAO/ImpuestoDAO.php";
        require_once __DIR__.'/../DAO/TipoDoctoDAO.php';
        require_once $this->cRutaRelativa . "Clases/Util/FechaUtil.php";
        require_once $this->cRutaRelativa . 'Clases/Constantes/ImpuestoCONST.php';
    }
    
    
    protected function genIdDocumento($cRutCompletoEmpresa, $idTipoDoctoElectronico, $idFolio) {
        return "R" . $cRutCompletoEmpresa . "T" . $idTipoDoctoElectronico . "F" . $idFolio;
    }
    
    protected function crearNodoIdDoc($oXML, $idTipoDoctoElectronico, $dFechaEmis, $idFolio) {
        $oNodoTXTTipoDTE = $oXML->createTextNode($idTipoDoctoElectronico);
        $oNodoTipoDTE = $oXML->createElement("TipoDTE");
        $oNodoTipoDTE->appendChild($oNodoTXTTipoDTE);

        $oNodoTXTFolio = $oXML->createTextNode($idFolio);
        $oNodoFolio = $oXML->createElement("Folio");
        $oNodoFolio->appendChild($oNodoTXTFolio);
        
        $oNodoTXTFchEmis = $oXML->createTextNode(FechaUtil::aFechaYMD($dFechaEmis));
        $oNodoFchEmis = $oXML->createElement("FchEmis");
        $oNodoFchEmis->appendChild($oNodoTXTFchEmis);
        
        $oNodoIdDoc = $oXML->createElement("IdDoc");
        $oNodoIdDoc->appendChild($oNodoTipoDTE);
        $oNodoIdDoc->appendChild($oNodoFolio);
        $oNodoIdDoc->appendChild($oNodoFchEmis);
        
        return $oNodoIdDoc;
    }
    
    protected function crearNodoEmisor($oXML, $oEmpresa) {
        $oNodoTXTRUTEmisor = $oXML->createTextNode($oEmpresa->obtRutCompleto());
        $oNodoRUTEmisor = $oXML->createElement("RUTEmisor");
        $oNodoRUTEmisor->appendChild($oNodoTXTRUTEmisor);
        
        $oNodoTXTRznSoc = $oXML->createTextNode($oEmpresa->razon_social);
        $oNodoRznSoc = $oXML->createElement("RznSoc");
        $oNodoRznSoc->appendChild($oNodoTXTRznSoc);
        
        $oNodoTXTGiroEmis = $oXML->createTextNode($oEmpresa->giro);
        $oNodoGiroEmis = $oXML->createElement("GiroEmis");
        $oNodoGiroEmis->appendChild($oNodoTXTGiroEmis);
        
        $oNodoTXTActeco = $oXML->createTextNode($oEmpresa->cod_actividad_economica);
        $oNodoActeco = $oXML->createElement("Acteco");
        $oNodoActeco->appendChild($oNodoTXTActeco);
        
        $oNodoTXTDirOrigen = $oXML->createTextNode($oEmpresa->direccion_empresa);
        $oNodoDirOrigen = $oXML->createElement("DirOrigen");
        $oNodoDirOrigen->appendChild($oNodoTXTDirOrigen);
        
        $oNodoTXTCmnaOrigen = $oXML->createTextNode($oEmpresa->comuna);
        $oNodoCmnaOrigen = $oXML->createElement("CmnaOrigen");
        $oNodoCmnaOrigen->appendChild($oNodoTXTCmnaOrigen);
        
        $oNodoTXTCiudadOrigen = $oXML->createTextNode($oEmpresa->ciudad);
        $oNodoCiudadOrigen = $oXML->createElement("CiudadOrigen");
        $oNodoCiudadOrigen->appendChild($oNodoTXTCiudadOrigen);
        /*
        $oNodoTXTCdgVendedor = $oXML->createTextNode($iNumVendedor);
        $oNodoCdgVendedor = $oXML->createElement("CdgVendedor");
        $oNodoCdgVendedor->appendChild($oNodoTXTCdgVendedor);
        */
        $oNodoEmisor = $oXML->createElement("Emisor");
        $oNodoEmisor->appendChild($oNodoRUTEmisor);
        $oNodoEmisor->appendChild($oNodoRznSoc);
        $oNodoEmisor->appendChild($oNodoGiroEmis);
        $oNodoEmisor->appendChild($oNodoActeco);
        $oNodoEmisor->appendChild($oNodoDirOrigen);
        $oNodoEmisor->appendChild($oNodoCmnaOrigen);
        $oNodoEmisor->appendChild($oNodoCiudadOrigen);
        //$oNodoEmisor->appendChild($oNodoCdgVendedor);
        
        return $oNodoEmisor;
    }
    
    protected function crearNodoReceptor($oXML, $db, $oVenta) {
        require_once $this->cRutaRelativa . "Clases/DAO/ClienteDAO.php";
        require_once $this->cRutaRelativa . "Clases/DAO/LocalClienteDAO.php";
        
        $this->oCliente = ClienteDAO::obtCliente($db, $oVenta->rut_cliente);
        $this->oLocalCliente = LocalClienteDAO::obtener($db, $oVenta->id_local_cliente);
        $oCliente = $this->oCliente;
        $oLocalCliente = $this->oLocalCliente;
        
        $oNodoTXTRUTRecep = $oXML->createTextNode($oCliente->obtRutCompleto());
        $oNodoRUTRecep = $oXML->createElement("RUTRecep");
        $oNodoRUTRecep->appendChild($oNodoTXTRUTRecep);
        
        $oNodoTXTRznSocRecep = $oXML->createTextNode($oCliente->razon_social);
        $oNodoRznSocRecep = $oXML->createElement("RznSocRecep");
        $oNodoRznSocRecep->appendChild($oNodoTXTRznSocRecep);
        
        $oNodoTXTGiroRecep = $oXML->createTextNode($oLocalCliente->giro);
        $oNodoGiroRecep = $oXML->createElement("GiroRecep");
        $oNodoGiroRecep->appendChild($oNodoTXTGiroRecep);
        
        $oNodoTXTCorreoRecep = $oXML->createTextNode($oLocalCliente->email_local_cliente);
        $oNodoCorreoRecep = $oXML->createElement("CorreoRecep");
        $oNodoCorreoRecep->appendChild($oNodoTXTCorreoRecep);
        
        $oNodoTXTDirRecep = $oXML->createTextNode($oLocalCliente->direccion_local_cliente);
        $oNodoDirRecep = $oXML->createElement("DirRecep");
        $oNodoDirRecep->appendChild($oNodoTXTDirRecep);
        
        $oNodoTXTCmnaRecep = $oXML->createTextNode($oLocalCliente->comuna);
        $oNodoCmnaRecep = $oXML->createElement("CmnaRecep");
        $oNodoCmnaRecep->appendChild($oNodoTXTCmnaRecep);
        
        $oNodoTXTCiudadRecep = $oXML->createTextNode($oCliente->ciudad);
        $oNodoCiudadRecep = $oXML->createElement("CiudadRecep");
        $oNodoCiudadRecep->appendChild($oNodoTXTCiudadRecep);
        /*
        $oNodoTXTCdgVendedor = $oXML->createTextNode($iNumVendedor);
        $oNodoCdgVendedor = $oXML->createElement("CdgVendedor");
        $oNodoCdgVendedor->appendChild($oNodoTXTCdgVendedor);
        */
        $oNodoReceptor = $oXML->createElement("Receptor");
        $oNodoReceptor->appendChild($oNodoRUTRecep);
        $oNodoReceptor->appendChild($oNodoRznSocRecep);
        $oNodoReceptor->appendChild($oNodoGiroRecep);
        $oNodoReceptor->appendChild($oNodoCorreoRecep);
        $oNodoReceptor->appendChild($oNodoDirRecep);
        $oNodoReceptor->appendChild($oNodoCmnaRecep);
        $oNodoReceptor->appendChild($oNodoCiudadRecep);
        //$oNodoReceptor->appendChild($oNodoCdgVendedor);
        
        return $oNodoReceptor;
    }
    
    protected function crearNodoTotales($oXML, $oVenta, $oImpIva, $oImpBebidas, $oImpHarina) {
        $oNodoTXTMntNeto = $oXML->createTextNode($oVenta->sub_total);
        $oNodoMntNeto = $oXML->createElement("MntNeto");
        $oNodoMntNeto->appendChild($oNodoTXTMntNeto);
        
        $oNodoTXTTasaIVA = $oXML->createTextNode($oImpIva->valor);
        $oNodoTasaIVA = $oXML->createElement("TasaIVA");
        $oNodoTasaIVA->appendChild($oNodoTXTTasaIVA);
        
        $oNodoTXTIVA = $oXML->createTextNode($oVenta->iva);
        $oNodoIVA = $oXML->createElement("IVA");
        $oNodoIVA->appendChild($oNodoTXTIVA);
        
        $oNodoTXTMntTotal = $oXML->createTextNode($oVenta->precio_total);
        $oNodoMntTotal = $oXML->createElement("MntTotal");
        $oNodoMntTotal->appendChild($oNodoTXTMntTotal);
        
        $oNodoTotales = $oXML->createElement("Totales");
        $oNodoTotales->appendChild($oNodoMntNeto);
        $oNodoTotales->appendChild($oNodoTasaIVA);
        $oNodoTotales->appendChild($oNodoIVA);
        
        // <editor-fold defaultstate="collapsed" desc="IMPUESTOS ADICIONALES">
        if ($this->fMontoIla10 > 0) {
            $oNodoImptoRetenIla10 = $oXML->createElement("ImptoReten");
            $oNodoTipoImpIla10 = $oXML->createElement("TipoImp");
            $oNodoTasaImpIla10 = $oXML->createElement("TasaImp");
            $oNodoMontoImpIla10 = $oXML->createElement("MontoImp");
            
            $oNodoTXTTipoImpIla10 = $oXML->createTextNode(ImpuestoCONST::ID_IMP_BEBIDAS);
            $oNodoTXTTasaImpIla10 = $oXML->createTextNode(10);
            $oNodoTXTMontoImpIla10 = $oXML->createTextNode($this->fMontoIla10);

            $oNodoTipoImpIla10->appendChild($oNodoTXTTipoImpIla10);
            $oNodoTasaImpIla10->appendChild($oNodoTXTTasaImpIla10);
            $oNodoMontoImpIla10->appendChild($oNodoTXTMontoImpIla10);
            $oNodoImptoRetenIla10->appendChild($oNodoTipoImpIla10);
            $oNodoImptoRetenIla10->appendChild($oNodoTasaImpIla10);
            $oNodoImptoRetenIla10->appendChild($oNodoMontoImpIla10);
            $oNodoTotales->appendChild($oNodoImptoRetenIla10);
        }
        
        if ($this->fMontoIla18 > 0) {
            $oNodoImptoRetenIla18 = $oXML->createElement("ImptoReten");
            $oNodoTipoImpIla18 = $oXML->createElement("TipoImp");
            $oNodoTasaImpIla18 = $oXML->createElement("TasaImp");
            $oNodoMontoImpIla18 = $oXML->createElement("MontoImp");
            
            $oNodoTXTTipoImpIla18 = $oXML->createTextNode(ImpuestoCONST::ID_IMP_BEBIDAS_18);
            $oNodoTXTTasaImpIla18 = $oXML->createTextNode(18);
            $oNodoTXTMontoImpIla18 = $oXML->createTextNode($this->fMontoIla18);

            $oNodoTipoImpIla18->appendChild($oNodoTXTTipoImpIla18);
            $oNodoTasaImpIla18->appendChild($oNodoTXTTasaImpIla18);
            $oNodoMontoImpIla18->appendChild($oNodoTXTMontoImpIla18);
            $oNodoImptoRetenIla18->appendChild($oNodoTipoImpIla18);
            $oNodoImptoRetenIla18->appendChild($oNodoTasaImpIla18);
            $oNodoImptoRetenIla18->appendChild($oNodoMontoImpIla18);
            $oNodoTotales->appendChild($oNodoImptoRetenIla18);
        }
        
        if ($this->fMontoIla19 > 0) {
            $oNodoImptoRetenIla19 = $oXML->createElement("ImptoReten");
            $oNodoTipoImpIla19 = $oXML->createElement("TipoImp");
            $oNodoTasaImpIla19 = $oXML->createElement("TasaImp");
            $oNodoMontoImpIla19 = $oXML->createElement("MontoImp");
            
            $oNodoTXTTipoImpIla19 = $oXML->createTextNode(ImpuestoCONST::ID_IMP_BEBIDAS);
            $oNodoTXTTasaImpIla19 = $oXML->createTextNode(19);
            $oNodoTXTMontoImpIla19 = $oXML->createTextNode($this->fMontoIla19);

            $oNodoTipoImpIla19->appendChild($oNodoTXTTipoImpIla19);
            $oNodoTasaImpIla19->appendChild($oNodoTXTTasaImpIla19);
            $oNodoMontoImpIla19->appendChild($oNodoTXTMontoImpIla19);
            $oNodoImptoRetenIla19->appendChild($oNodoTipoImpIla19);
            $oNodoImptoRetenIla19->appendChild($oNodoTasaImpIla19);
            $oNodoImptoRetenIla19->appendChild($oNodoMontoImpIla19);
            $oNodoTotales->appendChild($oNodoImptoRetenIla19);
        }

        if ($oVenta->espec > 0) {
            $oNodoImptoRetenEspec = $oXML->createElement("ImptoReten");
            $oNodoTipoImpEspec = $oXML->createElement("TipoImp");
            $oNodoTasaImpEspec = $oXML->createElement("TasaImp");
            $oNodoMontoImpEspec = $oXML->createElement("MontoImp");
            
            $oNodoTXTTipoImpEspec = $oXML->createTextNode(FacturacionClWS::ID_IMP_HARINA);
            $oNodoTXTTasaImpEspec = $oXML->createTextNode($oImpHarina->valor);
            $oNodoTXTMontoImpEspec = $oXML->createTextNode($oVenta->espec);
            
            $oNodoTipoImpEspec->appendChild($oNodoTXTTipoImpEspec);
            $oNodoTasaImpEspec->appendChild($oNodoTXTTasaImpEspec);
            $oNodoMontoImpEspec->appendChild($oNodoTXTMontoImpEspec);
            $oNodoImptoRetenEspec->appendChild($oNodoTipoImpEspec);
            $oNodoImptoRetenEspec->appendChild($oNodoTasaImpEspec);
            $oNodoImptoRetenEspec->appendChild($oNodoMontoImpEspec);
            $oNodoTotales->appendChild($oNodoImptoRetenEspec);
        }
        // </editor-fold>

        $oNodoTotales->appendChild($oNodoMntTotal);
        
        return $oNodoTotales;
    }
    
    protected function crearNodosDetalle($oXML, $oNodoDocumento, $db, $listProdVenta) {
        $iNumLinea = 1;
        foreach($listProdVenta as $oProductoVenta) {
            $oNodoDetalle = $oXML->createElement("Detalle");
        
            $oProducto = ProductoDAO::obtProducto($db, $oProductoVenta->id_producto);
            $oUM = UnidadMedidaDAO::obtUnidadMedida($db, $oProducto->id_UM);
            
            $bTieneDescuento = false;
            if($oProductoVenta->porcen_desc != "" && $oProductoVenta->porcen_desc > 0) {
                $bTieneDescuento = true;
            }
            
            $oNodoTXTNroLinDet = $oXML->createTextNode($iNumLinea);
            $oNodoNroLinDet = $oXML->createElement("NroLinDet");
            $oNodoNroLinDet->appendChild($oNodoTXTNroLinDet);
            
            // <editor-fold defaultstate="collapsed" desc="TAG CdgItem">
            $oNodoTXTTpoCodigo = $oXML->createTextNode("SERFEL");
            $oNodoTpoCodigo = $oXML->createElement("TpoCodigo");
            $oNodoTpoCodigo->appendChild($oNodoTXTTpoCodigo);

            $oNodoTXTVlrCodigo = $oXML->createTextNode($oProducto->cod_serfel);
            $oNodoVlrCodigo = $oXML->createElement("VlrCodigo");
            $oNodoVlrCodigo->appendChild($oNodoTXTVlrCodigo);

            $oNodoCdgItem = $oXML->createElement("CdgItem");
            $oNodoCdgItem->appendChild($oNodoTpoCodigo);
            $oNodoCdgItem->appendChild($oNodoVlrCodigo);
            // </editor-fold>

            $oNodoTXTNmbItem = $oXML->createTextNode(trim($oProducto->nom_producto));
            $oNodoNmbItem = $oXML->createElement("NmbItem");
            $oNodoNmbItem->appendChild($oNodoTXTNmbItem);
            
            $oNodoTXTQtyItem = $oXML->createTextNode($oProductoVenta->cantidad);
            $oNodoQtyItem = $oXML->createElement("QtyItem");
            $oNodoQtyItem->appendChild($oNodoTXTQtyItem);
            
            $oNodoTXTUnmdItem = $oXML->createTextNode($oUM->nom_UM);
            $oNodoUnmdItem = $oXML->createElement("UnmdItem");
            $oNodoUnmdItem->appendChild($oNodoTXTUnmdItem);
            
            $oNodoTXTPrcItem = $oXML->createTextNode($oProductoVenta->precio);
            $oNodoPrcItem = $oXML->createElement("PrcItem");
            $oNodoPrcItem->appendChild($oNodoTXTPrcItem);
            
            if($bTieneDescuento) {
                $oNodoTXTDescuentoPct = $oXML->createTextNode($oProductoVenta->porcen_desc);
                $oNodoDescuentoPct = $oXML->createElement("DescuentoPct");
                $oNodoDescuentoPct->appendChild($oNodoTXTDescuentoPct);
                
                $oNodoTXTDescuentoMonto = $oXML->createTextNode($oProductoVenta->obtMontoDescSubTotal());
                $oNodoDescuentoMonto = $oXML->createElement("DescuentoMonto");
                $oNodoDescuentoMonto->appendChild($oNodoTXTDescuentoMonto);
            }
            
            
            $oNodoTXTMontoItem = $oXML->createTextNode($oProductoVenta->obtSubTotalConDesc());
            $oNodoMontoItem = $oXML->createElement("MontoItem");
            $oNodoMontoItem->appendChild($oNodoTXTMontoItem);
                    
            $oNodoDetalle->appendChild($oNodoNroLinDet);
            $oNodoDetalle->appendChild($oNodoCdgItem);
            $oNodoDetalle->appendChild($oNodoNmbItem);
            $oNodoDetalle->appendChild($oNodoQtyItem);
            $oNodoDetalle->appendChild($oNodoUnmdItem);
            $oNodoDetalle->appendChild($oNodoPrcItem);
            
            if($bTieneDescuento) {
                $oNodoDetalle->appendChild($oNodoDescuentoPct);
                $oNodoDetalle->appendChild($oNodoDescuentoMonto);
            }
            
            // <editor-fold defaultstate="collapsed" desc="IMPUESTOS ADICIONALES">
            if($oProducto->impuesto > 0) {
                $oImpuestoDAO = new ImpuestoDAO($this->cRutaRelativa);
                $oImpuesto = $oImpuestoDAO->obtImpuesto($db, $oProducto->impuesto);
                
                $oNodoCodImpAdic = $oXML->createElement("CodImpAdic");
                $oNodoTXTCodImpAdic = $oXML->createTextNode($oImpuesto->id_imp_iss);
                
                $oNodoCodImpAdic->appendChild($oNodoTXTCodImpAdic);
                $oNodoDetalle->appendChild($oNodoCodImpAdic);
            }
            // </editor-fold>

            $oNodoDetalle->appendChild($oNodoMontoItem);
            $iNumLinea++;
            
            $oNodoDocumento->appendChild($oNodoDetalle);
        }
        
        return $oNodoDocumento;
    }
    
    protected function crearNodoAdicional($oXML, $oPDO, $iNumVendedor) {
        $oTipoDoctoDAO = new TipoDoctoDAO($this->cRutaRelativa);
        $oTipoDocto = $oTipoDoctoDAO->obtTipoDocto($oPDO, $this->oLocalCliente->id_forma_pago);
        
        $oNodoAdicional = $oXML->createElement("Adicional");
        $oNodoNodosa = $oXML->createElement("NodosA");
        $oNodoA1 = $oXML->createElement("A1");
        $oNodoA2 = $oXML->createElement("A2");
        $oNodoA3 = $oXML->createElement("A3");
        $oNodoA4 = $oXML->createElement("A4");
        $oNodoA5 = $oXML->createElement("A5");
        $oNodoA6 = $oXML->createElement("A6");
        
        $cTelefono = $this->oLocalCliente->telefono_local_cliente;
        if(empty($cTelefono)) {
            $cTelefono = $this->oCliente->telefono_cliente;
        }
        
        $oNodoTXTA1 = $oXML->createTextNode($this->oVenta->id_venta);                   // Nom Vendedor
        $oNodoTXTA2 = $oXML->createTextNode($cTelefono);                                // Telefono
        $oNodoTXTA3 = $oXML->createTextNode("");                                        // Forma pago
        $oNodoTXTA4 = $oXML->createTextNode($oTipoDocto->nom_tipo_docto);               // Cond Venta
        $oNodoTXTA5 = $oXML->createTextNode($iNumVendedor);                             // Cod Vendedor
        $oNodoTXTA6 = $oXML->createTextNode($this->oVenta->observaciones);              // Observaciones
        
        $oNodoA1->appendChild($oNodoTXTA1);
        $oNodoA2->appendChild($oNodoTXTA2);
        $oNodoA3->appendChild($oNodoTXTA3);
        $oNodoA4->appendChild($oNodoTXTA4);
        $oNodoA5->appendChild($oNodoTXTA5);
        $oNodoA6->appendChild($oNodoTXTA6);
        $oNodoNodosa->appendChild($oNodoA1);
        $oNodoNodosa->appendChild($oNodoA2);
        $oNodoNodosa->appendChild($oNodoA3);
        $oNodoNodosa->appendChild($oNodoA4);
        $oNodoNodosa->appendChild($oNodoA5);
        $oNodoNodosa->appendChild($oNodoA6);
        $oNodoAdicional->appendChild($oNodoNodosa);
        
        return $oNodoAdicional;
    }
    
    protected function calcMontosImpAdicional($oPDO, $listProdVenta) {
        foreach($listProdVenta as $oProductoVenta) {
            $oProducto = ProductoDAO::obtProducto($oPDO, $oProductoVenta->id_producto);
            
            if($oProducto->impuesto == 1) {
                $this->fMontoIla10 += round($oProductoVenta->obtSubTotalConDesc() * 0.1);
            } else if($oProducto->impuesto == 4) {
                $this->fMontoIla18 += round($oProductoVenta->obtSubTotalConDesc() * 0.18);
            } else if($oProducto->impuesto == 5) {
                $this->fMontoIla19 += round($oProductoVenta->obtSubTotalConDesc() * 0.19);
            }
        }
    }
}

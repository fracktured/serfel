<?php
require_once __DIR__ . '/../DAO/EmpresaDAO.php';

/**
 * Description of NotaCreditoNEG
 *
 * @author ccastro
 */
class NotaCreditoNEG {
    
    private $cRutaRelativa;
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        require_once __DIR__ . '/../Conexion/Conexion.php';
        require_once __DIR__ . '/../Constantes/TipoDoctoCONST.php';
        require_once __DIR__ . '/../DAO/NotaCreditoDAO.php';
        require_once __DIR__ . '/../POJO/NotaCredito.php';
        
        $this->cRutaRelativa = $cRutaRelativa;
    }
    // </editor-fold>
    
    
    public function obtNotaCredito($idNotaCredito) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oNotaCredito = NotaCreditoDAO::obtNotaCredito($oPDO, $idNotaCredito);
        
        return $oNotaCredito;
    }
    
    
    public function listNotaCredito() {
        require_once $this->cRutaRelativa . "Clases/DAO/VentaDAO.php";
        require_once $this->cRutaRelativa . "Clases/DAO/ClienteDAO.php";
        require_once $this->cRutaRelativa . "Clases/DAO/NotaDebitoDAO.php";
        require_once $this->cRutaRelativa . "Clases/NegDTO/NotaCreditoDTO.php";
        require_once __DIR__ . '/../FiltroBusqueda/NotaCreditoFB.php';
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();

        //$oVentaDAO       = new VentaDAO($this->cRutaRelativa);
        $oEmpresaDAO     = new EmpresaDAO($this->cRutaRelativa);
        $oNotaDebitoDAO  = new NotaDebitoDAO($this->cRutaRelativa);
        
        $oNotaCreditoFB = new NotaCreditoFB();
        $listNotaCredito = NotaCreditoDAO::listNotaCredito($oPDO, $oNotaCreditoFB);
        
        $i = 0;
        $listNotaCreditoDTO = Array();
        foreach($listNotaCredito as $oNotaCredito) {
            $oVenta      = VentaDAO::obtVenta($oPDO, $oNotaCredito->id_venta);
            $oCliente    = ClienteDAO::obtCliente($oPDO, $oVenta->rut_cliente);
            $oEmpresa    = $oEmpresaDAO->obtEmpresa($oPDO, $oVenta->rut_empresa);
            $oNotaDebito = $oNotaDebitoDAO->obtNotaDebitoXIdNC($oPDO, $oNotaCredito->id_nota_credito);
            
            $listNotaCreditoDTO[$i] = new NotaCreditoDTO();
            $listNotaCreditoDTO[$i]->oNotaCredito = $oNotaCredito;
            $listNotaCreditoDTO[$i]->oVenta       = $oVenta;
            $listNotaCreditoDTO[$i]->oCliente     = $oCliente;
            $listNotaCreditoDTO[$i]->oEmpresa     = $oEmpresa;
            $listNotaCreditoDTO[$i]->oNotaDebito  = $oNotaDebito;
            $i++;
        }

        return $listNotaCreditoDTO;
    }
    
    
    /**
     * Marca una NC como NC electronica, además de guardar el valor de la url de descarga del PDF
     * 
     * @param int $idNotaCredito
     * @param int $idFolio
     * @param Usuario $oUsuario
     * @return NDTO
     */
    public function marcarComoNCElectronica($idNotaCredito, $idFolio, $oUsuario) {
        require_once __DIR__ . '/../Constantes/FacturacionCLCONST.php';
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oNotaCredito = NotaCreditoDAO::obtNotaCredito($oPDO, $idNotaCredito);
        $oEmpresaDAO = new EmpresaDAO($this->cRutaRelativa);
        $oEmpresa = $oEmpresaDAO->obtEmpresa($oPDO, $oNotaCredito->rut_empresa);
        
        $oFacElecCLWS = new FacturacionClWS($this->cRutaRelativa);
        $oNCElecCLWSDTO_PDFOri = 
                $oFacElecCLWS->obtLinkDoctoElectronico(
                        $oEmpresa->obtRutCompleto(),
                        $idFolio, 
                        FacturacionClWS::C_TIPO_MOV_VENTA, 
                        FacturacionCLCONST::TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA,
                        false);
        $oNotaCredito->url_PDF_original = $oNCElecCLWSDTO_PDFOri->cMensaje;
            
        $oNCElecCLWSDTO_PDFCed = 
                $oFacElecCLWS->obtLinkDoctoElectronico(
                        $oEmpresa->obtRutCompleto(),
                        $idFolio, 
                        FacturacionClWS::C_TIPO_MOV_VENTA, 
                        FacturacionCLCONST::TIPO_DOCTO_NOTA_CREDITO_ELECTRONICA,
                        true);
        $oNotaCredito->url_PDF_cedible = $oNCElecCLWSDTO_PDFCed->cMensaje;
            
        $oNotaCredito->id_folio = $idFolio;
        $oNotaCredito->num_nota_credito = $idFolio;
        $oNotaCredito->id_tipo_docto_emitido = TipoDoctoCONST::NOTA_CREDITO_ELECTRONICA;
        $oNotaCredito->id_usuario_mod = $oUsuario->getIdUsuario();
        
        NotaCreditoDAO::modNotaCredito($oPDO, $oNotaCredito);
        
        return $oNotaCredito;
    }
    
    
    
    public function obtNuevoFolio($iRutEmpresa) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        return NotaCreditoDAO::obtNuevoFolio($oPDO, $iRutEmpresa);
    }
    
    
    /**
     * Ingresa una Nota de Crédito
     * 
     * @param NotaCredito $oNotaCredito
     * @param Array<ProdNotaCredito> $listProductoNC
     * @return NDTO
     */
    public function ingNotaCredito($oNotaCredito, $listProductoNC) {
        require_once __DIR__ . '/../Constantes/ImpuestoCONST.php';
        require_once __DIR__ . '/../Constantes/EstadoCONST.php';
        require_once __DIR__ . '/../Dominio/ProdNotaCreditoDOM.php';
        require_once __DIR__ . '/../Dominio/NotaCreditoDOM.php';
        require_once __DIR__ . '/../DAO/ImpuestoDAO.php';
        require_once __DIR__ . '/../DAO/ProductoDAO.php';
        require_once __DIR__ . '/../DAO/ProdNotaCreditoDAO.php';
        require_once __DIR__ . '/../POJO/Producto.php';
        require_once __DIR__ . '/../Util/FechaUtil.php';
        require_once __DIR__ . '/../NegDTO/NDTO.php';
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oNotaCreditoAux = NotaCreditoDOM::obtNotaCreditoXNumDocto($oPDO, TipoDoctoCONST::NOTA_CREDITO, $oNotaCredito->num_nota_credito, $oNotaCredito->rut_empresa);
        
        $oNDTO = new NDTO();
        if ( empty($oNotaCredito->num_nota_credito) ) {
            $oNDTO->bExito = false;
            $oNDTO->cMensaje = "Debe asignar un Número de Nota de Crédito.";
            
            return $oNDTO;
        } else if ( !is_null($oNotaCreditoAux) ) {
            $oNDTO->bExito = false;
            $oNDTO->cMensaje = "El Número de Nota de Crédito ya existe.";
            
            return $oNDTO;
        }
        
        $oImpuestoDAO = new ImpuestoDAO($this->cRutaRelativa);
        $oImpIVA = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::IVA);
        $oImpESPEC = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::ESPEC);
        
        $iMontoNetoTotal = 0;
        $iMontoILA = 0;
        $iMontoESPEC = 0;
        foreach($listProductoNC as $oProductoNC) {
            //$iSubTotal = $oProductoVenta->obtSubtotal();
            //$iMontoDescuento = $oProductoVenta->obtMontoDescSubTotal();
            $iSubTotal = $oProductoNC->obtSubTotalConDesc(); // -= $iMontoDescuento;
            $iMontoNetoTotal += $iSubTotal;
            
            $oProducto = ProductoDAO::obtProducto($oPDO, $oProductoNC->id_producto);
            if($oProducto->impuesto == ImpuestoCONST::ESPEC) {
                $iMontoESPEC += round($iSubTotal * $oImpESPEC->valor / 100);
            // Se debe mejorar esta condición en el caso de que se agreguen mas impuestos
            } else if($oProducto->impuesto > 0) {
                $oImpILA = $oImpuestoDAO->obtImpuesto($oPDO, $oProducto->impuesto);
                $iMontoILA += round($iSubTotal * $oImpILA->valor / 100);
            }
        }
        
        $oNotaCredito->id_nota_credito = NotaCreditoDAO::obtNuevoIdNotaCredito($oPDO);
        $oNotaCredito->fecha_nota_credito = FechaUtil::deFechaJQueryABD($oNotaCredito->fecha_nota_credito);
        $oNotaCredito->id_tipo_docto_emitido = TipoDoctoCONST::NOTA_CREDITO;
        $oNotaCredito->id_estado = EstadoCONST::FINALIZADO;
        $oNotaCredito->iva = round($iMontoNetoTotal * $oImpIVA->valor / 100);
        $oNotaCredito->espec = $iMontoESPEC;
        $oNotaCredito->iaba = $iMontoILA;
        $oNotaCredito->sub_total = $iMontoNetoTotal;
        $oNotaCredito->precio_total = $iMontoNetoTotal + $iMontoESPEC + $iMontoILA + $oNotaCredito->iva;
        
        $idNotaCredito = NotaCreditoDAO::ingNotaCredito($oPDO, $oNotaCredito);
        foreach($listProductoNC as $oProductoNC) {
            $oProductoNC->id_nota_credito = $oNotaCredito->id_nota_credito;
            ProdNotaCreditoDAO::ingProdNotaCredito($oPDO, $oProductoNC);
        }
        ProdNotaCreditoDOM::restituirStock($oPDO, $oNotaCredito->id_nota_credito);
        
        $oNDTO->cMensaje = "Nota Crédito realizada con éxito.";
        
        return $oNDTO;
    }
}

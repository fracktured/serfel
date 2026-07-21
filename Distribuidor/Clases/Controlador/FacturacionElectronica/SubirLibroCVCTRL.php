<?php

/**
 * Description of SubirLibroCVCTRL
 *
 * @author ccastro
 */
class SubirLibroCVCTRL {
    
    protected $cRutaRelativa = "";
    protected $oUsuario;
    
    
    public function __construct($cRutaRelativa, $bIniSesion = true) {
        $this->cRutaRelativa = $cRutaRelativa;
        
        require_once $this->cRutaRelativa . 'Clases/Constantes/UsuarioCONST.php';
        require_once $this->cRutaRelativa . "Clases/Usuario.php";
        require_once $this->cRutaRelativa . 'Clases/Constantes/FacturacionCLCONST.php';
        require_once $this->cRutaRelativa . 'Clases/Negocio/EmpresaNEG.php';
        require_once $this->cRutaRelativa . 'Clases/Negocio/FechaNEG.php';
        
        if($bIniSesion) {
            session_start();
        }
        
        $this->oUsuario = $_SESSION["usuario"];
    }
    
    
    /**
     * Controlador de FacturacionElectronica/subirLibroCV/subirLibroCV.php
     */
    public function generarLibroCV() {
        
        // <editor-fold defaultstate="collapsed" desc="PARAMETROS">
        $cTipoLibro = filter_input(INPUT_POST, "cmbTipoLibro");
        $iRutEmpresa = filter_input(INPUT_POST, "cmbEmpresa");
        $cFechaDesde = filter_input(INPUT_POST, "txtFechaDesde");
        $cFechaHasta = filter_input(INPUT_POST, "txtFechaHasta");
        // </editor-fold>
        
        require_once $this->cRutaRelativa . 'Clases/DTO/FacturacionElectronica/SubirLibroCVDTO.php';
        require_once $this->cRutaRelativa . 'Clases/Constantes/TipoDoctoCONST.php';
        
        $oEmpresaNEG = new EmpresaNEG($this->cRutaRelativa);
        $oFechaNEG = new FechaNEG($this->cRutaRelativa);
        
        $oSubirLibroCVDTO = new SubirLibroCVDTO();
        $oSubirLibroCVDTO->cTipoLibro = $cTipoLibro;
        $oSubirLibroCVDTO->cFechaDesde = $cFechaDesde;
        $oSubirLibroCVDTO->cFechaHasta = $cFechaHasta;
        $oSubirLibroCVDTO->listEmpresaSI = $oEmpresaNEG->listEmpresaSI();
        $oSubirLibroCVDTO->listMesesSI = $oFechaNEG->listMesesSI();
        $oSubirLibroCVDTO->oEmpresa = $oEmpresaNEG->obtEmpresa($iRutEmpresa);

        $oRecepcionDTO = new RecepcionDTO();
        $oRecepcionDTO->idTipoDocto = TipoDoctoCONST::FACTURA;
        $oRecepcionDTO->idTipoPago = TipoDoctoCONST::FACTURA;
        $oRecepcionDTO->iRutEmpresa = $iRutEmpresa;
        $oRecepcionDTO->cFechaDesde = $cFechaDesde;
        $oRecepcionDTO->cFechaHasta = $cFechaHasta;
        if($cTipoLibro == FacturacionCLCONST::TIPO_OPER_LIBRO_COMPRA) {
            require_once $this->cRutaRelativa . 'Clases/Negocio/RecepcionNEG.php';
            
            $oRecepcionNEG = new RecepcionNEG();
            $listRecepcionNDTO = $oRecepcionNEG->listRecepciones($oRecepcionDTO);
            $oResumenRecepcionNDTO = $oRecepcionNEG->crearResumenRecepciones($listRecepcionNDTO);
            
            $oSubirLibroCVDTO->listRecepcionNDTO = $listRecepcionNDTO;
            $oSubirLibroCVDTO->oResumenRecepcionNDTO = $oResumenRecepcionNDTO;
            
            $oSubirLibroCVDTO->iTotalDoctos = $oResumenRecepcionNDTO->iTotalDoctos;
            
        } else if($cTipoLibro == FacturacionCLCONST::TIPO_OPER_LIBRO_VENTA) {
            require_once $this->cRutaRelativa . "Clases/Negocio/VentaNEG.php";
            
            $oVentaNEG = new VentaNEG($this->cRutaRelativa);
            $listVentaNDTO = $oVentaNEG->listVentas($cFechaDesde, $cFechaHasta, 0, 0, $iRutEmpresa, TipoDoctoCONST::FACTURA);
            $oResumenVentaNDTO = $oVentaNEG->crearResumenVentas($listVentaNDTO);
            
            $oSubirLibroCVDTO->listVentaNDTO = $listVentaNDTO;
            $oSubirLibroCVDTO->oResumenVentaNDTO = $oResumenVentaNDTO;
            
            $oSubirLibroCVDTO->iTotalDoctos = $oResumenVentaNDTO->iTotalDoctos;
        }
        
        return $oSubirLibroCVDTO;
    }
    
    
    /**
     * Controlador de Ajax/FacturacionElectronica/ajaxSubirLibroCV.php
     */
    public function subirLiborCV() {
        require_once $this->cRutaRelativa . 'Clases/Negocio/FacturacionElectronica/XMLLibroCVNEG.php';
        require_once $this->cRutaRelativa . 'Clases/WS/FacturacionClWS.php';
        require_once $this->cRutaRelativa . 'Clases/DTO/AjaxDTO.php';
        
        // <editor-fold defaultstate="collapsed" desc="PARAMETROS">
        $cTipoLibro = filter_input(INPUT_POST, "cTipoLibro");
        $iRutEmpresa = filter_input(INPUT_POST, "iRutEmpresa");
        $cFechaDesde = filter_input(INPUT_POST, "cFechaDesde");
        $cFechaHasta = filter_input(INPUT_POST, "cFechaHasta");
        $iMesPeriodo = filter_input(INPUT_POST, "cmbMesPeriodo");
        $iAñoPeriodo = filter_input(INPUT_POST, "txtAñoPeriodo");
        // </editor-fold>
        
        $cPeriodo = "";
        if($iMesPeriodo < 10) {
            $cPeriodo = $iAñoPeriodo . "-0" . $iMesPeriodo;
        } else {
            $cPeriodo = $iAñoPeriodo . "-" . $iMesPeriodo;
        }
        
        $oXMLLibroCVNDTO = null;
        $oXMLLibroCVNEG = new XMLLibroCVNEG($this->cRutaRelativa);
        if($cTipoLibro == FacturacionCLCONST::TIPO_OPER_LIBRO_COMPRA) {
            $oXMLLibroCVNDTO = $oXMLLibroCVNEG->crearXMLLibroCompra($cPeriodo, $cFechaDesde, $cFechaHasta, $iRutEmpresa);
        } else if($cTipoLibro == FacturacionCLCONST::TIPO_OPER_LIBRO_VENTA) {
            $oXMLLibroCVNDTO = $oXMLLibroCVNEG->crearXMLLibroVenta($cPeriodo, $cFechaDesde, $cFechaHasta, $iRutEmpresa);
        }
        
        $oAjaxDTO = new AjaxDTO();
        if($oXMLLibroCVNDTO != null) {
            $oFacturacionClWS = new FacturacionClWS($this->cRutaRelativa);
            //$oFacturacionClWSDTO = $oFacturacionClWS->procesarDocumento($oXMLLibroCVNDTO->cRutaArchivoXML);
            
            $oAjaxDTO->cPopUp = "popUpError";
            $oAjaxDTO->cMensaje = "Módulo fuera de servicio por uso de rut de Maria Diaz en facturación electrónica";
            return $oAjaxDTO;
            
            if($oFacturacionClWSDTO->bExito == "True") {
                $oAjaxDTO->cPopUp = "popUpExito";
                $oAjaxDTO->cMensaje = "Libro $cTipoLibro procesado con éxito.\n $oFacturacionClWSDTO->cMensaje";
                
                if($cTipoLibro == FacturacionCLCONST::TIPO_OPER_LIBRO_COMPRA) {
                    require_once $this->cRutaRelativa . 'Clases/Negocio/RecepcionNEG.php';
                    
                    $oRecepcionNEG = new RecepcionNEG();
                    $oRecepcionNEG->marcarRecepcionesEnLibroCV($cFechaDesde, $cFechaHasta, $iRutEmpresa, $cPeriodo);
                    
                } else if($cTipoLibro == FacturacionCLCONST::TIPO_OPER_LIBRO_VENTA) {
                    require_once $this->cRutaRelativa . 'Clases/Negocio/VentaNEG.php';
                    
                    $oVentaNEG = new VentaNEG($this->cRutaRelativa);
                    $oVentaNEG->marcarVentasEnLibroCV($cPeriodo, $cFechaHasta, $iRutEmpresa, $cPeriodo);
                }
            } else {
                $oAjaxDTO->cPopUp = "popUpError";
                $oAjaxDTO->cMensaje = $oFacturacionClWSDTO->cMensaje . "\n" . $oFacturacionClWSDTO->cError;
            }
        } else {
            $oAjaxDTO->cPopUp = "popUpError";
            $oAjaxDTO->cMensaje = "Ocurrió un error al crear el XML del Libro de $cTipoLibro .\n [$cPeriodo] [$cFechaDesde] [$cFechaHasta] [$iRutEmpresa]";
        }
        
        return $oAjaxDTO;
    }
    
}

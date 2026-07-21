<?php

/**
 * Description of LibroCVCTRL
 *
 * @author ccastro
 */
class LibroCVCTRL {
    
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
     * Controlador de Vista/FacturacionElectronica/consultarLibroCV.php
     */
    public function consultarLibroCV() {
        require_once $this->cRutaRelativa . 'Clases/DTO/FacturacionElectronica/ConsultarLibroCVDTO.php';
        require_once $this->cRutaRelativa . 'Clases/Util/FechaUtil.php';
        
        //PARAMETROS
        $cTipoLibro = filter_input(INPUT_POST, "cmbTipoLibro");
        $iRutEmpresa = filter_input(INPUT_POST, "cmbEmpresa");
        $iMesPeriodo = filter_input(INPUT_POST, "cmbMesPeriodo");
        $iAñoPeriodo = filter_input(INPUT_POST, "txtAñoPeriodo");
        $bCmdGenerar = filter_input(INPUT_POST, "cmdGenerar");
        
        $cPeriodo = FechaUtil::aPeriodoLibro($iMesPeriodo, $iAñoPeriodo);
        
        $oEmpresaNEG = new EmpresaNEG($this->cRutaRelativa);
        $oFechaNEG = new FechaNEG($this->cRutaRelativa);
        
        $oModel = new ConsultarLibroCVDTO();
        $oModel->cTipoLibro = $cTipoLibro;
        $oModel->cPeriodo = $cPeriodo;
        $oModel->listEmpresaSI = $oEmpresaNEG->listEmpresaSI();
        $oModel->listMesesSI = $oFechaNEG->listMesesSI();
        
        if(!$bCmdGenerar) {
            $oModel->iAñoPeriodo = date("Y");
            $oModel->iMesPeriodo = 1;
            $oModel->oEmpresa = new Empresa();
        } else {
            $oModel->iAñoPeriodo = $iAñoPeriodo;
            $oModel->iMesPeriodo = $iMesPeriodo;
            $oModel->oEmpresa = $oEmpresaNEG->obtEmpresa($iRutEmpresa);
        }
        
        if($cTipoLibro == FacturacionCLCONST::TIPO_OPER_LIBRO_COMPRA) {
            require_once $this->cRutaRelativa . 'Clases/Negocio/RecepcionNEG.php';
            
            $oRecepcionNEG = new RecepcionNEG();
            $listRecepcionNDTO = $oRecepcionNEG->listRecepcionesEnLibroCV($cPeriodo, $iRutEmpresa);
            $oResumenRecepcionNDTO = $oRecepcionNEG->crearResumenRecepciones($listRecepcionNDTO);
            
            $oModel->listRecepcionNDTO = $listRecepcionNDTO;
            $oModel->oResumenRecepcionNDTO = $oResumenRecepcionNDTO;
            
            $oModel->iTotalDoctos = $oResumenRecepcionNDTO->iTotalDoctos;
            
        } else if($cTipoLibro == FacturacionCLCONST::TIPO_OPER_LIBRO_VENTA) {
            require_once $this->cRutaRelativa . "Clases/Negocio/VentaNEG.php";
            
            $oVentaNEG = new VentaNEG($this->cRutaRelativa);
            $listVentaNDTO = $oVentaNEG->listVentasEnLibroCV($cPeriodo, $iRutEmpresa);
            $oResumenVentaNDTO = $oVentaNEG->crearResumenVentas($listVentaNDTO);
            
            $oModel->listVentaNDTO = $listVentaNDTO;
            $oModel->oResumenVentaNDTO = $oResumenVentaNDTO;
            
            $oModel->iTotalDoctos = $oResumenVentaNDTO->iTotalDoctos;
        }
        
        return $oModel;
    }
    
    
    /**
     * Controlador de 
     *  Vista/FacturacionElectronica/subirLibroCV.php
     *  Vista/FacturacionElectronica/consultarLibroCV.php
     */
    public function eliminarRecepcionLibroCV() {
        require_once $this->cRutaRelativa . 'Clases/WS/FacturacionClWS.php';
        require_once $this->cRutaRelativa . 'Clases/Constantes/FacturacionCLCONST.php';
        require_once $this->cRutaRelativa . 'Clases/DTO/AjaxDTO.php';
        require_once $this->cRutaRelativa . 'Clases/Negocio/RecepcionNEG.php';
        
        $idRecepcion = filter_input(INPUT_POST, "idRecepcion");
        
        $oRecepcionNEG = new RecepcionNEG();
        $oRecepcionNDTO = $oRecepcionNEG->obtRecepcion($idRecepcion);
        $oEmpresa = $oRecepcionNDTO->oEmpresa;
        $oRecepcion = $oRecepcionNDTO->oRecepcion;
        
        $oAjaxDTO = new AjaxDTO();
        $oFacturacionClWS = new FacturacionClWS($this->cRutaRelativa);
        $oFacturacionClWSDTO = 
                $oFacturacionClWS->eliminarDocumento(
                        $oEmpresa->obtRutCompleto(),
                        FacturacionCLCONST::TIPO_MOV_COMPRA, 
                        $oRecepcion->num_docto, 
                        FacturacionCLCONST::TIPO_DOCTO_FACTURA_COMPRA);
        
        if($oFacturacionClWSDTO->bExito) {
            $oAjaxDTO->bReload = true;
            $oAjaxDTO->cMensaje = "Recepción eliminada del Libro COMRA éxitosamente.\n $oFacturacionClWSDTO->cMensaje";
            
            $oRecepcionNEG->desmarcarRecepcionEnLibroCV($idRecepcion, $this->oUsuario->getIdUsuario());
        } else {
            $oAjaxDTO->cMensaje = $oFacturacionClWSDTO->cMensaje . "\n" . $oFacturacionClWSDTO->cError;
        }
        
        return $oAjaxDTO;
    }
    
    
    /**
     * Controlador de 
     *  Vista/FacturacionElectronica/subirLibroCV.php
     *  Vista/FacturacionElectronica/consultarLibroCV.php
     */
    public function eliminarVentaLibroCV() {
        require_once $this->cRutaRelativa . 'Clases/WS/FacturacionClWS.php';
        require_once $this->cRutaRelativa . 'Clases/Constantes/FacturacionCLCONST.php';
        require_once $this->cRutaRelativa . 'Clases/DTO/AjaxDTO.php';
        require_once $this->cRutaRelativa . 'Clases/Negocio/VentaNEG.php';
        
        $idVenta = filter_input(INPUT_POST, "idVenta");
        
        $oVentaNEG = new VentaNEG($this->cRutaRelativa);
        $oEmpresaNEG = new EmpresaNEG($this->cRutaRelativa);
        $oVenta = $oVentaNEG->obtVenta($idVenta);
        $oEmpresa = $oEmpresaNEG->obtEmpresa($oVenta->rut_empresa);
        
        $oAjaxDTO = new AjaxDTO();
        $oFacturacionClWS = new FacturacionClWS($this->cRutaRelativa);
        $oFacturacionClWSDTO = 
                $oFacturacionClWS->eliminarDocumento(
                        $oEmpresa->obtRutCompleto(),
                        FacturacionCLCONST::TIPO_MOV_VENTA, 
                        $oVenta->num_docto_emitido, 
                        FacturacionCLCONST::TIPO_DOCTO_FACTURA);
        
        if($oFacturacionClWSDTO->bExito) {
            $oAjaxDTO->bReload = true;
            $oAjaxDTO->cMensaje = "Venta eliminada del Libro VENTA éxitosamente.\n $oFacturacionClWSDTO->cMensaje";
            
            $oVentaNEG->desmarcarVentaEnLibroCV($idVenta, $this->oUsuario->getIdUsuario());
        } else {
            $oAjaxDTO->cMensaje = $oFacturacionClWSDTO->cMensaje . "\n" . $oFacturacionClWSDTO->cError;
        }
        
        return $oAjaxDTO;
    }
    
    
    /**
     * Controlador de 
     *  Vista/FacturacionElectronica/consultarLibroCV.php
     */
    public function eliminarLibroCV() {
        require_once $this->cRutaRelativa . 'Clases/WS/FacturacionClWS.php';
        require_once $this->cRutaRelativa . 'Clases/Constantes/FacturacionCLCONST.php';
        require_once $this->cRutaRelativa . 'Clases/DTO/AjaxDTO.php';
        
        $cTipoLibro = filter_input(INPUT_POST, "cTipoLibro");
        $iRutEmpresa = filter_input(INPUT_POST, "iRutEmpresa");
        $cPeriodo = filter_input(INPUT_POST, "cPeriodo");
        
        $i = 0;
        $oAjaxDTO = new AjaxDTO();
        $oFacturacionClWS = new FacturacionClWS($this->cRutaRelativa);
        
        if($cTipoLibro == FacturacionCLCONST::TIPO_OPER_LIBRO_COMPRA) {
            require_once $this->cRutaRelativa . 'Clases/Negocio/RecepcionNEG.php';
            
            $oRecepcionNEG = new RecepcionNEG();
            $listRecepcionNDTO = $oRecepcionNEG->listRecepcionesEnLibroCV($cPeriodo, $iRutEmpresa);
            
            foreach($listRecepcionNDTO as $oRecepcionNDTO) {
                $oRecepcion = $oRecepcionNDTO->oRecepcion;
                $oEmpresa =  $oRecepcionNDTO->oEmpresa;
                $oFacturacionClWSDTO = 
                        $oFacturacionClWS->eliminarDocumento(
                                $oEmpresa->obtRutCompleto(),
                                FacturacionCLCONST::TIPO_MOV_COMPRA, 
                                $oRecepcion->num_docto, 
                                FacturacionCLCONST::TIPO_DOCTO_FACTURA_COMPRA);
                if($oFacturacionClWSDTO->bExito) {
                    $oRecepcionNEG->desmarcarRecepcionEnLibroCV($oRecepcion->id_recepcion, $this->oUsuario->getIdUsuario());
                    $i++;
                }
            }
        }
        
        $oAjaxDTO->bReload = true;
        $oAjaxDTO->cMensaje = "Libro $cTipoLibro eliminado éxitosamente.\n $i Documentos eliminados.";
        
        return $oAjaxDTO;
    }
}

<?php

/**
 * Description of NotaCreditoCTRL
 *
 * @author ccastro
 */
class NotaCreditoCTRL {
    
    private $cRutaRelativa;
    private $oUsuario;
    
    
    public function __construct($cRutaRelativa, $bIniSesion = true) {
        require_once __DIR__ . '/../Constantes/UsuarioCONST.php';
        require_once __DIR__ . '/../Usuario.php';
        require_once __DIR__ . '/../Negocio/NotaCreditoNEG.php';
        require_once __DIR__ . '/../POJO/NotaCredito.php';
        
        $this->cRutaRelativa = $cRutaRelativa;
        
        if($bIniSesion) {
            session_start();
        }
        
        $this->oUsuario = $_SESSION["usuario"];
    }
    
    
    public function listNotaCredito() {
        
        // <editor-fold defaultstate="collapsed" desc="PERMISOS">
        if ($this->oUsuario->getIdTipoUsuario() != UsuarioCONST::ADMINISTRADOR) {
            // Envíar a página de Ud. no tiene permisos para ver este contenido.
        }
        // </editor-fold>
        
        // <editor-fold defaultstate="collapsed" desc="PARAMETROS">
        //$idVenta = filter_input(INPUT_GET, "idVenta");
        
        //if(!isset($idVenta) || $idVenta <= 0) {
            // Envíar a página de venta inválida
        //}
        // </editor-fold>
        
        require_once __DIR__ . '/../Constantes/SisDistCONST.php';
        
        $oNotaCreditoNEG = new NotaCreditoNEG($this->cRutaRelativa);
        $listNotaCreditoDTO = $oNotaCreditoNEG->listNotaCredito();
        
        return $listNotaCreditoDTO;
    }
    
    
    /**
     * Controlador de Ajax/Venta/ajaxIngNotaCredito.php
     * 
     * @return AjaxDTO
     */
    public function ajaxIngNotaCredito() {
        require_once __DIR__ . '/../POJO/ProdNotaCredito.php';
        require_once __DIR__ . '/../DTO/AjaxDTO.php';
        
        $oAjaxDTO = new AjaxDTO();
        
        // <editor-fold defaultstate="collapsed" desc="PERMISOS">
        if ($this->oUsuario->getIdTipoUsuario() != UsuarioCONST::ADMINISTRADOR
                && $this->oUsuario->getIdTipoUsuario() != UsuarioCONST::SECRETARIO) {
            $oAjaxDTO->cMensaje = "Ud. no tiene permisos para realizar Venta.";
            $oAjaxDTO->cPopUp = "popUpError";

            return $oAjaxDTO;
        }
        // </editor-fold>
                
        // <editor-fold defaultstate="collapsed" desc="PARAMETROS">
        $oNotaCredito = new NotaCredito();
        $oNotaCredito->id_venta = filter_input(INPUT_POST, "idVenta", FILTER_VALIDATE_INT);
        $oNotaCredito->rut_empresa = filter_input(INPUT_POST, "rutEmpresa", FILTER_VALIDATE_INT);
        $oNotaCredito->num_nota_credito = filter_input(INPUT_POST, "numNotaCredito", FILTER_VALIDATE_INT);
        $oNotaCredito->id_motivo = filter_input(INPUT_POST, "idMotivo", FILTER_VALIDATE_INT);
        $oNotaCredito->fecha_nota_credito = filter_input(INPUT_POST, "fechaNota");
        $oNotaCredito->id_usuario = $this->oUsuario->getIdUsuario();
        
        $arrayProducto = $_POST["producto"]; //filter_input(INPUT_POST, "producto");
        $arrayCantidad = $_POST["cantidad"]; //filter_input(INPUT_POST, "cantidad");
        $arrayDescuento = $_POST["descuento"]; //filter_input(INPUT_POST, "descuento");
        $arrayPrecio = $_POST["precio"]; //filter_input(INPUT_POST, "precio");
        
        $listProductoNC = Array();
        for($i = 0; $i < count($arrayProducto); $i++) {
            $oProductoNC = new ProdNotaCredito();
            $oProductoNC->id_producto = $arrayProducto[$i];
            $oProductoNC->cantidad = $arrayCantidad[$i];
            $oProductoNC->porcen_desc = $arrayDescuento[$i];
            $oProductoNC->precio = $arrayPrecio[$i];
            $listProductoNC[$i] = $oProductoNC;
        }
        // </editor-fold>
        
        $oNotaCreditoNEG = new NotaCreditoNEG($this->cRutaRelativa);
        $oNDTO = $oNotaCreditoNEG->ingNotaCredito($oNotaCredito, $listProductoNC);
        
        $oAjaxDTO->cMensaje = $oNDTO->cMensaje;
        if($oNDTO->bExito) {
            $oAjaxDTO->cPopUp = "popUpExito";
        } else {
            $oAjaxDTO->cPopUp = "popUpError";
        }
        
        return $oAjaxDTO;
    }
    
}

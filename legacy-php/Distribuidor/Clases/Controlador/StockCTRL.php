<?php

/**
 * Description of StockCTRL
 *
 * @author ccastro
 */
class StockCTRL {
    
    protected $cRutaRelativa = "";
    protected $oUsuario;
    
    
    public function __construct($cRutaRelativa, $bIniSesion = true) {
        $this->cRutaRelativa = $cRutaRelativa;
        
        require_once __DIR__ . '/../Constantes/SisDistCONST.php';
        require_once $this->cRutaRelativa . 'Clases/Constantes/UsuarioCONST.php';
        require_once $this->cRutaRelativa . 'Clases/Constantes/BodegaCONST.php';
        require_once $this->cRutaRelativa . "Clases/Usuario.php";
        require_once $this->cRutaRelativa . 'Clases/Negocio/StockNEG.php';
        
        if($bIniSesion) {
            session_start();
        }
        
        $this->oUsuario = $_SESSION["usuario"];
    }
    
    
    /**
     * Controlador de VistaParcial/Stock/vpModStock.php
     */
    public function consultarStock() {
        $idProducto = filter_input(INPUT_POST, "idProducto");
        
        $oStockNEG = new StockNEG($this->cRutaRelativa);
        $oStockNDTO = $oStockNEG->obtStock(BodegaCONST::BODEGA_CENTRAL, $idProducto);
        
        return $oStockNDTO;
    }
    
    
    /**
     * Controlador de Ajax/Stock/ajaxModStock.php
     */
    public function ajaxModificarStock() {
        require_once $this->cRutaRelativa . 'Clases/DTO/AjaxDTO.php';
        require_once $this->cRutaRelativa . 'Clases/POJO/Stock.php';
        
        $oAjaxDTO = new AjaxDTO();
        if ($this->oUsuario->getIdTipoUsuario() != UsuarioCONST::ADMINISTRADOR
                && $this->oUsuario->getIdTipoUsuario() != UsuarioCONST::SECRETARIO) {
            $oAjaxDTO->cMensaje = "Ud. no tiene permisos para realizar cambio de Stock.";
            $oAjaxDTO->cPopUp = "popUpError";

            return $oAjaxDTO;
        }
        
        $oStock = new Stock();
        $oStock->id_bodega = BodegaCONST::BODEGA_CENTRAL;
        $oStock->id_producto = filter_input(INPUT_POST, "idProducto");
        $oStock->cantidad = filter_input(INPUT_POST, "txtCantidad");
        $oStock->id_usuario = $this->oUsuario->getIdUsuario();
        
        $oStockNEG = new StockNEG($this->cRutaRelativa);
        $bResultado = $oStockNEG->modStock($oStock);
                
        if($bResultado) {
            $oAjaxDTO->bReload = true;
            $oAjaxDTO->cMensaje = "Stock modificado éxitosamente.";
        } else {
            $oAjaxDTO->cMensaje = "Ha ocurrido un error al modificar Stock. Intente nuevamente.";
        }
        
        return $oAjaxDTO;
    }
}

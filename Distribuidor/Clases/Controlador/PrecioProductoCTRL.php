<?php

/**
 * Description of PrecioProductoCTRL
 *
 * @author ccastro
 */
class PrecioProductoCTRL {
    
    private $oUsuario;
    
    
    public function __construct($bIniSesion = true) {
        require_once __DIR__ . '/../Constantes/SisDistCONST.php';
        require_once __DIR__ . '/../Constantes/UsuarioCONST.php';
        //require_once __DIR__ . '/../Constantes/EstadoCONST.php';
        //require_once __DIR__ . '/../Negocio/ClienteNEG.php';
        require_once __DIR__ . "/../Usuario.php";
        require_once __DIR__ . '/../POJO/PrecioProducto.php';
        require_once __DIR__ . '/../DTO/ProductoDTO.php';
        require_once __DIR__ . '/../Negocio/PrecioProductoNEG.php';
        
        if($bIniSesion) {
            session_start();
        }
        
        $this->oUsuario = $_SESSION["usuario"];
        
        if($this->oUsuario->getIdTipoUsuario() != UsuarioCONST::ADMINISTRADOR) {
            header ("Location: " . SisDistCONST::URL_PAGINA_PERMISO_DENEGADO);
        }
    }
    
    
    /**
     * Controlador de Ajax/PrecioProducto/ajaxObtPrecioProducto.php
     * 
     * @return AjaxDTO
     */
    public function ajaxObtPrecioProducto() {
        $oProductoDTO = new ProductoDTO();
        $oPrecioProductoBuscar = new PrecioProducto();
        
        $oPrecioProductoBuscar->id_lista_precio = filter_input(INPUT_POST, "idListaPrecio");
        $oPrecioProductoBuscar->id_producto = filter_input(INPUT_POST, "idProducto");
        
        $oProductoNDTO = PrecioProductoNEG::obtPrecioProducto($oPrecioProductoBuscar);
        
        $oProductoDTO->oProducto = $oProductoNDTO->oProducto;
        $oProductoDTO->oPrecioProducto = $oProductoNDTO->oPrecioProducto;
        
        return $oProductoDTO;
    }
    
}

<?php
require_once SERFELCLASSPATH.'Negocio/UsuarioNEG.php';
require_once SERFELCLASSPATH.'Negocio/PrecioProductoNEG.php';

/**
 * Description of PrecioProducto
 *
 * @author ccastro
 */
class PrecioProductoCTRL extends CI_Controller {
    
    public function __construct() {
        parent::__construct();
    }
    
    
    public function descargarArchivoJSONPrecioProducto() {
        $this->load->view('precioProducto/descargarArchivoJSONPrecioProducto');
    }
    
    public function obtArchivoJSONPrecioProducto() {
        //session_start();
        //$this->oUsuario = $_SESSION["oUsuarioSession"];
        //if ($this->usuario->getIdTipoUsuario() != Usuario::ADMINISTRADOR) {
            // Envíar a página de Ud. no tiene permisos para ver este contenido.
        //}
        
        $listRegListPrecioProducto = PrecioProductoNEG::listPrecioProducto();
        
        $this->load->helper('download');
        force_download('productos.json', json_encode($listRegListPrecioProducto));
    }
    
}
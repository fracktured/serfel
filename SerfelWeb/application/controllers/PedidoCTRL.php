<?php
defined('BASEPATH') OR exit('No direct script access allowed');
require_once SERFELCLASSPATH.'NegDTO/UsuarioNDTO.php';
require_once SERFELCLASSPATH.'POJO/Usuario.php';
require_once SERFELCLASSPATH.'POJO/Estado.php';
require_once SERFELCLASSPATH.'POJO/TipoUsuario.php';

/**
 * Description of PrecioProducto
 *
 * @author ccastro
 */
class PedidoCTRL extends CI_Controller {
    
    public function __construct() {
        parent::__construct();
        session_start();
    }

    public function listarPedido() {
        if(isset($_SESSION["oUsuarioSession"])) {
            $aData["oUsuarioSession"] = $_SESSION["oUsuarioSession"]; //$this->session->oUsuarioSession;
            $aData["cTitulo"] = "Listar Pedido";
            
            $this->load->view('header', $aData);
            $this->load->view('pedido/listarPedido', $aData);
            $this->load->view('footer');
        } else {
            //If no session, redirect to login page
            redirect(base_url(), 'refresh');
        }
    }
    
    public function crearPedido() {
        if(isset($_SESSION["oUsuarioSession"])) {
            $aData["oUsuarioSession"] = $_SESSION["oUsuarioSession"]; //$this->session->oUsuarioSession;
            $aData["cTitulo"] = "Crear Pedido";
            
            $this->load->view('header', $aData);
            $this->load->view('pedido/crearPedido', $aData);
            $this->load->view('footer');
        } else {
            //If no session, redirect to login page
            redirect(base_url(), 'refresh');
        }
    }

    public function modificarPedido() {
        if(isset($_SESSION["oUsuarioSession"])) {
            $aData["oUsuarioSession"] = $_SESSION["oUsuarioSession"]; //$this->session->oUsuarioSession;
            $aData["cTitulo"] = "Modificar Pedido";
            
            $this->load->view('header', $aData);
            $this->load->view('pedido/modificarPedido', $aData);
            $this->load->view('footer');
        } else {
            //If no session, redirect to login page
            redirect(base_url(), 'refresh');
        }
    }
    
}

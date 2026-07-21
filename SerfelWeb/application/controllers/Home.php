<?php
defined('BASEPATH') OR exit('No direct script access allowed');
require_once SERFELCLASSPATH.'NegDTO/UsuarioNDTO.php';
require_once SERFELCLASSPATH.'POJO/Usuario.php';
require_once SERFELCLASSPATH.'POJO/Estado.php';
require_once SERFELCLASSPATH.'POJO/TipoUsuario.php';

/**
 * Description of Home
 *
 * @author ccastro
 */
class Home extends CI_Controller {
    
    public function __construct() {
        parent::__construct();
        session_start();
    }
 
 
    public function index() {
        if(isset($_SESSION["oUsuarioSession"])) {
            $aData["oUsuarioSession"] = $_SESSION["oUsuarioSession"]; //$this->session->oUsuarioSession;
            $aData["cTitulo"] = "Home";
            $this->load->view('header', $aData);
            $this->load->view('home', $aData);
            $this->load->view('footer');
        } else {
            //If no session, redirect to login page
            redirect(base_url(), 'refresh');
        }
    }
 
    public function logout() {
        session_destroy();
        session_write_close();
        redirect(base_url(), 'refresh');
    }
    
}

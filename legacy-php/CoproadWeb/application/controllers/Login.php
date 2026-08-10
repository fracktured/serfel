<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Description of Login
 *
 * @author ccastro
 */
class Login extends CI_Controller {
    
    public function __construct() {
        parent::__construct();
        session_start();
    }
    
    
    public function index() {
        if(isset($_SESSION["oUsuarioSession"])) {
            // DESA redirect(base_url("Home"), 'refresh');
            redirect("Home", 'refresh');
        } else {
            //If no session, redirect to login page
            $this->load->view('login');
        }
    }
    
    public function view($cPagina = 'home') {
        
        if ( ! file_exists(APPPATH.'/views/pages/'.$cPagina.'.php') ) {
            // Whoops, we don't have a page for that!
            show_404();
        }

        $aData['title'] = ucfirst($cPagina); // Capitalize the first letter

        $this->load->view('templates/header', $aData);
        $this->load->view('pages/'.$cPagina, $aData);
        $this->load->view('templates/footer', $aData);
        
    }
    /*
    public function loguear() {
        require_once SERFELCLASSPATH.'Negocio/UsuarioNEG.php';
        $oUsuarioNEG = new UsuarioNEG();
        $oUsuarioNDTO = $oUsuarioNEG->validaLogin("16483229-5", "82866c5de07358584d413a7fcace82ce");
            
        // Exito Login
        if($oUsuarioNDTO->bExito) {
            //$_SESSION["oUsuarioSession"] = $oUsuarioNDTO;
            //$this->session->set_userdata('oUsuarioSession', $oUsuarioNDTO);
            $this->session->oUsuarioSession = $oUsuarioNDTO;
        }
        $this->load->view('login');
    }
    */
}

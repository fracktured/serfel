<?php
require_once APPPATH.'/models/Negocio/UsuarioNEG.php';

/**
 * Description of LoginValidar
 *
 * @author ccastro
 */
class LoginValidar extends CI_Controller {
    
    public function __construct() {
        parent::__construct();
    }
 
    
    public function index() {
        $this->load->library('form_validation');
 
        $this->form_validation->set_rules('username', 'Username', 'trim|required');
        $this->form_validation->set_rules('password', 'Password', 'trim|required');
        //$this->form_validation->set_rules('password', 'Password', 'trim|required|xss_clean|callback_check_database');
 
        if($this->form_validation->run() == FALSE) {
            $this->load->view('index');
        } else {
            $cUsername = $this->input->post('username');
            $cPassword = $this->input->post('password');
   
            $oUsuarioNEG = new UsuarioNEG();
            $oUsuarioNDTO = $oUsuarioNEG->validaLogin($cUsername, $cPassword);
            
            // Exito Login
            if($oUsuarioNDTO->bExito) {
                require_once APPPATH.'/libraries/MenuUtil.php';
                
                $oUsuario = $oUsuarioNDTO->oUsuario;
                $oUsuario->contrasena = "";
                
                //session_start();
                $_SESSION["oUsuario"] = $oUsuario;
                $_SESSION["cMenu"] = MenuUtil::obtVistaMenu($oUsuario->id_tipo_usuario);

                redirect('Home', 'refresh');
                //header('Location: home.php');
                //header('Location: ' . $this->stRutaRelativa . 'Cliente/perfil.php');
                
            // Error Login
            } else {
                $aData["cMensaje"]   = $oUsuarioNDTO->cMensaje;
                //$this->form_validation->set_message('check_database', $oUsuarioNDTO->cMensaje);
                
                $this->load->view('index', $aData);
            }
        }
    }
    
}

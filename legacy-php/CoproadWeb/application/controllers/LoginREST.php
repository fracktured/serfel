<?php
defined('BASEPATH') OR exit('No direct script access allowed');
require_once APPPATH.'libraries/REST_Controller.php';

/**
 * Description of LoginREST
 *
 * @author ccastro
 */
class LoginREST extends REST_Controller {
    
    public function __construct($config = 'rest') {
        parent::__construct($config);
        require_once SERFELCLASSPATH.'Negocio/UsuarioNEG.php';
        require_once SERFELCLASSPATH.'Mapper/UsuarioMapper.php';
        require_once SERFELCLASSPATH.'Mapper/TipoUsuarioMapper.php';

        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
        header('Access-Control-Allow-Headers: content-type, Authorization');
    }
    
    public function login_post() {
        $cUsername = $this->post('cRut');
        $cPassword = $this->post('cPassword');
        
        $oUsuarioNEG = new UsuarioNEG();
        $oUsuarioNDTO = $oUsuarioNEG->validaLogin($cUsername, $cPassword);
            
        $aData["bExito"] = FALSE;
        // Exito Login
        if($oUsuarioNDTO->bExito) {
            session_start();
            $_SESSION["oUsuarioSession"] = $oUsuarioNDTO;
            //$this->session->set_userdata('oUsuarioSession', $oUsuarioNDTO);
            //$this->session->oUsuarioSession = $oUsuarioNDTO;
            $aData["oUsuario"] = $oUsuarioNDTO->oUsuario;
            $aData["oEstado"] = $oUsuarioNDTO->oEstado;
            $aData["cMensaje"] = "";
            $aData["bExito"] = TRUE;
                
        // Error Login
        } else {
            $aData["cMensaje"] = $oUsuarioNDTO->cMensaje;
        }
        
        $this->response($aData);
    }
    
    public function login2_post() {
        $aData["exito"] = FALSE;
        $cUsername = $this->post('cRut');
        $cPassword = $this->post('cPassword');
        
        $oUsuarioNDTO = UsuarioNEG::validaLogin($cUsername, $cPassword);

        if( $oUsuarioNDTO->bExito ) {
            session_start();
            $_SESSION["oUsuarioSession"] = $oUsuarioNDTO;
            $aData["usuario"] = UsuarioMapper::fromEntityToDTO( $oUsuarioNDTO->oUsuario );
            $aData["estado"] = $oUsuarioNDTO->oEstado;
            $aData["tipoUsuario"] = TipoUsuarioMapper::fromEntityToDTO( $oUsuarioNDTO->oTipoUsuario );
            $aData["mensaje"] = "";
            $aData["exito"] = TRUE;
            $this->response($aData);
        } else {
            $aData["mensaje"] = $oUsuarioNDTO->cMensaje;
            $this->response($aData, REST_Controller::HTTP_UNAUTHORIZED);
        }
    }

    public function login2_options() {
        return $this->response(NULL, REST_Controller::HTTP_OK);
    }
    
}

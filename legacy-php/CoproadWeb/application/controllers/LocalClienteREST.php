<?php
defined('BASEPATH') OR exit('No direct script access allowed');
require_once APPPATH.'libraries/REST_Controller.php';

/**
 * Description of LocalClienteREST
 *
 * @author ccastro
 */
class LocalClienteREST extends REST_Controller {
    
    public function __construct($config = 'rest') {
        parent::__construct($config);
        require_once APPPATH.'libraries/BasicAuth.php';
        require_once SERFELCLASSPATH.'Constantes/UsuarioCONST.php';
        require_once SERFELCLASSPATH.'Constantes/MensajesCONST.php';
        require_once SERFELCLASSPATH.'Negocio/LocalClienteNEG.php';
        require_once SERFELCLASSPATH.'POJO/Usuario.php';
        require_once SERFELCLASSPATH.'NegDTO/UsuarioNDTO.php';
        require_once SERFELCLASSPATH.'Mapper/LocalClienteMapper.php';

        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
        header('Access-Control-Allow-Headers: content-type, Authorization');
    }

    /**
     * Retorna lista de locales cliente por rut
     */
    public function buscarPorRut_get() {
        $aData["bExito"] = FALSE;
        
        session_start();
        if ( isset($_SESSION["oUsuarioSession"])
                && ( $_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario == UsuarioCONST::ADMINISTRADOR
                    || $_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario == UsuarioCONST::VENDEDOR ) ) {
            try {
                $rut = $this->get("rut");
                $rut = str_replace(".", "", $rut);
                $aData["listLocales"] = LocalClienteNEG::listarPorRut($rut);
                $aData["cMensaje"] = "";
                $aData["bExito"] = TRUE;
            } catch (Exception $ex) {
                $aData["cMensaje"] = $ex->getMessage();
            }
        } else {
            $aData["cMensaje"] = "Ud no tiene permisos para acceder a este recurso.";
        }

        $this->response($aData);
    }

    /**
     * Retorna lista de locales cliente por rut
     */
    public function buscarPorNombre_get() {
        $aData["bExito"] = FALSE;
        
        session_start();
        if ( isset($_SESSION["oUsuarioSession"])
                && ( $_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario == UsuarioCONST::ADMINISTRADOR
                    || $_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario == UsuarioCONST::VENDEDOR ) ) {
            try {
                $nombre = $this->get("nombre");
                $aData["listLocales"] = LocalClienteNEG::listarPorRazonSocialONombre($nombre);
                $aData["cMensaje"] = "";
                $aData["bExito"] = TRUE;
            } catch (Exception $ex) {
                $aData["cMensaje"] = $ex->getMessage();
            }
        } else {
            $aData["cMensaje"] = "Ud no tiene permisos para acceder a este recurso.";
        }

        $this->response($aData);
    }

    /**
     * Retorna lista de locales cliente por rut
     */
    public function findByRut_get() {
        $aData["exito"] = FALSE;
        $oUsuario = BasicAuth::authenticate();
        
        if ( $oUsuario == null
            || ( $oUsuario->id_tipo_usuario != UsuarioCONST::ADMINISTRADOR 
                && $oUsuario->id_tipo_usuario != UsuarioCONST::VENDEDOR )
        ) {
            $aData["mensaje"] = MensajesCONST::SIN_PERMISO;
            $this->response($aData, REST_Controller::HTTP_UNAUTHORIZED);
        }

        if ( !$this->get("rut") ) {
            $aData["mensaje"] = MensajesCONST::SIN_CAMPOS;
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }
        
        try {
            $rut = str_replace(".", "", $this->get("rut"));
            $locales = LocalClienteNEG::listarPorRut($rut);
            if ( $locales == null || sizeof($locales) == 0 ) {
                $aData["mensaje"] = 'No existen locales para rut ' . $this->get("rut");
            } else {
                $aData["locales"] = LocalClienteMapper::fromEntitysToDTOs( $locales );
                $aData["mensaje"] = "";
                $aData["exito"] = TRUE;
            }
            $this->response($aData);

        } catch (Exception $ex) {
            $aData["mensaje"] = $ex->getMessage();
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }

    }

    public function findByRut_options() {
        return $this->response(NULL, REST_Controller::HTTP_OK);
    }

    /**
     * Retorna lista de locales cliente por rut
     */
    public function findByName_get() {
        $aData["exito"] = FALSE;
        $oUsuario = BasicAuth::authenticate();
        
        if ( $oUsuario == null
            || ( $oUsuario->id_tipo_usuario != UsuarioCONST::ADMINISTRADOR 
                && $oUsuario->id_tipo_usuario != UsuarioCONST::VENDEDOR )
        ) {
            $aData["mensaje"] = MensajesCONST::SIN_PERMISO;
            $this->response($aData, REST_Controller::HTTP_UNAUTHORIZED);
        }

        $nombre = $this->get("nombre");
        //if ( empty( $nombre ) ) {
        if ( !isset($nombre) ) {
            $aData["mensaje"] = MensajesCONST::SIN_CAMPOS;
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }

        try {
            $locales = LocalClienteNEG::listarPorRazonSocialONombre($nombre);
            if ( $locales == null || sizeof($locales) == 0 ) {
                $aData["mensaje"] = 'No existen locales para nombre ' . $nombre;
            } else {
                $aData["locales"] = LocalClienteMapper::fromEntitysToDTOs( $locales );
                $aData["mensaje"] = "";
                $aData["exito"] = TRUE;
            }
            $this->response($aData);

        } catch (Exception $ex) {
            $aData["mensaje"] = $ex->getMessage();
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }
    }

    public function findByName_options() {
        return $this->response(NULL, REST_Controller::HTTP_OK);
    }

}
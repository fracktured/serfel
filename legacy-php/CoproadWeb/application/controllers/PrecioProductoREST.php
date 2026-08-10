<?php
defined('BASEPATH') OR exit('No direct script access allowed');
require_once APPPATH.'libraries/REST_Controller.php';

//error_reporting(-1);//report all errors

/**
 * Description of PrecioProductoREST
 *
 * @author ccastro
 */
class PrecioProductoREST extends REST_Controller {
    
    public function __construct($config = 'rest') {
        parent::__construct($config);
        require_once APPPATH.'libraries/BasicAuth.php';
        //require_once APPPATH.'core/Negocio/UsuarioNEG.php';
        require_once SERFELCLASSPATH.'Constantes/UsuarioCONST.php';
        require_once SERFELCLASSPATH.'Constantes/MensajesCONST.php';
        require_once SERFELCLASSPATH.'POJO/Usuario.php';
        require_once SERFELCLASSPATH.'NegDTO/UsuarioNDTO.php';
        require_once SERFELCLASSPATH.'Negocio/PrecioProductoNEG.php';
        require_once SERFELCLASSPATH.'Mapper/PrecioProductoMapper.php';
        //require_once SERFELCLASSPATH.'../Globales/funciones.php';

        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
        header('Access-Control-Allow-Headers: content-type, Authorization');
    }
    
    public function listPrecioProducto_get() {
        $aData["bExito"] = FALSE;
        
        session_start();
        if ( !isset($_SESSION["oUsuarioSession"])
                || ($_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario != UsuarioCONST::ADMINISTRADOR
                    && $_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario != UsuarioCONST::VENDEDOR) ) {
            $aData["cMensaje"] = "Ud no tiene permisos para acceder a este recurso.";
        } else {
        
            $idListaPrecio = $this->get("idListaPrecio");
            $listRegListPrecioProducto = PrecioProductoNEG::listPrecioProducto($idListaPrecio);
                
            $aData["listPrecioProducto"] = $listRegListPrecioProducto;
            $aData["cMensaje"] = "";
            $aData["bExito"] = TRUE;
        }
        
        $this->response($aData);
    }
    
    public function list_get() {
        $aData["exito"] = FALSE;
        $oUsuario = BasicAuth::authenticate();
        
        if ( $oUsuario == null
            || ( $oUsuario->id_tipo_usuario != UsuarioCONST::ADMINISTRADOR 
                && $oUsuario->id_tipo_usuario != UsuarioCONST::VENDEDOR )
        ) {
            $aData["mensaje"] = MensajesCONST::SIN_PERMISO;
            $this->response($aData, REST_Controller::HTTP_UNAUTHORIZED);
        }
        
        $idListaPrecio = $this->get("idListaPrecio");
        if ( !isset($idListaPrecio) ) {
            $aData["mensaje"] = MensajesCONST::SIN_CAMPOS;
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }

        try {
            $listRegListPrecioProducto = PrecioProductoNEG::listPrecioProducto( $idListaPrecio );
            $aData["productos"] = PrecioProductoMapper::fromEntitysToDTOs( $listRegListPrecioProducto );
            $aData["mensaje"] = "";
            $aData["exito"] = TRUE;
            $this->response($aData);

        } catch (Exception $ex) {
            $aData["mensaje"] = $ex->getMessage();
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }
    }

    public function list_options() {
        return $this->response(NULL, REST_Controller::HTTP_OK);
    }
}

<?php
defined('BASEPATH') OR exit('No direct script access allowed');
require_once APPPATH.'libraries/REST_Controller.php';

/**
 * Description of RutaREST
 *
 * @author ccastro
 */
class ProductoREST extends REST_Controller {
    
    public function __construct($config = 'rest') {
        parent::__construct($config);
        require_once APPPATH.'libraries/BasicAuth.php';
        require_once SERFELCLASSPATH.'Constantes/UsuarioCONST.php';
        require_once SERFELCLASSPATH.'Constantes/MensajesCONST.php';
        require_once SERFELCLASSPATH.'POJO/Usuario.php';
        require_once SERFELCLASSPATH.'NegDTO/UsuarioNDTO.php';
        require_once SERFELCLASSPATH.'Negocio/ProductoNEG.php';
        require_once SERFELCLASSPATH.'Mapper/ProductoMapper.php';
        require_once SERFELCLASSPATH.'FiltroBusqueda/ProductoFB.php';

        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
        header('Access-Control-Allow-Headers: content-type, Authorization');
    }

    private function hasPermission( $oUsuario ) {
        if ( $oUsuario == null
            || ( $oUsuario->id_tipo_usuario != UsuarioCONST::ADMINISTRADOR 
                && $oUsuario->id_tipo_usuario != UsuarioCONST::SECRETARIO )
        ) {
            $aData["exito"] = FALSE;
            $aData["mensaje"] = MensajesCONST::SIN_PERMISO;
            $this->response($aData, REST_Controller::HTTP_UNAUTHORIZED);
        }
    }

    /**
     * Retorna Producto por ID
     */
    public function findByID_get() {
        $aData["exito"] = FALSE;
        $oUsuario = BasicAuth::authenticate();
        $this->hasPermission( $oUsuario );

        if ( !$this->get("idProducto") ) {
            $aData["mensaje"] = MensajesCONST::SIN_CAMPOS;
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }
        try {
            $producto = ProductoNEG::get( $this->get("idProducto") );

            if ( $producto == null || sizeof( $producto ) == 0 ) {
                $aData["mensaje"] = 'No existe producto con ID ' . $this->get("idProducto");
                $this->response($aData, REST_Controller::HTTP_NOT_FOUND);
            } else {
                $aData["exito"] = TRUE;
                $aData["mensaje"] = "";
                $aData["producto"] = ProductoMapper::fromEntityToDTO( $producto[0] );
                $this->response($aData);
            }

        } catch (Exception $ex) {
            $aData["mensaje"] = $ex->getMessage();
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }
    }

    public function findByID_options() {
        return $this->response(NULL, REST_Controller::HTTP_OK);
    }

    /**
     * Retorna lista de Producto por codSerfel
     */
    public function findByCodSerfel_get() {
        $aData["exito"] = FALSE;
        $oUsuario = BasicAuth::authenticate();
        $this->hasPermission( $oUsuario );

        if ( !$this->get("codSerfel") ) {
            $aData["mensaje"] = MensajesCONST::SIN_CAMPOS;
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }
        try {
            $oProductoFB = new ProductoFB();
            $oProductoFB->codSerfel = $this->get("codSerfel");
            $productos = ProductoNEG::list($oProductoFB);

            if ( $productos == null || sizeof($productos) == 0 ) {
                $aData["mensaje"] = 'No existe producto con código serfel ' . $oProductoFB->codSerfel;
            } else {
                $aData["exito"] = TRUE;
                $aData["mensaje"] = "";
                $aData["producto"] = ProductoMapper::fromEntitysToDTOs( $productos );
            }
            $this->response($aData);

        } catch (Exception $ex) {
            $aData["mensaje"] = $ex->getMessage();
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }
    }

    public function findByCodSerfel_options() {
        return $this->response(NULL, REST_Controller::HTTP_OK);
    }

    /**
     * Retorna lista de Productos por nombre
     */
    public function findByName_get() {
        $aData["exito"] = FALSE;
        $oUsuario = BasicAuth::authenticate();
        $this->hasPermission( $oUsuario );

        if ( !$this->get("name") ) {
            $aData["mensaje"] = MensajesCONST::SIN_CAMPOS;
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }
        try {
            $oProductoFB = new ProductoFB();
            $name = $this->get("name");
            $oProductoFB->palabrasNomProducto = explode( '%20', $name );
            $productos = ProductoNEG::list($oProductoFB);

            if ( $productos == null || sizeof($productos) == 0 ) {
                $aData["mensaje"] = 'No existen productos con nombre ' . $name;
            } else {
                $aData["exito"] = TRUE;
                $aData["mensaje"] = "";
                $aData["productos"] = ProductoMapper::fromEntitysToDTOs( $productos );
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
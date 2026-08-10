<?php
defined('BASEPATH') OR exit('No direct script access allowed');
require_once APPPATH.'libraries/REST_Controller.php';

/**
 * Description of RutaREST
 *
 * @author ccastro
 */
class PedidoREST extends REST_Controller {
    
    public function __construct($config = 'rest') {
        parent::__construct($config);
        require_once APPPATH.'libraries/BasicAuth.php';
        require_once SERFELCLASSPATH.'Constantes/UsuarioCONST.php';
        require_once SERFELCLASSPATH.'Constantes/EstadoCONST.php';
        require_once SERFELCLASSPATH.'Constantes/MensajesCONST.php';
        require_once SERFELCLASSPATH.'FiltroBusqueda/PedidoFB.php';
        require_once SERFELCLASSPATH.'Negocio/PedidoNEG.php';
        require_once SERFELCLASSPATH.'POJO/Usuario.php';
        require_once SERFELCLASSPATH.'NegDTO/UsuarioNDTO.php';
        require_once SERFELCLASSPATH.'Mapper/LocalClienteMapper.php';
        require_once SERFELCLASSPATH.'Mapper/PrecioProductoMapper.php';
        require_once SERFELCLASSPATH.'Mapper/PedidoMapper.php';
        require_once SERFELCLASSPATH.'Mapper/ProductoPedidoMapper.php';

        date_default_timezone_set('America/Santiago');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
        header('Access-Control-Allow-Headers: content-type, Authorization');
    }
    
    /**
     * Retorna lista de pedidos activos (no asociados a venta) del usuario conectado en el dia
     */
    public function listPedidosDelDia_get() {
        $aData["bExito"] = FALSE;
        $oUsuario = BasicAuth::authenticate();
        
        if ( $oUsuario == null
            || ( $oUsuario->id_tipo_usuario != UsuarioCONST::ADMINISTRADOR 
                && $oUsuario->id_tipo_usuario != UsuarioCONST::VENDEDOR )
        ) {
            $aData["mensaje"] = MensajesCONST::SIN_PERMISO;
            $this->response($aData, REST_Controller::HTTP_UNAUTHORIZED);
        }

        try {
            $oPedidoFB = new PedidoFB();
            $oPedidoFB->idUsuario = $oUsuario->id_usuario;
            $oPedidoFB->idEstado = EstadoCONST::ACTIVO;
            $dt = new DateTime;
            $dt->setTime(0, 0);
            $oPedidoFB->cFechaDesde = $dt->format('Y-m-d H:i:s');
            $dt->setTime(23, 59, 59);
            $oPedidoFB->cFechaHasta = $dt->format('Y-m-d H:i:s');
            $listPedidoNDTO = PedidoNEG::listPedidos($oPedidoFB);
            $aData["listPedido"] = $listPedidoNDTO->listPedidoDTO;
            $aData["cMensaje"] = $listPedidoNDTO->cMensaje;
            $aData["bExito"] = TRUE;
            $this->response($aData);

        } catch (Exception $ex) {
            $aData["cMensaje"] = $ex->getMessage();
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }
    }

    public function listPedidosDelDia_options() {
        return $this->response(NULL, REST_Controller::HTTP_OK);
    }

    /**
     * Retorna pedido por id
     */
    public function obtPedido_get() {
        $aData["bExito"] = FALSE;
        
        session_start();
        if ( !isset($_SESSION["oUsuarioSession"])
                || ($_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario != UsuarioCONST::ADMINISTRADOR
                    && $_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario != UsuarioCONST::SECRETARIO
                    && $_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario != UsuarioCONST::VENDEDOR) ) {
            $aData["cMensaje"] = "Ud no tiene permisos para acceder a este recurso.";
        } else {
            
            $idPedido = $this->get("idPedido");
            $aData = PedidoNEG::obtPedido($idPedido);
        }

        $this->response($aData);
    }

    /**
     * Crea pedido
     */
    public function crearPedido_post() {
    
        $aData["bExito"] = FALSE;
        
        session_start();
        if ( !isset($_SESSION["oUsuarioSession"])
                || ($_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario != UsuarioCONST::ADMINISTRADOR
                    && $_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario != UsuarioCONST::SECRETARIO
                    && $_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario != UsuarioCONST::VENDEDOR) ) {
            $aData["cMensaje"] = "Ud no tiene permisos para acceder a este recurso.";
        } else {

            $oPedido = (object) $this->post("oPedido");
            $listProductos = $this->post("listProductos");
            $oPedido->id_usuario = $_SESSION["oUsuarioSession"]->oUsuario->id_usuario;

            if ( !empty($listProductos) && !empty($oPedido) ) {
                $aData = PedidoNEG::crearPedido($oPedido, $listProductos);
            } else {
                $aData["cMensaje"] = "Error en parámetros de entrada";
            }
            
        }

        $this->response($aData);
    }

    /**
     * Modifica pedido
     */
    public function modPedido_post() {
        $aData["bExito"] = FALSE;
        
        session_start();
        if ( !isset($_SESSION["oUsuarioSession"])
                || ($_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario != UsuarioCONST::ADMINISTRADOR
                    && $_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario != UsuarioCONST::SECRETARIO
                    && $_SESSION["oUsuarioSession"]->oUsuario->id_tipo_usuario != UsuarioCONST::VENDEDOR) ) {
            $aData["cMensaje"] = "Ud no tiene permisos para acceder a este recurso.";
        } else {
            
            $oPedido = (object) $this->post("oPedido");
            $listProductos = $this->post("listProductos");
            
            $oPedido->id_usuario = $_SESSION["oUsuarioSession"]->oUsuario->id_usuario;

            if ( !empty($listProductos) && !empty($oPedido) ) {
                $aData = PedidoNEG::modPedido($oPedido, $listProductos);
            } else {
                $aData["cMensaje"] = "Error en parámetros de entrada";
            }

        }

        $this->response($aData);
    }

    /**
     * Elimina pedido
     */
    public function elimPedido_post() {
        $aData["bExito"] = FALSE;
        $oUsuario = BasicAuth::authenticate();
        
        if ( $oUsuario == null
            || ( $oUsuario->id_tipo_usuario != UsuarioCONST::ADMINISTRADOR 
                && $oUsuario->id_tipo_usuario != UsuarioCONST::SECRETARIO
                && $oUsuario->id_tipo_usuario != UsuarioCONST::VENDEDOR )
        ) {
            $aData["mensaje"] = MensajesCONST::SIN_PERMISO;
            $this->response($aData, REST_Controller::HTTP_UNAUTHORIZED);
        }

        $idPedido = $this->post("idPedido");
        if ( !isset($idPedido) ) {
            $aData["mensaje"] = MensajesCONST::SIN_CAMPOS;
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }
            
        try  {
            $aData = PedidoNEG::elimPedido($idPedido, $oUsuario->id_usuario);
            $this->response($aData);

        } catch (Exception $ex) {
            $aData["mensaje"] = $ex->getMessage();
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }
    }

    public function elimPedido_options() {
        return $this->response(NULL, REST_Controller::HTTP_OK);
    }


    public function create_post() {
        $aData["exito"] = FALSE;
        $oUsuario = BasicAuth::authenticate();
        
        if ( $oUsuario == null
            || ( $oUsuario->id_tipo_usuario != UsuarioCONST::ADMINISTRADOR 
                && $oUsuario->id_tipo_usuario != UsuarioCONST::SECRETARIO
                && $oUsuario->id_tipo_usuario != UsuarioCONST::VENDEDOR )
        ) {
            $aData["mensaje"] = MensajesCONST::SIN_PERMISO;
            $this->response($aData, REST_Controller::HTTP_UNAUTHORIZED);
        }

        $pedido = $this->post("pedido");
        $productos = $this->post("productos");
        //if ( !empty($listProductos) && !empty($oPedido) ) {
        if ( !isset($pedido) || !isset($productos) ) {
            $aData["mensaje"] = MensajesCONST::SIN_CAMPOS;
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }

        try {
            $oPedido = PedidoMapper::fromDTOToEntity( $pedido );
            $listProductos = ProductoPedidoMapper::fromDTOsToEntitys( $productos );
            $oPedido->id_usuario = $oUsuario->id_usuario;
            $oPedidoDTO = PedidoNEG::crearPedido($oPedido, $listProductos);
            $aData["exito"] = $oPedidoDTO->bExito;
            $aData["pedido"] = PedidoMapper::fromEntityToDTO( $oPedidoDTO->oPedido );
            $aData["mensaje"] = $oPedidoDTO->cMensaje;
            $this->response($aData);
            
        } catch (Exception $ex) {
            $aData["mensaje"] = $ex->getMessage();
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }
    }

    public function create_options() {
        return $this->response(NULL, REST_Controller::HTTP_OK);
    }

    public function modify_post() {
        $aData["exito"] = FALSE;
        $oUsuario = BasicAuth::authenticate();
        
        if ( $oUsuario == null
            || ( $oUsuario->id_tipo_usuario != UsuarioCONST::ADMINISTRADOR 
                && $oUsuario->id_tipo_usuario != UsuarioCONST::SECRETARIO
                && $oUsuario->id_tipo_usuario != UsuarioCONST::VENDEDOR )
        ) {
            $aData["mensaje"] = MensajesCONST::SIN_PERMISO;
            $this->response($aData, REST_Controller::HTTP_UNAUTHORIZED);
        }
        
        $pedido = $this->post("pedido");
        $productos = $this->post("productos");
        if ( !isset($pedido) || !isset($productos) ) {
            $aData["mensaje"] = MensajesCONST::SIN_CAMPOS;
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }

        try {
            $oPedido = PedidoMapper::fromDTOToEntity( $pedido );
            $listProductos = ProductoPedidoMapper::fromDTOsToEntitys( $productos );
            $oPedido->id_usuario = $oUsuario->id_usuario;
            $oPedidoDTO  = PedidoNEG::modPedido($oPedido, $listProductos);
            $aData["exito"] = $oPedidoDTO->bExito;
            $aData["pedido"] = PedidoMapper::fromEntityToDTO( $oPedidoDTO->oPedido );
            $aData["mensaje"] = $oPedidoDTO->cMensaje;
            $this->response($aData);
            
        } catch (Exception $ex) {
            $aData["mensaje"] = $ex->getMessage();
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }
    }

    public function modify_options() {
        return $this->response(NULL, REST_Controller::HTTP_OK);
    }
    
    public function order_get() {
        $aData["exito"] = FALSE;
        $oUsuario = BasicAuth::authenticate();
        
        if ( $oUsuario == null
            || ( $oUsuario->id_tipo_usuario != UsuarioCONST::ADMINISTRADOR 
                && $oUsuario->id_tipo_usuario != UsuarioCONST::SECRETARIO
                && $oUsuario->id_tipo_usuario != UsuarioCONST::VENDEDOR )
        ) {
            $aData["mensaje"] = MensajesCONST::SIN_PERMISO;
            $this->response($aData, REST_Controller::HTTP_UNAUTHORIZED);
        }
        
        $idPedido = $this->get("idPedido");
        if ( !isset($idPedido) ) {
            $aData["mensaje"] = MensajesCONST::SIN_CAMPOS;
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }

        try {
            $oPedidoDTO = PedidoNEG::findOrder($idPedido);
            $aData["exito"] = $oPedidoDTO->bExito;
            $aData["local"] = LocalClienteMapper::fromEntityToDTO( $oPedidoDTO->oLocalCliente );
            $aData["pedido"] = PedidoMapper::fromEntityToDTO( $oPedidoDTO->oPedido );
            $aData["productos"] = PrecioProductoMapper::fromEntitysToDTOs( $oPedidoDTO->listRegListProductoPedido );
            $this->response($aData);
            
        } catch (Exception $ex) {
            $aData["mensaje"] = $ex->getMessage();
            $this->response($aData, REST_Controller::HTTP_BAD_REQUEST);
        }
    }

    public function order_options() {
        return $this->response(NULL, REST_Controller::HTTP_OK);
    }
}

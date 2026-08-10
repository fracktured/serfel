<?php

/**
 * Description of EstadoEntregaChoferCTRL
 *
 * @author ccastro
 */
class EstadoEntregaChoferCTRL {
    
    private $rutaRelativa = "";
    
    
    public function __construct($rutaRelativa) {
        $this->rutaRelativa = $rutaRelativa;
        
        require_once $this->rutaRelativa . 'Globales/Constantes.php';
        require_once $this->rutaRelativa . "Clases/Usuario.php";
    }
    
    
    /**
     * Controlador de Ventas/estadoEntregasChofer/estadoEntregaChofer.php
     * 
     * @return EstadoEntregaChoferDTO
     */
    public function estadoEntregasChofer() {
        
        // <editor-fold defaultstate="collapsed" desc="PERMISOS">
        $usuario = $_SESSION["usuario"];
        if ($usuario->getIdTipoUsuario() != ADMINISTRADOR && $usuario->getIdTipoUsuario() != CHOFER) {
            // Envíar a página de Ud. no tiene permisos para ver este contenido.
        }
        // </editor-fold>

        require_once $this->rutaRelativa . 'Clases/DTO/EstadoEntregaChoferDTO.php';
        
        $estEntChoferDTO = new EstadoEntregaChoferDTO();
        
        // <editor-fold defaultstate="collapsed" desc="PARAMETROS">
        $idRuta     = filter_input(INPUT_POST, "cmbListaRutas");
        $fechaVenta = filter_input(INPUT_POST, "fechaEntrega");
        // </editor-fold>
        
        require_once $this->rutaRelativa . "Coneccion/coneccion.php";
        require_once $this->rutaRelativa . "Clases/Lista.php";
        
        $lista = new Lista();
        $estEntChoferDTO->listaRutas = $lista->getListaNomRutas($this->rutaRelativa);
        $estEntChoferDTO->ventas = null;
        
        if(isset($idRuta) || isset($fechaVenta)) {
            require_once $this->rutaRelativa . "Clases/Negocio/VentaNEG.php";
        
            $estEntChoferDTO->idRuta = $idRuta;
            $estEntChoferDTO->fechaVenta = $fechaVenta;

            $ventaNEG = new VentaNEG("");
            $estEntChoferDTO->estEntChoferNDTOs = $ventaNEG->listVentasXRutaFecha($idRuta, $fechaVenta);
        }
        
        return $estEntChoferDTO;
    }
    
    
    /**
     * Controlador de Ventas/estadoEntregasChofer/popUpEstadoEntregaChofer.php
     * 
     * @return PopUpEstadoEntregaChoferDTO
     */
    public function popUpEstadoEntregaChofer() {
        
        // <editor-fold defaultstate="collapsed" desc="PERMISOS">
        session_start();
        if ($_SESSION["usuario"]->getIdTipoUsuario() != ADMINISTRADOR && $_SESSION["usuario"]->getIdTipoUsuario() != CHOFER) {
            // Envíar a página de Ud. no tiene permisos para ver este contenido.
        }
        // </editor-fold>

        require_once $this->rutaRelativa . 'Clases/DTO/PopUpEstadoEntregaChoferDTO.php';

        $popUpEstEntChoferDTO = new PopUpEstadoEntregaChoferDTO();
        
        // <editor-fold defaultstate="collapsed" desc="PARAMETROS">
        $idVenta = filter_input(INPUT_POST, "idVenta");
        
        if(!isset($idVenta)) {
            return $popUpEstEntChoferDTO;
        }
        // </editor-fold>
        
        require_once $this->rutaRelativa . "Coneccion/coneccion.php";
        require_once $this->rutaRelativa . "Clases/Lista.php";
        require_once $this->rutaRelativa . "Clases/Negocio/GeneralNEG.php";
        require_once $this->rutaRelativa . "Clases/Negocio/MotivoDevolucionNEG.php";
        require_once $this->rutaRelativa . "Clases/Negocio/VentaNEG.php";
        
        if($_SESSION["usuario"]->getIdTipoUsuario() == ADMINISTRADOR) {
            $popUpEstEntChoferDTO->esVerEstado = true;
        }

        $lista = new Lista();
        $popUpEstEntChoferDTO->listaTipoPago = $lista->getListaTipoPago($this->rutaRelativa);
        
        $motDevNEG = new MotivoDevolucionNEG($this->rutaRelativa);
        $popUpEstEntChoferDTO->listaMotivoDevolucion = $motDevNEG->listMotivosDevolucion();
        
        $ventaNEG = new VentaNEG($this->rutaRelativa);
        $ventaNDTO = $ventaNEG->obtVenta($idVenta);
        $popUpEstEntChoferDTO->venta = $ventaNDTO->oVenta;
        $popUpEstEntChoferDTO->estado = $ventaNDTO->oEstado;
        $popUpEstEntChoferDTO->prodDevNDTOs = $ventaNEG->listProductosDevolucion($idVenta);
        
        return $popUpEstEntChoferDTO;
    }
    
    
    /**
     * Controlador de Ajax/Venta/ajaxIngModEntregaChofer.php
     * 
     * @return json
     */
    public function ajaxIngModEntregaChofer() {
        
        // <editor-fold defaultstate="collapsed" desc="PERMISOS">
        session_start();
        if ($_SESSION["usuario"]->getIdTipoUsuario() != ADMINISTRADOR && $_SESSION["usuario"]->getIdTipoUsuario() != CHOFER) {
            // Envíar a página de Ud. no tiene permisos para ver este contenido.
        }
        // </editor-fold>
        
        // <editor-fold defaultstate="collapsed" desc="PARAMETROS">
        $idVenta     = filter_input(INPUT_POST, "idVenta");
        $idFormaPago = filter_input(INPUT_POST, "idFormaPago");
        $productos   = $_POST["productos"];
        
        if(!isset($idVenta) || !isset($idFormaPago) || !isset($productos)) {
            $json["exito"]   = false;
            $json["error"]   = true;
            $json["mensaje"] = "Faltan parámetros de ingreso [" . isset($idVenta) . ", " . $idFormaPago . ", " . isset($productos) . "].";
            
            return $json;
        }
        // </editor-fold>
        
        require_once $this->rutaRelativa . "Clases/Negocio/VentaNEG.php";
        
        $ventaNEG = new VentaNEG("../../");
        $ingEntChoferNDTO = $ventaNEG->ingEntregaChofer($idVenta, $idFormaPago, $productos, $_SESSION["usuario"]);
        
        $json["exito"]   = $ingEntChoferNDTO->exito;
        $json["error"]   = $ingEntChoferNDTO->error;
        $json["mensaje"] = $ingEntChoferNDTO->mensaje;
        
        return $json;
    }
}

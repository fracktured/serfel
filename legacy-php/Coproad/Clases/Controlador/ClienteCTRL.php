<?php
require_once __DIR__ . '/../DTO/ClientesDTO.php';
require_once __DIR__ . '/../Negocio/ListaPrecioNEG.php';
require_once __DIR__ . '/../FiltroBusqueda/ClienteFB.php';
require_once __DIR__ . '/../Negocio/ClienteNEG.php';

/**
 * Description of ClienteCTRL
 *
 * @author ccastro
 */
class ClienteCTRL {
    private $oUsuario;
    
    
    public function __construct($bIniSesion = true) {
        require_once __DIR__ . '/../Constantes/SisDistCONST.php';
        require_once __DIR__ . '/../Constantes/UsuarioCONST.php';
        require_once __DIR__ . '/../Constantes/EstadoCONST.php';
        require_once __DIR__ . "/../Usuario.php";
        require_once __DIR__ . '/../DTO/AjaxDTO.php';
        
        if($bIniSesion) {
            session_start();
        }
        
        $this->oUsuario = $_SESSION["usuario"];
        
        if($this->oUsuario->getIdTipoUsuario() != UsuarioCONST::ADMINISTRADOR) {
            header ("Location: " . SisDistCONST::URL_PAGINA_PERMISO_DENEGADO);
        }
    }
    
    
    /**
     * Controlador de Ajax/Cliente/ajaxExisteCliente.php
     * 
     * @return AjaxDTO
     */
    public function ajaxExisteCliente() {
        $cRutCliente = filter_input(INPUT_POST, "cRutCliente");
        $iRutCliente = explode("-", $cRutCliente)[0];
        
        $oAjaxDTO = new AjaxDTO();
        if(is_numeric($iRutCliente)) {
            try {
                //$oClienteNEG = new ClienteNEG();
                $oCliente = ClienteNEG::obtCliente($iRutCliente);
                
                if($oCliente->id_estado == EstadoCONST::INACTIVO) {
                    $oAjaxDTO->bReload = false;
                    $oAjaxDTO->cMensaje = "Cliente ya existe. ¿Desea reingresarlo?";
                    $oAjaxDTO->cPopUp = "puReingresarCliente";
                } else if($oCliente->id_estado == EstadoCONST::ACTIVO) {
                    $oAjaxDTO->bReload = false;
                    $oAjaxDTO->cMensaje = "Cliente ya existe.";
                }
            } catch (Exception $ex) {

            }
        }
        
        return $oAjaxDTO;
    }
    
    
    /**
     * Controlador de Ajax/Cliente/ajaxReingresarCliente.php
     * 
     * @return AjaxDTO
     */
    public function ajaxReingresarCliente() {
        $cRutCliente = filter_input(INPUT_POST, "cRutCliente");
        $iRutCliente = explode("-", $cRutCliente)[0];
        
        $oClienteNEG = new ClienteNEG();
        $oCliente = $oClienteNEG->reingresarCliente($iRutCliente);
        
        $oAjaxDTO = new AjaxDTO();
        $oAjaxDTO->bReload = true;
        $oAjaxDTO->cMensaje = "Cliente reingresado.";
        
        return $oAjaxDTO;
    }
    

    /**
     * Controlador de Clientes/listCliente/listCliente.php
     * 
     * @return ClienteDTO
     */
    public static function clientes() {
        $oClientesDTO = new ClientesDTO();
        $oClientesDTO->clientes = Array();
        $oClientesDTO->listasPrecio = ListaPrecioNEG::listar();

        $oClienteFB = new ClienteFB();
        if ( filter_input(INPUT_POST, "btnFiltrar") ) {
            $oClienteFB->cRazonSocialCliente = filter_input(INPUT_POST, "nombre");
            $oClienteFB->cDireccion = filter_input(INPUT_POST, "direccion");
            $cRut = filter_input(INPUT_POST, "rutCliente");

            if ($cRut == "") {
                $oClienteFB->iRutCliente = SisDistCONST::ID_FILTRO_TODOS;
            } else {
                $oClienteFB->iRutCliente = explode("-", $cRut)[0];
            }

            $oClientesDTO->clientes = ClienteNEG::listar($oClienteFB);
            $oClientesDTO->cRutCliente = $cRut;
            $oClientesDTO->cRazonSocialCliente = $oClienteFB->cRazonSocialCliente;
            $oClientesDTO->cDireccion = $oClienteFB->cDireccion;
        }
        
        return $oClientesDTO;
    }
    
}

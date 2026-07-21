<?php
require_once __DIR__ . '/../Constantes/SisDistCONST.php';
require_once __DIR__ . '/../Negocio/VentaNEG.php';
require_once __DIR__ . '/../POJO/Venta.php';
require_once __DIR__ . '/../DTO/VentaDTO.php';
require_once __DIR__ . '/../DTO/AjaxDTO.php';
require_once __DIR__ . '/../FiltroBusqueda/VentaFB.php';
require_once __DIR__ . '/../Negocio/TipoDoctoNEG.php';

/**
 * Description of VentaCTRL
 *
 * @author ccastro
 */
class VentaCTRL {
    
    protected $cRutaRelativa = "";
    protected $oUsuario;
    
    
    public function __construct($cRutaRelativa, $bIniSesion = true) {
        $this->cRutaRelativa = $cRutaRelativa;
        
        require_once __DIR__ . '/../Constantes/UsuarioCONST.php';
        require_once __DIR__ . "/../Usuario.php";
        
        if($bIniSesion) {
            session_start();
        }
        
        $this->oUsuario = $_SESSION["usuario"];
    }
    
    
    /**
     * Controlador de Ventas/listVentas/listVentas.php
     * 
     * @return VentaDTO
     */
    public static function listVentas() {
        require_once __DIR__ . '/../Negocio/VendedorNEG.php';
        
        $oVentaFB = new VentaFB();
        
        $bCmbFiltrar = filter_input(INPUT_POST, "btnFiltrar");
        $oVentaFB->idTipoDocto = filter_input(INPUT_POST, "cmbTipoDocto");
        $oVentaFB->idVendedor = filter_input(INPUT_POST, "cmbVendedores");
        $oVentaFB->cFechaDesde = filter_input(INPUT_POST, "txtFechaDesde");
        $oVentaFB->cFechaHasta = filter_input(INPUT_POST, "txtFechaHasta");
        $iNumFacturaDesde = filter_input(INPUT_POST, "txtNumFacturaDesde");
        $iNumFacturaHasta = filter_input(INPUT_POST, "txtNumFacturaHasta");
        
        if(!isset($iNumFacturaDesde) || $iNumFacturaDesde == "") {
            $iNumFacturaDesde = SisDistCONST::ID_FILTRO_TODOS;
        }
        
        if(!isset($iNumFacturaHasta) || $iNumFacturaHasta == "") {
            $iNumFacturaHasta = SisDistCONST::ID_FILTRO_TODOS;
        }
        
        $oVentaFB->iNumFacturaDesde = $iNumFacturaDesde;
        $oVentaFB->iNumFacturaHasta = $iNumFacturaHasta;
        $oVentaFB->iRutEmpresa = SisDistCONST::ID_FILTRO_TODOS;
        
        $oTipoDoctoNEG = new TipoDoctoNEG();
        $oVentaNEG = new VentaNEG("");
        
        $oVentaDTO = new VentaDTO();
        $oVentaDTO->listTipoDoctoSI = $oTipoDoctoNEG->listTipoDoctoCompraSI(true);
        $oVentaDTO->vendedoresSI = VendedorNEG::listVendedoresSI();
        
        if($bCmbFiltrar) {
            $oVentaDTO->listVenta = $oVentaNEG->listVentas($oVentaFB);
        }
        
        if($oVentaFB->iNumFacturaDesde == SisDistCONST::ID_FILTRO_TODOS) {
            $oVentaFB->iNumFacturaDesde = "";
        }
        if($oVentaFB->iNumFacturaHasta == SisDistCONST::ID_FILTRO_TODOS) {
            $oVentaFB->iNumFacturaHasta = "";
        }
        $oVentaDTO->oVentaFB = $oVentaFB;
        
        return $oVentaDTO;
    }
    
    
    /**
     * Controlador de Ajax/Venta/ajaxAnularVenta.php
     * 
     * @return AjaxDTO
     */
    public function ajaxAnularVenta() {
        $idVenta = filter_input(INPUT_POST, "idVenta");
        
        $oVentaNEG = new VentaNEG($this->cRutaRelativa);
        $oNDTO = $oVentaNEG->anularVenta($idVenta, $this->oUsuario->getIdUsuario());
        
        $oAjaxDTO = new AjaxDTO();
        if($oNDTO->bExito) {
            $oAjaxDTO->bReload = true;
            $oAjaxDTO->cMensaje = "Venta anulada con éxito";
        } else {
            $oAjaxDTO->cMensaje = $oNDTO->cMensaje;
        }
        
        return $oAjaxDTO;
    }
    
    
    /**
     * Controlador de Ajax/Venta/ajaxEliminarVenta.php
     * 
     * @return AjaxDTO
     */
    public function ajaxEliminarVenta() {
        $idVenta = filter_input(INPUT_POST, "idVenta");
        
        $oVentaNEG = new VentaNEG($this->cRutaRelativa);
        $oNDTO = $oVentaNEG->eliminarVenta($idVenta, $this->oUsuario->getIdUsuario());
        
        $oAjaxDTO = new AjaxDTO();
        if($oNDTO->bExito) {
            $oAjaxDTO->bReload = true;
            $oAjaxDTO->cMensaje = "Venta eliminada con éxito";
        } else {
            $oAjaxDTO->cMensaje = $oNDTO->cMensaje;
        }
        
        return $oAjaxDTO;
    }
    
    
    /**
     * Controlador de Ajax/Venta/ajaxIngVenta.php
     * 
     * @return AjaxDTO
     */
    public function ajaxIngVenta() {
        require_once __DIR__ . '/../POJO/ProductoVenta.php';
        
        $oAjaxDTO = new AjaxDTO();
        
        if ($this->oUsuario->getIdTipoUsuario() != UsuarioCONST::ADMINISTRADOR
                && $this->oUsuario->getIdTipoUsuario() != UsuarioCONST::SECRETARIO) {
            $oAjaxDTO->cMensaje = "Ud. no tiene permisos para realizar Venta.";
            $oAjaxDTO->cPopUp = "popUpError";

            return $oAjaxDTO;
        }
                
        $oVenta = new Venta();
        $oVenta->id_pedido = filter_input(INPUT_POST, "idPedido", FILTER_VALIDATE_INT);
        $oVenta->rut_empresa = filter_input(INPUT_POST, "rutEmpresa", FILTER_VALIDATE_INT);
        $oVenta->id_forma_pago = filter_input(INPUT_POST, "idFormaPago", FILTER_VALIDATE_INT);
        $oVenta->num_docto_emitido = filter_input(INPUT_POST, "numDoctoEmit", FILTER_VALIDATE_INT);
        $oVenta->fecha_venta = filter_input(INPUT_POST, "fechaVenta");
        $oVenta->id_usuario_venta = filter_input(INPUT_POST, "idVendedor", FILTER_VALIDATE_INT);
        $oVenta->id_local_cliente = filter_input(INPUT_POST, "idLocalCliente", FILTER_VALIDATE_INT);
        $oVenta->id_usuario_mod = $this->oUsuario->getIdUsuario();
        $oVenta->observaciones = filter_input(INPUT_POST, "cObservaciones");
        
        $arrayProducto = $_POST["producto"]; //filter_input(INPUT_POST, "producto");
        $arrayCantidad = $_POST["cantidad"]; //filter_input(INPUT_POST, "cantidad");
        $arrayDescuento = $_POST["descuento"]; //filter_input(INPUT_POST, "descuento");
        $arrayPrecio = $_POST["precio"]; //filter_input(INPUT_POST, "precio");
        
        $listProductoVenta = Array();
        for($i = 0; $i < count($arrayProducto); $i++) {
            $oProductoVenta = new ProductoVenta();
            $oProductoVenta->id_producto = $arrayProducto[$i];
            $oProductoVenta->cantidad = $arrayCantidad[$i];
            $oProductoVenta->porcen_desc = $arrayDescuento[$i];
            $oProductoVenta->precio = $arrayPrecio[$i];
            $listProductoVenta[$i] = $oProductoVenta;
        }
        
        $oVentaNEG = new VentaNEG($this->cRutaRelativa);
        $oNDTO = $oVentaNEG->ingVenta($oVenta, $listProductoVenta);
        
        $oAjaxDTO->cMensaje = $oNDTO->cMensaje;
        if($oNDTO->bExito) {
            $oAjaxDTO->cPopUp = "popUpExito";
        } else {
            $oAjaxDTO->cPopUp = "popUpError";
        }
        
        return $oAjaxDTO;
    }
}

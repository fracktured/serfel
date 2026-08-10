<?php
require_once __DIR__ . '/../Constantes/SisDistCONST.php';
require_once __DIR__ . '/../Negocio/TipoDoctoNEG.php';
require_once __DIR__ . '/../DTO/RecepcionDTO.php';
require_once __DIR__ . '/../FiltroBusqueda/RecepcionFB.php';
require_once __DIR__ . '/../Negocio/RecepcionNEG.php';

/**
 * Description of RecepcionCTRL
 *
 * @author ccastro
 */
class RecepcionCTRL {
    private $oUsuario;
    
    public function __construct($bIniSesion = true) {
        require_once __DIR__ . '/../Constantes/UsuarioCONST.php';
        require_once __DIR__ . "/../Usuario.php";
        
        if($bIniSesion) {
            session_start();
        }
        
        $this->oUsuario = $_SESSION["usuario"];
        
        if($this->oUsuario->getIdTipoUsuario() != UsuarioCONST::ADMINISTRADOR) {
            header ("Location: " . SisDistCONST::URL_PAGINA_PERMISO_DENEGADO);
        }
    }

    /**
     * Controlador de Stock/listRecepcionProductos/listRecepcionProductos.php
     *
     * @return RecepcionDTO
     */
    public static function recepciones() {
        $oRecepcionDTO = new RecepcionDTO();
        $oRecepcionDTO->listTipoDoctoSI = TipoDoctoNEG::listTipoDoctoFormaPagoSI(true);
        $oRecepcionDTO->idTipoPago = SisDistCONST::ID_FILTRO_TODOS;

        $oRecepcionFB = new RecepcionFB();
        if ( filter_input(INPUT_POST, "btnFiltrar") ) {
            $oRecepcionFB->idTipoPago = filter_input(INPUT_POST, "cmbTipoPago");
            $cRut = filter_input(INPUT_POST, "rutProveedor");
            $oRecepcionFB->cRazonSocialProveedor = filter_input(INPUT_POST, "nombre");
            $oRecepcionFB->cFechaDesde = filter_input(INPUT_POST, "fechaDesde");
            $oRecepcionFB->cFechaHasta = filter_input(INPUT_POST, "fechaHasta");
            $oRecepcionDTO->iFacturaDesde = filter_input(INPUT_POST, "facturaDesde");
            $oRecepcionDTO->iFacturaHasta = filter_input(INPUT_POST, "facturaHasta");

            $oRecepcionFB->iRutProveedor = $cRut == "" ? SisDistCONST::ID_FILTRO_TODOS : explode("-", $cRut)[0];
            $oRecepcionFB->iFacturaDesde = $oRecepcionDTO->iFacturaDesde == "" ? SisDistCONST::ID_FILTRO_TODOS : $oRecepcionDTO->iFacturaDesde;
            $oRecepcionFB->iFacturaHasta = $oRecepcionDTO->iFacturaHasta == "" ? SisDistCONST::ID_FILTRO_TODOS : $oRecepcionDTO->iFacturaHasta;

            $oRecepcionNEG = new RecepcionNEG();
            $oRecepcionDTO->recepciones = $oRecepcionNEG->listRecepciones($oRecepcionFB);
            $oRecepcionDTO->idTipoPago = $oRecepcionFB->idTipoPago;
            $oRecepcionDTO->cRutProveedor = $cRut;
            $oRecepcionDTO->cRazonSocialProveedor = $oRecepcionFB->cRazonSocialProveedor;
            $oRecepcionDTO->cFechaDesde = $oRecepcionFB->cFechaDesde;
            $oRecepcionDTO->cFechaHasta = $oRecepcionFB->cFechaHasta;
        }
        
        return $oRecepcionDTO;
    }
    
    /**
     * Vista Stock/recepcionProductos/recepcionProductos.php
     */
    public function recepcionProductos() {
        require_once __DIR__ . '/../Negocio/GeneralNEG.php';
        require_once __DIR__ . '/../Negocio/EmpresaNEG.php';
        
        $oRecepcionDTO = new RecepcionDTO();
        $oTipoDoctoNEG = new TipoDoctoNEG($this->cRutaRelativa);
        $oEmpresaNEG = new EmpresaNEG($this->cRutaRelativa);
        
        $oRecepcionDTO->listTipoDoctoCompraSI = $oTipoDoctoNEG->listTipoDoctoCompraSI(false);
        $oRecepcionDTO->listEmpresaSI = $oEmpresaNEG->listEmpresaSI();
        
        return $oRecepcionDTO;
    }
    
    public function obtRecepcion() {
        $idRecepcion = filter_input(INPUT_GET, "idRecepcion");
        
        $oRecepcionNEG = new RecepcionNEG();
        $oRecepcionNDTO = $oRecepcionNEG->obtRecepcion($idRecepcion, TRUE);
        
        return $oRecepcionNDTO;
    }
    
    public function ajaxCrearNotaCreditoCompra() {
        require_once __DIR__ . '/../Negocio/NotaCreditoCompraNEG.php';
        
        $idRecepcion = filter_input(INPUT_POST, "idRecepcion");
        
        $oRecepcionNEG = new RecepcionNEG();
        $oRecepcionNDTO = $oRecepcionNEG->obtRecepcion($idRecepcion, TRUE);
        
        //$oProductoRecepcionNDTO = new ProductoRecepcionNDTO();
        $listProductoRecepcionNDTO = $oRecepcionNDTO->listProductoRecepcionNDTO;
        $i = 0;
        $listProdNCCompra = Array();
        foreach($listProductoRecepcionNDTO as $oProductoRecepcionNDTO) {
            $oProducto = $oProductoRecepcionNDTO->oProducto;
            
            $oProdNCCompra = new ProdNotaCreditoCompra();
            $oProdNCCompra->id_nc_compra = 0;
            $oProdNCCompra->id_producto = $oProducto->id_producto;
            $oProdNCCompra->cantidad = filter_input(INPUT_POST, "txtCantProducto-$oProducto->id_producto");
            $oProdNCCompra->precio = filter_input(INPUT_POST, "txtPrecioProducto-$oProducto->id_producto");
            
            $listProdNCCompra[$i] = $oProdNCCompra;
        }
        
        NotaCreditoCompraNEG::crearNotaCreditoCompra($oRecepcionNDTO, $listProdNCCompra);
    }
}

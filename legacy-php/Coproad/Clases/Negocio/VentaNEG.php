<?php
require_once __DIR__ . "/../Conexion/Conexion.php";
require_once __DIR__ . "/../DAO/VentaDAO.php";
require_once __DIR__ . "/../DAO/PedidoDAO.php";

/**
 * Description of VentaNEG
 *
 * @author christian
 */
class VentaNEG {
    
    private $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;

        require_once __DIR__ . '/../../Coneccion/coneccion.php';
        require_once __DIR__ . '/../Constantes/TipoDoctoCONST.php';
        require_once __DIR__ . '/../Constantes/EstadoCONST.php';
        require_once __DIR__ . '/../NegDTO/VentaNDTO.php';
        require_once __DIR__ . '/../NegDTO/NDTO.php';
        require_once __DIR__ . "/../DAO/TipoDoctoDAO.php";
        require_once __DIR__ . '/../DAO/EmpresaDAO.php';
        require_once __DIR__ . '/../DAO/ClienteDAO.php';
        require_once __DIR__ . '/../DAO/LocalClienteDAO.php';
        require_once __DIR__ . '/../DAO/NotaCreditoDAO.php';
        require_once __DIR__ . '/../POJO/Venta.php';
        require_once __DIR__ . '/../POJO/LocalCliente.php';
        require_once __DIR__ . '/../POJO/RegListVenta.php';
    }
    // </editor-fold>
    
    
    /**
     * Crea lista de VentaNDTO según lista de Venta
     * 
     * @param Array Venta $listVentas
     * @return Array VentaNDTO
     */
    protected function crearListVentaNDTO($oPDO, $listVentas) {
        $oTipoDoctoDAO = new TipoDoctoDAO($this->cRutaRelativa);
        $oEmpresaDAO = new EmpresaDAO($this->cRutaRelativa);
        
        $i = 0;
        $listVentaNDTO = Array();
        foreach($listVentas as $oVenta) {
            $oVentaNDTO = new VentaNDTO();
            $oVentaNDTO->oVenta = $oVenta;
            $oVentaNDTO->oTipoDocto = $oTipoDoctoDAO->obtTipoDocto($oPDO, $oVenta->id_tipo_docto_emitido);
            $oVentaNDTO->oEmpresa = $oEmpresaDAO->obtEmpresa($oPDO, $oVenta->rut_empresa);
            $oVentaNDTO->oCliente = ClienteDAO::obtCliente($oPDO, $oVenta->rut_cliente);
            //$oVentaNDTO->oLocalCliente = LocalClienteDAO::obtLocalCliente($oPDO, $oVenta->id_local_cliente);
            $oVentaNDTO->iMontoTotalNC = NotaCreditoDAO::obtMontoTotalNotaCredito($oPDO, $oVenta->id_venta);
            
            $listVentaNDTO[$i] = $oVentaNDTO;
            $i++;
        }
        
        return $listVentaNDTO;
    }
        
    
    /**
     * Devuelve Venta según ID
     * 
     * VentaNDTO { Venta, Estado }
     * 
     * @param int $idVenta
     * @return VentaNDTO
     */
    public function obtVenta($idVenta) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oVentaNDTO = new VentaNDTO();

        $oEmpresaDAO = new EmpresaDAO($this->cRutaRelativa);
        //$oVentaDAO = new VentaDAO($this->cRutaRelativa);
        $oVenta = VentaDAO::obtVenta($oPDO, $idVenta);

        if ($oVenta != null) {
            include_once $this->cRutaRelativa . "Clases/DAO/EstadoDAO.php";

            $oVentaNDTO->oVenta = $oVenta;
            $oVentaNDTO->oEstado = EstadoDAO::obtEstado($oPDO, $oVenta->id_estado);
            $oVentaNDTO->oEmpresa = $oEmpresaDAO->obtEmpresa($oPDO, $oVenta->rut_empresa);
        }

        return $oVentaNDTO;
    }
    

    public function calcPrecioProducto($pp) {
        require_once $this->cRutaRelativa . "Clases/DAO/ImpuestoDAO.php";
        require_once $this->cRutaRelativa . 'Clases/Constantes/ImpuestoCONST.php';
                
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $impuestoDAO = new ImpuestoDAO($this->cRutaRelativa);
        $iva = $impuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::IVA);
        $iaba = $impuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::IABA);
        $espec = $impuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::ESPEC);
        
        $pp->impIaba = 0;
        $pp->impEspec = 0;
        $pp->iva = $pp->precioNeto * $iva / 100;
                 
        if($pp->impuesto == ImpuestoCONST::IABA) {
            $pp->impIaba = $pp->precioNeto * $iaba / 100;
            
        } else if($pp->impuesto == ImpuestoCONST::ESPEC) {
            $pp->impEspec = $pp->precioNeto * $espec / 100;
        }
                
        $pp->precioVenta = $pp->precioNeto + $pp->iva + $pp->impIaba + $pp->impEspec;
        $pp->precioVentaFinal = $pp->precioVenta - ($pp->precioVenta * $pp->porcenDesc / 100);
        
        return $pp;
    }
    
    
    public function obtProductoVenta($idVenta, $idProducto) {
        require_once $this->cRutaRelativa . "Clases/DAO/ProductoVentaDAO.php";
        
        $db = conectarse();
        
        $producto = ProductoVentaDAO::obtProductoVenta($db, $idVenta, $idProducto);
        
        return $producto;
    }
    
    
    /**
     * Anula Venta
     * 
     * @param int $idVenta
     * @param int $idUsuario
     * @return int
     */
    public function anularVenta($idVenta, $idUsuario) {
        require_once $this->cRutaRelativa . "Clases/Dominio/StockDOM.php";
        require_once $this->cRutaRelativa . 'Clases/Dominio/ProductoVentaDOM.php';
        require_once $this->cRutaRelativa . 'Clases/Constantes/VentaCONST.php';
        
        $oNDTO = new NDTO();
        //$oVentaDAO = new VentaDAO($this->cRutaRelativa);
        $oConexion = new Conexion();
        
        $oPDO = $oConexion->abrirConexion();
        $oVenta = VentaDAO::obtVenta($oPDO, $idVenta);
        $oPedido = PedidoDAO::obtPedido($oPDO, $oVenta->id_pedido);
        
        //if($oVenta->entregado == VentaCONST::ENTREGADO) {
        //    $oNDTO->bExito = false;
        //    $oNDTO->cMensaje = "La Venta no puede ser anulada porque ya fue entregada";
        //} else {
            $oVenta->id_estado = EstadoCONST::ANULADO;
            $oVenta->id_usuario = $idUsuario;
            $oPedido->id_estado = EstadoCONST::ACTIVO;
            
            $oPDO->beginTransaction();
            VentaDAO::modVenta($oPDO, $oVenta);
            PedidoDAO::modPedido($oPDO, $oPedido);
            ProductoVentaDOM::restituirStock($oPDO, $idVenta);
            $oPDO->commit();
        //}
        
        return $oNDTO;
    }
    
    
    /**
     * Elimina Venta
     * 
     * @param int $idVenta
     * @param int $idUsuario
     * @return int
     */
    public function eliminarVenta($idVenta, $idUsuario) {
        require_once $this->cRutaRelativa . "Clases/Dominio/StockDOM.php";
        require_once $this->cRutaRelativa . 'Clases/Dominio/ProductoVentaDOM.php';
        require_once $this->cRutaRelativa . 'Clases/Constantes/VentaCONST.php';
        
        $oNDTO = new NDTO();
        //$oVentaDAO = new VentaDAO($this->cRutaRelativa);
        $oConexion = new Conexion();
        
        $oPDO = $oConexion->abrirConexion();
        $oVenta = VentaDAO::obtVenta($oPDO, $idVenta);
        $oPedido = PedidoDAO::obtPedido($oPDO, $oVenta->id_pedido);
        
        //if($oVenta->entregado == VentaCONST::ENTREGADO) {
        //    $oNDTO->bExito = false;
        //    $oNDTO->cMensaje = "La Venta no puede ser anulada porque ya fue entregada";
        //} else {
            $oVenta->id_estado = EstadoCONST::INACTIVO;
            $oVenta->id_usuario = $idUsuario;
            $oPedido->id_estado = EstadoCONST::ACTIVO;
            
            $oPDO->beginTransaction();
            VentaDAO::modVenta($oPDO, $oVenta);
            PedidoDAO::modPedido($oPDO, $oPedido);
            ProductoVentaDOM::restituirStock($oPDO, $idVenta);
            $oPDO->commit();
        //}
        
        return $oNDTO;
    }
    
    
    /**
     * Devuelve las Ventas de una fecha y ruta específicas.
     * 
     * EstadoEntregaChoferNDTO { Venta, FormaPago, Cliente }
     * 
     * @param type $idRuta
     * @param type $fechaVenta
     * @return Array EstadoEntregaChoferNDTO
     */
    public function listVentasXRutaFecha($idRuta, $fechaVenta) {
        require_once $this->cRutaRelativa . "Clases/DAO/RutaLocalClienteDAO.php";
        require_once $this->cRutaRelativa . "Clases/DAO/ClienteDAO.php";
        require_once $this->cRutaRelativa . "Clases/DAO/TipoDoctoDAO.php";
        require_once $this->cRutaRelativa . "Clases/NegDTO/EstadoEntregaChoferNDTO.php";
        
        $db = conectarse();
        $conexion = new Conexion();
        $db2 = $conexion->abrirConexion();
        
        $rutaLocalClienteDAO = new RutaLocalClienteDAO($this->cRutaRelativa);
        $rutas = $rutaLocalClienteDAO->listRutaLocalCliente($db, $idRuta);
        
        $i = 0;
        $estEntChoferNDTOs = Array();
        $ventaDAO = new VentaDAO($this->cRutaRelativa);
        $tipoDoctoDAO = new TipoDoctoDAO($this->cRutaRelativa);
        $clienteDAO = new ClienteDAO($this->cRutaRelativa);
        
        foreach($rutas as $rutaLocalCliente) {
            $ventasLocalFecha = $ventaDAO->listVentasXLocalFecha($db2, $rutaLocalCliente->getIdLocalCliente(), $fechaVenta);
                    
            foreach($ventasLocalFecha as $ventaLocalFecha) {
                $estEntChoferNDTO = new EstadoEntregaChoferNDTO();
                $estEntChoferNDTO->venta = $ventaLocalFecha;
                $estEntChoferNDTO->formaPago = $tipoDoctoDAO->obtTipoDocto($db2, $ventaLocalFecha->id_forma_pago);
                $estEntChoferNDTO->cliente = $clienteDAO->obtCliente($db2, $ventaLocalFecha->rut_cliente);;
                
                $estEntChoferNDTOs[$i] = $estEntChoferNDTO;
                $i++;
            }
        }
        
        return $estEntChoferNDTOs;
    }
    
    
    public function listProductosDevolucion($idVenta) {
        require_once $this->cRutaRelativa . "Clases/DAO/ProductoDevolucionDAO.php";
        require_once $this->cRutaRelativa . "Clases/NegDTO/ProductoDevolucionNDTO.php";
        require_once $this->cRutaRelativa . "Clases/TipoProducto.php";
        require_once $this->cRutaRelativa . "Clases/Producto.php";
        require_once $this->cRutaRelativa . "Clases/POJO/PrecioProducto.php";
        
        $db = conectarse();
        $conexion = new Conexion();
        $db2 = $conexion->abrirConexion();
        
        $productoVentaDAO = new ProductoDevolucionDAO($this->cRutaRelativa);
        $productos = $productoVentaDAO->listProductosDevolucion($db2, $idVenta);
        
        $i = 0;
        $precioTotal = 0;
        $prodDevNDTOs = Array();
        foreach($productos as $devolucion) {
            $producto = new Producto($devolucion->id_producto);
            $prodVenta = $this->obtProductoVenta($idVenta, $devolucion->id_producto);
                    
            $precioProducto = new PrecioProducto();
            $precioProducto->idProducto = $devolucion->id_producto;
            $precioProducto->impuesto   = $producto->getImpuesto();
            $precioProducto->precioNeto = $prodVenta->getPrecio();
            $precioProducto->porcenDesc = $prodVenta->getPorcenDesc();
                    
            $precioProducto = $this->calcPrecioProducto($precioProducto);
            
            $precioTotal += $precioProducto->precioVentaFinal * $devolucion->cantidad;
            
            $prodDevNDTOs[$i] = new ProductoDevolucionNDTO();
            $prodDevNDTOs[$i]->producto = $producto;
            $prodDevNDTOs[$i]->productoDevolucion = $devolucion;
            $prodDevNDTOs[$i]->precioProducto = $precioProducto;
            $prodDevNDTOs[$i]->productoVenta = $prodVenta;
            $i++;
        }
        
        return $prodDevNDTOs;
    }
    
    
    /**
     * Ingresa estado entrega de chofer para venta determinada.
     * 
     * @param int $idVenta
     * @param int $idFormaPago
     * @param Array $productos
     * @param Usuario $usuario
     * 
     * @return Array respuesta JSON
     */
    public function ingEntregaChofer($idVenta, $idFormaPago, $productos, $usuario) {
        require_once $this->cRutaRelativa . "Clases/DAO/ProductoDevolucionDAO.php";

        $conexion = new Conexion();
        $db = $conexion->abrirConexion();
        
        $ingEntChoferNDTO = new NDTO();
        $productoDevolucionDAO = new ProductoDevolucionDAO($this->cRutaRelativa);

        // Se ingresan devoluciones de productos
        foreach($productos as $producto) {
            $pd = new ProductoDevolucion();
            $pd->id_venta             = $idVenta;
            $pd->id_producto          = $producto["idProducto"];
            $pd->id_motivo_devolucion = $producto["motivoDevolucion"];
            $pd->cantidad             = $producto["cantidad"];
            $pd->id_usuario           = $usuario->getIdUsuario();
            
            $productoDevolucionDAO->ingProductoDevolucion($db, $pd);
        }

        // Se modifica forma de pago según información de vendedor
        $ventaDAO = new VentaDAO($this->cRutaRelativa);
        
        $ventaDAO->entregaChofer($db, $idVenta, $idFormaPago, $usuario->getIdUsuario());
            
        $ingEntChoferNDTO->exito = true;
        $ingEntChoferNDTO->mensaje = "Entrega confirmada con éxito.";
        
        return $ingEntChoferNDTO;
    }
    
    
    /**
     * Marca una venta como factura electronica, además de guardar el valor de la url de descarga del PDF
     * 
     * @param int $idVenta
     * @param int $idFolio
     * @param Usuario $oUsuario
     * @return VentaNDTO { oVenta }
     */
    public function marcarComoFacturaElectronica($idVenta, $idFolio, $oUsuario) {
        require_once __DIR__ . '/../Constantes/FacturacionCLCONST.php';
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        //$oVentaDAO = new VentaDAO($this->cRutaRelativa);
        $oEmpresaDAO = new EmpresaDAO($this->cRutaRelativa);
        $oVenta = VentaDAO::obtVenta($oPDO, $idVenta);
        $oEmpresa = $oEmpresaDAO->obtEmpresa($oPDO, $oVenta->rut_empresa);
        
        $oFacElecCLWS = new FacturacionClWS($this->cRutaRelativa);
        
        if(empty($oVenta->url_PDF_original)) {
            $oFacElecCLWSDTO_PDFOri = 
                    $oFacElecCLWS->obtLinkDoctoElectronico(
                            $oEmpresa->obtRutCompleto(),
                            $idFolio, 
                            FacturacionClWS::C_TIPO_MOV_VENTA, 
                            FacturacionCLCONST::TIPO_DOCTO_FACTURA_ELECTRONICA,
                            false);
            if (!$oFacElecCLWSDTO_PDFOri->bExito) {
                //Segundo intento
                $oFacElecCLWSDTO_PDFOri = 
                        $oFacElecCLWS->obtLinkDoctoElectronico(
                                $oEmpresa->obtRutCompleto(),
                                $idFolio, 
                                FacturacionClWS::C_TIPO_MOV_VENTA, 
                                FacturacionCLCONST::TIPO_DOCTO_FACTURA_ELECTRONICA,
                                false);
            }
            if($oFacElecCLWSDTO_PDFOri->bExito) {
                $oVenta->url_PDF_original = $oFacElecCLWSDTO_PDFOri->cMensaje;
            }
        }
        
        if(empty($oVenta->url_PDF_cedible)) {
            $oFacElecCLWSDTO_PDFCed = 
                    $oFacElecCLWS->obtLinkDoctoElectronico(
                            $oEmpresa->obtRutCompleto(),
                            $idFolio, 
                            FacturacionClWS::C_TIPO_MOV_VENTA, 
                            FacturacionCLCONST::TIPO_DOCTO_FACTURA_ELECTRONICA,
                            true);
            if (!$oFacElecCLWSDTO_PDFCed->bExito) {
                //Segundo intento
                $oFacElecCLWSDTO_PDFCed = 
                        $oFacElecCLWS->obtLinkDoctoElectronico(
                                $oEmpresa->obtRutCompleto(),
                                $idFolio, 
                                FacturacionClWS::C_TIPO_MOV_VENTA, 
                                FacturacionCLCONST::TIPO_DOCTO_FACTURA_ELECTRONICA,
                                true);
            }
            if($oFacElecCLWSDTO_PDFCed->bExito) {
                $oVenta->url_PDF_cedible = $oFacElecCLWSDTO_PDFCed->cMensaje;
            }
            
        }
            
        $oVenta->id_folio = $idFolio;
        $oVenta->num_docto_emitido = $idFolio;
        $oVenta->id_tipo_docto_emitido = TipoDoctoCONST::FACTURA_ELECTRONICA;
        $oVenta->id_usuario_mod = $oUsuario->getIdUsuario();
        
        VentaDAO::modVenta($oPDO, $oVenta);
            
        $oVentaNDTO = new VentaNDTO();
        $oVentaNDTO->oVenta = $oVenta;
        
        return $oVentaNDTO;
    }
    
    
    /**
     * Retorna lista ventas
     * 
     * @param VentaFB $oVentaFB
     * @return Array VentaNDTO
     */
    public function listVentas($oVentaFB) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $listVentas = VentaDAO::listVentas($oPDO, $oVentaFB);
        //$listVentaNDTO = $this->crearListVentaNDTO($oPDO, $listVentas);
        
        return $listVentas;
    }

     /**
     * Retorna lista ventas
     * 
     * @param VentaFB $oVentaFB
     * @return Array VentaNDTO
     */
    public static function listVentasS($oVentaFB) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $listVentas = VentaDAO::listVentas($oPDO, $oVentaFB);
        //$listVentaNDTO = $this->crearListVentaNDTO($oPDO, $listVentas);
        
        return $listVentas;
    }
    
    /**
     * Retorna lista ventas
     * 
     * @param VentaFB $oVentaFB
     * @return Array VentaNDTO
     */
    public static function totalesVentas($oVentaFB) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $totalesVentas = VentaDAO::obtTotalesVenta($oPDO, $oVentaFB);
        //$listVentaNDTO = $this->crearListVentaNDTO($oPDO, $listVentas);
        
        return $totalesVentas;
    }
    
    
    /**
     * Retorna lista de Ventas en Libro CV Facturacion.cl
     * 
     * @param string $cPeriodo
     * @param int $iRutEmpresa
     * @return Array VentaNDTO
     */
    public function listVentasEnLibroCV($cPeriodo, $iRutEmpresa) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oVentaDAO = new VentaDAO($this->cRutaRelativa);
        $listVentas = $oVentaDAO->listVentasEnLibroCV($oPDO, $cPeriodo, $iRutEmpresa);
        $listVentaNDTO = $this->crearListVentaNDTO($oPDO, $listVentas);
        
        return $listVentaNDTO;
    }
    
    
    /**
     * Crea resumen de Ventas desde listado
     * 
     * @param Array VentaNDTO $listVentaNDTO
     * @return ResumenDoctosNDTO
     */
    public function crearResumenVentas($listVentaNDTO) {
        require_once $this->cRutaRelativa . 'Clases/NegDTO/ResumenDoctosNDTO.php';
        
        $oResumenVentaNDTO = new ResumenDoctosNDTO();
        foreach($listVentaNDTO as $oVentaNDTO) {
            $oVenta = $oVentaNDTO->oVenta;
            $oResumenVentaNDTO->iTotalIVA += $oVenta->iva;
            $oResumenVentaNDTO->iTotalNeto += $oVenta->sub_total;
            $oResumenVentaNDTO->iPrecioTotal += $oVenta->precio_total;
            $oResumenVentaNDTO->iTotalDoctos++;
        }
        
        return $oResumenVentaNDTO;
    }
    
    
    /**
     * Marca Ventas como subidas al LibroCV
     * 
     * @param string $cFechaDesde
     * @param string $cFechaHasta
     * @param int $iRutEmpresa
     * @param string $cPeriodo
     * @return boolean
     */
    public function marcarVentasEnLibroCV($cFechaDesde, $cFechaHasta, $iRutEmpresa, $cPeriodo) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oVentaDAO = new VentaDAO($this->cRutaRelativa);
        $oVentaDAO->marcarVentasEnLibroCV($oPDO, $cFechaDesde, $cFechaHasta, $iRutEmpresa, $cPeriodo);
        
        return true;
    }
    
    
    /**
     * Desmarca Venta como subida al LibroCV
     * 
     * @param int $idVenta
     * @return boolean
     */
    public function desmarcarVentaEnLibroCV($idVenta, $idUsuario) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oVentaDAO = new VentaDAO($this->cRutaRelativa);
        $oVentaDAO->desmarcarVentaEnLibroCV($oPDO, $idVenta, $idUsuario);
        
        return true;
    }
    
    
    
    public function obtNuevoFolio($iRutEmpresa) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        return VentaDAO::obtNuevoFolio($oPDO, $iRutEmpresa);
    }
    
    
    /**
     * Ingresa una venta
     * 
     * @param Venta $oVenta
     * @param Array<ProductoVenta> $listProductoVenta
     * @return NDTO
     */
    public function ingVenta($oVenta, $listProductoVenta) {
        require_once __DIR__ . '/../Constantes/ImpuestoCONST.php';
        require_once __DIR__ . '/../Dominio/ProductoVentaDOM.php';
        require_once __DIR__ . '/../Dominio/VentaDOM.php';
        require_once __DIR__ . '/../DAO/ImpuestoDAO.php';
        require_once __DIR__ . '/../DAO/ProductoDAO.php';
        require_once __DIR__ . '/../DAO/ClienteDAO.php';
        require_once __DIR__ . '/../DAO/ProductoVentaDAO.php';
        require_once __DIR__ . '/../POJO/Producto.php';
        require_once __DIR__ . '/../Util/FechaUtil.php';
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        $oVentaAux = VentaDOM::obtVentaXNumDocto($oPDO, TipoDoctoCONST::FACTURA, $oVenta->num_docto_emitido, $oVenta->rut_empresa);
        
        $oNDTO = new NDTO();
        if(empty($oVenta->num_docto_emitido)) {
            $oNDTO->bExito = false;
            $oNDTO->cMensaje = "Debe asignar un Número de Factura.";
            
            return $oNDTO;
        } else if($oVentaAux != null) {
            $oNDTO->bExito = false;
            $oNDTO->cMensaje = "El Número de Factura ya existe.";
            
            return $oNDTO;
        }
        
        $oImpuestoDAO = new ImpuestoDAO($this->cRutaRelativa);
        $oImpIVA = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::IVA);
        $oImpESPEC = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::ESPEC);
        
        $iMontoNetoTotal = 0;
        $iMontoILA = 0;
        $iMontoESPEC = 0;
        
        foreach($listProductoVenta as $oProductoVenta) {
            //$iSubTotal = $oProductoVenta->obtSubtotal();
            //$iMontoDescuento = $oProductoVenta->obtMontoDescSubTotal();
            $iSubTotal = $oProductoVenta->obtSubTotalConDesc(); // -= $iMontoDescuento;
            $iMontoNetoTotal += $iSubTotal;
            
            $oProducto = ProductoDAO::obtProducto($oPDO, $oProductoVenta->id_producto);
            if($oProducto->impuesto == ImpuestoCONST::ESPEC) {
                $iMontoESPEC += round($iSubTotal * $oImpESPEC->valor / 100);
            // Se debe mejorar esta condición en el caso de que se agreguen mas impuestos. 
            // Se deja de esta forma por haber mas de 1 valor para ILA.
            } else if($oProducto->impuesto > 0) {
                $oImpILA = $oImpuestoDAO->obtImpuesto($oPDO, $oProducto->impuesto);
                $iMontoILA += round($iSubTotal * $oImpILA->valor / 100);
            }
        }
        
        $oPedido = null;
        if(empty($oVenta->id_pedido)) {
            $oVenta->id_pedido = 0;
        } else {
            $oPedido = PedidoDAO::obtPedido($oPDO, $oVenta->id_pedido);
            $oVenta->id_local_cliente = $oPedido->id_local_cliente;
            $oVenta->id_usuario_venta = $oPedido->id_usuario;
        }
        $oLocalCliente = LocalClienteDAO::obtener($oPDO, $oVenta->id_local_cliente);
        $oCliente = ClienteDAO::obtCliente($oPDO, $oLocalCliente->rut_cliente);
        $oVenta->rut_cliente = $oCliente->rut_cliente;
        $oVenta->id_lista_precio = $oCliente->id_lista_precio;
        $oVenta->id_forma_pago = $oLocalCliente->id_forma_pago;
        $oVenta->fecha_venta = FechaUtil::deFechaJQueryABD($oVenta->fecha_venta);
        $oVenta->id_tipo_docto_emitido = TipoDoctoCONST::FACTURA;
        $oVenta->id_estado = EstadoCONST::FINALIZADO;
        $oVenta->iva = round($iMontoNetoTotal * $oImpIVA->valor / 100);
        $oVenta->espec = $iMontoESPEC;
        $oVenta->iaba = $iMontoILA;
        $oVenta->sub_total = $iMontoNetoTotal;
        $oVenta->precio_total = $iMontoNetoTotal + $iMontoESPEC + $iMontoILA + $oVenta->iva;
        
        $idVenta = VentaDAO::ingVenta($oPDO, $oVenta);
        foreach($listProductoVenta as $oProductoVenta) {
            $oProductoVenta->id_venta = $idVenta;
            $oProductoVenta->precio_neto = 0;
            ProductoVentaDAO::ingProductoVenta($oPDO, $oProductoVenta);
        }
        
        if($oPedido != null) {
            $oPedido->id_estado = EstadoCONST::FINALIZADO;
            $idPedido = PedidoDAO::modPedido($oPDO, $oPedido);
        }
        
        // 20160901 Se solicito que las ventas a empresas internas no descuenten Stock
        $oEmpresaDAO = new EmpresaDAO($this->cRutaRelativa);
        $oEmpresa = $oEmpresaDAO->obtEmpresa($oPDO, $oVenta->rut_cliente);
        if($oEmpresa == null) {
            ProductoVentaDOM::reducirStock($oPDO, $idVenta);
        }
        
        $oNDTO->cMensaje = "Venta realizada con éxito.";
        
        return $oNDTO;
    }
}
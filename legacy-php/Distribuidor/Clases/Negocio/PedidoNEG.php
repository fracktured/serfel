<?php
require_once __DIR__.'/../Constantes/EstadoCONST.php';
require_once __DIR__.'/../Conexion/Conexion.php';
require_once __DIR__.'/../POJO/Ruta.php';
require_once __DIR__.'/../POJO/RegTotalesVenta.php';
require_once __DIR__.'/../FiltroBusqueda/PedidoFB.php';
require_once __DIR__.'/../FiltroBusqueda/VentaFB.php';
require_once __DIR__.'/../DAO/PedidoDAO.php';
require_once __DIR__.'/../DAO/ProductoPedidoDAO.php';
require_once __DIR__.'/../DAO/LocalClienteDAO.php';
require_once __DIR__.'/../DAO/ClienteDAO.php';
require_once __DIR__.'/../DAO/VentaDAO.php';
require_once __DIR__.'/../DAO/ProductoPedidoDAO.php';
require_once __DIR__.'/../DTO/ListPedidoDTO.php';
require_once __DIR__.'/../DTO/PedidoDTO.php';

/**
 * Description of PedidoNEG
 *
 * @author ccastro
 */
class PedidoNEG {

    /**
     * Retorna lista de Pedido
     * ListPedidoDTO { 
     *     listPedidoDTO, oPedidoFB
     * }
     * 
     * @param PedidoFB $oPedidoFB
     * @return ListaPedidoDTO
     */
    public static function listPedidos($oPedidoFB) {
        $oListPedidoDTO = new ListPedidoDTO();
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oListPedidoDTO->oPedidoFB = $oPedidoFB;
        $listPedidos = PedidoDAO::listPedidos($oPDO, $oPedidoFB);
        
        // No se encontraron resultados
        if ( empty($listPedidos) ) {
            $oListPedidoDTO->cMensaje = "No se encontraron registros";
        } else {
            $oListPedidoDTO->bExito = TRUE;
            
            $listPedidoDTO = Array();
            $i = 0;
            foreach ( $listPedidos as $oPedido ) {
                // Si se encuentra venta asociada, pedido no se lista
                if ( !VentaDAO::obtVentaXIDPedido($oPDO, $oPedido->id_pedido) ) {
                    $oPedidoDTO = new PedidoDTO();
                    $oPedidoDTO->bExito = TRUE;
                    $oPedidoDTO->oPedido = $oPedido;
                    $oPedidoDTO->oLocalCliente = LocalClienteDAO::obtener($oPDO, $oPedido->id_local_cliente);
                    $oPedidoDTO->oCliente = ClienteDAO::obtCliente($oPDO, $oPedidoDTO->oLocalCliente->rut_cliente);
                    $listPedidoDTO[$i] = $oPedidoDTO;
                    $i++;
                }
            }
            
            $oListPedidoDTO->listPedidoDTO = $listPedidoDTO;
        }
        
        return $oListPedidoDTO;
    }

    /**
     * Retorna Pedido
     * PedidoDTO { 
     *     oPedido, oCliente, oLocalCliente, listRegListProductoPedido
     * }
     * 
     * @param int $idPedido
     * @return PedidoDTO
     */
    public static function obtPedido($idPedido) {
        $oPedidoDTO = new PedidoDTO();
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oPedido = PedidoDAO::obtPedido($oPDO, $idPedido);
        
        // No se encontraron resultados
        if ( empty($oPedido) ) {
            $oListPedidoDTO->cMensaje = "No existe pedido id " . $idPedido;
        } else {
            $oPedidoDTO->bExito = TRUE;
            $oPedidoDTO->oPedido = $oPedido;
            $oPedidoDTO->oLocalCliente = LocalClienteDAO::obtener($oPDO, $oPedido->id_local_cliente);
            $oPedidoDTO->oCliente = ClienteDAO::obtCliente($oPDO, $oPedidoDTO->oLocalCliente->rut_cliente);
            $oPedidoDTO->listRegListProductoPedido = ProductoPedidoDAO::listProductoPedidoComoRegListProductoPedido($oPDO, $idPedido);
        }
        
        return $oPedidoDTO;
    }

    /**
     * Retorna Pedido
     * PedidoDTO { 
     *     pedido, locales, RegListProductoPedido
     * }
     * 
     * @param int $idPedido
     * @return PedidoDTO
     */
    public static function findOrder($idPedido) {
        $oPedidoDTO = new PedidoDTO();
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oPedido = PedidoDAO::obtPedido($oPDO, $idPedido);
        
        // No se encontraron resultados
        if ( empty($oPedido) ) {
            $oListPedidoDTO->cMensaje = "No existe pedido id " . $idPedido;
        } else {
            $oPedidoDTO->bExito = TRUE;
            $oPedidoDTO->oPedido = $oPedido;
            $oPedidoDTO->oLocalCliente = LocalClienteDAO::get($oPDO, $oPedido->id_local_cliente);
            $oPedidoDTO->listRegListProductoPedido = ProductoPedidoDAO::listProductoPedidoComoRegListProductoPedido($oPDO, $idPedido);
        }
        
        return $oPedidoDTO;
    }

    /**
     * Crea Pedido
     * 
     * @param Pedido $oPedido
     * @param Array $listProductos
     * @return PedidoDTO
     */
    public static function crearPedido($oPedido, $listProductos) {
        setlocale(LC_MONETARY, 'es_CL.UTF-8');

        $oPedidoDTO = new PedidoDTO();
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        try {
            $oLocalCliente = LocalClienteDAO::obtener($oPDO, $oPedido->id_local_cliente);
            //$oCliente = ClienteDAO::obtCliente($oPDO, $oLocalCliente->rut_cliente);
            $oPedido->id_forma_pago = $oLocalCliente->id_forma_pago;

            /*
            if ( !$oLocalCliente->permite_venta_tope_mensual && $oLocalCliente->tope_venta > 0 ) {
                $oVentaFB = new VentaFB();
                $oVentaFB->idLocalCliente = $oPedido->id_local_cliente;
                $oVentaFB->cFechaDesde = date("Y-m") . "-01";
                $oVentaFB->cFechaHasta = date("Y-m") . "-31";
                $oRegTotalesVenta = VentaDAO::obtTotalesVenta($oPDO, $oVentaFB);
                
                $iMontoVentasMes = $oRegTotalesVenta->sum_precio_total + $oPedido->precio_total;
                if ( $iMontoVentasMes > $oLocalCliente->tope_venta  ) {
                    //TODO: Cambiar variable por money_format()
                    $iDiferenciaSobreTope = $iMontoVentasMes - $oLocalCliente->tope_venta;
                    $oPedidoDTO->cMensaje = "No es posible crear pedido. Local supera tope mensual de ventas en " . money_format('%.0n', $iDiferenciaSobreTope);
                }
            //} else if ( ! $oCliente->permite_venta_deuda ) {
                // TODO: Buscar ultima venta y verificar si esta pagada
            //    $oPedidoDTO->cMensaje = "No es posible realizar pedido. Cliente presenta factura impaga.";
            } else {*/
                $oPDO->beginTransaction();
                $oPedido->id_pedido = PedidoDAO::obtNuevoIdPedido($oPDO);
                $idPedido = PedidoDAO::ingPedido($oPDO, $oPedido);
        
                $i = 1;
                foreach ( $listProductos as $productoPedido ) {
                    $oProductoPedido = (object) $productoPedido;
                    $oProductoPedido->id_pedido = $oPedido->id_pedido;
                    
                    if ( $i == 22 ) {
                        $oPedido->id_pedido = PedidoDAO::obtNuevoIdPedido($oPDO);
                        $idPedido = PedidoDAO::ingPedido($oPDO, $oPedido);
                        $i = 1;
                    }

                    ProductoPedidoDAO::ingProductoPedido($oPDO, $oProductoPedido);
                    $i++;
                }
                $oPDO->commit();
                $oPedidoDTO->oPedido = PedidoDAO::obtPedido($oPDO, $oPedido->id_pedido);
                $oPedidoDTO->bExito = TRUE;
                $oPedidoDTO->cMensaje = "Pedido creado con éxito.";
            //}
            
        } catch (Exception $ex) {
            $oPDO->rollBack();
            $oPedidoDTO->cMensaje = $ex->getMessage();
        }
        
        return $oPedidoDTO;
    }

    /**
     * Modificar Pedido
     * 
     * @param Pedido $oPedido
     * @param Array $listProductos
     * @return PedidoDTO
     */
    public static function modPedido($oPedido, $listProductos) {
        setlocale(LC_MONETARY, 'es_CL.UTF-8');

        $oPedidoDTO = new PedidoDTO();
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        try {
            $oLocalCliente = LocalClienteDAO::obtener($oPDO, $oPedido->id_local_cliente);
            //$oCliente = ClienteDAO::obtCliente($oPDO, $oLocalCliente->rut_cliente);
            $oPedido->id_forma_pago = $oLocalCliente->id_forma_pago;

            /*if ( !$oLocalCliente->permite_venta_tope_mensual && $oLocalCliente->tope_venta > 0 ) {
                $oVentaFB = new VentaFB();
                $oVentaFB->idLocalCliente = $oPedido->id_local_cliente;
                $oVentaFB->cFechaDesde = date("Y-m") . "-01";
                $oVentaFB->cFechaHasta = date("Y-m") . "-31";
                $oRegTotalesVenta = VentaDAO::obtTotalesVenta($oPDO, $oVentaFB);
                
                $iMontoVentasMes = $oRegTotalesVenta->sum_precio_total + $oPedido->precio_total;
                if ( $iMontoVentasMes > $oLocalCliente->tope_venta  ) {
                    //TODO: Cambiar variable por money_format()
                    $iDiferenciaSobreTope = $iMontoVentasMes - $oLocalCliente->tope_venta;
                    $oPedidoDTO->cMensaje = "No es posible modificar pedido. Local supera tope mensual de ventas en " . money_format('%.0n', $iDiferenciaSobreTope);
                }
            //} else if ( ! $oCliente->permite_venta_deuda ) {
                // TODO: Buscar ultima venta y verificar si esta pagada
            //    $oPedidoDTO->cMensaje = "No es posible realizar pedido. Cliente presenta factura impaga.";
            } else {*/
                $oPDO->beginTransaction();
                $oPedido->id_estado = EstadoCONST::ACTIVO;
                PedidoDAO::modPedido($oPDO, $oPedido);
                $idPedido = $oPedido->id_pedido;

                ProductoPedidoDAO::delProductosPedido($oPDO, $idPedido);
        
                foreach ( $listProductos as $productoPedido ) {
                    //TODO: cambiar cantidad
                    $oProductoPedido = (object) $productoPedido;
                    $oProductoPedido->id_pedido = $oPedido->id_pedido;
                    //$oProductoPedido->cantidad = $oProductoPedido->cantidad;
                    //$oProductoPedido->precio = $oProductoPedido->precio_neto;
                    ProductoPedidoDAO::ingProductoPedido($oPDO, $oProductoPedido);
                }
                $oPDO->commit();
                $oPedidoDTO->oPedido = PedidoDAO::obtPedido($oPDO, $oPedido->id_pedido);
                $oPedidoDTO->bExito = TRUE;
                $oPedidoDTO->cMensaje = "Pedido modificado con éxito.";
            //}
            
        } catch (Exception $ex) {
            $oPDO->rollBack();
            $oPedidoDTO->cMensaje = $ex->getMessage();
        }
        
        return $oPedidoDTO;
    }

    /**
     * Eliminar Pedido
     * 
     * @param int $iPedido
     * @param int $idUsuario
     * @return PedidoDTO
     */
     public static function elimPedido($idPedido, $idUsuario) {
        $oPedidoDTO = new PedidoDTO();
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();

        try {
            $oVenta = VentaDAO::obtVentaXIDPedido($oPDO, $idPedido);

            if ( $oVenta ) {
                $oPedidoDTO->cMensaje = "No es posible eliminar pedido porque esta asociado a venta.";
            } else {
                $oPedido = new Pedido();
                $oPedido->id_pedido = $idPedido;
                $oPedido->id_usuario = $idUsuario;

                $oPDO->beginTransaction();
                PedidoDAO::anulaPedido($oPDO, $oPedido);
                $oPDO->commit();
                $oPedidoDTO->bExito = TRUE;
                $oPedidoDTO->cMensaje = "Pedido eliminado con éxito.";
            }
            
        } catch (Exception $ex) {
            $oPDO->rollBack();
            $oPedidoDTO->cMensaje = $ex->getMessage();
        }
        
        return $oPedidoDTO;
    }

}
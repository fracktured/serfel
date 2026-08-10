<?php
require_once __DIR__.'/../Constantes/EstadoCONST.php';
require_once __DIR__.'/../Constantes/EstadoPagoCONST.php';
require_once __DIR__.'/../Constantes/TipoDoctoCONST.php';
require_once __DIR__.'/../Conexion/Conexion.php';
require_once __DIR__.'/../DTO/ListPagoDTO.php';
require_once __DIR__.'/../DAO/VentaDAO.php';
require_once __DIR__.'/../DAO/PagoDAO.php';
require_once __DIR__.'/../DAO/NotaCreditoDAO.php';

/**
 * Description of PagoNEG
 *
 * @author ccastro
 */
class PagoNEG {

    /**
     * Retorna lista de Pago
     * ListPagoDTO { 
     *     listPagoDTO, idVenta
     * }
     * 
     * @param int $idVenta
     * @return ListPagoDTO
     */
    public static function listPago($idVenta) {
        $oListPagoDTO = new ListPagoDTO();
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oVenta = VentaDAO::obtVenta($oPDO, $idVenta);
        $oListPagoDTO->idVenta = $idVenta;
        $oListPagoDTO->numFactura = $oVenta->num_docto_emitido;
        $oListPagoDTO->listPago = PagoDAO::listarXVenta($oPDO, $idVenta);
        
        $oListPagoDTO->iTotalXPagar = $oVenta->precio_total;
        $oListPagoDTO->iTotalXPagar -= NotaCreditoDAO::obtMontoTotalNotaCredito($oPDO, $idVenta);

        if ( empty($oListPagoDTO->listPago) ) {
            $oListPagoDTO->cMensaje = "No se encontraron registros";
        } else {
            $oListPagoDTO->bExito = TRUE;

            foreach ( $oListPagoDTO->listPago as $pago ) {
                $oListPagoDTO->iTotalPagado += $pago->monto;
            }
            $oListPagoDTO->iTotalXPagar -= $oListPagoDTO->iTotalPagado;

        }
        
        return $oListPagoDTO;
    }

    /**
     * Inserta Pago
     * 
     * @param Pago $oPago
     * @return AjaxDTO
     */
    public static function ingPago($oPago) {
        $oListPagoDTO = new ListPagoDTO();
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $aData["bExito"] = FALSE;
        $oListPagoDTO = PagoNEG::listPago($oPago->id_venta);
        if ( $oPago->monto > $oListPagoDTO->iTotalXPagar ) {
            $aData["cMensaje"] = "Monto del pago no puede ser mayor al total por pagar";
        } else {
            $oPDO->beginTransaction();
            $aData["bExito"] = TRUE;

            try {
                $idPago = PagoDAO::ingPago($oPDO, $oPago);

                $oVenta = VentaDAO::obtVenta($oPDO, $oPago->id_venta);
                if ( $oPago->monto == $oListPagoDTO->iTotalXPagar ) {
                    $oVenta->id_estado_pago = EstadoPagoCONST::PAGO_COMPLETO;
                } else {
                    $oVenta->id_estado_pago = EstadoPagoCONST::PAGO_PARCIAL;
                }
                VentaDAO::modVenta($oPDO, $oVenta);
                $oPDO->commit();

                $aData["cMensaje"] = "Pago ingresado";
            } catch (Exception $ex) {
                $oPDO->rollBack();
                $aData["cMensaje"] = $ex->getMessage();
            }
            
        }
        
        return $aData;
    }

    /**
     * Elimina Pago
     * 
     * @param int $idVenta
     * @param int $idPago
     * @return AjaxDTO
     */
    public static function elimPago($idVenta, $idPago) {
        $oListPagoDTO = new ListPagoDTO();
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $aData["bExito"] = FALSE;
        $oPDO->beginTransaction();
        try {
            PagoDAO::elimPago($oPDO, $idPago);
            
            $oListPagoDTO = PagoNEG::listPago($idVenta);
            $oVenta = VentaDAO::obtVenta($oPDO, $idVenta);
            if ( $oListPagoDTO->iTotalPagado == 0 ) {
                $oVenta->id_estado_pago = EstadoPagoCONST::SIN_PAGOS;
            } else {
                $oVenta->id_estado_pago = EstadoPagoCONST::PAGO_PARCIAL;
            }
            VentaDAO::modVenta($oPDO, $oVenta);
            $oPDO->commit();

            $aData["bExito"] = TRUE;
            $aData["cMensaje"] = "Pago eliminado";
        } catch (Exception $ex) {
            $oPDO->rollBack();
            $aData["cMensaje"] = $ex->getMessage();
        }
        
        return $aData;
    }

    /**
     * Paga completas ventas
     * 
     * @param Array int
     * @return AjaxDTO
     */
    public static function pagarCompletas($ventas) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();

        $aData["bExito"] = FALSE;
        foreach ( $ventas as $idVenta ) {
            $oListPagoDTO = PagoNEG::listPago($idVenta);
            $oPago = new Pago();
            $oPago->id_venta = $idVenta;
            $oPago->monto = $oListPagoDTO->iTotalXPagar;
            $oPago->id_forma_pago = TipoDoctoCONST::CONTADO;
            $oPago->observaciones = "Pagada completa";
            $aData = PagoNEG::ingPago($oPago);
        }

        if ( $aData["bExito"] ) {
            $aData["cMensaje"] = "Se pagaron completas " . sizeof($ventas) . " ventas";
        }

        return $aData;
    }


    public static function elimPagoXVenta($idVenta) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();

        $aData["bExito"] = FALSE;
        $oPDO->beginTransaction();
        try {
            $numEliminados = PagoDAO::elimPagoXVenta($oPDO, $idVenta);
            
            $oVenta = VentaDAO::obtVenta($oPDO, $idVenta);
            $oVenta->id_estado_pago = EstadoPagoCONST::SIN_PAGOS;
            VentaDAO::modVenta($oPDO, $oVenta);
            $oPDO->commit();

            $aData["bExito"] = TRUE;
            $aData["cMensaje"] = $numEliminados . " pago(s) eliminado(s)";
        } catch (Exception $ex) {
            $oPDO->rollBack();
            $aData["cMensaje"] = $ex->getMessage();
        }

        return $aData;
    }

}
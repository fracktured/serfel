<?php
require_once __DIR__ . '/../Constantes/SisDistCONST.php';
require_once __DIR__ . '/../Constantes/UsuarioCONST.php';
require_once __DIR__ . '/../Constantes/EstadoPagoCONST.php';
require_once __DIR__ . '/../Negocio/RutaNEG.php';
require_once __DIR__ . '/../Negocio/TipoDoctoNEG.php';
require_once __DIR__ . '/../Negocio/CobranzaNEG.php';
require_once __DIR__ . '/../Negocio/VentaNEG.php';
require_once __DIR__ . '/../DTO/CobranzaDTO.php';
require_once __DIR__ . '/../FiltroBusqueda/VentaFB.php';
require_once __DIR__ . '/../Usuario.php';
require_once __DIR__ . '/../../Reporte/class/tcpdf/tcpdf.php';
require_once __DIR__ . '/../../Reporte/class/PHPJasperXML.inc.php';
require_once __DIR__ . '/../../Coneccion/coneccion.php';
require_once __DIR__ . '/../../Globales/funciones.php';

/**
 * Description of CobranzaCTRL
 *
 * @author ccastro
 */
class CobranzaCTRL {

    /**
     * Controlador de Cobranzas/cobranzas/cobranzas.php
     * 
     * @return CobranzaDTO
     */
    public static function cobranzas() {
        $oCobranzaDTO = new CobranzaDTO();
        $oCobranzaDTO->listRutaSI = RutaNEG::listarSI();

        $oCobranzaDTO->listEstadoPagoSI = Array();
        $oCobranzaDTO->listEstadoPagoSI[0] = new SelectItem(SisDistCONST::ID_FILTRO_TODOS, "TODOS");
        //$oCobranzaDTO->listEstadoPagoSI[1] = new SelectItem(EstadoPagoCONST::SIN_PAGOS, "Sin pagos");
        //$oCobranzaDTO->listEstadoPagoSI[1] = new SelectItem(EstadoPagoCONST::PAGO_PARCIAL, "Pago parcial");
        $oCobranzaDTO->listEstadoPagoSI[1] = new SelectItem(EstadoPagoCONST::PAGO_COMPLETO, "Pago completo");
        $oCobranzaDTO->listEstadoPagoSI[2] = new SelectItem(EstadoPagoCONST::CON_DEUDA, "Con deuda");

        $oCobranzaDTO->listTipoDoctoSI = TipoDoctoNEG::listTipoDoctoFormaPagoSI(true);

        $oVentaFB = new VentaFB();
        if ( filter_input(INPUT_POST, "btnFiltrar") ) {
            $oVentaFB->idRuta = filter_input(INPUT_POST, "cmbRuta");
            $oVentaFB->idEstadoPago = filter_input(INPUT_POST, "cmbEstadoPago");
            $oVentaFB->idTipoDocto = filter_input(INPUT_POST, "cmbTipoDocto");
            $cRut = filter_input(INPUT_POST, "rutCliente");
            $oVentaFB->cRazonSocialCliente = filter_input(INPUT_POST, "nombre");
            $oVentaFB->cFechaDesde = filter_input(INPUT_POST, "fechaDesde");
            $oVentaFB->cFechaHasta = filter_input(INPUT_POST, "fechaHasta");

            if ($cRut == "") {
                $oVentaFB->iRutCliente = SisDistCONST::ID_FILTRO_TODOS;
            } else {
                $oVentaFB->iRutCliente = explode("-", $cRut)[0];
            }

            $oVentaNEG = new VentaNEG("../");
            $oCobranzaDTO->listVenta = $oVentaNEG->listVentas($oVentaFB);
            $oCobranzaDTO->idRuta = $oVentaFB->idRuta;
            $oCobranzaDTO->idEstadoPago = $oVentaFB->idEstadoPago;
            $oCobranzaDTO->idTipoDocto = $oVentaFB->idTipoDocto;
            $oCobranzaDTO->cRutCliente = $cRut;
            $oCobranzaDTO->cRazonSocialCliente = $oVentaFB->cRazonSocialCliente;
            $oCobranzaDTO->cFechaDesde = $oVentaFB->cFechaDesde;
            $oCobranzaDTO->cFechaHasta = $oVentaFB->cFechaHasta;
        } else {
            $oCobranzaDTO->listVenta = Array();
            $oCobranzaDTO->idEstadoPago = SisDistCONST::ID_FILTRO_TODOS;
            $oCobranzaDTO->idTipoDocto = SisDistCONST::ID_FILTRO_TODOS;
        }
        
        return $oCobranzaDTO;
    }

    /**
     * Controlador de Cobranzas/informeCobranzas/informeCobranzas.php
     * 
     * @return VentaDTO
     */
    public static function informeCobranzas() {
        $oCobranzaDTO = new CobranzaDTO();
        $oCobranzaDTO->listRutaSI = RutaNEG::listarSI();

        $oCobranzaDTO->listEstadoPagoSI = Array();
        //$oCobranzaDTO->listEstadoPagoSI[0] = new SelectItem(SisDistCONST::ID_FILTRO_TODOS, "TODOS");
        //$oCobranzaDTO->listEstadoPagoSI[0] = new SelectItem(EstadoPagoCONST::SIN_PAGOS, "Sin pagos");
        //$oCobranzaDTO->listEstadoPagoSI[0] = new SelectItem(EstadoPagoCONST::PAGO_PARCIAL, "Pago parcial");
        $oCobranzaDTO->listEstadoPagoSI[0] = new SelectItem(EstadoPagoCONST::PAGO_COMPLETO, "Pago completo");
        $oCobranzaDTO->listEstadoPagoSI[1] = new SelectItem(EstadoPagoCONST::CON_DEUDA, "Con deuda");

        //$oCobranzaDTO->listTipoDoctoSI = TipoDoctoNEG::listTipoDoctoFormaPagoSI(true);
        
        return $oCobranzaDTO;
    }

}
<?php
require_once __DIR__ . '/../Constantes/UsuarioCONST.php';
require_once __DIR__ . "/../Usuario.php";
require_once __DIR__ . "/../Negocio/PagoNEG.php";
require_once __DIR__ . '/../Negocio/TipoDoctoNEG.php';

/**
 * Description of PagoCTRL
 *
 * @author ccastro
 */
class PagoCTRL {


    /**
     * Controlador de Ajax/Pago/ajaxListPago.php
     *
     * @return jsonData
     */
    public static function ajaxListPago() {
        $aData["bExito"] = FALSE;
        session_start();
        if ( !isset($_SESSION["usuario"])
                || $_SESSION["usuario"]->getIdTipoUsuario() != UsuarioCONST::ADMINISTRADOR ) {
            $aData["cMensaje"] = "Ud no tiene permisos para acceder a este recurso.";
        } else {
            try {
                $idVenta = filter_input(INPUT_POST, "idVenta");
                $aData = PagoNEG::listPago($idVenta);
                $aData->listTipoDoctoSI = TipoDoctoNEG::listTipoDoctoFormaPagoSI(false);
            } catch (Exception $ex) {
                $aData["cMensaje"] = $ex->getMessage();
            }
        }

        return $aData;
    }

    /**
     * Controlador de Ajax/Pago/ajaxIngPago.php
     *
     * @return jsonData
     */
    public static function ajaxIngPago() {
        $aData["bExito"] = FALSE;
        session_start();
        if ( !isset($_SESSION["usuario"])
                || $_SESSION["usuario"]->getIdTipoUsuario() != UsuarioCONST::ADMINISTRADOR ) {
            $aData["cMensaje"] = "Ud no tiene permisos para acceder a este recurso.";
        } else {
            try {
                $oPago = new Pago();
                $oPago->id_venta = filter_input(INPUT_POST, "idVenta");
                $oPago->monto = filter_input(INPUT_POST, "nMonto");
                $oPago->id_forma_pago = filter_input(INPUT_POST, "cmbFormaPago");
                $oPago->observaciones = filter_input(INPUT_POST, "tObservaciones");

                $aData = PagoNEG::ingPago($oPago);
            } catch (Exception $ex) {
                $aData["cMensaje"] = $ex->getMessage();
            }
        }

        return $aData;
    }

    /**
     * Controlador de Ajax/Pago/ajaxElimPago.php
     *
     * @return jsonData
     */
    public static function ajaxElimPago() {
        $aData["bExito"] = FALSE;
        session_start();
        if ( !isset($_SESSION["usuario"])
                || $_SESSION["usuario"]->getIdTipoUsuario() != UsuarioCONST::ADMINISTRADOR ) {
            $aData["cMensaje"] = "Ud no tiene permisos para acceder a este recurso.";
        } else {
            try {
                $idVenta = filter_input(INPUT_POST, "idVenta");
                $idPago = filter_input(INPUT_POST, "idPago");

                $aData = PagoNEG::elimPago($idVenta, $idPago);
            } catch (Exception $ex) {
                $aData["cMensaje"] = $ex->getMessage();
            }
        }

        return $aData;
    }

    /**
     * Controlador de Ajax/Pago/ajaxPagarCompletas.php
     *
     * @return jsonData
     */
    public static function ajaxPagarCompletas() {
        $aData["bExito"] = FALSE;
        session_start();
        if ( !isset($_SESSION["usuario"])
                || $_SESSION["usuario"]->getIdTipoUsuario() != UsuarioCONST::ADMINISTRADOR ) {
            $aData["cMensaje"] = "Ud no tiene permisos para acceder a este recurso.";
        } else {
            try {
                $ventas = filter_input(INPUT_POST, "ventas", FILTER_DEFAULT, FILTER_REQUIRE_ARRAY);
                
                $aData = PagoNEG::pagarCompletas($ventas);
            } catch (Exception $ex) {
                $aData["cMensaje"] = $ex->getMessage();
            }
        }

        return $aData;
    }

    /**
     * Controlador de Ajax/Pago/ajaxEliminarPagos.php
     *
     * @return jsonData
     */
    public static function ajaxEliminarPagos() {
        $aData["bExito"] = FALSE;
        session_start();
        if ( !isset($_SESSION["usuario"])
                || $_SESSION["usuario"]->getIdTipoUsuario() != UsuarioCONST::ADMINISTRADOR ) {
            $aData["cMensaje"] = "Ud no tiene permisos para acceder a este recurso.";
        } else {
            try {
                $idVenta = filter_input(INPUT_POST, "idVenta");
                
                $aData = PagoNEG::elimPagoXVenta($idVenta);
            } catch (Exception $ex) {
                $aData["cMensaje"] = $ex->getMessage();
            }
        }

        return $aData;
    }
}

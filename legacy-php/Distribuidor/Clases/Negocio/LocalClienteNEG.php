<?php
require_once __DIR__ . "/../Conexion/Conexion.php";
require_once __DIR__ . '/../DAO/LocalClienteDAO.php';

/**
 * Description of LocalClienteNEG
 *
 * @author ccastro
 */
class LocalClienteNEG {
    
    /**
     * Retorna LocalCliente por id
     * 
     * @param int $idLocalCliente
     * @return LocalCliente
     */
    public static function obtener($idLocalCliente) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        return LocalClienteDAO::obtener($oPDO, $idLocalCliente);
    }
    
    /**
     * Retorna lista de LocalCliente por rut cliente
     * 
     * @param int $iRutCliente
     * @return LocalCliente[]
     */
    public static function listarPorRut($rutCliente) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $aRut = explode("-", $rutCliente);
        return LocalClienteDAO::listarPorRut($oPDO, $aRut[0]);
    }
    
    /**
     * Retorna lista de LocalCliente por razon social cliente
     * 
     * @param String $cBusqueda
     * @return LocalCliente[]
     */
    public static function listarPorRazonSocialONombre($cBusqueda) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        /*
        $listLocales = [];
        foreach ( explode("%20", $cBusqueda) as $palabra ) {
            $locales = LocalClienteDAO::listarPorRazonSocialONombre($oPDO, "%".$palabra."%");
            $listLocales = array_merge($listLocales, $locales);
        }
        return array_unique($listLocales, SORT_REGULAR);
        */
        return LocalClienteDAO::listarPorRazonSocialONombre($oPDO, explode("%20", $cBusqueda));
    }
}
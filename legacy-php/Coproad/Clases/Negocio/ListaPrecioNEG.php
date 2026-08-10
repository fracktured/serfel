<?php
require_once __DIR__ . "/../Conexion/Conexion.php";
require_once __DIR__ . '/../DAO/ListaPrecioDAO.php';
require_once __DIR__ . '/../POJO/ListaPrecio.php';

/**
 * Description of ListaPrecioNEG
 *
 * @author ccastro
 */
class ListaPrecioNEG {
    
    // public static function obtCliente($iRutCliente) {
    //     $oConexion = new Conexion();
    //     $oPDO = $oConexion->abrirConexion();
        
    //     return ClienteDAO::obtCliente($oPDO, $iRutCliente);
    // }
    
    /**
     * Retorna lista ListaPrecio
     * 
     * @return Array ListaPrecio
     */
    public static function listar() {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        return ListaPrecioDAO::listar($oPDO);
    }
}

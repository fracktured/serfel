<?php
require_once __DIR__ . "/../Conexion/Conexion.php";
require_once __DIR__ . '/../DAO/ClienteDAO.php';
require_once __DIR__ . '/../POJO/Cliente.php';

/**
 * Description of ClienteNEG
 *
 * @author ccastro
 */
class ClienteNEG {
    
    public static function obtCliente($iRutCliente) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        return ClienteDAO::obtCliente($oPDO, $iRutCliente);
    }
    
    public static function reingresarCliente($iRutCliente) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oCliente = ClienteDAO::obtCliente($oPDO, $iRutCliente);
        $oCliente->id_estado = EstadoCONST::ACTIVO;
        $iRutCliente = ClienteDAO::modCliente($oPDO, $oCliente);
        
        return $oCliente;
    }
    
    /**
     * Retorna lista clientes
     * 
     * @param ClienteFB $oClienteFB
     * @return Array RegListCliente
     */
    public static function listar($oClienteFB) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        return ClienteDAO::listar($oPDO, $oClienteFB);
    }
}

<?php

/**
 * Description of NotaCreditoCompraNEG
 *
 * @author ccastro
 */
class NotaCreditoCompraNEG {
    
    public static function crearNotaCreditoCompra($oRecepcionNDTO, $listProdNCCompra) {
        require_once __DIR__ . '/../Conexion/Conexion.php';
        require_once __DIR__ . '/../DAO/NotaCreditoCompraDAO.php';
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oRecepcionNDTO = new RecepcionNDTO();
        $oRecepcion = $oRecepcionNDTO->oRecepcion;
        $oNotaCreditoCompra = new NotaCreditoCompra();
        $oNotaCreditoCompra->id_recepcion = $oRecepcion->id_recepcion;
        
    }
    
}

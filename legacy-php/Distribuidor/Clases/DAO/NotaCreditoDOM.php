<?php

/**
 * Description of NotaCreditoDOM
 *
 * @author ccastro
 */
class NotaCreditoDOM {
    
    /**
     * Retorna Nota Credito según tipo docto, número de nota y rut empresa
     * 
     * @param PDO $oPDO
     * @param int $idTipoDocto
     * @param int $iNumDoctoEmitido
     * @param int $iRutEmpresa
     * @return NotaCredito
     */
    public static function obtNotaCreditoXNumDocto($oPDO, $idTipoDocto, $iNumDoctoEmitido, $iRutEmpresa) {
        require_once __DIR__ . '/../FiltroBusqueda/NotaCreditoFB.php';
        
        $oNotaCredito = null;
        
        $oNotaCreditoFB = new NotaCreditoFB();
        $oNotaCreditoFB->idTipoDocto = $idTipoDocto;
        $oNotaCreditoFB->iNumNotaCreditoDesde = $iNumDoctoEmitido;
        $oNotaCreditoFB->iNumNotaCreditoHasta = $iNumDoctoEmitido;
        $oNotaCreditoFB->iRutEmpresa = $iRutEmpresa;
        
        $listNotaCredito = NotaCreditoDAO::listNotaCredito($oPDO, $oNotaCreditoFB);
        foreach($listNotaCredito as $oNC) {
            $oNotaCredito = $oNC;
        }
        
        return $oNotaCredito;
    }
    
}

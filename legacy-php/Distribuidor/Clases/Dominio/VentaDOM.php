<?php
/**
 * Description of VentaDOM
 *
 * @author ccastro
 */

require_once __DIR__ . '/../FiltroBusqueda/VentaFB.php';

class VentaDOM {
    
    public static function obtVentaXNumDocto($oPDO, $idTipoDocto, $iNumDoctoEmitido, $iRutEmpresa) {
        $oVenta = null;
        
        $oVentaFB = new VentaFB();
        $oVentaFB->idTipoDocto = $idTipoDocto;
        $oVentaFB->iNumFacturaDesde = $iNumDoctoEmitido;
        $oVentaFB->iNumFacturaHasta = $iNumDoctoEmitido;
        $oVentaFB->iRutEmpresa = $iRutEmpresa;
        
        $listVenta = VentaDAO::listVentas($oPDO, $oVentaFB);
        foreach($listVenta as $oV) {
            $oVenta = $oV;
        }
        
        return $oVenta;
    }
    
}

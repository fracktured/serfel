<?php

require_once __DIR__ . '/../Constantes/SisDistCONST.php';

/**
 * Description of RecepcionFB
 *
 * @author ccastro
 */
class RecepcionFB {
    
    public $cFechaDesde = "";
    public $cFechaHasta = "";
    public $iFacturaDesde = SisDistCONST::ID_FILTRO_TODOS;
    public $iFacturaHasta = SisDistCONST::ID_FILTRO_TODOS;
    public $iRutEmpresa = SisDistCONST::ID_FILTRO_TODOS;
    public $iRutProveedor = SisDistCONST::ID_FILTRO_TODOS;
    public $cRazonSocialProveedor = "";
    public $idTipoDocto = SisDistCONST::ID_FILTRO_TODOS;
    public $idTipoPago = SisDistCONST::ID_FILTRO_TODOS;
    public $orden = 'v.id_venta DESC';
    
}

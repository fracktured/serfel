<?php

require_once __DIR__ . '/../Constantes/SisDistCONST.php';

/**
 * Description of VentaFB
 *
 * @author ccastro
 */
class VentaFB {
    
    public $cFechaDesde = "";
    public $cFechaHasta = "";
    public $iNumFacturaDesde = SisDistCONST::ID_FILTRO_TODOS;
    public $iNumFacturaHasta = SisDistCONST::ID_FILTRO_TODOS;
    public $iRutEmpresa = SisDistCONST::ID_FILTRO_TODOS;
    public $iRutCliente = SisDistCONST::ID_FILTRO_TODOS;
    public $cRazonSocialCliente = "";
    public $idTipoDocto = SisDistCONST::ID_FILTRO_TODOS;
    public $idLocalCliente = SisDistCONST::ID_FILTRO_TODOS;
    public $idRuta = SisDistCONST::ID_FILTRO_TODOS;
    public $idEstadoPago = SisDistCONST::ID_FILTRO_TODOS;
    public $idVendedor = SisDistCONST::ID_FILTRO_TODOS;
    public $orden = 'v.id_venta DESC';
    
}

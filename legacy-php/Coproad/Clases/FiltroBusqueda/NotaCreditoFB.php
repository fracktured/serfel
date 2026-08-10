<?php
require_once __DIR__ . '/../Constantes/SisDistCONST.php';

/**
 * Description of NotaCreditoFB
 *
 * @author ccastro
 */
class NotaCreditoFB {
    
    public $cFechaDesde = "";
    public $cFechaHasta = "";
    public $iNumNotaCreditoDesde = SisDistCONST::ID_FILTRO_TODOS;
    public $iNumNotaCreditoHasta = SisDistCONST::ID_FILTRO_TODOS;
    public $iRutEmpresa = SisDistCONST::ID_FILTRO_TODOS;
    public $idTipoDocto = SisDistCONST::ID_FILTRO_TODOS;
    
}

<?php
require_once __DIR__.'/../Constantes/SisDistCONST.php';

/**
 * Description of PedidoFB
 *
 * @author ccastro
 */
class PedidoFB {
    
    public $idEstado = SisDistCONST::ID_FILTRO_TODOS;
    public $cFechaDesde = "";
    public $cFechaHasta = "";
    public $iNumFacturaDesde = SisDistCONST::ID_FILTRO_TODOS;
    public $iNumFacturaHasta = SisDistCONST::ID_FILTRO_TODOS;
    public $idLocalCliente = SisDistCONST::ID_FILTRO_TODOS;
    public $idUsuario = SisDistCONST::ID_FILTRO_TODOS;
    
}
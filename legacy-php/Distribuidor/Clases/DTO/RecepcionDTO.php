<?php

/**
 * Description of RecepcionDTO
 *
 * @author ccastro
 */
class RecepcionDTO {
    public $listTipoDoctoCompraSI;
    public $listEmpresaSI;
    
    public $listTipoDoctoSI = array();
    public $idTipoPago;
    public $cRutProveedor;
    public $cRazonSocialProveedor;
    public $iFacturaDesde;
    public $iFacturaHasta;
    public $cFechaDesde;
    public $cFechaHasta;
    public $recepciones = array();
}

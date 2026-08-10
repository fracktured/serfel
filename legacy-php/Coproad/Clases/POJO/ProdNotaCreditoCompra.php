<?php

/**
 * Description of ProdNotaCreditoCompra
 *
 * @author ccastro
 */
class ProdNotaCreditoCompra {
    
    public $id_nc_compra;
    public $id_producto;
    public $cantidad;
    public $precio;
    
    
    public function __construct() {
        
    }
    
    
    public function obtSubTotal() {
        return intval($this->cantidad * $this->precio);
    }
    
}

<?php

/**
 * Description of ProductoVenta
 *
 * @author christian
 */
class ProductoVenta {
    
    public $id_venta;
    public $id_producto;
    public $cantidad;
    public $precio;
    public $porcen_desc;
    public $precio_neto;
    
    
    public function __construct() {
        
    }
    
    
    public function obtSubTotal() {
        return round($this->cantidad * $this->precio);
    }
    
    public function obtMontoDescSubTotal() {
        return round($this->obtSubTotal() * $this->porcen_desc / 100);
    }
    
    public function obtSubTotalConDesc() {
        return $this->obtSubTotal() - $this->obtMontoDescSubTotal();
    }
    
    public function obtMontoDescuento() {
        return round($this->precio * $this->porcen_desc / 100);
    }
}

?>

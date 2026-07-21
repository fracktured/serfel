<?php

/**
 * Description of RegListVenta
 *
 * @author ccastro
 */
class RegListVenta {
    
    public $id_venta;
    public $id_tipo_docto_emitido;
    public $rut_empresa;
    public $dv_empresa;
    public $razon_social_empresa;
    public $num_docto_emitido;
    public $nom_tipo_docto;
    public $fecha_venta;
    public $rut_cliente;
    public $dv_cliente;
    public $razon_social_cliente;
    public $precio_total;
    public $entregado;
    public $periodo_libro;
    public $nom_forma_pago;
    public $id_estado_pago;
    public $iMontoTotalNC;
    public $iMontoTotalPago;
    public $nomVendedor;
    
    
    public function obtRutCompletoEmpresa() {
        return $this->rut_empresa . "-" . $this->dv_empresa;
    }
    
    public function obtRutCompletoCliente() {
        return $this->rut_cliente . "-" . $this->dv_cliente;
    }
}

<?php

/**
 * Description of Cliente
 *
 * @author ccastro
 */
class Cliente {
    
    public $rut_cliente;
    public $dv_cliente;
    public $razon_social;
    public $nom_fantasia;
    public $telefono_cliente;
    public $direccion_cliente;
    public $comuna;
    public $email_cliente;
    public $id_lista_precio;
    public $id_usuario_mod;
    public $ult_fecha_mod;
    public $id_estado;
    public $permite_venta_deuda;
    
    
    public function obtRutCompleto() {
        return $this->rut_cliente . "-" . $this->dv_cliente;
    }
    
}

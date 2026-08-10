<?php

/**
 * Description of Proveedor
 *
 * @author ccastro
 */
class Proveedor {
    
    public $rut_proveedor;
    public $dv_proveedor;
    public $razon_social;
    public $nom_fantasia;
    public $direccion_proveedor;
    public $giro;
    public $fono_1;
    public $fono_2;
    public $email;
    public $cond_pago;
    public $glosa_pago;
    public $nom_vendedor;
    public $fono_vendedor;
    public $email_vendedor;
    public $observaciones;
    public $id_usuario_mod;
    public $ult_fecha_mod;
    public $id_estado;
    
    
    public function obtRutCompleto() {
        return $this->rut_proveedor . "-" . $this->dv_proveedor;
    }
}

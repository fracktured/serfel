<?php

/**
 * Description of LocalCliente
 *
 * @author ccastro
 */
class LocalCliente {
    
    public $id_local_cliente;
    public $rut_cliente;
    public $nom_local_cliente;
    public $telefono_local_cliente;
    public $direccion_local_cliente;
    public $comuna_local_cliente;
    public $email_local_cliente;
    public $giro;
    public $nom_contacto;
    public $apell_pat_contacto;
    public $apell_mat_contacto;
    public $telefono_contacto;
    public $email_contacto;
    public $tope_venta;
    public $tope_credito;
    public $id_vendedor;
    public $id_forma_pago;
    public $comuna;
    public $observaciones;
    public $id_usuario_mod;
    public $ult_fecha_mod;
    public $id_estado;
    public $ciudad;
    public $permite_venta_tope_mensual;
    
    
    public function __construct() {
        
    }
}

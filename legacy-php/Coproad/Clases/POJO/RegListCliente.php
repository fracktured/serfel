<?php

/**
 * Description of RegListCliente
 *
 * @author ccastro
 */
class RegListCliente {
    
    public $rut_cliente;
    public $dv_cliente;
    public $razon_social;
    public $nom_fantasia;
    public $nom_lista_precio;
    public $telefono_cliente;
    public $email_cliente;
    public $lunes;
    public $martes;
    public $miercoles;
    public $jueves;
    public $viernes;
    public $ult_factura;
    public $ult_nota_credito;
    
    
    public function obtRutCompletoCliente() {
        return $this->rut_cliente . "-" . $this->dv_cliente;
    }
}

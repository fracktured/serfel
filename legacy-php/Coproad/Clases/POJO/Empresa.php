<?php

/**
 * Description of Empresa
 *
 * @author ccastro
 */
class Empresa {
    
    public $rut_empresa;
    public $dv_empresa;
    public $razon_social;
    public $nom_fantasia;
    public $direccion_empresa;
    public $acceso_rapido;
    public $id_usuario_mod;
    public $ult_fecha_mod;
    public $id_estado;
    public $giro;
    public $cod_actividad_economica;
    public $comuna;
    public $ciudad;
    public $rut_representante_legal;
    public $dv_representante_legal;
    public $fecha_aprobacion_SII;
    public $num_aprobacion_SII;
    
    
    public function obtRutCompleto() {
        return $this->rut_empresa . "-" . $this->dv_empresa;
    }
    
    public function obtRutCompletoRepLegal() {
        return $this->rut_representante_legal . "-" . $this->dv_representante_legal;
    }
}

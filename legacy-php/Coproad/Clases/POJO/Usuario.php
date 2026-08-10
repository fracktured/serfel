<?php

/**
 * Description of Usuario
 *
 * @author ccastro
 */
class Usuario {
    
    public $id_usuario;
    public $rut_usuario;
    public $dv_usuario;
    public $nom_usuario;
    public $apell_pat_usuario;
    public $apell_mat_usuario;
    public $id_tipo_usuario;
    public $telefono_usuario;
    public $direccion_usuario;
    public $email_usuario;
    public $num_usuario;
    public $id_usuario_mod;
    public $ult_fecha_mod;
    public $id_estado;
    public $fecha_act_productos;
    
    
    public function obtRutCompleto() {
        return $this->rut_usuario . "-" . $this->dv_usuario;
    }
    
    public function obtNomCompleto() {
        return $this->nom_usuario . " " . $this->apell_pat_usuario;
    }
}

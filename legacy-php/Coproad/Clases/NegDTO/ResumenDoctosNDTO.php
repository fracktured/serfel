<?php

/**
 * Description of ResumenDoctosNDTO
 *
 * @author ccastro
 */
class ResumenDoctosNDTO {
    
    public $iTotalDoctos = 0;
    public $iTotalNeto = 0;
    public $iTotalIVA = 0;
    public $iPrecioTotal = 0;
    
    public function obtMontoTotal() {
        return $this->iTotalNeto + $this->iTotalIVA;
    }
}

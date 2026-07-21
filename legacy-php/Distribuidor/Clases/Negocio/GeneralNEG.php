<?php

/**
 * Description of GeneralNEG
 *
 * @author ccastro
 */
class GeneralNEG {
    
    protected $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;

        require_once $this->cRutaRelativa . "Clases/Conexion/Conexion.php";
    }
    // </editor-fold>
    
}

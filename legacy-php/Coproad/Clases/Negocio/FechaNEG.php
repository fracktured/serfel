<?php

/**
 * Description of FechaNEG
 *
 * @author ccastro
 */
class FechaNEG {
    
    protected $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;

        require_once 'Clases/Util/FechaUtil.php';
    }
    // </editor-fold>
    
    public function listMesesSI() {
        require_once 'Clases/Factory/DTO/SelectItem.php';
        
        $i = 0;
        $listFechaSI = Array();
        foreach(FechaUtil::listMeses() as $cFecha) {
            $listFechaSI[$i] = new SelectItem($i + 1, $cFecha);
            $i++;
        }
        
        return $listFechaSI;
    }
    
}

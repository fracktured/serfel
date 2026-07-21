<?php

/**
 * Description of GeneralCTRL
 *
 * @author ccastro
 */
class GeneralCTRL {
    
    protected $cRutaRelativa = "";
    protected $oUsuario;
    
    
    public function __construct($cRutaRelativa, $bIniSesion = true) {
        $this->cRutaRelativa = $cRutaRelativa;
        
        require_once $this->cRutaRelativa . 'Clases/Constantes/UsuarioCONST.php';
        require_once $this->cRutaRelativa . "Clases/Usuario.php";
        
        if($bIniSesion) {
            session_start();
        }
        
        $this->oUsuario = $_SESSION["usuario"];
    }
    
}

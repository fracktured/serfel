<?php

/**
 * Description of FacturacionClWSCredenciales
 *
 * @author ccastro
 */
class FacturacionClWSCredenciales {
    
    public $cRut;
    public $cUsuario;
    public $cClave;
    
    
    private function __construct($cRut, $cUsuario, $cClave) {
        $this->cRut = $cRut;
        $this->cUsuario = $cUsuario;
        $this->cClave = $cClave;
    }
    
    
    public static function create($cRut) {
        //PRODUCCION
        $USUARIO_SERGIO_ARANDA = "SERFEL";
        $RUT_SERGIO_ARANDA = "8030856-6";
        $CLAVE_SERGIO_ARANDA = "sj3243hcx/*-";

        $USUARIO_MARIA_DIAZ = "serfel2";
        $RUT_MARIA_DIAZ = "8367020-7";
        $CLAVE_MARIA_DIAZ = "23ad67e8b1";

        $USUARIO_FELIPE_ARANDA = "COPROAD";
        $RUT_FELIPE_ARANDA = "76770842-4";
        $CLAVE_FELIPE_ARANDA = "051704HIJOS";
        
        switch ($cRut) {
            case $RUT_MARIA_DIAZ:
                return new FacturacionClWSCredenciales($RUT_MARIA_DIAZ, $USUARIO_MARIA_DIAZ, $CLAVE_MARIA_DIAZ);
            case $RUT_SERGIO_ARANDA:
                return new FacturacionClWSCredenciales($RUT_SERGIO_ARANDA, $USUARIO_SERGIO_ARANDA, $CLAVE_SERGIO_ARANDA);
            case $RUT_FELIPE_ARANDA:
                return new FacturacionClWSCredenciales($RUT_FELIPE_ARANDA, $USUARIO_FELIPE_ARANDA, $CLAVE_FELIPE_ARANDA);
            default :
                throw new Exception("Rut sin credenciales de WS.");
        } 
    }
}

<?php

/**
 * Description of RutaLocalCliente
 *
 * @author ccastro
 */
class RutaLocalCliente {
    
    private $idRuta;
    private $idLocalCliente;
    
    
    public function __construct($idRuta, $idLocalCliente) {
        $this->idRuta = $idRuta;
        $this->idLocalCliente = $idLocalCliente;
    }
    
    
    // <editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
    public function getIdRuta() {
        return $this->idRuta;
    }

    public function getIdLocalCliente() {
        return $this->idLocalCliente;
    }

    public function setIdRuta($idRuta) {
        $this->idRuta = $idRuta;
    }

    public function setIdLocalCliente($idLocalCliente) {
        $this->idLocalCliente = $idLocalCliente;
    }
    // </editor-fold>
}

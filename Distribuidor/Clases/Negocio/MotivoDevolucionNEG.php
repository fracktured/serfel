<?php

/**
 * Description of MotivoDevolucionNEG
 *
 * @author ccastro
 */
class MotivoDevolucionNEG extends GeneralNEG {
    
    /**
     * Devuelve listado de motivos de devolucion
     * 
     * @return Array MotivoDevolucion
     */
    public function listMotivosDevolucion() {
        require_once $this->cRutaRelativa . "Clases/DAO/MotivoDevolucionDAO.php";
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();

        $motDevDAO = new MotivoDevolucionDAO($this->cRutaRelativa);
        $listMotDev = $motDevDAO->listMotivosDevolucion($oPDO);

        return $listMotDev;
    }
}

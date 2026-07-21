<?php

/**
 * Description of ProveedorDAO
 *
 * @author ccastro
 */
class ProveedorDAO {
    
    private $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;

        include_once $this->cRutaRelativa . "Clases/POJO/Proveedor.php";
    }
    // </editor-fold>

    
    /**
     * Retorna Proveedor según id.
     * 
     * @param PDO $oPDO
     * @param int $iRutProveedor
     * @return Venta
     */
    public function obtProveedor($oPDO, $iRutProveedor) {
        $cSql = 
            "SELECT * 
             FROM 70_m_proveedor 
             WHERE rut_proveedor = :rut_proveedor";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':rut_proveedor', $iRutProveedor, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'Proveedor');

        $oProveedor = null;
        foreach ($rs as $p) {
            $oProveedor = $p;
        }

        return $oProveedor;
    }
    
}

<?php

/**
 * Description of StockNEG
 *
 * @author ccastro
 */
class StockNEG {
    
    private $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;

        require_once $this->cRutaRelativa . "Clases/Conexion/Conexion.php";
        require_once $this->cRutaRelativa . "Clases/DAO/StockDAO.php";
        require_once $this->cRutaRelativa . 'Clases/DAO/ProductoDAO.php';
        require_once $this->cRutaRelativa . 'Clases/NegDTO/StockNDTO.php';
        require_once __DIR__ . '/../POJO/Producto.php';
    }
    // </editor-fold>
    
    
    /**
     * Retorna Stock según PK
     * 
     * @param int $idBodega
     * @param int $idProducto
     * @return Stock
     */
    public function obtStock($idBodega, $idProducto) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oStockNDTO = new StockNDTO();
        $oStockNDTO->oStock = StockDAO::obtStock($oPDO, $idBodega, $idProducto);
        $oStockNDTO->oProducto = ProductoDAO::obtProducto($oPDO, $idProducto);
        
        return $oStockNDTO;
    }
    
    
    /**
     * Modifica Stock
     * 
     * @param Stock $oStock
     */
    public function modStock($oStock) {
        require_once $this->cRutaRelativa . 'Clases/Dominio/StockDOM.php';
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        StockDOM::modStock($oPDO, $oStock);
        
        return true;
    }
    
}

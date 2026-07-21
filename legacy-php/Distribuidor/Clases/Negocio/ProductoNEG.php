<?php
require_once __DIR__.'/../Conexion/Conexion.php';
require_once __DIR__.'/../DAO/ProductoDAO.php';

/**
 * Description of ProductoNEG
 *
 * @author ccastro
 */
class ProductoNEG {
    
    private $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;

        //require_once $this->cRutaRelativa . "Clases/Conexion/Conexion.php";
        //require_once $this->cRutaRelativa . "Clases/DAO/ProductoDAO.php";
        //require_once __DIR__ . '/../POJO/Producto.php';
    }
    // </editor-fold>
    
    
    /**
     * Retorna Producto según PK
     * 
     * @param int $idProducto
     * @return Producto
     */
    public function obtProducto($idProducto) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oProducto = ProductoDAO::obtProducto($oPDO, $idProducto);
        
        return $oProducto;
    }
    
    
    /**
     * Retorna Producto según cod_serfel
     * 
     * @param int $iCodSerfel
     * @return Producto
     */
    public function obtProductoXCodSerfel($iCodSerfel) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oProductoDAO = new ProductoDAO($this->cRutaRelativa);
        $oProducto = $oProductoDAO->obtProductoXCodSerfel($oPDO, $iCodSerfel);
        
        return $oProducto;
    }
    
    
    /**
     * Retorna lista de Producto
     * 
     * @param int $oProductoFB
     * @return Producto[]
     */
    public static function lista($oProductoFB) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        return ProductoDAO::lista($oPDO, $oProductoFB);
    }

    /**
     * Retorna Producto según PK
     * 
     * @param int $idProducto
     * @return Producto
     */
    public static function get($idProducto) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oProducto = ProductoDAO::get($oPDO, $idProducto);
        
        return $oProducto;
    }
}

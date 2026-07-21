<?php
require_once __DIR__.'/../Conexion/Conexion.php';
require_once __DIR__.'/../DAO/PrecioProductoDAO.php';

/**
 * Description of PrecioProductoNEG
 *
 * @author ccastro
 */
class PrecioProductoNEG {
    
    
    /**
     * Retorna Precio Producto
     * 
     * @return ProductoNDTO
     */
    public static function obtPrecioProducto($oPrecioProductoBuscar) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oProductoNDTO = new ProductoNDTO();
        $oProductoNDTO->oPrecioProducto = PrecioProductoDAO::selectXId($oPDO, $oPrecioProductoBuscar);
        $oProductoNDTO->oProducto = ProductoDAO::obtProducto($oPDO, $oPrecioProductoBuscar->id_producto);
        
        return $oProductoNDTO;
    }


    public static function ingPrecioProducto( $oPrecioProducto ) {

    }
    
    
    /**
     * Retorna listado de Precios Producto
     * 
     * @return Array RegListPrecioProducto
     */
    public static function listPrecioProducto($idListaPrecio) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        return PrecioProductoDAO::listPrecioProducto($oPDO, $idListaPrecio);
    }
    
}

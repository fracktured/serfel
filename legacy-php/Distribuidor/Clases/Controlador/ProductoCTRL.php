<?php
require_once __DIR__ . '/../DTO/ProductosDTO.php';
require_once __DIR__ . '/../FiltroBusqueda/ProductoFB.php';
require_once __DIR__ . '/../Negocio/MarcaNEG.php';
require_once __DIR__ . '/../Negocio/ProductoNEG.php';

class ProductoCTRL {

    /**
     * Controlador de Productos/listProducto/listProducto.php
     *
     * @return ProductoDTO
     */
    public static function productos() {
        $oProductosDTO = new ProductosDTO();
        $oProductosDTO->productos = [];
        $oProductosDTO->marcasSI = MarcaNEG::listSI(true);

        $oProductoFB = new ProductoFB();
        if ( filter_input(INPUT_POST, "btnFiltrar") ) {
            $codigo = filter_input(INPUT_POST, "codigo");
            $nombre = filter_input(INPUT_POST, "nombre");
            $oProductoFB->codSerfel = $codigo;
            $oProductoFB->palabrasNomProducto = explode(" ", $nombre);
            $oProductoFB->idMarca = filter_input(INPUT_POST, "idMarca");
            
            $oProductosDTO->productos = ProductoNEG::lista($oProductoFB);
            $oProductosDTO->codigo = $codigo;
            $oProductosDTO->nombre = $nombre;
            $oProductosDTO->idMarca = $oProductoFB->idMarca;
        }
        
        return $oProductosDTO;
    }
}
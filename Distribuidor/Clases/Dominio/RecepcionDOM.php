<?php

/**
 * Description of RecepcionDOM
 *
 * @author ccastro
 */
class RecepcionDOM {
    
    
    /**
     * Retorna lista ProductoRecepcionNDTO según idRecepcion.
     * 
     * @param PDO $oPDO
     * @param int $idRecepcion
     * @return Array ProductoRecepcionNDTO
     */
    public static function listProductoRecepcion($oPDO, $idRecepcion) {
        require_once __DIR__ . '/../DAO/ProductoRecepcionDAO.php';
        require_once __DIR__ . '/../DAO/ProductoDAO.php';
        require_once __DIR__ . '/../DAO/MarcaDAO.php';
        require_once __DIR__ . '/../DAO/UnidadMedidaDAO.php';
        
        $i = 0;
        $listProductoRecepcionNDTO = Array();
        $listProductoRecepcion = ProductoRecepcionDAO::listProductoRecepcion($oPDO, $idRecepcion);
        foreach($listProductoRecepcion as $oProductoRecepcion) {
            $oProducto = ProductoDAO::obtProducto($oPDO, $oProductoRecepcion->id_producto);
            
            $oProductoRecepcionNDTO = new ProductoRecepcionNDTO();
            $oProductoRecepcionNDTO->oProductoRecepcion = $oProductoRecepcion;
            $oProductoRecepcionNDTO->oProducto = $oProducto;
            $oProductoRecepcionNDTO->oMarca = MarcaDAO::obtMarca($oPDO, $oProducto->id_marca);
            $oProductoRecepcionNDTO->oUM = UnidadMedidaDAO::obtUnidadMedida($oPDO, $oProducto->id_UM);
            $listProductoRecepcionNDTO[$i] = $oProductoRecepcionNDTO;
            $i++;
        }
        
        return $listProductoRecepcionNDTO;
    }
    
}

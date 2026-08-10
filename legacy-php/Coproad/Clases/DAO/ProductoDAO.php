<?php
require_once __DIR__.'/../POJO/Producto.php';
require_once __DIR__.'/GeneralDAO.php';

/**
 * Description of ProductoDAO
 *
 * @author ccastro
 */
class ProductoDAO {
    
    private $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;
    }
    // </editor-fold>
    
    
    /**
     * Retorna Producto según id.
     * 
     * @param PDO $oPDO
     * @param int $idProducto
     * @return Producto
     */
    public static function obtProducto($oPDO, $idProducto) {
        return GeneralDAO::obtPOJO($oPDO, $idProducto, SisDistCONST::POJO_PRODUCTO);
    }
    
    
    /**
     * Retorna Producto según cod_serfel.
     * 
     * @param PDO $oPDO
     * @param int $iCodSerfel
     * @return Producto
     */
    public function obtProductoXCodSerfel($oPDO, $iCodSerfel) {
        $cSql = 
            "SELECT * 
             FROM 20_m_producto 
             WHERE cod_serfel = :cod_serfel";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':cod_serfel', $iCodSerfel, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'Producto');

        $oProducto = null;
        foreach ($rs as $o) {
            $oProducto = $o;
        }

        return $oProducto;
    }

    /**
     * Devuelve lista de Productos
     * 
     * @param PDO $oPDO
     * @param ProductoFB $oProductoFB
     * @return Array Producto
     */
    public static function lista($db, $oProductoFB) {
        $sql =
           "SELECT  p.*,
                    m.nom_marca,
                    um.nom_UM,
                    tpp.nom_tipo_producto as familia,
                    tp.nom_tipo_producto as sub_familia
            FROM 20_m_producto p
                JOIN 20_p_marca m on p.id_marca = m.id_marca
                JOIN 20_p_unidad_medida um on p.id_UM = um.id_UM
                JOIN 20_p_tipo_producto tp on p.id_tipo_producto = tp.id_tipo_producto
                JOIN 20_p_tipo_producto tpp on tp.nivel_1 = tpp.id_tipo_producto
            WHERE (:cod_serfel = " . SisDistCONST::ID_FILTRO_TODOS . " OR p.cod_serfel = :cod_serfel)
            AND (:nom_producto = '' OR upper(p.nom_producto) LIKE upper(:nom_producto))
            AND (:id_marca = " . SisDistCONST::ID_FILTRO_TODOS . " OR p.id_marca = :id_marca)
            AND p.id_estado = 1";
        
        $nom_producto = '%';
        foreach ( $oProductoFB->palabrasNomProducto as $palabra ) {
            $nom_producto .= $palabra.'%';
        }
        if ( $nom_producto == '%%' ) {
            $nom_producto = '';
        }
        if ( $oProductoFB->codSerfel == '' ) {
            $oProductoFB->codSerfel = SisDistCONST::ID_FILTRO_TODOS;
        }

        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':cod_serfel' => $oProductoFB->codSerfel,
            ':nom_producto' => $nom_producto,
            ':id_marca' => $oProductoFB->idMarca
        ]);
        
        return $stmt->fetchALL(PDO::FETCH_CLASS, 'Producto');
    }

    /**
     * Devuelve Producto
     * 
     * @param PDO $oPDO
     * @param int $idProducto
     * @return Array Producto
     */
    public static function get($db, $idProducto) {
        $sql = 
           "SELECT  p.*, 
                    m.nom_marca,
                    um.nom_UM,
                    tpp.nom_tipo_producto as familia,
                    tp.nom_tipo_producto as sub_familia
            FROM 20_m_producto p
                JOIN 20_p_marca m on p.id_marca = m.id_marca
                JOIN 20_p_unidad_medida um on p.id_UM = um.id_UM
                JOIN 20_p_tipo_producto tp on p.id_tipo_producto = tp.id_tipo_producto
                JOIN 20_p_tipo_producto tpp on tp.nivel_1 = tpp.id_tipo_producto
            WHERE p.id_producto = :id_producto";

        $stmt = $db->prepare($sql);
        $parametros = [];
        $parametros += [ ':id_producto' => $idProducto ];
        $stmt->execute($parametros);
        
        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'Producto');

        return $rs;
    }
    
}

<?php
require_once __DIR__ . '/../POJO/ProdNotaCredito.php';

/**
 * Description of ProdNotaCreditoDAO
 *
 * @author ccastro
 */
class ProdNotaCreditoDAO {
    
    private $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;

        include_once $this->cRutaRelativa . "Clases/POJO/ProdNotaCredito.php";
    }
    // </editor-fold>
    
    
    /**
     * Ingresa ProdNotaCredito
     *  
     * @param PDO $oPDO
     * @param ProdNotaCredito $oProdNotaCredito
     */
    public static function ingProdNotaCredito($oPDO, $oProdNotaCredito) {
        $cSql = 
            "INSERT INTO 40_m_prod_nota_credito (id_nota_credito,
                                                 id_producto,
                                                 cantidad,
                                                 precio,
                                                 porcen_desc)
             VALUES (:id_nota_credito,
                     :id_producto,
                     :cantidad,
                     :precio,
                     :porcen_desc)";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_nota_credito', $oProdNotaCredito->id_nota_credito, PDO::PARAM_INT);
        $oStmt->bindParam(':id_producto', $oProdNotaCredito->id_producto, PDO::PARAM_INT);
        $oStmt->bindParam(':cantidad', $oProdNotaCredito->cantidad, PDO::PARAM_STR);
        $oStmt->bindParam(':precio', $oProdNotaCredito->precio, PDO::PARAM_INT);
        $oStmt->bindParam(':porcen_desc', $oProdNotaCredito->porcen_desc, PDO::PARAM_INT);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }
    
    
    /**
     * Retorna lista ProdNotaCredito según idNotaCredito.
     * 
     * @param PDO $oPDO
     * @param int $idNotaCredito
     * @return Array ProdNotaCredito
     */
    public static function listProductoNotaCredito($oPDO, $idNotaCredito) {
        $sql = 
            "SELECT * 
             FROM 40_m_prod_nota_credito 
             WHERE id_nota_credito = :id_nota_credito";

        $stmt = $oPDO->prepare($sql);
        $stmt->bindParam(':id_nota_credito', $idNotaCredito, PDO::PARAM_INT);
        $stmt->execute();

        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'ProdNotaCredito');

        return $rs;
    }
    
}

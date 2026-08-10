<?php

/**
 * Description of GeneralDAO
 *
 * @author ccastro
 */
class GeneralDAO {
    
    private static function obtPKTabla($cPOJO) {
        switch ($cPOJO) {
            case SisDistCONST::POJO_PRODUCTO:
                return SisDistCONST::PK_PRODUCTO;
            case SisDistCONST::POJO_MARCA:
                return SisDistCONST::PK_MARCA;
            case SisDistCONST::POJO_UNIDAD_MEDIDA:
                return SisDistCONST::PK_UNIDAD_MEDIDA;
            case SisDistCONST::POJO_CLIENTE:
                return SisDistCONST::PK_CLIENTE;
            case SisDistCONST::POJO_PEDIDO:
                return SisDistCONST::PK_PEDIDO;
            default:
                break;
        }
    }

    private static function obtNomTabla($cPOJO) {
        switch ($cPOJO) {
            case SisDistCONST::POJO_PRODUCTO:
                return SisDistCONST::TABLA_PRODUCTO;
            case SisDistCONST::POJO_MARCA:
                return SisDistCONST::TABLA_MARCA;
            case SisDistCONST::POJO_UNIDAD_MEDIDA:
                return SisDistCONST::TABLA_UNIDAD_MEDIDA;
            case SisDistCONST::POJO_CLIENTE:
                return SisDistCONST::TABLA_CLIENTE;
            case SisDistCONST::POJO_PEDIDO:
                return SisDistCONST::TABLA_PEDIDO;
            default:
                break;
        }
    }

    /**
     * Retorna POJO según id.
     * 
     * @param PDO $oPDO
     * @param int $idPOJO
     * @param String $cPOJO
     * @return POJO
     */
    public static function obtPOJO($oPDO, $idPOJO, $cPOJO) {
        $cPKTabla = GeneralDAO::obtPKTabla($cPOJO);
        $cNomTabla = GeneralDAO::obtNomTabla($cPOJO);

        $cSql = 
                "SELECT * 
                    FROM $cNomTabla
                    WHERE $cPKTabla = :idPOJO";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':idPOJO', $idPOJO, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, $cPOJO);

        $oPOJO = null;
        foreach ($rs as $o) {
            $oPOJO = $o;
        }
        
        if ($oPOJO == NULL) {
            throw new Exception("No existe registro $idPOJO en la tabla $cNomTabla.", 1);
        }
        return $oPOJO;
    }

}

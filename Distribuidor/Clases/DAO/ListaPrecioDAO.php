<?php
require_once __DIR__ . '/../POJO/ListaPrecio.php';

class ListaPrecioDAO {

    public static function listar($oPDO) {
        $cSql = "SELECT * FROM 40_m_lista_precio WHERE id_estado = 1";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->execute();
        return $oStmt->fetchALL(PDO::FETCH_CLASS, 'ListaPrecio');
    }
}

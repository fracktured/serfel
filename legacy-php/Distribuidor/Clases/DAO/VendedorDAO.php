<?php
require_once __DIR__ . '/../POJO/Vendedor.php';
require_once __DIR__ . '/../Constantes/EstadoCONST.php';

/**
 * Description of VendedorDAO
 *
 * @author ccastro
 */
class VendedorDAO {

    /**
     * Retorna listado de vendedores
     *
     * @param PDO $oPDO
     * @return Array<Vendedor>
     */
    public static function listUsuarios($oPDO, $iIdTipoUsuario) {
        $activo = EstadoCONST::ACTIVO;

        $cSql = "SELECT * FROM 10_m_usuario WHERE id_tipo_usuario = :id_tipo_usuario AND id_estado = :id_estado";
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_tipo_usuario', $iIdTipoUsuario, PDO::PARAM_INT);
        $oStmt->bindParam(':id_estado', $activo, PDO::PARAM_INT);
        $oStmt->execute();
        return $oStmt->fetchALL(PDO::FETCH_CLASS, 'Vendedor');
    }

}

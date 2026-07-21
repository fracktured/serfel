<?php
require_once __DIR__ . '/../POJO/TipoUsuario.php';

/**
 * Description of TipoUsuarioDAO
 *
 * @author ccastro
 */
class TipoUsuarioDAO {
    
    
    /**
     * Retorna TipoUsuario según id.
     * 
     * @param PDO $oPDO
     * @param int $idTipoUsuario
     * @return Usuario
     */
    public static function obtTipoUsuario($oPDO, $idTipoUsuario) {
        $cSql = 
            "SELECT * 
             FROM 10_p_tipo_usuario 
             WHERE id_tipo_usuario = :id_tipo_usuario";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_tipo_usuario', $idTipoUsuario, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'TipoUsuario');

        $oPojo = null;
        foreach ($rs as $o) {
            $oPojo = $o;
        }

        return $oPojo;
    }
    
}

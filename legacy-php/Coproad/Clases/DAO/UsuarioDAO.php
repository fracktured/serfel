<?php
require_once __DIR__ . '/../POJO/Usuario.php';

/**
 * Description of UsuarioDAO
 *
 * @author ccastro
 */
class UsuarioDAO {
    
    /**
     * Retorna Usuario según Rut y Contraseña.
     * 
     * @param PDO $oPDO
     * @param string $cRut
     * @param string $cContrasena
     * @return Usuario
     */
    public static function obtUsuarioXRutYPass($oPDO, $cRut, $cContrasena) {
        $aRut = explode("-", $cRut);
        
        $cSql = 
            "SELECT * 
             FROM 10_m_usuario 
             WHERE rut_usuario = :rut_usuario
               AND dv_usuario = :dv_usuario
               AND password = :password";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':rut_usuario', $aRut[0], PDO::PARAM_INT);
        $oStmt->bindParam(':dv_usuario', $aRut[1], PDO::PARAM_STR);
        $oStmt->bindParam(':password', $cContrasena, PDO::PARAM_STR);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'Usuario');

        $oPojo = null;
        foreach ($rs as $o) {
            $oPojo = $o;
        }

        return $oPojo;
    }
    
}

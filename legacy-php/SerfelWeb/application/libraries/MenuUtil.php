<?php

/**
 * Description of Menu
 *
 * @author ccastro
 */
class MenuUtil {
    
    
    /**
     * Retorna string con ubicación de archivo de menu
     * 
     * @param int $idTipoUsuario
     * @return string
     */
    public static function obtVistaMenu($idTipoUsuario) {
        $cMenu = "";
        switch ($idTipoUsuario) {
            case Usuario::ADMINISTRADOR_SISTEMA:
                $cMenu = "/menu/menuAdministradorSistema.php";
                break;
            case Usuario::CLIENTE:
                $cMenu = "/menu/menuCliente.php";
                break;
            case Usuario::USUARIO_EMPRESA:
                $cMenu = "/menu/menuUsuarioEmpresa.php";
                break;
        }
        
        return $cMenu;
    }
    
}

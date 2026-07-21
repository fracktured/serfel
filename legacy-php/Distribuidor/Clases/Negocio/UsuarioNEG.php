<?php
require_once __DIR__ . '/../Conexion/Conexion.php';
require_once __DIR__ . '/../Constantes/EstadoCONST.php';
require_once __DIR__ . '/../POJO/Usuario.php';
require_once __DIR__ . '/../POJO/Estado.php';
require_once __DIR__ . '/../POJO/TipoUsuario.php';
require_once __DIR__ . '/../DAO/UsuarioDAO.php';
require_once __DIR__ . '/../DAO/EstadoDAO.php';
require_once __DIR__ . '/../DAO/TipoUsuarioDAO.php';
require_once __DIR__ . '/../NegDTO/UsuarioNDTO.php';

/**
 * Description of UsuarioNEG
 *
 * @author ccastro
 */
class UsuarioNEG {
    
    /**
     * Válida login usuario
     * 
     * @param string $cRut
     * @param string $cContrasena
     * @return UsuarioNDTO
     */
    public static function validaLogin($cRut, $cContrasena) {
        $oUsuarioNDTO = new UsuarioNDTO();
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oUsuario = UsuarioDAO::obtUsuarioXRutYPass($oPDO, $cRut, $cContrasena);
        
        // No encontrado en BD
        if( ! $oUsuario ) {
            $oUsuarioNDTO->bExito = FALSE;
            $oUsuarioNDTO->cMensaje = "Usuario o Contraseña inválida.";
            
        // Inactivo
        } else if($oUsuario->id_estado == EstadoCONST::INACTIVO) {
            $oUsuarioNDTO->bExito = FALSE;
            $oUsuarioNDTO->cMensaje = "Usuario inactivo. Comuníquese con el Administrador del Sistema para solucionar la situación.";
            
        // Encontrado
        } else {
            $oUsuarioNDTO->bExito = TRUE;
            $oUsuarioNDTO->oUsuario = $oUsuario;
            $oUsuarioNDTO->oEstado = EstadoDAO::obtEstado($oPDO, $oUsuario->id_estado);
            $oUsuarioNDTO->oTipoUsuario = TipoUsuarioDAO::obtTipoUsuario($oPDO, $oUsuario->id_tipo_usuario);
        }
        
        return $oUsuarioNDTO;
    }
    
}

<?php
require_once SERFELCLASSPATH.'Negocio/UsuarioNEG.php';

class BasicAuth {

    public static function authenticate() {
        $oUsuario = null;

        session_start();
        if ( isset($_SESSION["oUsuarioSession"]) ) {
            $oUsuario = $_SESSION["oUsuarioSession"]->oUsuario;

        } else if ( isset($_SERVER['PHP_AUTH_USER']) && isset($_SERVER['PHP_AUTH_PW']) ) {
            $user = $_SERVER['PHP_AUTH_USER'];
            $pass = $_SERVER['PHP_AUTH_PW'];
            $oUsuarioNDTO = UsuarioNEG::validaLogin($user, $pass);
            if ( $oUsuarioNDTO->bExito ) {
                $oUsuario = $oUsuarioNDTO->oUsuario;
            }
        }

        return $oUsuario;
    }

}

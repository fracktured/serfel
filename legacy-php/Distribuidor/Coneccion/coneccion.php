<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 12-08-2011                                        *
 * Desc : Coneccion a BD                                    *
 ************************************************************/

    // DB config is injected via environment (Secrets Manager on Fargate ->
    // serfel-dev-db). Fallbacks are the legacy names for local dev; the
    // password is never hardcoded.
    function getHostBD() {
        return getenv('DB_HOST') ?: "mariadb";
    }

    function getUsuarioBD() {
        return getenv('DB_USER') ?: "serfelcl_dist";
    }

    function getPassBD() {
        return getenv('DB_PASS') ?: "";
    }

    function getNomBD() {
        return getenv('DB_NAME') ?: "serfelcl_distribuidor";
    }

    function conectarse() {
        //mysql_set_charset("utf8");
        $db = mysql_connect(getHostBD(), getUsuarioBD(), getPassBD());
        mysql_set_charset('utf8', $db);
        
        if (!$db) {
            die("No es posible conectarse: " . mysql_error());
        }
        if (!mysql_select_db(getNomBD(), $db)) {
            die("No es posible conectarse a la Base de Datos: " . mysql_error());
        }

        return $db;
    }
?>
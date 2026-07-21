<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 12-08-2011                                        *
 * Desc : Coneccion a BD                                    *
 ************************************************************/

    function getUsuarioBD() {
        return "serfelcl_dist";
        //return "dist";
    }
    
    function getPassBD() {
        return "sis2011dist";
    }
    
    function getNomBD() {
        return "serfelcl_distribuidor";
    }

    function conectarse() {
        //mysql_set_charset("utf8");
        $db = mysql_connect("mariadb", getUsuarioBD(), getPassBD());
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
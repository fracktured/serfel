<?php

/**
 * Description of Conexion
 *
 * @author ccastro
 */
class Conexion {
    
    private $dbname = "serfelcl_distribuidor";
    private $usuario = "serfelcl_dist";
    private $password = "sis2011dist";
    private $options = array(
        PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8',
    );

    public function __construct() {
        
    }
    
    public function abrirConexion() {
        try {
            $db = new PDO("mysql:dbname=$this->dbname;host=mariadb", $this->usuario, $this->password, $this->options);
            $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            return $db;
            //echo "PDO connection object created";
        } catch (PDOException $e) {
            echo $e->getMessage();
            
            return null;
        }
    }

}

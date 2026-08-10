<?php

/**
 * Description of Conexion
 *
 * @author ccastro
 */
class Conexion {
    
    private $dbname;
    private $usuario;
    private $password;
    private $host;
    private $options = array(
        PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8',
    );

    public function __construct() {
        // DB config injected via environment (Secrets Manager on Fargate ->
        // serfel-dev-db). Fallbacks are the legacy names for local dev; the
        // password is never hardcoded.
        $this->host     = getenv('DB_HOST') ?: 'mariadb';
        $this->dbname   = getenv('DB_NAME_COPROAD') ?: 'serfelcl_coproad';
        $this->usuario  = getenv('DB_USER') ?: 'serfelcl_coproadUser';
        $this->password = getenv('DB_PASS') ?: '';
    }

    public function abrirConexion() {
        try {
            $db = new PDO("mysql:dbname=$this->dbname;host=$this->host", $this->usuario, $this->password, $this->options);
            $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            return $db;
            //echo "PDO connection object created";
        } catch (PDOException $e) {
            echo $e->getMessage();
            
            return null;
        }
    }

}
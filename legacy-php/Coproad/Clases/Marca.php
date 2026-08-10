<?php

/* * **********************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 19-08-2011                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a los Usuarios (tabla 10_m_usuario)     *
 * ********************************************************** */

class Marca {

    //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
    private $id_marca = "";       // GET
    private $nom_marca = "";       // GET
    private $desc_marca = "";       // GET

    //</editor-fold>
    //<editor-fold defaultstate="collapsed" desc="CONSTRUCTORES">

    function __construct() {
        /*         * **********************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 20-08-2011                                        *
         * Modif: 28-12-2011                                        *
         * Desc : Constructores principales de la Clase Usuario     *
         * ********************************************************** */

        //<editor-fold defaultstate="collapsed" desc="Se carga la clase con la info del Local Cliente segun Id">
        if (func_num_args() == 1) {

            $query = " SELECT   id_marca,
                                nom_marca,
                                desc_marca
                        FROM 20_p_marca
                        WHERE id_marca = " . func_get_arg(0);

            $db = conectarse();

            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);

            if ($totRes > 0) {
                while ($filaDB = mysql_fetch_assoc($resDB)) {
                    $this->id_marca = $filaDB["id_marca"];
                    $this->nom_marca = $filaDB["nom_marca"];
                    $this->desc_marca = $filaDB["desc_marca"];
                }
            }
            //</editor-fold>
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Cliente)">
        } else if (func_num_args() == 3) {
            $this->id_marca = func_get_arg(0);
            $this->nom_marca = func_get_arg(1);
            $this->desc_marca = func_get_arg(2);
        }
        //</editor-fold>
    }

    //</editor-fold>

    private function obtMarca() {
        /*         * **********************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 23-11-2011                                        *
         * Desc : Devuelve el siguiente Id Clientes del sistema.    *
         *        Esta funcionalidad solo trabaja si la tabla de    *
         *        Clientes tiene por lo menos un registro           *
         * ********************************************************** */
        $db = conectarse();

        $query = "SELECT ((MAX(id_marca) + 1)) AS id_marca
                          FROM 20_p_marca";

        $resDB = mysql_query($query, $db) or die(mysql_error());

        while ($filaDB = mysql_fetch_assoc($resDB)) $id_marca = $filaDB["id_marca"];
        
        if($id_marca == "") $id_marca = 1;

        mysql_close($db);
        return $id_marca;
    }

    function ingMarca($nom, $desc) {
        /*         * *********************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 19-08-2011                                        *
         * Desc : Ingresa Clientes nuevos al sistema                *
         * Resp : { -1: Rut ya existe y no esta activo.             *
         *           0: Rut ya existe y esta activo.                *
         *          >0: Cliente ingresado con exito.                *
         *        }                                                 *
         * ********************************************************** */
        $idMarca = $this->obtMarca();

        $db = conectarse();

        $query = "SELECT *
            FROM 20_p_marca
            WHERE nom_marca = '" . $nom . "'";

        $resDB = mysql_query($query, $db) or die(mysql_error());
        $totRes = mysql_num_rows($resDB);

        if ($totRes == 0) {
            $query = "INSERT INTO 20_p_marca (  id_marca,
                                                    nom_marca,
                                                    desc_marca
                                                    )
                            VALUES (" . $idMarca . ",
                                   '" . $nom . "',
                                   '" . $desc . "'
                                       )";
            mysql_query($query, $db) or die(mysql_error());
            mysql_close($db);
            return 1;
        } else {
            return 0;
        }
    }

    function elimMarca($idMarca) {

        $db = conectarse();

        $query = "SELECT *
            FROM 20_m_producto
            WHERE id_marca =" . $idMarca."";

        $resDB = mysql_query($query, $db) or die(mysql_error());
        $totRes = mysql_num_rows($resDB);

        if ($totRes == 0) {

            $query = "DELETE FROM 20_p_marca WHERE id_marca = " . $idMarca . "";
            mysql_query($query, $db) or die(mysql_error());
            mysql_close($db);

            return 1;
        } else {
            return 0;
        }
    }

    function modMarca($idMarca, $desc) {
        /*         * **********************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 28-12-2011                                        *
         * Desc : Modifica a un Usuario del sistema                 *
         * Resp : {  1: Usuario modificado.                         *
         *        }                                                 *
         * ********************************************************** */
        $db = conectarse();

        $query = "UPDATE 20_p_marca
                              SET desc_marca = '" . $desc . "'
                          WHERE id_marca = " . $idMarca;

        mysql_query($query, $db) or die(mysql_error());

        mysql_close($db);
        return 1;
    }

    //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
    public function getId_marca() {
        return $this->id_marca;
    }

    public function setId_marca($id_marca) {
        $this->id_marca = $id_marca;
    }

    public function getNom_marca() {
        return $this->nom_marca;
    }

    public function setNom_marca($nom_marca) {
        $this->nom_marca = $nom_marca;
    }

    public function getDesc_marca() {
        return $this->desc_marca;
    }

    public function setDesc_marca($desc_marca) {
        $this->desc_marca = $desc_marca;
    }

    //</editor-fold>
}

?>

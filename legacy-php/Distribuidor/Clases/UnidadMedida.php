<?php

/* * **********************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 19-08-2011                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a los Usuarios (tabla 10_m_usuario)     *
 * ********************************************************** */

class UnidadMedida {

    //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
    private $id_UM = "";       // GET
    private $nom_UM = "";       // GET
    private $desc_UM = "";       // GET

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

            $query = " SELECT   id_UM,
                                nom_UM,
                                desc_UM
                        FROM 20_p_unidad_medida
                        WHERE id_UM = " . func_get_arg(0);

            $db = conectarse();

            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);

            if ($totRes > 0) {
                while ($filaDB = mysql_fetch_assoc($resDB)) {
                    $this->id_UM = $filaDB["id_UM"];
                    $this->nom_UM = $filaDB["nom_UM"];
                    $this->desc_UM = $filaDB["desc_UM"];
                }
            }
            //</editor-fold>
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Cliente)">
        } else if (func_num_args() == 3) {
            $this->id_UM = func_get_arg(0);
            $this->nom_UM = func_get_arg(1);
            $this->desc_UM = func_get_arg(2);
        }
        //</editor-fold>
    }

    //</editor-fold>

    private function obtUnidadMedida() {
        /*         * **********************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 23-11-2011                                        *
         * Desc : Devuelve el siguiente Id Clientes del sistema.    *
         *        Esta funcionalidad solo trabaja si la tabla de    *
         *        Clientes tiene por lo menos un registro           *
         * ********************************************************** */
        $db = conectarse();

        $query = "SELECT ((MAX(id_UM) + 1)) AS id_UM
                          FROM 20_p_unidad_medida";

        $resDB = mysql_query($query, $db) or die(mysql_error());

        while ($filaDB = mysql_fetch_assoc($resDB)) $id_UM = $filaDB["id_UM"];
        
        if($id_UM == "") $id_UM = 1;

        mysql_close($db);
        return $id_UM;
    }

    function ingUnidaMedida($nom, $desc) {
        /*         * *********************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 19-08-2011                                        *
         * Desc : Ingresa Clientes nuevos al sistema                *
         * Resp : { -1: Rut ya existe y no esta activo.             *
         *           0: Rut ya existe y esta activo.                *
         *          >0: Cliente ingresado con exito.                *
         *        }                                                 *
         * ********************************************************** */
        $idUnidadMedida = $this->obtUnidadMedida();

        $db = conectarse();

        $query = "SELECT *
            FROM 20_p_unidad_medida
            WHERE nom_UM = '" . $nom . "'";

        $resDB = mysql_query($query, $db) or die(mysql_error());
        $totRes = mysql_num_rows($resDB);

        if ($totRes == 0) {
            $query = "INSERT INTO 20_p_unidad_medida (  id_UM,
                                                    nom_UM,
                                                    desc_UM
                                                    )
                            VALUES (" . $idUnidadMedida . ",
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

    function elimUnidadMedida($idUnidadMedida) {

        $db = conectarse();

        $query = "SELECT *
            FROM 20_m_producto
            WHERE id_UM =" . $idUnidadMedida;

        $resDB = mysql_query($query, $db) or die(mysql_error());
        $totRes = mysql_num_rows($resDB);

        if ($totRes == 0) {

            $query = "DELETE FROM 20_p_unidad_medida WHERE id_UM = " . $idUnidadMedida . "";
            mysql_query($query, $db) or die(mysql_error());
            mysql_close($db);

            return 1;
        } else {
            return 0;
        }
    }

    function modUnidadMedida($idUnidadMedida,$desc) {
        /*         * **********************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 28-12-2011                                        *
         * Desc : Modifica a un Usuario del sistema                 *
         * Resp : {  1: Usuario modificado.                         *
         *        }                                                 *
         * ********************************************************** */
        $db = conectarse();

        $query = "UPDATE 20_p_unidad_medida
                              SET desc_UM = '" . $desc . "'
                          WHERE id_UM = " . $idUnidadMedida;

        mysql_query($query, $db) or die(mysql_error());

        mysql_close($db);
        return 1;
    }

    //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
    public function getId_UM() {
        return $this->id_UM;
    }

    public function setId_UM($id_UM) {
        $this->id_UM = $id_UM;
    }

    public function getNom_UM() {
        return $this->nom_UM;
    }

    public function setNom_UM($nom_UM) {
        $this->nom_UM = $nom_UM;
    }

    public function getDesc_UM() {
        return $this->desc_UM;
    }

    public function setDesc_UM($desc_UM) {
        $this->desc_UM = $desc_UM;
    }

    //</editor-fold>
}

?>

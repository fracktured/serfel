<?php

/* * **********************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 19-08-2011                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a los Usuarios (tabla 10_m_usuario)     *
 * ********************************************************** */

class TipoProducto {

    //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
    private $id_tipo_producto = "";       // GET
    private $nom_tipo_producto = "";       // GET
    private $desc_tipo_producto = "";       // GET
    private $nivel_1 = "";       // GET
    private $nivel_2 = "";       // GET
    private $id_usuario_mod = "";       // GET
    private $ult_fecha_mod = "";       // GET
    private $id_estado = "";       // GET
    private $nombreFamilia = "";       // GET

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

            $query = "SELECT tp.id_tipo_producto,
                             tp.nom_tipo_producto,
                             tp.desc_tipo_producto,
                             tp.nivel_1,
                             tp.nivel_2,
                             tpp.nom_tipo_producto AS nombreFamilia
                      FROM 20_p_tipo_producto tp
                          INNER JOIN 20_p_tipo_producto tpp ON tp.nivel_1 = tpp.id_tipo_producto
                      WHERE tp.id_tipo_producto = " . func_get_arg(0);

            $db = conectarse();

            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);

            if ($totRes > 0) {
                while ($filaDB = mysql_fetch_assoc($resDB)) {
                    $this->id_tipo_producto = $filaDB["id_tipo_producto"];
                    $this->nom_tipo_producto = $filaDB["nom_tipo_producto"];
                    $this->desc_tipo_producto = $filaDB["desc_tipo_producto"];
                    $this->nivel_1 = $filaDB["nivel_1"];
                    $this->nivel_2 = $filaDB["nivel_2"];
                    $this->nombreFamilia = $filaDB["nombreFamilia"];
                }
            }
            //</editor-fold>
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Cliente)">
        } else if (func_num_args() == 6) {
            $this->id_tipo_producto = func_get_arg(0);
            $this->nom_tipo_producto = func_get_arg(1);
            $this->desc_tipo_producto = func_get_arg(2);
            $this->nivel_1 = func_get_arg(3);
            $this->nivel_2 = func_get_arg(4);
            $this->nombreFamilia = func_get_arg(5);
        }
        //</editor-fold>
    }

    //</editor-fold>

    private function obtTipoProducto() {
        /*         * **********************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 23-11-2011                                        *
         * Desc : Devuelve el siguiente Id Clientes del sistema.    *
         *        Esta funcionalidad solo trabaja si la tabla de    *
         *        Clientes tiene por lo menos un registro           *
         * ********************************************************** */
        $db = conectarse();

        $query = "SELECT (((MAX(id_tipo_producto) + 1))) as id_tipo_producto
                          FROM 20_p_tipo_producto";

        $resDB = mysql_query($query, $db) or die(mysql_error());

        while ($filaDB = mysql_fetch_assoc($resDB)) $id_tipo_producto = $filaDB["id_tipo_producto"];
        
        if($id_tipo_producto == "") $id_tipo_producto = 1;

        mysql_close($db);
        return $id_tipo_producto;
    }

    function ingTipoProducto($nom, $desc, $n1, $usu) {
        /*         * **********************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 19-08-2011                                        *
         * Desc : Ingresa Clientes nuevos al sistema                *
         * Resp : { -1: Rut ya existe y no esta activo.             *
         *           0: Rut ya existe y esta activo.                *
         *          >0: Cliente ingresado con exito.                *
         *        }                                                 *
         * ********************************************************** */

        $idTipoProducto = $this->obtTipoProducto();

        $db = conectarse();

        $query = "SELECT *
            FROM 20_p_tipo_producto
            WHERE nom_tipo_producto = '" . $nom . "'";

        $resDB = mysql_query($query, $db) or die(mysql_error());
        $totRes = mysql_num_rows($resDB);

        if ($totRes == 0) {

            if ($n1 == 0) {
                $n1 = $idTipoProducto;
                $n2 = 0;
            } else {
                $n2 = $idTipoProducto;
            }

            $query = "INSERT INTO 20_p_tipo_producto (id_tipo_producto,
                                                    nom_tipo_producto,
                                                    desc_tipo_producto,
                                                    nivel_1,
                                                    nivel_2,
                                                    id_usuario_mod,
                                                    ult_fecha_mod,
                                                    id_estado)
                            VALUES (" . $idTipoProducto . ",
                                   '" . $nom . "',
                                   '" . $desc . "',
                                   " . $n1 . ",
                                   " . $n2 . ",
                                   " . $usu . ",
                                   NOW(),
                                   1)";
            mysql_query($query, $db) or die(mysql_error());

            mysql_close($db);
            return 1;
        } else {
            return 0;
        }
    }

    function elimTipoProducto($idTipoProd) {
        $db = conectarse();

        $query = "SELECT *
            FROM 20_m_producto
            WHERE id_tipo_producto IN (SELECT id_tipo_producto
                                       FROM 20_p_tipo_producto
                                       WHERE nivel_1 = " . $idTipoProd . "
                                           OR nivel 2 = " . $idTipoProd . ")";

        $resDB = mysql_query($query, $db) or die(mysql_error());
        $totRes = mysql_num_rows($resDB);

        if ($totRes == 0) {

            $query = "SELECT * FROM 20_p_tipo_producto WHERE id_tipo_producto != " . $idTipoProd . " AND (nivel_1 = " . $idTipoProd . " OR nivel_2=" . $idTipoProd . ")";

            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);

            if ($totRes == 0) {

                $query = "DELETE FROM 20_p_tipo_producto WHERE id_tipo_producto = " . $idTipoProd . "";
                $resDB = mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                return 1;
            } else {
                return -2;
            }
        } else if ($totRes > 0) {
            mysql_close($db);
            return -1;
        }
    }

    function modTipoProducto($idTipoProd, $desc, $n1, $idUsu) {
        /*         * **********************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 28-12-2011                                        *
         * Desc : Modifica a un Usuario del sistema                 *
         * Resp : {  1: Usuario modificado.                         *
         *        }                                                 *
         * ********************************************************** */
        $db = conectarse();

        if ($n1 == 0) {
            $n1 = $idTipoProd;
            $n2 = 0;
        } else {
            $n2 = $idTipoProd;
        }

        $query = "UPDATE 20_p_tipo_producto
                              SET desc_tipo_producto = '" . $desc . "',
                                  nivel_1      = " . $n1 . ",
                                  nivel_2      = " . $n2 . ",
                                  ult_fecha_mod  = NOW(),
                                  id_usuario_mod = " . $idUsu . "
                          WHERE id_tipo_producto = " . $idTipoProd;

        mysql_query($query, $db) or die(mysql_error());

        mysql_close($db);
        return 1;
    }

    //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
    public function getId_tipo_producto() {
        return $this->id_tipo_producto;
    }

    public function setId_tipo_producto($id_tipo_producto) {
        $this->id_tipo_producto = $id_tipo_producto;
    }

    public function getNom_tipo_producto() {
        return $this->nom_tipo_producto;
    }

    public function setNom_tipo_producto($nom_tipo_producto) {
        $this->nom_tipo_producto = $nom_tipo_producto;
    }

    public function getDesc_tipo_producto() {
        return $this->desc_tipo_producto;
    }

    public function setDesc_tipo_producto($desc_tipo_producto) {
        $this->desc_tipo_producto = $desc_tipo_producto;
    }

    public function getNivel_1() {
        return $this->nivel_1;
    }

    public function setNivel_1($nivel_1) {
        $this->nivel_1 = $nivel_1;
    }

    public function getNivel_2() {
        return $this->nivel_2;
    }

    public function setNivel_2($nivel_2) {
        $this->nivel_2 = $nivel_2;
    }

    public function getid_usuario_mod() {
        return $this->id_usuario_mod;
    }

    public function setid_usuario_mod($id_usuario_mod) {
        $this->id_usuario_mod = $id_usuario_mod;
    }

    public function getUlt_fecha_mod() {
        return $this->ult_fecha_mod;
    }

    public function setUlt_fecha_mod($ult_fecha_mod) {
        $this->ult_fecha_mod = $ult_fecha_mod;
    }

    public function getId_estado() {
        return $this->id_estado;
    }

    public function setId_estado($id_estado) {
        $this->id_estado = $id_estado;
    }

    public function getNombreFamilia() {
        return $this->nombreFamilia;
    }

    public function setNombreFamilia($nombreFamilia) {
        $this->nombreFamilia = $nombreFamilia;
    }

    //</editor-fold>
}

?>

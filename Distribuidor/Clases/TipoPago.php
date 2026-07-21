<?php

/* * **********************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 19-08-2011                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a los Usuarios (tabla 10_m_usuario)     *
 * ********************************************************** */
class TipoPago {

    //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
    private $id_tipo_docto = "";       // GET
    private $nom_tipo_docto = "";       // GET
    private $desc_tipo_docto = "";       // GET

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

            $query = " SELECT	id_tipo_docto,
                    nom_tipo_docto,
                    desc_tipo_docto                   
                    FROM 10_p_tipo_docto
                    WHERE id_tipo_docto = " . func_get_arg(0);

            $db = conectarse();

            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);

            if ($totRes > 0) {

                while ($filaDB = mysql_fetch_assoc($resDB)) {
                    $this->id_tipo_docto = $filaDB["id_tipo_docto"];
                    $this->nom_tipo_docto = $filaDB["nom_tipo_docto"];
                    $this->desc_tipo_docto = $filaDB["desc_tipo_docto"];
                }
            }
            //</editor-fold>
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Cliente)">
        } else if (func_num_args() == 3) {
            $this->id_tipo_docto = func_get_arg(0);
            $this->nom_tipo_docto = func_get_arg(1);
            $this->desc_tipo_docto = func_get_arg(2);
        }
        //</editor-fold>
    }

    //</editor-fold>
    //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
    public function getIdTipoDocto() {
        return $this->id_tipo_docto;
    }

    public function getNomTipoDocto() {
        return $this->nom_tipo_docto;
    }

    public function getDescTipoDocto() {
        return $this->desc_tipo_docto;
    }

    //</editor-fold>
}
?>
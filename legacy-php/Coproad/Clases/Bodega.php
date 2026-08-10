<?php

/* * **********************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 19-08-2011                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a los Usuarios (tabla 10_m_usuario)     *
 * ********************************************************** */

class Bodega {

    //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
    private $id_bodega       = "";
    private $nom_bodega      = "";
    private $desc_bodega     = "";
    private $id_tipo_bodega  = "";
    private $nom_tipo_bodega = "";
    private $id_usuario_mod  = "";
    private $ult_fecha_mod   = "";
    private $id_estado       = "";
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
        if(func_num_args() == 1) {
            $db = conectarse();
            
            $query = "SELECT b.id_bodega,
                             b.nom_bodega,
                             b.desc_bodega,
                             b.id_tipo_bodega,
                             tb.nom_tipo_bodega
                      FROM 50_m_bodega b
                          INNER JOIN 50_p_tipo_bodega tb ON b.id_tipo_bodega = tb.id_tipo_bodega
                      WHERE id_bodega = " . func_get_arg(0);
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);

            if($totRes > 0) {
                while($filaDB = mysql_fetch_assoc($resDB)) {
                    $this->id_bodega       = $filaDB["id_bodega"];
                    $this->nom_bodega      = $filaDB["nom_bodega"];
                    $this->desc_bodega     = $filaDB["desc_bodega"];
                    $this->id_tipo_bodega  = $filaDB["id_tipo_bodega"];
                    $this->nom_tipo_bodega = $filaDB["nom_tipo_bodega"];
                }
            }
            //</editor-fold>
        
        //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Cliente)">
        } else if (func_num_args() == 5) {
            $this->id_bodega       = func_get_arg(0);
            $this->nom_bodega      = func_get_arg(1);
            $this->desc_bodega     = func_get_arg(2);
            $this->id_tipo_bodega  = func_get_arg(3);
            $this->nom_tipo_bodega = func_get_arg(4);
        }
        //</editor-fold>
    }

    //</editor-fold>

    //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
    public function getIdBodega() {
        return $this->id_bodega;
    }

    public function getNomBodega() {
        return $this->nom_bodega;
    }

    public function getDescBodega() {
        return $this->desc_bodega;
    }

    public function getIdTipoBodega() {
        return $this->id_tipo_bodega;
    }

    public function getNomTipoBodega() {
        return $this->nom_tipo_bodega;
    }

            //</editor-fold>
}

?>

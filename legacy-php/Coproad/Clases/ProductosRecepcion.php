<?php

/* * **********************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 19-08-2011                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a los Usuarios (tabla 10_m_usuario)     *
 * ********************************************************** */

class ProductosRecepcion {

    //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
    private $id_producto  = "";
    private $nom_producto = "";
    private $nom_UM       = "";
    private $cantidad     = "";
    private $valor        = "";
    private $nom_marca    = "";
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

            //</editor-fold>
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Cliente)">
        } else if (func_num_args() == 6) {
            $this->id_producto = func_get_arg(0);
            $this->nom_producto = func_get_arg(1);
            $this->nom_UM = func_get_arg(2);
            $this->cantidad = func_get_arg(3);
            $this->valor = func_get_arg(4);
            $this->nom_marca = func_get_arg(5);
        }
        //</editor-fold>
    }
    //</editor-fold>

    //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
    public function getIdProducto() {
        return $this->id_producto;
    }

    public function getNomProducto() {
        return $this->nom_producto;
    }

    public function getNomUM() {
        return $this->nom_UM;
    }

    public function getCantidad() {
        return $this->cantidad;
    }

    public function getValor() {
        return $this->valor;
    }
    public function getNomMarca() {
        return $this->nom_marca;
    }

        //</editor-fold>
}

?>

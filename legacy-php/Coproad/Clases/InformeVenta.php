<?php

/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 19-08-2011                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a los Informes de Venta                 *
 ************************************************************/

class InformeVenta {

    //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
    private $ruta_relativa      = "";
    private $local_cliente      = "";
    private $cantidad_productos = "";
    private $precio_total       = "";
    //</editor-fold>
    
    //<editor-fold defaultstate="collapsed" desc="CONSTRUCTORES">
    function __construct() {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 20-08-2011                                        *
         * Modif: 28-12-2011                                        *
         * Desc : Constructores principales de la Clase InformeVenta*
         ************************************************************/
        if(func_num_args() > 0) $this->ruta_relativa = func_get_arg(0);

        //<editor-fold defaultstate="collapsed" desc="Se carga la clase con la info segun setInformeVentasPorVendedorCliente">
        if (func_num_args() == 4) {
            include_once($this->ruta_relativa . "Clases/LocalCliente.php");
            
            $this->local_cliente      = new LocalCliente(func_get_arg(1));
            $this->cantidad_productos = func_get_arg(2);
            $this->precio_total       = func_get_arg(3);
        }
        //</editor-fold>
    }

    //</editor-fold>
    
    //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
    public function getLocalCliente() {
        return $this->local_cliente;
    }

    public function getCantidadProductos() {
        return $this->cantidad_productos;
    }

    public function getPreciototal() {
        return $this->precio_total;
    }
    //</editor-fold>
}

?>

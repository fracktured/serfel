<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 02-02-2012                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a las Mermas (tabla 50_m_mermas)        *
 ************************************************************/

    class Merma {
        
        //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
        private $id_bodega          = "";
        private $nom_bodega         = "";
        private $id_producto        = "";
        private $nom_producto       = "";
        private $nom_UM             = "";
        private $id_tipo_producto   = "";
        private $nom_tipo_producto  = "";
        private $cantidad           = "";
        private $motivo_merma       = "";
        private $fecha_merma        = "";
        private $meses              = "";
        private $id_usuario_mod     = "";
        private $fecha_modificacion = "";
        private $estado             = "";
        //</editor-fold>
        
        //<editor-fold defaultstate="collapsed" desc="CONSTRUCTORES">
        function __construct() {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 20-08-2011                                        *
         * Modif: 28-12-2011                                        *
         * Desc : Constructores principales de la Clase             *
         *        Merma                                             *
         ************************************************************/
            
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Lista)">
            if(func_num_args() == 8) {
                $this->id_producto       = func_get_arg(0);
                $this->nom_producto      = func_get_arg(1);
                $this->id_tipo_producto  = func_get_arg(2);
                $this->nom_tipo_producto = func_get_arg(3);
                $this->nom_UM            = func_get_arg(4);
                $this->cantidad          = func_get_arg(5);
                $this->motivo_merma      = func_get_arg(6);
                $this->fecha_merma       = func_get_arg(7);
            }
            //</editor-fold>
        }
        //</editor-fold>
        
        function ingMerma($idBodega, $idProducto, $cantidad, $motivo, $idUsuIng) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Ingresa Alertas de Stock nuevas al sistema        *
         * Resp : { 0: Alerta ya existe y esta activa.              *
         *          1: Alerta ingresada con exito.                  *
         *        }                                                 *
         ************************************************************/
            include_once("../../Clases/Stock.php");
            
            $db = conectarse();

            $query = "INSERT INTO 50_m_mermas (id_bodega,
                                               fecha_merma,
                                               id_producto,
                                               cantidad,
                                               motivo_merma,
                                               id_usuario_merma,
                                               id_usuario_mod,
                                               ult_fecha_mod)
                        VALUES (" . $idBodega . ",
                                NOW(),
                                " . $idProducto . ",
                                " . $cantidad . ",
                                '" . $motivo . "',
                                " . $idUsuIng . ",
                                " . $idUsuIng . ",
                                NOW())";
            mysql_query($query, $db) or die(mysql_error());
            mysql_close($db);
            
            $stock = new Stock();
            $stock->modStock($idBodega, $idProducto, $cantidad * -1);

            return 1;
        }
        
        function elimMerma($idBodega, $idProducto, $fechaMerma, $idUsuElim) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Elimina a una Empresa del sistema                 *
         * Resp : {  1: Alerta eliminada.                           *
         *        }                                                 *
         ************************************************************/
            include_once("../../Clases/Stock.php");
            $db = conectarse();
            
            $query = "UPDATE 50_m_mermas
                          SET id_estado      = 0,
                              ult_fecha_mod  = NOW(),
                              id_usuario_mod = " . $idUsuElim . "
                      WHERE id_bodega = " . $idBodega . "
                          AND id_producto = " . $idProducto . "
                          AND fecha_merma = '" . $fechaMerma . "'";
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $query = "SELECT cantidad
                      FROM 50_m_mermas
                      WHERE id_bodega = " . $idBodega . "
                          AND id_producto = " . $idProducto . "
                          AND fecha_merma = '" . $fechaMerma . "'";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $cantidad = "";
            while($filaDB = mysql_fetch_assoc($resDB)) {
                $cantidad = $filaDB["cantidad"];
            }
            mysql_close($db);
            
            $stock = new Stock();
            $stock->modStock($idBodega, $idProducto, $cantidad);
            
            return 1;
        }
        
        //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
        function getIdBodega() {
            return $this->id_bodega;
        }
        
        function getNomBodega() {
            return $this->nom_bodega;
        }
        
        function getIdProducto() {
            return $this->id_producto;
        }
        
        function getNomProducto() {
            return $this->nom_producto;
        }
        
        function getNomUM() {
            return $this->nom_UM;
        }
        
        function getIdTipoProducto() {
            return $this->id_tipo_producto;
        }
        
        function getNomTipoProducto() {
            return $this->nom_tipo_producto;
        }
        
        function getCantidad() {
            return $this->cantidad;
        }
        
        function getMotivoMerma() {
            return $this->motivo_merma;
        }
        
        function getFechaMerma() {
            return $this->fecha_merma;
        }
        
        function getIdUsuarioMod() {
            return $this->id_usuario_mod;
        }
        
        function getFechaModificacion() {
            return $this->fecha_modificacion;
        }
        
        function getEstado() {
            return $this->estado;
        }
        //</editor-fold>
    }

?>

<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 02-02-2012                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados al Stock (tabla 50_m_stock)             *
 ************************************************************/

    class Stock {
        
        //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
        private $id_bodega          = "";
        private $nom_bodega         = "";
        private $id_producto        = "";
        private $nom_producto       = "";
        private $nom_UM             = "";
        private $id_tipo_producto   = "";
        private $nom_tipo_producto  = "";
        private $cantidad           = "";
        private $costo_prom         = "";
        private $costo_prom_total   = "";
        private $ultima_compra      = "";
        private $minimo             = "";
        private $punto_orden        = "";
        private $meses              = "";
        private $color              = "";
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
         *        TipoMovimiento                                    *
         ************************************************************/
            
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Lista, metodo getListaExistenciasPorBodega)">
            if(func_num_args() == 3) {
                $this->id_producto = func_get_arg(0);
                $this->id_bodega = func_get_arg(1);
                $tipo = func_get_arg(2);
                
                if($tipo == "nivelStock") {
                    $query = "SELECT p.nom_producto,
                                     b.nom_bodega,
                                     npb.minimo,
                                     npb.punto_orden,
                                     npb.meses
                              FROM 50_m_nivel_producto_bodega npb
                                  INNER JOIN 20_m_producto p ON npb.id_producto = p.id_producto
                                  INNER JOIN 50_m_bodega b ON npb.id_bodega = b.id_bodega
                              WHERE npb.id_producto = " . $this->id_producto . "
                                  AND npb.id_bodega = " . $this->id_bodega;
                    
                    $db = conectarse();

                    $resDB = mysql_query($query, $db) or die(mysql_error());
                    $totRes = mysql_num_rows($resDB);

                    if($totRes > 0) {
                        while ($filaDB = mysql_fetch_assoc($resDB)) {
                            $this->nom_producto = $filaDB["nom_producto"];
                            $this->nom_bodega   = $filaDB["nom_bodega"];
                            $this->minimo       = $filaDB["minimo"];
                            $this->punto_orden  = $filaDB["punto_orden"];
                            $this->meses        = $filaDB["meses"];
                        }
                    }
                }

                mysql_close($db);
            //</editor-fold>
            
            ////<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Lista, metodo getListaExistenciasPorBodega)">
            } else if(func_num_args() == 4) {
                $this->id_bodega  = func_get_arg(0);
                $this->nom_bodega = func_get_arg(1);
                $this->cantidad   = func_get_arg(2);
                $this->costo_prom = func_get_arg(3);
            //</editor-fold>
                
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Lista, metodo getListaExistenciasPorBodegaFamilia)">
            } else if(func_num_args() == 5) {
                $this->id_bodega         = func_get_arg(0);
                $this->id_tipo_producto  = func_get_arg(1);
                $this->nom_tipo_producto = func_get_arg(2);
                $this->cantidad          = func_get_arg(3);
                $this->costo_prom        = func_get_arg(4);
            //</editor-fold>
            
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Lista, metodo 'varios')">
            } else if(func_num_args() == 9) {
                $tipoLista = func_get_arg(8);
                
                if($tipoLista == "Existencias") {
                    $this->id_producto      = func_get_arg(0);
                    $this->nom_producto     = func_get_arg(1);
                    $this->nom_UM           = func_get_arg(2);
                    $this->costo_prom       = func_get_arg(3);
                    $this->cantidad         = func_get_arg(4);
                    $this->color            = func_get_arg(5);
                    $this->costo_prom_total = func_get_arg(6);
                    $this->ultima_compra    = func_get_arg(7);
                } else if($tipoLista == "NivelStock") {
                    $this->id_producto       = func_get_arg(0);
                    $this->nom_producto      = func_get_arg(1);
                    $this->id_tipo_producto  = func_get_arg(2);
                    $this->nom_tipo_producto = func_get_arg(3);
                    $this->nom_UM            = func_get_arg(4);
                    $this->minimo            = func_get_arg(5);
                    $this->punto_orden       = func_get_arg(6);
                    $this->meses             = func_get_arg(7);
                }
            }
            //</editor-fold>
        }
        //</editor-fold>
        
        function ingNivelStock($idBodega, $idProducto, $minimo, $puntoOrden, $meses, $idUsuIng) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Ingresa Alertas de Stock nuevas al sistema        *
         * Resp : { 0: Alerta ya existe y esta activa.              *
         *          1: Alerta ingresada con exito.                  *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();

            $query = "SELECT id_estado
                      FROM 50_m_nivel_producto_bodega
                      WHERE id_bodega = " . $idBodega . "
                          AND id_producto = " . $idProducto;
            $resDB = mysql_query($query, $db) or die(mysql_error());
                
            $estado = "";
            while($filaDB = mysql_fetch_assoc($resDB)) {
                $estado = $filaDB["id_estado"];
            }
            
            if($estado == 1) {
                return 0;
            } else if($estado != "" && $estado == 0) {
                return $this->modNivelStock($idBodega, $idProducto, $minimo, $puntoOrden, $meses, $idUsuIng);
            } else if($estado == "") {
                $db = conectarse();

                $query = "INSERT INTO 50_m_nivel_producto_bodega (id_bodega,
                                                                  id_producto,
                                                                  minimo,
                                                                  punto_orden,
                                                                  meses,
                                                                  id_usuario_mod,
                                                                  ult_fecha_mod)
                            VALUES (" . $idBodega . ",
                                    " . $idProducto . ",
                                    " . $minimo . ",
                                    " . $puntoOrden . ",
                                    " . $meses . ",
                                    " . $idUsuIng . ",
                                    NOW())";
                //echo $query;
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                return 1;
            }
        }
        
        function elimNivelStock($idBodega, $idProducto, $idUsuElim) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Elimina a una Empresa del sistema                 *
         * Resp : {  1: Alerta eliminada.                           *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();
            
            $query = "UPDATE 50_m_nivel_producto_bodega
                          SET id_estado      = 0,
                              ult_fecha_mod  = NOW(),
                              id_usuario_mod = " . $idUsuElim . "
                      WHERE id_bodega = " . $idBodega . "
                          AND id_producto = " . $idProducto;
            $resDB = mysql_query($query, $db) or die(mysql_error());

            mysql_close($db);
            return 1;
        }

        function modNivelStock($idBodega, $idProducto, $minimo, $puntoOrden, $meses, $idUsuMod) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Modifica a una Empresa del sistema                *
         * Resp : {  1: Empresa modificada.                         *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();

            $query = "UPDATE 50_m_nivel_producto_bodega
                        SET minimo         = " . $minimo . ",
                            punto_orden    = " . $puntoOrden . ",
                            meses          = " . $meses . ",
                            id_usuario_mod = " . $idUsuMod . ",
                            ult_fecha_mod  = NOW(),
                            id_estado      = 1
                      WHERE id_bodega = " . $idBodega . "
                          AND id_producto = " . $idProducto;
            mysql_query($query, $db) or die(mysql_error());

            mysql_close($db);
            return 1;
        }
        
        function modStock($idBodega, $idProducto, $cantidad) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Modifica el Stock del sistema                     *
         * Resp : {  1: Stock modificada.                           *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();
            
            $query = "SELECT id_bodega
                      FROM 50_m_stock
                      WHERE id_bodega = " . $idBodega . "
                          AND id_producto = " . $idProducto;
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $idBodegaStock = "";
            while($filaDB = mysql_fetch_assoc($resDB)) {
                $idBodegaStock = $filaDB["id_bodega"];
            }
            
            if($idBodegaStock != "") {
                $db = conectarse();
                
                $query = "UPDATE 50_m_stock
                              SET cantidad = cantidad + " . $cantidad . "
                          WHERE id_bodega = " . $idBodega . "
                              AND id_producto = " . $idProducto;
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
            } else if($idBodegaStock == "") {
                $db = conectarse();
                
                $query = "INSERT INTO 50_m_stock (id_bodega,
                                                  id_producto,
                                                  cantidad)
                            VALUES (" . $idBodega . ",
                                    " . $idProducto . ",
                                    " . $cantidad . ")";
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
            }
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
        
        function getCostoProm() {
            return $this->costo_prom;
        }
        
        function getCostoPromTotal() {
            return $this->costo_prom_total;
        }
        
        function getUltimaCompra() {
            return $this->ultima_compra;
        }
        
        function getMinimo() {
            return $this->minimo;
        }
        
        function getPuntoOrden() {
            return $this->punto_orden;
        }
        
        function getMeses() {
            return $this->meses;
        }
        
        function getColor() {
            return $this->color;
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

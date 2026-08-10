<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 02-02-2012                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a las Listas de Precios                 *
 *        (tabla 40_m_lista_precio)                         *
 ************************************************************/

    class ListaPrecio {
        
        //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
        private $id_lista_precio    = "";
        private $nom_lista_precio   = "";
        private $total_registros    = "";
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
            
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Lista)">
            if(func_num_args() == 2) {
                $this->id_lista_precio  = func_get_arg(0);
                $this->nom_lista_precio = func_get_arg(1);
            }
            //</editor-fold>
        }
        //</editor-fold>
        
        private function obtNuevoIdListaPrecio() {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 23-11-2011                                        *
         * Desc : Devuelve el siguiente Id Lista Precio del sistema.*
         ************************************************************/
            $db = conectarse();

            $query = "SELECT (MAX(id_lista_precio) + 1) as id_lista_precio
                          FROM 40_m_lista_precio";
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            while ($filaDB = mysql_fetch_assoc($resDB)) $idListaPrecio = $filaDB["id_lista_precio"];
            
            if($idListaPrecio == "") $idListaPrecio = 1;

            mysql_close($db);
            return $idListaPrecio;
        }
        
        function ingListaPrecio($nomListaPrecio, $idUsuIng) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Ingresa Alertas de Stock nuevas al sistema        *
         * Resp : {  0: Lista ya existe y esta activa.              *
         *          >0: Lista ingresada con exito.                  *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();

            $query = "SELECT id_lista_precio,
                             id_estado
                      FROM 40_m_lista_precio
                      WHERE nom_lista_precio = '" . $nomListaPrecio . "'";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $idListaPrecio = "";
            $estado        = "";
            while($filaDB = mysql_fetch_assoc($resDB)) {
                $idListaPrecio = $filaDB["id_lista_precio"];
                $estado        = $filaDB["id_estado"];
            }
            
            if($estado == 1) {
                return 0;
            } else if($estado != "" && $estado == 0) {
                $db = conectarse();
                
                $query = "UPDATE 40_m_lista_precio
                              SET nom_lista_precio = '" . $nomListaPrecio . "',
                                  id_usuario_mod   = " . $idUsuIng . ",
                                  ult_fecha_mod    = NOW(),
                                  id_estado        = 1
                          WHERE id_lista_precio = " . $idListaPrecio;
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                
                return 1;
            } else if($estado == "") {
                $idListaPrecio = $this->obtNuevoIdListaPrecio();
                
                $db = conectarse();
                
                $query = "INSERT INTO 40_m_lista_precio (id_lista_precio,
                                                         nom_lista_precio,
                                                         id_usuario_mod,
                                                         ult_fecha_mod)
                            VALUES (" . $idListaPrecio . ",
                                    '" . $nomListaPrecio . "',
                                    " . $idUsuIng . ",
                                    NOW())";
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                return 1;
            }
        }
        
        function elimListaPrecio($idListaPrecio, $idUsuElim) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Elimina a una Empresa del sistema                 *
         * Resp : {  1: Lista eliminada.                            *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();
            
            $query = "UPDATE 40_m_lista_precio
                          SET id_estado      = 0,
                              ult_fecha_mod  = NOW(),
                              id_usuario_mod = " . $idUsuElim . "
                      WHERE id_lista_precio = " . $idListaPrecio;
            $resDB = mysql_query($query, $db) or die(mysql_error());

            mysql_close($db);
            return 1;
        }

        function getListaPrecioProductos($rutaRelativa, $idListaPrecio) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Devuelve la Lista de Productos con sus Precios    *
         ************************************************************/
            include_once($rutaRelativa . "Clases/PrecioProducto.php");
            $listaPrecioProductos = Array();
            
            //((pp.precio + ((pp.precio * pp.porcen_desc) / 100)) / (1 + i.iva / 100)) AS precio_neto,  --> precio_neto
            
            $db = conectarse();
            $query = "SELECT DISTINCT
                             p.id_producto,
                             p.cod_serfel,
                             p.nom_producto,
                             p.costo_prom,
                             pp.precio_neto,
                             pp.precio AS precio_base,
                             (((100 * ((pp.precio / (1 + i.iva / 100)) + (((pp.precio / (1 + i.iva / 100)) * pp.porcen_desc) / 100))) / p.costo_prom) - 100) AS margen_utilidad,
                             pp.max_porcen_desc AS porcen_desc,
                             pp.precio + ((pp.precio * pp.porcen_desc) / 100) AS precio_venta,
                             pp.cant_tramo1,
                             pp.max_porcen_tramo1,
                             pp.cant_tramo2,
                             pp.max_porcen_tramo2,
                             pp.cant_tramo3,
                             pp.max_porcen_tramo3
                      FROM 20_m_producto p
                          INNER JOIN 40_m_lista_precio lp ON lp.id_lista_precio = " . $idListaPrecio . "
                          LEFT OUTER JOIN 40_m_precio_producto pp ON lp.id_lista_precio = pp.id_lista_precio
                              AND p.id_producto = pp.id_producto
                          INNER JOIN 99_p_iva i
                      WHERE p.id_estado = 1";
            /*
             * $query = "SELECT DISTINCT
                             p.id_producto,
                             p.nom_producto,
                             CASE ISNULL(p.costo_prom)
                                 WHEN 1 THEN p.costo_prom 
                                 ELSE 0
                             END AS costo_prom,
                             CONVERT(DECIMAL(18, 2), 
                                     ((pp.precio + ((pp.precio * pp.porcen_desc) / 100)) / i.iva)) AS precio_neto,
                             pp.precio AS precio_base,
                             CONVERT(DECIMAL(18, 2), 
                                     (((100 * ((pp.precio / i.iva) + (((pp.precio / i.iva) * pp.porcen_desc) / 100))) / p.costo_prom) - 100 )) AS margen_utilidad,
                            pp.porcen_desc,
                            pp.precio + ((pp.precio * pp.porcen_desc) / 100) AS precio_venta
                      FROM 20_m_producto p
                          INNER JOIN 40_m_lista_precio lp ON lp.id_lista_precio = " . @idListaPrecio . "
                          LEFT OUTER JOIN 40_m_precio_producto pp ON lp.id_lista_precio = pp.id_lista_precio
                              AND p.id_producto = pp.id_producto
                          INNER JOIN 99_p_iva i";
             */
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaPrecioProductos[$i] = 
                    new PrecioProducto(
                        $filaDB["id_producto"], $filaDB["nom_producto"], 
                        $filaDB["costo_prom"], $filaDB["precio_neto"],
                        $filaDB["precio_base"], $filaDB["margen_utilidad"], 
                        $filaDB["porcen_desc"], $filaDB["precio_venta"], 
                        $filaDB["cod_serfel"],
                        $filaDB["cant_tramo1"], $filaDB["max_porcen_tramo1"],
                        $filaDB["cant_tramo2"], $filaDB["max_porcen_tramo2"],
                        $filaDB["cant_tramo3"], $filaDB["max_porcen_tramo3"]);
                $i++;
            }
            $this->total_registros = $i - 1;
            return $listaPrecioProductos;
        }
        
        //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
        function getIdListaPrecio() {
            return $this->id_lista_precio;
        }
        
        function getNomListaPrecio() {
            return $this->nom_lista_precio;
        }
        
        function getTotalRegistros() {
            return $this->total_registros;
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

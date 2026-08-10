<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 12-01-2012                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a los Productos (tabla 20_m_producto)   *
 ************************************************************/

    class Producto {
        
        //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
        private $id_producto        = "";
        private $cod_serfel         = "";
        private $nom_producto       = "";
        private $desc_producto      = "";
        private $cod_barra_producto = "";
        private $id_tipo_producto   = "";
        private $tipo_producto      = "";
        private $id_marca           = "";
        private $nom_marca          = "";
        private $id_UM              = "";
        private $nom_UM             = "";
        private $impuesto           = "";
        private $costo_prom         = "";
        private $id_usuario_mod     = "";
        private $fecha_modificacion = "";
        private $estado             = 0;
        private $max_porcen_desc    = "";
        public $cantidad;
        public $usa_porciones = 0;
        //</editor-fold>
        
        //<editor-fold defaultstate="collapsed" desc="CONSTRUCTORES">
        function __construct() {
            
            //<editor-fold defaultstate="collapsed" desc="Se carga la clase con la info del Local Cliente segun Id">
            if(func_num_args() == 1 || func_num_args() == 2) {
                $query = "SELECT p.id_producto,
                                 p.cod_serfel,
                                 p.nom_producto,
                                 p.desc_producto,
                                 p.cod_barra_producto,
                                 p.id_tipo_producto,
                                 p.id_marca,
                                 m.nom_marca,
                                 p.id_UM,
                                 um.nom_UM,
                                 p.impuesto,
                                 p.costo_prom,
                                 p.id_usuario_mod,
                                 p.ult_fecha_mod,
                                 p.id_estado,
                                 COALESCE(pp.max_porcen_desc, 0) AS max_porcen_desc,
                                 p.usa_porciones
                          FROM 20_m_producto p
                              LEFT OUTER JOIN 40_m_precio_producto pp ON p.id_producto = pp.id_producto
                                  AND pp.id_lista_precio = 1
                              INNER JOIN 20_p_marca m ON p.id_marca = m.id_marca
                              INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM ";
                
                if(func_num_args() == 1) 
                    $query .= "WHERE p.id_producto = " . func_get_arg(0);
                else if(func_num_args() == 2 && func_get_arg(1) == "codSerfel") 
                    $query .= "WHERE p.cod_serfel = " . func_get_arg(0) . "
                                 AND p.id_estado = 1";
                //echo $query;
                $db = conectarse();

                $resDB = mysql_query($query, $db) or die(mysql_error());
                $totRes = mysql_num_rows($resDB);

                if($totRes > 0) {
                    while ($filaDB = mysql_fetch_assoc($resDB)) {
                        $this->id_producto        = $filaDB["id_producto"];
                        $this->cod_serfel         = $filaDB["cod_serfel"];
                        $this->nom_producto       = $filaDB["nom_producto"];
                        $this->desc_producto      = $filaDB["desc_producto"];
                        $this->cod_barra_producto = $filaDB["cod_barra_producto"];
                        $this->id_tipo_producto   = $filaDB["id_tipo_producto"];
                        $this->id_marca           = $filaDB["id_marca"];
                        $this->nom_marca          = $filaDB["nom_marca"];
                        $this->id_UM              = $filaDB["id_UM"];
                        $this->nom_UM             = $filaDB["nom_UM"];
                        $this->impuesto           = $filaDB["impuesto"];
                        $this->costo_prom         = $filaDB["costo_prom"];
                        $this->id_usuario_mod     = $filaDB["id_usuario_mod"];
                        $this->fecha_modificacion = $filaDB["ult_fecha_mod"];
                        $this->estado             = $filaDB["id_estado"];
                        $this->max_porcen_desc    = $filaDB["max_porcen_desc"];
                        $this->usa_porciones      = $filaDB["usa_porciones"];
                    }
                    
                    if($this->id_producto > 0) $this->tipo_producto = new TipoProducto($this->id_tipo_producto);
                }
            //</editor-fold>
                
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Lista)">
            } else if(func_num_args() == 8) {
                $this->id_producto        = func_get_arg(0);
                $this->cod_serfel         = func_get_arg(1);
                $this->nom_producto       = func_get_arg(2);
                $this->desc_producto      = func_get_arg(3);
                $this->cod_barra_producto = func_get_arg(4);
                $this->id_tipo_producto   = func_get_arg(5);
                $this->nom_marca          = func_get_arg(6);
                $this->nom_UM             = func_get_arg(7);
                
                $this->tipo_producto = new TipoProducto($this->id_tipo_producto);
            }
            //</editor-fold>
        }
        //</editor-fold>
        
        private function obtNuevoIdProducto() {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 23-11-2011                                        *
         * Desc : Devuelve el siguiente Id Producto del sistema.    *
         ************************************************************/
            $db = conectarse();

            $query = "SELECT (MAX(id_producto) + 1) as id_producto
                      FROM 20_m_producto";
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            while ($filaDB = mysql_fetch_assoc($resDB)) $idProducto = $filaDB["id_producto"];
            
            if($idProducto == "") $idProducto = 1;

            mysql_close($db);
            return $idProducto;
        }
        
        function ingProducto($codSerfel, $nomProd, $descProd, $codBarraProd, $idTipoProd, $idMarca, $idUM, $idImp, $esPorcionado, $idUsuIng) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 10-01-2012                                        *
         * Desc : Ingresa Productos nuevos al Sistema               *
         * Resp : { -3: Código Serfel ya existe                     *
         *          -1: Producto ya existe y no esta activo.        *
         *           0: Producto ya existe y esta activo.           *
         *          >0: Producto ingresado con exito.               *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();

            $query = "SELECT * 
                      FROM 20_m_producto
                      WHERE nom_producto = '" . $nomProd . "'
                          AND id_estado = 1";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);
            
            if($totRes == 0) {
                if($codSerfel == "") $codSerfel = 0;
                else if($codSerfel != 0) {
                    $query = "SELECT * 
                              FROM 20_m_producto
                              WHERE cod_serfel = " . $codSerfel . "
                                  AND id_estado = 1";
                    $resDB = mysql_query($query, $db) or die(mysql_error());
                    $totRes = mysql_num_rows($resDB);
                }
            
                if($totRes == 0) {
                    $idProducto = $this->obtNuevoIdProducto();

                    $db = conectarse();
                    $query = "INSERT INTO 20_m_producto (id_producto,
                                                         cod_serfel,
                                                         nom_producto,
                                                         desc_producto,
                                                         cod_barra_producto,
                                                         id_tipo_producto,
                                                         id_marca,
                                                         id_UM,
                                                         impuesto,
                                                        usa_porciones,
                                                         id_usuario_mod,
                                                         ult_fecha_mod)
                              VALUES (" . $idProducto . ",
                                      " . $codSerfel . ",
                                      '" . $nomProd . "',
                                      '" . $descProd . "',
                                      '" . $codBarraProd . "',
                                      " . $idTipoProd . ",
                                      " . $idMarca . ",
                                      " . $idUM . ",
                                      " . $idImp . ",
                                      " . $esPorcionado . ",
                                      " . $idUsuIng . ",
                                      NOW())";
                    
                    mysql_query($query, $db) or die(mysql_error());

                    mysql_close($db);
                    return $idProducto;
                } else return -3;
            } else if($totRes > 0) {
                //while ($filaDB = mysql_fetch_assoc($resDB)) $idEstado = $filaDB["id_estado"];
                
                mysql_close($db);
                
                //if($idEstado == 1) return 0; 
                //else return -1;
                return 0;
            }
        }
        
        function elimProducto($idProducto, $idUsuElim) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 10-01-2012                                        *
         * Desc : Elimina a un Producto del Sistema                 *
         * Resp : {  1: Producto eliminado.                         *
         *          -1: Producto tiene stock.                       *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();
            
            $query = "SELECT SUM(cantidad)
                      FROM 50_m_stock
                      WHERE id_producto = " . $idProducto . "
                      GROUP BY id_producto
                          HAVING SUM(cantidad) > 0";
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);
            
            if($totRes == 0) {
                $query = "UPDATE 20_m_producto
                              SET id_estado      = 0,
                                  ult_fecha_mod  = NOW(),
                                  id_usuario_mod = " . $idUsuElim . "
                          WHERE id_producto = " . $idProducto;
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                return 1;
            } else if($totRes > 0) {
                mysql_close($db);
                return -1;
            }
        }

        function modProducto($idProducto, $codSerfel, $nomProd, $descProd, $codBarraProd, $idTipoProd, $idMarca, $maxPorcen, 
                             $idUM, $idImp, $esPorcionado, $idUsuMod) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 28-12-2011                                        *
         * Desc : Modifica a un Producto                            *
         * Resp : {  1: Producto modificado.                        *
         *          -1: Nombre Producto ya existe.                  *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();
            
            $query = "SELECT * 
                      FROM 20_m_producto
                      WHERE nom_producto = '" . $nomProd . "'
                          AND id_producto <> " . $idProducto;
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);
            
            if($totRes == 0) {
                if($codSerfel == "") $codSerfel = 0;
                else if($codSerfel != 0) {
                    $query = "SELECT * 
                              FROM 20_m_producto
                              WHERE cod_serfel = " . $codSerfel . "
				                  AND id_producto != " . $idProducto . "
                                  AND id_estado = 1";
                    $resDB = mysql_query($query, $db) or die(mysql_error());
                    $totRes = mysql_num_rows($resDB);
                }
            
                if($totRes == 0) {
                    $query = "UPDATE 20_m_producto
                                  SET cod_serfel         = " . $codSerfel . ",
                                      nom_producto       = '" . $nomProd . "',
                                      desc_producto      = '" . $descProd . "',
                                      cod_barra_producto = '" . $codBarraProd . "',
                                      id_tipo_producto   = " . $idTipoProd . ",
                                      id_marca           = " . $idMarca . ",
                                      id_UM              = " . $idUM . ",
                                      impuesto           = " . $idImp . ", 
                                      id_usuario_mod     = '" . $idUsuMod . "',
                                      usa_porciones      = " . $esPorcionado . ",
                                      ult_fecha_mod      = NOW()
                            WHERE id_producto = " . $idProducto;
                    mysql_query($query, $db) or die(mysql_error());
                    
                    $query = "SELECT id_lista_precio
                              FROM 40_m_precio_producto
                              WHERE id_lista_precio = 1
                                  AND id_producto = " . $idProducto;
                    $resDB = mysql_query($query, $db) or die(mysql_error());

                    $idListaExistente = "";
                    while($filaDB = mysql_fetch_assoc($resDB)) {
                        $idListaExistente = $filaDB["id_lista_precio"];
                    }

                    if($idListaExistente != "") {
                        $query = "UPDATE 40_m_precio_producto
                                      SET max_porcen_desc = " . $maxPorcen . "
                                  WHERE id_producto = " . $idProducto . "
                                      AND id_lista_precio = 1";
                        mysql_query($query, $db) or die(mysql_error());
                    } else if($idListaExistente == "") {
                        $query = "INSERT INTO 40_m_precio_producto (id_lista_precio,
                                                                    id_producto,
                                                                    precio_neto,
                                                                    precio,
                                                                    porcen_desc,
                                                                    max_porcen_desc)
                                    VALUES (1,
                                            " . $idProducto . ",
                                            0, 
                                            0,
                                            0,
                                            " . $maxPorcen . ")";
                        mysql_query($query, $db) or die(mysql_error());
                    }

                    mysql_close($db);
                    return 1;
                } else return -3;
            } else {
                mysql_close($db);
                return -1;
            }
        }
        
        //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
        function getIdProducto() {
            return $this->id_producto;
        }
        
        function getCodSerfel() {
            return $this->cod_serfel;
        }

        function getNomProducto() {
            return $this->nom_producto;
        }

        function getDescProducto() {
            return $this->desc_producto;
        }
        
        function getCodBarraProducto() {
            return $this->cod_barra_producto;
        }
        
        function getIdTipoProducto() {
            return $this->id_tipo_producto;
        }
        
        function getTipoProducto() {
            return $this->tipo_producto;
        }
        
        function getCostoProm() {
            return $this->costo_prom;
        }
        
        function getIdMarca() {
            return $this->id_marca;
        }
        
        function getNomMarca() {
            return $this->nom_marca;
        }
        
        function getIdUM() {
            return $this->id_UM;
        }
        
        function getNomUM() {
            return $this->nom_UM;
        }
        
        function getImpuesto() {
            return $this->impuesto;
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
        
        function getMaxPorcenDesc() {
            return $this->max_porcen_desc;
        }
        //</editor-fold>
    }
?>

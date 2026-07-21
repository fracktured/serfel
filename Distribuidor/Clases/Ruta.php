<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 02-02-2012                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados al Stock (tabla 50_m_stock)             *
 ************************************************************/

    class Ruta {
        
        //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
        private $ruta_relativa      = "";
        private $id_ruta            = "";
        private $nom_ruta           = "";
        private $id_usuario         = "";
        private $locales            = Array();
        private $num_dia            = "";
        private $num_facturas       = "";
        private $total              = "";
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
         * Desc : Constructores principales de la Clase Ruta        *
         ************************************************************/
            if(func_num_args() > 0) $this->ruta_relativa = func_get_arg(0);

            //<editor-fold defaultstate="collapsed" desc="Constructor que carga la info de la Ruta">
            if(func_num_args() == 2) {
                include_once($this->ruta_relativa . "Clases/LocalCliente.php");
                
                $db = conectarse();
                $query = "SELECT id_ruta,
                                 nom_ruta,
                                 id_usuario,
                                 num_dia,
                                 id_usuario_mod,
                                 ult_fecha_mod,
                                 id_estado
                          FROM 40_m_ruta
                          WHERE id_ruta = " . func_get_arg(1);
                //echo $query;
                $resDB = mysql_query($query, $db) or die(mysql_error());

                while($filaDB = mysql_fetch_assoc($resDB)) {
                    $this->id_ruta            = $filaDB["id_ruta"];
                    $this->nom_ruta           = $filaDB["nom_ruta"];
                    $this->id_usuario         = $filaDB["id_usuario"];
                    $this->num_dia            = $filaDB["num_dia"];
                    $this->id_usuario_mod     = $filaDB["id_usuario_mod"];
                    $this->fecha_modificacion = $filaDB["ult_fecha_mod"];
                    $this->estado             = $filaDB["id_estado"];
                }
                
                if($this->id_ruta > 0) {
                    $query = "SELECT c.rut_cliente,
									 c.dv_cliente,
									 c.razon_social,
									 lc.id_local_cliente,
                                     lc.nom_local_cliente,
                                     lc.direccion_local_cliente,
                                     lc.telefono_local_cliente,
                                     lc.nom_contacto,
                                     lc.apell_pat_contacto,
                                     lc.apell_mat_contacto,
                                     lc.telefono_contacto
                              FROM 40_m_ruta r
                                  INNER JOIN 40_m_ruta_local_cliente rlc ON r.id_ruta = rlc.id_ruta
                                  INNER JOIN 10_m_local_cliente lc ON rlc.id_local_cliente = lc.id_local_cliente
								  INNER JOIN 10_m_cliente c ON lc.rut_cliente = c.rut_cliente
                              WHERE r.id_ruta = " . $this->id_ruta . "
                                  AND r.id_estado = 1";
                    $resDB = mysql_query($query, $db) or die(mysql_error());

                    $i = 0;
                    while ($filaDB = mysql_fetch_assoc($resDB)) {
                        $this->locales[$i] = new LocalCliente($filaDB["rut_cliente"], $filaDB["dv_cliente"], $filaDB["razon_social"],
															  $filaDB["id_local_cliente"], $filaDB["nom_local_cliente"], 
                                                              $filaDB["direccion_local_cliente"], $filaDB["telefono_local_cliente"], 
                                                              $filaDB["nom_contacto"], $filaDB["apell_pat_contacto"], 
                                                              $filaDB["apell_mat_contacto"], $filaDB["telefono_contacto"]);
                        $i++;
                    }
                    
                }
            //</editor-fold>
            
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Lista)">
            } else if(func_num_args() == 3) {
                $this->id_ruta  = func_get_arg(1);
                $this->nom_ruta = func_get_arg(2);
            }
            //</editor-fold>
        }
        //</editor-fold>
        
        private function obtNuevoIdRuta() {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 12-02-2012                                        *
         * Desc : Devuelve el siguiente Id Ruta     del sistema.    *
         ************************************************************/
            $db = conectarse();

            $query = "SELECT (MAX(id_ruta) + 1) as id_ruta
                      FROM 40_m_ruta";
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            while ($filaDB = mysql_fetch_assoc($resDB)) $idRuta = $filaDB["id_ruta"];
            
            if($idRuta == "") $idRuta = 1;

            mysql_close($db);
            return $idRuta;
        }
        
        function ingRuta($nomRuta, $idVendedor, $numDia, $idUsuIng) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Ingresa Alertas de Stock nuevas al sistema        *
         * Resp : {  0: Lista ya existe y esta activa.              *
         *          >0: Lista ingresada con exito.                  *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();

            $query = "SELECT id_ruta,
                             id_estado
                      FROM 40_m_ruta
                      WHERE nom_ruta = '" . $nomRuta . "'";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $idRuta = "";
            $estado        = "";
            while($filaDB = mysql_fetch_assoc($resDB)) {
                $idRuta = $filaDB["id_ruta"];
                $estado = $filaDB["id_estado"];
            }
            
            if($estado == 1) {
                return 0;
            } else if($estado != "" && $estado == 0) {
                $db = conectarse();
                
                $query = "UPDATE 40_m_ruta
                              SET nom_ruta       = '" . $nomRuta . "',
                                  id_usuario     = " . $idVendedor . ",
                                  num_dia        = " . $numDia . ",
                                  id_usuario_mod = " . $idUsuIng . ",
                                  ult_fecha_mod  = NOW(),
                                  id_estado      = 1
                          WHERE id_ruta = " . $idRuta;
                //echo $query;
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                
                return 1;
            } else if($estado == "") {
                $idRuta = $this->obtNuevoIdRuta();
                
                $db = conectarse();
                
                $query = "INSERT INTO 40_m_ruta (id_ruta,
                                                 nom_ruta,
                                                 id_usuario,
                                                 num_dia,
                                                 id_usuario_mod,
                                                 ult_fecha_mod)
                            VALUES (" . $idRuta . ",
                                    '" . $nomRuta . "',
                                    " . $idVendedor . ",
                                    " . $numDia . ",
                                    " . $idUsuIng . ",
                                    NOW())";
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                return 1;
            }
        }
        
        function modRuta($idRuta, $idVendedor, $numDia, $idUsuMod) {
            $db = conectarse();
                
            $query = "UPDATE 40_m_ruta
                          SET id_usuario     = " . $idVendedor . ",
                              num_dia        = " . $numDia . ",
                              id_usuario_mod = " . $idUsuMod . ",
                              ult_fecha_mod  = NOW()
                      WHERE id_ruta = " . $idRuta;
            //echo $query;
            mysql_query($query, $db) or die(mysql_error());

            mysql_close($db);
                
            return 1;
        }
        
        function elimRuta($idRuta, $idUsuElim) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Elimina a una Empresa del sistema                 *
         * Resp : {  1: Ruta eliminada.                             *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();
            
            $query = "UPDATE 40_m_ruta
                          SET id_estado      = 0,
                              ult_fecha_mod  = NOW(),
                              id_usuario_mod = " . $idUsuElim . "
                      WHERE id_ruta = " . $idRuta;
            $resDB = mysql_query($query, $db) or die(mysql_error());

            mysql_close($db);
            return 1;
        }
        
        function ingLocalRuta($idLocal, $idRuta, $idVendedor, $idUsuMod) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 10-01-2012                                        *
         * Desc : Ingresa Rutas a Vendedores nuevos al Sistema      *
         * Resp : {  0: Ruta ya existe y esta activo.               *
         *          >0: Ruta ingresado con exito.                   *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();

            $query = "SELECT * 
                      FROM 40_m_ruta_local_cliente
                      WHERE id_ruta = " . $idRuta . "
                          AND id_local_cliente = " . $idLocal;
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);
            
            if($totRes == 0) {
                $db = conectarse();

                $query = "INSERT INTO 40_m_ruta_local_cliente (id_ruta,
                                                               id_local_cliente) 
                              VALUES (" . $idRuta . ",
                                      " . $idLocal . ")";
                mysql_query($query, $db) or die(mysql_error());
                
                $query = "UPDATE 10_m_local_cliente
                              SET id_vendedor = " . $idVendedor . "
                          WHERE id_local_cliente = " . $idLocal;
                mysql_query($query, $db) or die(mysql_error());
                
                mysql_close($db);
                return $idRuta;
            } else if($totRes > 0) {
                return 0;
            }
        }
        
        function elimLocalRuta($idLocal, $idRuta, $idUsuElim) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 10-01-2012                                        *
         * Desc : Elimina a un Producto del Sistema                 *
         * Resp : {  1: Producto eliminado.                         *
         *          -1: Producto tiene stock.                       *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();
            
            $query = "DELETE FROM 40_m_ruta_local_cliente
                      WHERE id_local_cliente = " . $idLocal . "
                          AND id_ruta = " . $idRuta;
            //echo $query;
            mysql_query($query, $db) or die(mysql_error());

            mysql_close($db);
            return 1;
        }
        
        function getListaEstadoRutario($idRuta, $entregado) {
            $db = conectarse();
            $query = "SELECT  v.id_venta,
                              CONCAT(v.rut_empresa, '-', e.dv_empresa) AS rut_empresa,
                              CONCAT(v.rut_cliente, '-', c.dv_cliente) AS rut_cliente,
                              c.razon_social,
                              v.num_docto_emitido,
                              v.precio_total
                      FROM 40_m_ruta r
                          INNER JOIN 40_m_ruta_local_cliente rlc ON r.id_ruta = rlc.id_ruta
                          INNER JOIN 40_m_venta v ON rlc.id_local_cliente = v.id_local_cliente
                          INNER JOIN 10_m_cliente c ON v.rut_cliente = c.rut_cliente
                          INNER JOIN 10_m_empresa e ON v.rut_empresa = e.rut_empresa
                      WHERE r.id_ruta = " . $idRuta . "
                          AND v.entregado = " . $entregado . "
                          AND v.id_estado = 3
                      ORDER BY v.num_docto_emitido";
            //echo $query;
            $resDB = mysql_query($query, $db) or die(mysql_error());

            $i = 0;
            $listaEstadoRutario = Array();
            while($filaDB = mysql_fetch_assoc($resDB)) {
                $listaEstadoRutario[$i]["id_venta"]     = $filaDB["id_venta"];
                $listaEstadoRutario[$i]["rut_empresa"]  = $filaDB["rut_empresa"];
                $listaEstadoRutario[$i]["rut_cliente"]  = $filaDB["rut_cliente"];
                $listaEstadoRutario[$i]["razon_social"] = $filaDB["razon_social"];
                $listaEstadoRutario[$i]["factura"]      = $filaDB["num_docto_emitido"];
                $listaEstadoRutario[$i]["precio_total"] = $filaDB["precio_total"];
                $i++;
            }
            
            return $listaEstadoRutario;
        }
        
        public function setTotalesListadoCarga() {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 12-02-2012                                        *
         * Desc : Setea los totales del Listado de Carga            *
         ************************************************************/
            if($this->id_ruta > 0) {
                $db = conectarse();

                $query = "SELECT COUNT(v.id_venta) AS num_facturas,
                                 CONVERT(SUM(v.precio_total), UNSIGNED) as total
                          FROM 40_m_ruta r
                              INNER JOIN 40_m_ruta_local_cliente rlc ON r.id_ruta = rlc.id_ruta
                              INNER JOIN 40_m_venta v ON rlc.id_local_cliente = v.id_local_cliente
                          WHERE r.id_ruta = " . $this->id_ruta . "
                              AND v.entregado = 0
                              AND v.id_estado = 3";

                $resDB = mysql_query($query, $db) or die(mysql_error());

                while ($filaDB = mysql_fetch_assoc($resDB)) { 
                    $this->num_facturas = $filaDB["num_facturas"]; 
                    $this->total        = $filaDB["total"]; 
                }

                mysql_close($db);
            }
        }
        
        //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
        function getIdRuta() {
            return $this->id_ruta;
        }
        
        function getNomRuta() {
            return $this->nom_ruta;
        }
        
        function getIdUsuario() {
            return $this->id_usuario;
        }
        
        function getLocales() {
            return $this->locales;
        }
        
        function getNumDia() {
            return $this->num_dia;
        }
        
        function getNumFacturas() {
            return $this->num_facturas;
        }
        
        function getTotal() {
            return $this->total;
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

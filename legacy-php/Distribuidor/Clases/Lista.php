<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 20-12-2011                                        *
 * Desc : Clase que contiene los metodos listadores de las  *
 *        clases del Sistema                                *
 ************************************************************/

    class Lista {
        
        //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
        private $total_registros = "";          // GET
        //</editor-fold>
        
        private function generarListaUsuarios($idTipoUsu) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-02-2012                                        *
         * Desc : Genera una lista de usuarios segun el tipo de     *
         *        usuario                                           *
         ************************************************************/
            $listaUsuarios = Array();
            
            $db = conectarse();

            $query = "SELECT u.id_usuario,
                             u.rut_usuario,
                             u.dv_usuario,
                             u.nom_usuario,
                             u.apell_pat_usuario,
                             u.apell_mat_usuario,
                             tu.nom_tipo_usuario,
                             u.telefono_usuario,
                             u.email_usuario,
                             u.fecha_act_productos
                      FROM 10_m_usuario u
                          INNER JOIN 10_p_tipo_usuario tu ON u.id_tipo_usuario = tu.id_tipo_usuario
                      WHERE u.id_estado = 1
                          AND (u.id_tipo_usuario = " . $idTipoUsu . " OR " . $idTipoUsu . " = 0)
                      ORDER BY u.apell_pat_usuario, u.apell_mat_usuario";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaUsuarios[$i] = new Usuario($filaDB["id_usuario"], $filaDB["rut_usuario"], $filaDB["dv_usuario"],
                                                 $filaDB["nom_usuario"], $filaDB["apell_pat_usuario"], $filaDB["apell_mat_usuario"],
                                                 $filaDB["nom_tipo_usuario"], $filaDB["telefono_usuario"], $filaDB["email_usuario"], $filaDB["fecha_act_productos"]);
                $i++;
            }
            
            $this->total_registros = $i - 1;

            mysql_close($db);
            return $listaUsuarios;
        }

        function getListaUsuarios() {
            return $this->generarListaUsuarios(0);
        }
        
        function getListaVendedores() {
            return $this->generarListaUsuarios(2);
        }
        
        function getListaEmpresas() {
            include("Clases/Empresa.php");
            $listaEmpresas = Array();

            $db = conectarse();

            $query = "SELECT rut_empresa,
                             dv_empresa,
                             razon_social,
                             nom_fantasia,
                             direccion_empresa,
                             acceso_rapido
                      FROM 10_m_empresa
                      WHERE id_estado = 1";
            $resDB = mysql_query($query, $db) or die(mysql_error());

            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaEmpresas[$i] = new Empresa($filaDB["rut_empresa"], $filaDB["dv_empresa"], $filaDB["razon_social"],
                                                 $filaDB["nom_fantasia"], $filaDB["direccion_empresa"], $filaDB["acceso_rapido"]);
                $i++;
            }

            $this->total_registros = $i - 1;

            mysql_close($db);
            return $listaEmpresas;
        }
        
        function getListaProveedores() {
            include("Clases/Proveedor.php");
            $listaProveedores = Array();

            $db = conectarse();

            $query = "SELECT rut_proveedor,
                             dv_proveedor,
                             razon_social,
                             nom_fantasia,
                             direccion_proveedor
                      FROM 70_m_proveedor
                      WHERE id_estado = 1";
            $resDB = mysql_query($query, $db) or die(mysql_error());

            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaProveedores[$i] = new Proveedor($filaDB["rut_proveedor"], $filaDB["dv_proveedor"], 
                                                      $filaDB["razon_social"], $filaDB["nom_fantasia"], 
                                                      $filaDB["direccion_proveedor"]);
                $i++;
            }

            $this->total_registros = $i - 1;

            mysql_close($db);
            return $listaProveedores;
        }
        
        function getListaTipoProducto($rutaRelativa, $familiaPadre, $soloPadres) {
            require_once($rutaRelativa . "Clases/TipoProducto.php");
            $listaTipoProductos = Array();
            
            $db = conectarse();
            
            $query = "SELECT  id_tipo_producto,
                                    nom_tipo_producto,
                                    desc_tipo_producto,
                                    nivel_1,
                                    nivel_2,
                                    CASE tp.nivel_2
                                    WHEN 0 THEN 'SIN FAMILIA'
                                    ELSE (SELECT nom_tipo_producto
                                            FROM 20_p_tipo_producto
                                                    WHERE id_tipo_producto = tp.nivel_1)
                                    END AS nombreFamilia
                            FROM 20_p_tipo_producto tp
                            WHERE id_estado = 1
                                AND ((nivel_1 = " . $familiaPadre . " AND nivel_2 <> 0) OR " . $familiaPadre . " = 0)";
            if($soloPadres == 1) $query .= " AND nivel_2 = 0";
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaTipoProductos[$i] = new TipoProducto($filaDB["id_tipo_producto"], $filaDB["nom_tipo_producto"], $filaDB["desc_tipo_producto"],
                                $filaDB["nivel_1"], $filaDB["nivel_2"], $filaDB["nombreFamilia"]);
                $i++;
            }
            
            $this->total_registros = $i - 1;

            return $listaTipoProductos;
        }
        
        function getListaUnidadMedida($rutaRelativa) {
            include($rutaRelativa . "Clases/UnidadMedida.php");
            $listaUnidadMedida = Array();
            
            $db = conectarse();
            $query = "SELECT   id_UM,
                                nom_UM,
                                desc_UM
                        FROM 20_p_unidad_medida";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaUnidadMedida[$i] = new UnidadMedida($filaDB["id_UM"], $filaDB["nom_UM"], $filaDB["desc_UM"]);
                $i++;
            }
            $this->total_registros = $i - 1;

            return $listaUnidadMedida;
        }
        
        function getListaMarca($rutaRelativa) {
            include($rutaRelativa . "Clases/Marca.php");
            $listaMarca = Array();
            
            $db = conectarse();
            $query = "SELECT   id_marca,
                                nom_marca,
                                desc_marca
                        FROM 20_p_marca";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaMarca[$i] = new Marca($filaDB["id_marca"], $filaDB["nom_marca"], $filaDB["desc_marca"]);
                $i++;
            }
            $this->total_registros = $i - 1;

            return $listaMarca;
        }
        
        function getListaProductos($rutaRelativa) {
            include($rutaRelativa . "Clases/TipoProducto.php");
            include($rutaRelativa . "Clases/Producto.php");
            
            if(func_num_args() > 1) $filtro = func_get_arg(1);
            else $filtro = "";
            
            if(func_num_args() > 2) $id = func_get_arg(2);
            else $id = "";
            
            $listaProductos = Array();
            
            $db = conectarse();
            $query = "SELECT p.id_producto,
                             p.cod_serfel,
                             p.nom_producto,
                             p.desc_producto,
                             p.cod_barra_producto,
                             p.id_tipo_producto,
                             m.nom_marca,
                             um.nom_UM,
                             COALESCE(SUM(s.cantidad), 0) AS cantidad_total
                        FROM 20_m_producto p
                            INNER JOIN 20_p_marca m ON p.id_marca = m.id_marca
                            INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM
                            LEFT OUTER JOIN 50_m_stock s ON p.id_producto = s.id_producto
                        WHERE p.id_estado = 1 ";
            if($filtro == "prodVenta")
                $query .= "AND p.id_producto IN (SELECT pv.id_producto
                                                 FROM 40_m_producto_venta pv
                                                 WHERE pv.id_venta = " . $id . ") ";
            $query .= "GROUP BY p.id_producto,
                             p.cod_serfel,
                             p.nom_producto,
                             p.desc_producto,
                             p.cod_barra_producto,
                             p.id_tipo_producto,
                             m.nom_marca,
                             um.nom_UM";
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaProductos[$i] = new Producto($filaDB["id_producto"], $filaDB["cod_serfel"], $filaDB["nom_producto"], 
                                                   $filaDB["desc_producto"], $filaDB["cod_barra_producto"], 
                                                   $filaDB["id_tipo_producto"], $filaDB["nom_marca"], $filaDB["nom_UM"]);
                $listaProductos[$i]->cantidad = $filaDB["cantidad_total"];
                $i++;
            }
            $this->total_registros = $i - 1;

            return $listaProductos;
        }
        
        function getListaBodega($rutaRelativa) {
            include($rutaRelativa . "Clases/Bodega.php");
            $listaBodega = Array();
            
            $db = conectarse();
            $query = "SELECT b.id_bodega,
                             b.nom_bodega,
                             b.desc_bodega, 
                             b.id_tipo_bodega,                  
                             tb.nom_tipo_bodega
                      FROM 50_m_bodega b
                          INNER JOIN 50_p_tipo_bodega tb ON b.id_tipo_bodega = tb.id_tipo_bodega
                      WHERE b.id_estado = 1";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaBodega[$i] = new Bodega($filaDB["id_bodega"], $filaDB["nom_bodega"], $filaDB["desc_bodega"],
                                              $filaDB["id_tipo_bodega"], $filaDB["nom_tipo_bodega"]);
                $i++;
            }
            $this->total_registros = $i - 1;

            return $listaBodega;
        }
        
        function getListaExistenciasPorBodega($rutaRelativa, $idBodega) {
            include($rutaRelativa . "Clases/Stock.php");
            include($rutaRelativa . "Globales/funciones.php");
            $listaExistencias = Array();
            
            $db = conectarse();
            $query = "SELECT b.id_bodega, 
                             b.nom_bodega, 
                             COUNT(s.id_producto) AS cant_productos,
                             SUM(p.costo_prom * (SELECT SUM(s2.cantidad)
                                                 FROM 50_m_stock s2
                                                 WHERE id_producto = s.id_producto
                                                     AND id_bodega = b.id_bodega
                                                 GROUP BY id_producto)) AS costo_prom_total
                      FROM 50_m_stock s
			  INNER JOIN 50_m_bodega b ON s.id_bodega = b.id_bodega
			  INNER JOIN 20_m_producto p ON s.id_producto = p.id_producto
                      WHERE s.id_bodega = " . $idBodega . " OR " . $idBodega . " = -1
                          AND p.id_estado = 1
                      GROUP BY b.id_bodega, b.nom_bodega";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaExistencias[$i] = new Stock($filaDB["id_bodega"], $filaDB["nom_bodega"], 
                                                  $filaDB["cant_productos"], 
                                                  getFormatoDinero($filaDB["costo_prom_total"]));
                $i++;
            }
            $this->total_registros = $i - 1;
            
            return $listaExistencias;
        }
        
        function getListaExistenciasPorBodegaFamilia($rutaRelativa, $idBodega, $idFamilia, $nivel) {
            include($rutaRelativa . "Clases/Stock.php");
            include($rutaRelativa . "Globales/funciones.php");
            $listaExistencias = Array();
            
            $db = conectarse();
            
            if($nivel == 1) {
                $query = "SELECT s.id_bodega,
				 tp.nivel_1 AS id_tipo_producto,
				 tpp.nom_tipo_producto,
				 COUNT(s.id_producto) AS cant_productos,
				 SUM(p.costo_prom * (SELECT SUM(s2.cantidad)
                                                     FROM 50_m_stock s2
                                                     WHERE id_producto = s.id_producto
                                                         AND id_bodega = " . $idBodega . "
                                                     GROUP BY id_producto)) AS costo_prom_total
                          FROM 50_m_stock s
                              INNER JOIN 20_m_producto p ON p.id_producto = s.id_producto
                              INNER JOIN 20_p_tipo_producto tp ON p.id_tipo_producto = tp.id_tipo_producto
                              LEFT OUTER JOIN 20_p_tipo_producto tpp ON tpp.id_tipo_producto = tp.nivel_1
                          WHERE s.id_bodega = " . $idBodega . "
                              AND p.id_estado = 1
                          GROUP BY s.id_bodega, tp.nivel_1, tpp.nom_tipo_producto";
            } else if($nivel == 2) {
                $query = "SELECT s.id_bodega,
				 tp.nivel_2 AS id_tipo_producto,
				 tp.nom_tipo_producto,
				 COUNT(s.id_producto) AS cant_productos,
				 SUM(p.costo_prom * (SELECT SUM(s2.cantidad)
                                                     FROM 50_m_stock s2
                                                     WHERE id_producto = s.id_producto
                                                         AND id_bodega = " . $idBodega . "
                                                     GROUP BY id_producto)) AS costo_prom_total
                          FROM 50_m_stock s
                              INNER JOIN 20_m_producto p ON p.id_producto = s.id_producto
                              INNER JOIN 20_p_tipo_producto tp ON p.id_tipo_producto = tp.id_tipo_producto
                          WHERE s.id_bodega = " . $idBodega . "
                              AND tp.nivel_1 = " . $idFamilia . "
                              AND tp.nivel_2 <> 0
                              AND p.id_estado = 1
                          GROUP BY s.id_bodega, tp.nivel_2, tp.nom_tipo_producto";
            } else {
                $query = "";
                $this->total_registros = - 1;
            }
            
            if($query != "") {
                $resDB = mysql_query($query, $db) or die(mysql_error());
            
                $i = 0;
                while ($filaDB = mysql_fetch_assoc($resDB)) {
                    $listaExistencias[$i] = new Stock($filaDB["id_bodega"], $filaDB["id_tipo_producto"], 
                                                      $filaDB["nom_tipo_producto"], 
                                                      $filaDB["cant_productos"],
                                                      getFormatoDinero($filaDB["costo_prom_total"]));
                    $i++;
                }
                $this->total_registros = $i - 1;
            }
            
            return $listaExistencias;
        }
        
        function getListaExistenciasPorBodegaFamiliaProducto($rutaRelativa, $idBodega, $idFamilia) {
            include($rutaRelativa . "Clases/Stock.php");
            include($rutaRelativa . "Clases/Fecha.php");
            include($rutaRelativa . "Globales/funciones.php");
            $listaExistencias = Array();
            
            $fecha = new Fecha();
            
            $db = conectarse();
            $query = "SELECT s.id_producto,
                             p.nom_producto,
                             um.nom_UM,
                             p.costo_prom,
                             s.cantidad,
                             CASE
                                 WHEN DATEDIFF(NOW(), p.ult_fecha_compra) >= (npb.meses * 30) THEN 'palevioletred'
                                 WHEN DATEDIFF(NOW(), p.ult_fecha_compra) >= (npb.meses * 30 * 0.7) THEN 'orange'
                                 WHEN s.cantidad <= npb.minimo THEN 'red'
				 WHEN s.cantidad <= (npb.minimo * 1.3) THEN 'yellow'
                             END AS color,
                             p.costo_prom * s.cantidad AS costo_prom_total,
                             p.ult_fecha_compra
                      FROM 50_m_stock s
                          INNER JOIN 20_m_producto p ON p.id_producto = s.id_producto
                          INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM
                          LEFT OUTER JOIN 50_m_nivel_producto_bodega npb ON s.id_bodega = npb.id_bodega AND s.id_producto = npb.id_producto
                      WHERE s.id_bodega = " . $idBodega . "
                          AND p.id_tipo_producto = " . $idFamilia . "
                          AND p.id_estado = 1";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaExistencias[$i] = new Stock($filaDB["id_producto"], $filaDB["nom_producto"], $filaDB["nom_UM"], 
                                                  getFormatoDineroEntero($filaDB["costo_prom"]), 
                                                  getCantConPuntos($filaDB["cantidad"]), $filaDB["color"],
                                                  getFormatoDineroEntero($filaDB["costo_prom_total"]), 
                                                  $fecha->getFormatoFecha($filaDB["ult_fecha_compra"]), "Existencias");
                $i++;
            }
            $this->total_registros = $i - 1;
            return $listaExistencias;
        }
        
        function getListaExistenciasPorBodegaFamiliaProductoCritico($rutaRelativa, $idBodega) {
            include($rutaRelativa . "Clases/Stock.php");
            include($rutaRelativa . "Clases/Fecha.php");
            include($rutaRelativa . "Globales/funciones.php");
            $listaExistencias = Array();
            
            $fecha = new Fecha();
            
            $db = conectarse();
            $query = "SELECT s.id_producto,
                             p.nom_producto,
                             um.nom_UM,
                             p.costo_prom,
                             s.cantidad,
                             CASE
                                 WHEN DATEDIFF(NOW(), p.ult_fecha_compra) >= (npb.meses * 30) THEN 'palevioletred'
                                 WHEN DATEDIFF(NOW(), p.ult_fecha_compra) >= (npb.meses * 30 * 0.7) THEN 'orange'
				 WHEN s.cantidad <= npb.minimo THEN 'red'
				 WHEN s.cantidad <= (npb.minimo * 1.3) THEN 'yellow'
                             END AS color,
                             p.costo_prom * s.cantidad AS costo_prom_total,
                             p.ult_fecha_compra
                      FROM 50_m_stock s
                          INNER JOIN 20_m_producto p ON p.id_producto = s.id_producto
                          INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM
                          INNER JOIN 50_m_nivel_producto_bodega npb ON s.id_bodega = npb.id_bodega AND s.id_producto = npb.id_producto 
                              AND s.cantidad <= (npb.minimo * 1.3)
                      WHERE s.id_bodega = " . $idBodega . "
                          AND p.id_estado = 1";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaExistencias[$i] = new Stock($filaDB["id_producto"], $filaDB["nom_producto"], $filaDB["nom_UM"], 
                                                  getFormatoDineroEntero($filaDB["costo_prom"]), 
                                                  getCantConPuntos($filaDB["cantidad"]), $filaDB["color"],
                                                  getFormatoDineroEntero($filaDB["costo_prom_total"]), 
                                                  $fecha->getFormatoFecha($filaDB["ult_fecha_compra"]), "Existencias");
                $i++;
            }
            $this->total_registros = $i - 1;
            return $listaExistencias;
        }
        
        function getListaRutas($rutaRelativa, $numDia, $idUsu) {
            include_once($rutaRelativa . "Clases/LocalCliente.php");
            $listaRutas = Array();
            
            if(func_num_args() > 3)
                $filtro = " AND rlc.id_local_cliente NOT IN
                                    (SELECT p.id_local_cliente
                                     FROM 30_m_pedido p
                                     WHERE (DATE(p.fecha_pedido) + 0) = (CURRENT_DATE() + 0))";
            else 
                $filtro = "";
            
            $db = conectarse();
            $query = "SELECT lc.id_local_cliente,
                             lc.nom_local_cliente,
                             lc.direccion_local_cliente,
                             lc.telefono_local_cliente,
                             lc.nom_contacto,
                             lc.apell_pat_contacto,
                             lc.apell_mat_contacto,
                             lc.telefono_contacto,
                             c.razon_social,
                             c.id_lista_precio
                      FROM 40_m_ruta r
                          INNER JOIN 40_m_ruta_local_cliente rlc ON r.id_ruta = rlc.id_ruta
                          INNER JOIN 10_m_local_cliente lc ON rlc.id_local_cliente = lc.id_local_cliente
                          INNER JOIN 10_m_cliente c ON lc.rut_cliente = c.rut_cliente
                      WHERE r.id_usuario = " . $idUsu . "
                          AND r.num_dia = " . $numDia . "
                          AND r.id_estado = 1" .
                          $filtro;
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaRutas[$i] = new LocalCliente($filaDB["id_local_cliente"], $filaDB["nom_local_cliente"], 
                                                   $filaDB["direccion_local_cliente"], $filaDB["telefono_local_cliente"], 
                                                   $filaDB["nom_contacto"], $filaDB["apell_pat_contacto"], 
                                                   $filaDB["apell_mat_contacto"], $filaDB["telefono_contacto"], $filaDB["razon_social"]);
                $listaRutas[$i]->setIdListaPrecio($filaDB["id_lista_precio"]);
                $i++;
            }
            $this->total_registros = $i - 1;
            return $listaRutas;
        }
        
        function getListaTipoDocumento($rutaRelativa) {
            include($rutaRelativa . "Clases/TipoDocumento.php");
            $listaTipoDocumento = Array();
            $db = conectarse();
            $query = " SELECT	id_tipo_docto,
                        nom_tipo_docto,
                        desc_tipo_docto                   
                        FROM 10_p_tipo_docto
                        WHERE id_tipo_docto IN (1,2)
                        ORDER BY nom_tipo_docto";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaTipoDocumento[$i] = new TipoDocumento($filaDB["id_tipo_docto"], $filaDB["nom_tipo_docto"],
                                $filaDB["desc_tipo_docto"]);
                $i++;
            }
            $this->total_registros = $i - 1;
            return $listaTipoDocumento;
        }

        function getListaTipoPago($rutaRelativa) {
            include($rutaRelativa . "Clases/TipoPago.php");
            $listaTipoPago = Array();
            $db = conectarse();
            $query = " SELECT   id_tipo_docto,
                                nom_tipo_docto,
                                desc_tipo_docto                   
                        FROM 10_p_tipo_docto
                        WHERE id_tipo_docto IN (3, 4, 5, 6, 7, 8)
                        ORDER BY nom_tipo_docto";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaTipoPago[$i] = new TipoPago($filaDB["id_tipo_docto"], $filaDB["nom_tipo_docto"],
                                $filaDB["desc_tipo_docto"]);
                $i++;
            }
            $this->total_registros = $i - 1;
            return $listaTipoPago;
        }

        function getListaProductosRecepcion($rutaRelativa, $idRecepcion) {
            include($rutaRelativa . "Clases/ProductosRecepcion.php");
            include($rutaRelativa . "Globales/funciones.php");
            $listaProductosRecepcion = Array();
            
            $db = conectarse();
            $query = "SELECT p.id_producto,
                             p.nom_producto,
                             u.nom_UM,
                             pr.cantidad,
                             pr.valor,
                             m.nom_marca
                        FROM 50_m_recepcion_compra r
                            INNER JOIN 50_m_producto_recepcion pr ON pr.id_recepcion = r.id_recepcion
                            INNER JOIN 20_m_producto p ON p.id_producto = pr.id_producto
                            INNER JOIN 20_p_unidad_medida u ON u.id_UM = p.id_UM
                            INNER JOIN 20_p_marca m ON p.id_marca = m.id_marca
                        WHERE r.id_recepcion = ".$idRecepcion;

            $resDB = mysql_query($query, $db) or die(mysql_error());

            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaProductosRecepcion[$i] = new ProductosRecepcion($filaDB["id_producto"], $filaDB["nom_producto"], 
                                                                      $filaDB["nom_UM"], 
                                                                      getCantConPuntos($filaDB["cantidad"]), 
                                                                      getFormatoDineroEntero($filaDB["valor"]),
                                                                      $filaDB["nom_marca"]);
                $i++;
            }
            $this->total_registros = $i - 1;

            return $listaProductosRecepcion;
        }
        
        function getListaNivelesStock($rutaRelativa, $idBodega) {
            include_once($rutaRelativa . "Clases/Stock.php");
            $listaNivelesStock = Array();
            
            $db = conectarse();
            $query = "SELECT npb.id_producto,
                             p.nom_producto,
                             p.id_tipo_producto,
                             tp.nom_tipo_producto,
                             um.nom_UM,
                             npb.minimo,
                             npb.punto_orden,
                             npb.meses
                      FROM 50_m_nivel_producto_bodega npb
                          INNER JOIN 20_m_producto p ON npb.id_producto = p.id_producto
                          INNER JOIN 20_p_tipo_producto tp ON p.id_tipo_producto = tp.id_tipo_producto
                          INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM
                      WHERE npb.id_bodega = " . $idBodega . "
                          AND npb.id_estado = 1";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaNivelesStock[$i] = new Stock($filaDB["id_producto"], $filaDB["nom_producto"], 
                                                   $filaDB["id_tipo_producto"], $filaDB["nom_tipo_producto"], 
                                                   $filaDB["nom_UM"], $filaDB["minimo"], $filaDB["punto_orden"], 
                                                   $filaDB["meses"], "NivelStock");
                $i++;
            }
            $this->total_registros = $i - 1;
            return $listaNivelesStock;
        }
        
        function getListaPrecios($rutaRelativa) {
            include_once($rutaRelativa . "Clases/ListaPrecio.php");
            $listaPrecios = Array();
            
            $db = conectarse();
            $query = "SELECT id_lista_precio,
                             nom_lista_precio
                      FROM 40_m_lista_precio
                      WHERE id_estado = 1";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaPrecios[$i] = new ListaPrecio($filaDB["id_lista_precio"], $filaDB["nom_lista_precio"]);
                $i++;
            }
            $this->total_registros = $i - 1;
            return $listaPrecios;
        }
        
        function getListaNomRutas($rutaRelativa) {
            include_once($rutaRelativa . "Clases/Ruta.php");
            $listaRutas = Array();
            
            $db = conectarse();
            $query = "SELECT id_ruta,
                             nom_ruta
                      FROM 40_m_ruta
                      WHERE id_estado = 1";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaRutas[$i] = new Ruta($rutaRelativa, $filaDB["id_ruta"], $filaDB["nom_ruta"]);
                $i++;
            }
            $this->total_registros = $i - 1;
            return $listaRutas;
        }
        
        function getListaMotivosNotaCredito($rutaRelativa) {
            //include_once($rutaRelativa . "Clases/ListaPrecio.php");
            $listaMotivos = Array();
            
            $db = conectarse();
            $query = "SELECT id_motivo,
                             nom_motivo
                      FROM 40_m_motivo_nota_credito";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaMotivos[$i]["idMotivo"]  = $filaDB["id_motivo"];
                $listaMotivos[$i]["nomMotivo"] = $filaDB["nom_motivo"];
                $i++;
            }
            $this->total_registros = $i - 1;
            return $listaMotivos;
        }
        
        function getListaMermas($rutaRelativa, $idBodega) {
            include_once($rutaRelativa . "Clases/Merma.php");
            $listaMermas = Array();
            
            $db = conectarse();
            $query = "SELECT m.id_producto,
                             p.nom_producto,
                             p.id_tipo_producto,
                             tp.nom_tipo_producto,
                             um.nom_UM,
                             m.cantidad,
                             m.motivo_merma,
                             m.fecha_merma
                      FROM 50_m_mermas m
                          INNER JOIN 20_m_producto p ON m.id_producto = p.id_producto
                          INNER JOIN 20_p_tipo_producto tp ON p.id_tipo_producto = tp.id_tipo_producto
                          INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM
                      WHERE m.id_bodega = " . $idBodega . "
                          AND m.id_estado = 1";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaMermas[$i] = new Merma($filaDB["id_producto"], $filaDB["nom_producto"], $filaDB["id_tipo_producto"], 
                                             $filaDB["nom_tipo_producto"], $filaDB["nom_UM"], $filaDB["cantidad"], 
                                             $filaDB["motivo_merma"], $filaDB["fecha_merma"]);
                $i++;
            }
            $this->total_registros = $i - 1;
            return $listaMermas;
        }
        
        function getListaPedidos($rutaRelativa) {
            include_once($rutaRelativa . "Clases/Pedido.php");
                
            $listaPedidos = Array();
            
            $db = conectarse();
            $query = "SELECT p.id_pedido, 
                             p.id_local_cliente, 
                             p.id_usuario, " .
                             /*
                             c.rut_cliente,
                             c.nom_fantasia,
                             lc.nom_local_cliente,
                             lc.nom_contacto,
                             lc.apell_pat_contacto,
                             lc.apell_mat_contacto, 
                             u.nom_usuario,
                             u.apell_pat_usuario,
                             u.apell_mat_usuario,*/
                            "p.precio_total,
                             p.fecha_pedido
                      FROM 30_m_pedido p " .
                          //INNER JOIN 10_m_local_cliente lc ON p.id_local_cliente = lc.id_local_cliente
                          //INNER JOIN 10_m_cliente c ON lc.rut_cliente = c.rut_cliente
                          //INNER JOIN 10_m_usuario u ON p.id_usuario = u.id_usuario
                       "WHERE p.id_estado = 1";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                //echo  $filaDB["id_pedido"]. "<br />";
                $listaPedidos[$i] = new Pedido($rutaRelativa, $filaDB["id_pedido"], $filaDB["id_local_cliente"], $filaDB["id_usuario"],
                                               $filaDB["precio_total"], $filaDB["fecha_pedido"]);
                /*
                $listaPedidos[$i] = new Pedido($filaDB["id_pedido"], $filaDB["rut_cliente"], $filaDB["nom_fantasia"],
                                               $filaDB["nom_local_cliente"], $filaDB["nom_contacto"], 
                                               $filaDB["apell_pat_contacto"], $filaDB["apell_mat_contacto"],
                                               $filaDB["nom_usuario"], $filaDB["apell_pat_usuario"], 
                                               $filaDB["apell_mat_usuario"], $filaDB["precio_total"]);*/
                $i++;
            }
            $this->total_registros = $i - 1;
            //print_r($listaPedidos);
            return $listaPedidos;
        }
        
        function getListaVentas($rutaRelativa) {
            include_once($rutaRelativa . "Clases/Venta.php");
                
            $listaVentas = Array();
            
            $db = conectarse();
            $query = "SELECT v.id_venta,
                             v.id_local_cliente, 
                             v.id_usuario_venta,
                             v.precio_total,
                             v.num_docto_emitido,
                             v.rut_empresa,
                             v.fecha_venta,
                             SUM(nc.precio_total) AS total_nota_credito,
                             v.entregado,
                             v.id_tipo_docto_emitido
                      FROM 40_m_venta v 
                          LEFT OUTER JOIN 40_m_nota_credito nc ON v.id_venta = nc.id_venta
                              AND nc.id_estado = 3
                      WHERE v.id_estado = 3
                      GROUP BY v.id_venta,
                               v.id_local_cliente, 
                               v.id_usuario_venta,
                               v.precio_total,
                               v.num_docto_emitido,
                               v.rut_empresa,
                               v.fecha_venta
                      ORDER BY v.fecha_venta DESC
                      LIMIT 5000";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $listaVentas[$i] = new Venta($rutaRelativa, $filaDB["id_venta"], $filaDB["id_local_cliente"], 
                                             $filaDB["id_usuario_venta"], $filaDB["precio_total"], $filaDB["num_docto_emitido"],
                                             $filaDB["rut_empresa"], $filaDB["fecha_venta"], $filaDB["total_nota_credito"]);
                $listaVentas[$i]->setEntregado($filaDB["entregado"]);
                $listaVentas[$i]->id_tipo_docto_emitido = $filaDB["id_tipo_docto_emitido"];
                $i++;
            }
            $this->total_registros = $i - 1;

            return $listaVentas;
        }
        
        function getTotalRegistros() {
            return $this->total_registros;
        }
    }
?>

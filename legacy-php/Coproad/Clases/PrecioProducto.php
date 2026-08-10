<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 02-02-2012                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a los Precios de Productos              *
 *        (tabla 40_m_precio_producto)                      *
 ************************************************************/

    class PrecioProducto {
        
        //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
        private $id_lista_precio     = "";
        private $tipo_producto       = "";
        private $id_producto         = "";
        private $cod_serfel          = "";
        private $nom_producto        = "";
        private $nom_marca           = "";
        private $nom_UM              = "";
        private $cantidad            = "";
        private $cantidad_stock      = "";
        private $cantidad_pedida     = "";
        private $cantidad_disponible = "";
        private $costo_prom          = "";
        private $ult_fecha_compra    = "";
        private $precio_neto         = "";
        private $precio_base         = "";
        private $impuesto            = "";
        private $imp_iaba            = "";
        private $imp_espec           = "";
        private $iva                 = "";
        private $margen_utilidad     = "";
        private $porcen_desc         = "";
        private $precio_venta        = "";
        private $sub_total           = "";
        private $ruta_relativa       = "";
        private $max_porcen_desc     = "";
        private $id_usuario_mod      = "";
        private $fecha_modificacion  = "";
        private $estado              = "";

        public $cant_tramo1       = "";
        public $max_porcen_tramo1 = "";
        public $cant_tramo2       = "";
        public $max_porcen_tramo2 = "";
        public $cant_tramo3       = "";
        public $max_porcen_tramo3 = "";
        //</editor-fold>
        
        //<editor-fold defaultstate="collapsed" desc="CONSTRUCTORES">
        function __construct() {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 20-08-2011                                        *
         * Modif: 28-12-2011                                        *
         * Desc : Constructores principales de la Clase             *
         *        PrecioProducto                                    *
         ************************************************************/
            
            if(func_num_args() == 1) {
                $this->ruta_relativa = func_get_arg(0);
            
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase segun Id Lista Precio e Id Producto">
            } else if(func_num_args() == 4) {
                $this->ruta_relativa = func_get_arg(0);
                $this->id_lista_precio = func_get_arg(1);
                $idProducto = func_get_arg(2);
                
                $query = "SELECT p.id_producto,
                                     p.cod_serfel,
                                     p.nom_producto,
                                     p.id_tipo_producto,
                                     p.impuesto,
                                     p.costo_prom,
                                     p.ult_fecha_compra,
                                     m.nom_marca,
                                     um.nom_UM,
                                     COALESCE(pp.precio_neto, 0) AS precio_neto,
                                     COALESCE(pp.precio, 0) AS precio,
                                     COALESCE((SELECT SUM(cantidad)
                                               FROM 50_m_stock s
                                               WHERE s.id_producto = p.id_producto), 0) AS cantidad_stock,
                                     COALESCE(pp.precio / (1 + (pp.porcen_desc / 100)), 0) AS precio_venta,
                                     COALESCE(pp.porcen_desc, 0) AS porcen_desc,
                                     COALESCE((SELECT SUM(ppe.cantidad)
                                               FROM 30_m_producto_pedido ppe
                                                   INNER JOIN 30_m_pedido pe ON ppe.id_pedido = pe.id_pedido AND pe.id_estado = 1
                                               WHERE ppe.id_producto = p.id_producto), 0) AS cantidad_pedida,
                                     COALESCE(pp.max_porcen_desc, 0) AS max_porcen_desc
                              FROM 20_m_producto p
                                  INNER JOIN 20_p_marca m ON p.id_marca = m.id_marca
                                  INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM
                                  LEFT OUTER JOIN 40_m_precio_producto pp ON p.id_producto = pp.id_producto 
                                      AND pp.id_lista_precio = " . $this->id_lista_precio;
                                          
                if(func_num_args() == 3 || func_get_arg(3) == "idProducto")
                    $query .= " WHERE p.id_producto = " . $idProducto;
                else if(func_get_arg(3) == "codSerfel")
                    $query .= " WHERE (p.cod_serfel = " . $idProducto . "
                                        OR p.cod_barra_producto = " . $idProducto . ")
                                    AND p.id_estado = 1";
                
                $db = conectarse();
                $resDB = mysql_query($query, $db) or die(mysql_error());
                $totRes = mysql_num_rows($resDB);

                if($totRes > 0) {
                    include_once($this->ruta_relativa . "Clases/TipoProducto.php");
                    
                    while ($filaDB = mysql_fetch_assoc($resDB)) {
                        $this->id_producto      = $filaDB["id_producto"];
                        $this->cod_serfel       = $filaDB["cod_serfel"];
                        $this->nom_producto     = $filaDB["nom_producto"];
                        $this->impuesto         = $filaDB["impuesto"];
                        $this->nom_marca        = $filaDB["nom_marca"];
                        $this->nom_UM           = $filaDB["nom_UM"];
                        $this->cantidad_stock   = $filaDB["cantidad_stock"];
                        $this->cantidad_pedida  = $filaDB["cantidad_pedida"];
                        $this->precio_neto      = $filaDB["precio_neto"];
                        $this->precio_base      = $filaDB["precio"];
                        $this->precio_venta     = $filaDB["precio_venta"];
                        $this->porcen_desc      = $filaDB["porcen_desc"];
                        $this->costo_prom       = $filaDB["costo_prom"];
                        $this->ult_fecha_compra = $filaDB["ult_fecha_compra"];
                        $this->max_porcen_desc  = $filaDB["max_porcen_desc"];
                        //if($filaDB["costo_prom"] == "") $this->costo_prom = 0.00;
                        //else $this->costo_prom = $filaDB["costo_prom"];
                        
                        $this->tipo_producto = new TipoProducto($filaDB["id_tipo_producto"]);
                    }
                    include_once($this->ruta_relativa . "Clases/Venta.php");
                    $venta = new Venta();
                    
                    $this->imp_iaba  = 0;
                    $this->imp_espec = 0;
                    //$this->iva       = $this->precio_base - $this->precio_neto;
                    $this->iva       = $this->precio_neto * $venta->getIva() / 100;
                    $this->precio_base = $this->precio_neto + $this->iva;
                    
                    if($this->impuesto == 1 || $this->impuesto == 4 || $this->impuesto == 5) {
                        $this->imp_iaba  = $this->precio_neto * $venta->getIaba() / 100;
                        $this->precio_base = $this->precio_neto + $this->iva + $this->imp_iaba;
                        //$this->iva      -= $this->imp_iaba;
                    } else if($this->impuesto == 2) {
                        $this->imp_espec = $this->precio_neto * $venta->getImpEspec() / 100;
                        $this->precio_base = $this->precio_neto + $this->iva + $this->imp_espec;
                        //$this->iva      -= $this->imp_espec;
                    }
                    
                    $this->precio_venta = $this->precio_base - $this->precio_base * $this->porcen_desc / 100;
                }
            //</editor-fold>
                
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Venta)">
            } else if(func_num_args() == 6) {
                $this->id_producto  = func_get_arg(0);
                $this->nom_producto = func_get_arg(1);
                $this->nom_marca    = func_get_arg(2);
                $this->nom_UM       = func_get_arg(3);
                $this->cantidad     = func_get_arg(4);
                $this->sub_total    = func_get_arg(5);
            //</editor-fold>

            } else if(func_num_args() == 9) {
                $this->id_producto     = func_get_arg(0);
                $this->nom_producto    = func_get_arg(1);
                $this->costo_prom      = func_get_arg(2);
                $this->precio_neto     = func_get_arg(3);
                $this->precio_base     = func_get_arg(4);
                $this->margen_utilidad = func_get_arg(5);
                $this->porcen_desc     = func_get_arg(6);
                $this->precio_venta    = func_get_arg(7);
                $this->cod_serfel      = func_get_arg(8);
                
                if($this->costo_prom == "") $this->costo_prom = 0;
                if($this->precio_neto == "") $this->precio_neto = 0;
                if($this->precio_base == "") $this->precio_base = 0;
                if($this->margen_utilidad == "") $this->margen_utilidad = 0;
                if($this->porcen_desc == "") $this->porcen_desc = 0;
                if($this->precio_venta == "") $this->precio_venta = 0;
                
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Lista)">
            } else if(func_num_args() == 15) {
                $this->id_producto     = func_get_arg(0);
                $this->nom_producto    = func_get_arg(1);
                $this->costo_prom      = func_get_arg(2);
                $this->precio_neto     = func_get_arg(3);
                $this->precio_base     = func_get_arg(4);
                $this->margen_utilidad = func_get_arg(5);
                $this->porcen_desc     = func_get_arg(6);
                $this->precio_venta    = func_get_arg(7);
                $this->cod_serfel      = func_get_arg(8);
                //max porcen desc por tramos
                $this->cant_tramo1       = func_get_arg(9);
                $this->max_porcen_tramo1 = func_get_arg(10);
                $this->cant_tramo2       = func_get_arg(11);
                $this->max_porcen_tramo2 = func_get_arg(12);
                $this->cant_tramo3       = func_get_arg(13);
                $this->max_porcen_tramo3 = func_get_arg(14);
                
                if($this->costo_prom == "") $this->costo_prom = 0;
                if($this->precio_neto == "") $this->precio_neto = 0;
                if($this->precio_base == "") $this->precio_base = 0;
                if($this->margen_utilidad == "") $this->margen_utilidad = 0;
                if($this->porcen_desc == "") $this->porcen_desc = 0;
                if($this->precio_venta == "") $this->precio_venta = 0;
            //</editor-fold>
            
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Pedido)">
            } else if(func_num_args() == 10) {
                $this->id_producto     = func_get_arg(0);
                $this->nom_producto    = func_get_arg(1);
                $this->nom_marca       = func_get_arg(2);
                $this->nom_UM          = func_get_arg(3);
                $this->cantidad        = func_get_arg(4);
                $this->precio_base     = func_get_arg(5);
                $this->cantidad_stock  = func_get_arg(6);
                $this->precio_venta    = func_get_arg(7);
                $this->porcen_desc     = func_get_arg(8);
                $this->cantidad_pedida = func_get_arg(9);
                
                $this->cantidad_pedida -= $this->cantidad;
            //</editor-fold>
            
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Pedido)">
            } else if(func_num_args() == 13) {
                $this->ruta_relativa   = func_get_arg(0);
                $this->id_producto     = func_get_arg(1);
                $this->cod_serfel      = func_get_arg(2);
                $this->nom_producto    = func_get_arg(3);
                $impuesto              = func_get_arg(4);
                $this->nom_marca       = func_get_arg(5);
                $this->nom_UM          = func_get_arg(6);
                $this->cantidad        = func_get_arg(7);
                $this->precio_neto     = func_get_arg(8);
                $this->cantidad_stock  = func_get_arg(9);
                $this->precio_venta    = func_get_arg(10);
                $this->porcen_desc     = func_get_arg(11);
                $this->cantidad_pedida = func_get_arg(12);
                
                $this->cantidad_pedida -= $this->cantidad;
                $this->impuesto = $impuesto;
                include_once($this->ruta_relativa . "Clases/Venta.php");
                $venta = new Venta();
                    
                $this->imp_iaba  = 0;
                $this->imp_espec = 0;
                //$this->iva       = round($this->precio_neto * $venta->getIva() / 100);
                $this->iva       = $this->precio_neto * $venta->getIva() / 100;
                 
                $this->precio_base = $this->precio_neto + $this->iva;
                
                if($impuesto == 1 || $impuesto == 4 || $impuesto == 5) {
                    //$this->imp_iaba    = round($this->precio_neto * $venta->getIaba() / 100);
                    $this->imp_iaba    = $this->precio_neto * $venta->getIaba() / 100;
                    $this->precio_base = $this->precio_neto + $this->iva + $this->imp_iaba;
                } else if($impuesto == 2) {
                    //$this->imp_espec = round($this->precio_neto * $venta->getImpEspec() / 100);
                    $this->imp_espec = $this->precio_neto * $venta->getImpEspec() / 100;
                    $this->precio_base = $this->precio_neto + $this->iva + $this->imp_espec;
                }
                //echo $this->precio_base . " - " . $this->porcen_desc;
                
                $this->precio_venta = $this->precio_base;
                //$this->precio_venta = $this->precio_base - $this->precio_base * $this->porcen_desc / 100;
                //echo $this->precio_venta;
            }
            //</editor-fold>
            
            if($this->cantidad_stock == "") $this->cantidad_stock = 0;
            if($this->precio_base == "") $this->precio_base = 0;
            if($this->precio_venta == "") $this->precio_venta = 0;
            if($this->porcen_desc == "") $this->porcen_desc = 0;
            if($this->cantidad_pedida == "") $this->cantidad_pedida = 0;
                
            $this->cantidad_disponible = $this->cantidad_stock - $this->cantidad_pedida;
        }
        //</editor-fold>
        
        function ingPrecioProducto($idListaPrecio, $idProducto, $precioVenta, $idUsuIng) {
            /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Ingresa Alertas de Stock nuevas al sistema        *
         * Resp : {  0: Lista ya existe y esta activa.              *
         *          >0: Lista ingresada con exito.                  *
         *        }                                                 *
         ************************************************************/
            include_once($this->ruta_relativa . "Clases/Venta.php");
            include_once($this->ruta_relativa . "Clases/Producto.php");
            include_once($this->ruta_relativa . "Clases/TipoProducto.php");
            
            $venta = new Venta($this->ruta_relativa);
            $iva = $venta->getIva();
            
            $db = conectarse();

            $query = "SELECT id_lista_precio
                      FROM 40_m_precio_producto
                      WHERE id_lista_precio = " . $idListaPrecio . "
                          AND id_producto = " . $idProducto;
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $idListaExistente = "";
            while($filaDB = mysql_fetch_assoc($resDB)) {
                $idListaExistente = $filaDB["id_lista_precio"];
            }
            
            
            if($idListaExistente != "") {
                $db = conectarse();
                
                $producto = new Producto($idProducto);
                
                $impuestos = $iva;
                
                if($producto->getImpuesto() > 0) $impuestos += $venta->getImpuesto($producto->getImpuesto());
                
                $query = "UPDATE 40_m_precio_producto
                              SET precio_neto = " . $precioVenta . ",
                                  precio      = " . $precioVenta . " + " . /*$precioVenta * $impuestos / 100*/ round($precioVenta * $impuestos / 100) . "
                          WHERE id_lista_precio = " . $idListaPrecio . "
                              AND id_producto = " . $idProducto;
                //echo $query;
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                
                return 1;
            } else if($idListaExistente == "") {
                $db = conectarse();
                
                $producto = new Producto($idProducto);
                
                $impuestos = $iva;
                
                if($producto->getImpuesto() > 0) $impuestos += $venta->getImpuesto($producto->getImpuesto());
                
                $query = "INSERT INTO 40_m_precio_producto (id_lista_precio,
                                                            id_producto,
                                                            precio_neto,
                                                            precio,
                                                            porcen_desc,
                                                            max_porcen_desc)
                            VALUES (" . $idListaPrecio . ",
                                    " . $idProducto . ",
                                    " . /*$precioVenta * $impuestos / 100*/ $precioVenta . ", 
                                    " . $precioVenta . " + " . round($precioVenta * $impuestos / 100) . ",
                                    0,
                                    0)";
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                return 1;
            }
        }
        
        function ingPorcenDesc($idListaPrecio, $idProducto, $porcenVariacion, $idUsuIng) {
            /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Ingresa Alertas de Stock nuevas al sistema        *
         * Resp : {  0: Lista ya existe y esta activa.              *
         *          >0: Lista ingresada con exito.                  *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();

            $query = "SELECT id_lista_precio
                      FROM 40_m_precio_producto
                      WHERE id_lista_precio = " . $idListaPrecio . "
                          AND id_producto = " . $idProducto;
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $idListaExistente = "";
            while($filaDB = mysql_fetch_assoc($resDB)) {
                $idListaExistente = $filaDB["id_lista_precio"];
            }
            
            if($idListaExistente != "") {
                $db = conectarse();
                
                $query = "UPDATE 40_m_precio_producto
                              SET max_porcen_desc = " . $porcenVariacion . "
                          WHERE id_lista_precio = " . $idListaPrecio . "
                              AND id_producto = " . $idProducto;
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                
                return 1;
            } else if($idListaExistente == "") {
                $db = conectarse();
                
                $query = "INSERT INTO 40_m_precio_producto (id_lista_precio,
                                                            id_producto,
                                                            precio,
                                                            porcen_desc,
                                                            max_porcen_desc)
                            VALUES (" . $idListaPrecio . ",
                                    " . $idProducto . ",
                                    0,
                                    0,
                                    " . $porcenVariacion . ")";
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                return 1;
            }
        }
        
        //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
        function getMaxPorcenDesc() {
            return $this->max_porcen_desc;
        }
        
        function getTipoProducto() {
            return $this->tipo_producto;
        }
        
        function getUltFechaCompra() {
            return $this->ult_fecha_compra;
        }
        
        function getIdProducto() {
            return $this->id_producto;
        }
        
        function getCodSerfel() {
            return $this->cod_serfel;
        }
        
        function getNomProducto() {
            return $this->nom_producto;
        }
        
        function getNomMarca() {
            return $this->nom_marca;
        }
        
        function getNomUM() {
            return $this->nom_UM;
        }
        
        function getCantidad() {
            return $this->cantidad;
        }
        
        function getCantidadStock() {
            return $this->cantidad_stock;
        }
        
        function getCantidadPedida() {
            return $this->cantidad_pedida;
        }
        
        function getCantidadDisponible() {
            return $this->cantidad_disponible;
        }

        function getCostoProm() {
            return $this->costo_prom;
        }
        
        function getImpuesto() {
            return $this->impuesto;
        }
        
        function getPrecioNeto() {
            return $this->precio_neto;
        }
        
        function getPrecioBase() {
            return $this->precio_base;
        }
        
        function getMargenUtilidad() {
            return $this->margen_utilidad;
        }
        
        function getPorcenDesc() {
            return $this->porcen_desc;
        }
        
        function getPrecioVenta() {
            return $this->precio_venta;
        }
        
        function getSubTotal() {
            return $this->sub_total;
        }
        
        function getImpIaba() {
            return $this->imp_iaba;
        }
        
        function getImpEspec() {
            return $this->imp_espec;
        }
        
        function getIva() {
            return $this->iva;
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

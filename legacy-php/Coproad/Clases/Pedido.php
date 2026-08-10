<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 02-02-2012                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a los Pedidos (tabla 30_m_pedido)       *
 ************************************************************/

    class Pedido {
        
        //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
        private $id_pedido       = "";
        private $local_cliente   = "";
        private $vendedor        = "";
        private $id_forma_pago   = "";
        private $precio_total    = "";
        private $dia_ruta        = "";
        private $productos       = "";
        private $total_productos = "";
        private $ruta_relativa   = "";
        private $fecha_pedido    = "";
        private $estado          = "";
        //</editor-fold>
        
        //<editor-fold defaultstate="collapsed" desc="CONSTRUCTORES">
        function __construct() {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 20-08-2011                                        *
         * Modif: 28-12-2011                                        *
         * Desc : Constructores principales de la Clase Pedido      *
         ************************************************************/
            if(func_num_args() > 0) $this->ruta_relativa = func_get_arg(0);
            
            //<editor-fold defaultstate="collapsed" desc="Se carga la clase con la info del Pedido segun Id">
            if(func_num_args() == 2) {
                $idPedido = func_get_arg(1);
                
                $query = "SELECT p.id_pedido, 
                                 p.id_local_cliente, 
                                 p.id_usuario,
                                 p.precio_total,
                                 p.fecha_pedido,
                                 p.id_forma_pago,
                                 p.dia_ruta,
                                 p.id_estado
                          FROM 30_m_pedido p
                          WHERE p.id_pedido = " . $idPedido;
                
                $db = conectarse();
                $resDB = mysql_query($query, $db) or die(mysql_error());
                $totRes = mysql_num_rows($resDB);

                if($totRes > 0) {
                    while ($filaDB = mysql_fetch_assoc($resDB)) {
                        $this->id_pedido     = $filaDB["id_pedido"];
                        $this->local_cliente = new LocalCliente($filaDB["id_local_cliente"]);
                        $this->vendedor      = new Usuario($filaDB["id_usuario"]);
                        $this->precio_total  = $filaDB["precio_total"];
                        $this->fecha_pedido  = $filaDB["fecha_pedido"];
                        $this->id_forma_pago = $filaDB["id_forma_pago"];
                        $this->dia_ruta      = $filaDB["dia_ruta"];
                        $this->estado        = $filaDB["id_estado"];
                    }
                    
                    $query = "SELECT pp.id_producto,
                                     p.cod_serfel,
                                     p.nom_producto,
                                     p.impuesto,
                                     m.nom_marca,
                                     um.nom_UM,
                                     pp.cantidad,
                                     pp.precio_neto,
                                     (SELECT SUM(cantidad)
                                      FROM 50_m_stock s
                                      WHERE s.id_producto = pp.id_producto) AS cantidad_stock,
                                     pp.precio AS precio_venta,
                                     pp.porcen_desc,
                                     (SELECT SUM(ppe.cantidad)
                                      FROM 30_m_producto_pedido ppe
                                          INNER JOIN 30_m_pedido pe ON ppe.id_pedido = pe.id_pedido AND pe.id_estado = 1
                                      WHERE ppe.id_producto = pp.id_producto) AS cantidad_pedida
                              FROM 30_m_producto_pedido pp
                                  INNER JOIN 20_m_producto p ON pp.id_producto = p.id_producto
                                  INNER JOIN 20_p_marca m ON p.id_marca = m.id_marca
                                  INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM
                              WHERE pp.id_pedido = " . $this->id_pedido;
                    //pp.precio + ((pp.precio * pp.porcen_desc) / 100) AS precio_venta,
                    $db = conectarse();
                    $resDB = mysql_query($query, $db) or die(mysql_error());

                    $i = 0;
                    while ($filaDB = mysql_fetch_assoc($resDB)) {
                        $this->productos[$i] = new PrecioProducto($this->ruta_relativa, $filaDB["id_producto"], 
                                                                  $filaDB["cod_serfel"], $filaDB["nom_producto"],
                                                                  $filaDB["impuesto"], $filaDB["nom_marca"], 
                                                                  $filaDB["nom_UM"], $filaDB["cantidad"], $filaDB["precio_neto"],  
                                                                  $filaDB["cantidad_stock"], $filaDB["precio_venta"], 
                                                                  $filaDB["porcen_desc"], $filaDB["cantidad_pedida"]);
                        $i++;
                    }
                    $this->total_productos =  $i - 1;

                    mysql_close($db);
                }
                
                //</editor-fold>
                
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Lista)">
            } else if(func_num_args() == 6) {
                include_once($this->ruta_relativa . "Clases/LocalCliente.php");
                
                $this->id_pedido     = func_get_arg(1);
                $this->local_cliente = new LocalCliente(func_get_arg(2));
                $this->vendedor      = new Usuario(func_get_arg(3));
                $this->precio_total  = func_get_arg(4);
                $this->fecha_pedido  = func_get_arg(5);
            }
            //</editor-fold>
        }
        //</editor-fold>
        
        private function obtNuevoIdPedido() {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 23-11-2011                                        *
         * Desc : Devuelve el siguiente Id Pedido del sistema.      *
         ************************************************************/
            $db = conectarse();

            $query = "SELECT (MAX(id_pedido) + 1) as id_pedido
                      FROM 30_m_pedido";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            while ($filaDB = mysql_fetch_assoc($resDB)) $idPedido = $filaDB["id_pedido"];
            
            if($idPedido == "") $idPedido = 1;
            
            mysql_close($db);
            return $idPedido;
        }
        
        function anularPedido($idPedido, $idUsuElim) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Elimina a una Empresa del sistema                 *
         * Resp : {  1: Lista eliminada.                            *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();
            
            $query = "UPDATE 30_m_pedido
                          SET id_estado     = 0
                      WHERE id_pedido = " . $idPedido;
            $resDB = mysql_query($query, $db) or die(mysql_error());

            mysql_close($db);
            return 1;
        }
        
        //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
        function getIdPedido() {
            return $this->id_pedido;
        }
        
        public function getLocalCliente() {
            return $this->local_cliente;
        }

        public function getVendedor() {
            return $this->vendedor;
        }
        
        public function getIdFormaPago() {
            return $this->id_forma_pago;
        }
                
        function getProductos() {
            return $this->productos;
        }
        
        function getPrecioTotal() {
            return $this->precio_total;
        }
        
        function getTotalProductos() {
            return $this->total_productos;
        }
        
        function getFechaPedido() {
            return $this->fecha_pedido;
        }
        
        function getEstado() {
            return $this->estado;
        }
        //</editor-fold>
    }

?>

<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 02-02-2012                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a la Venta (tabla 40_m_venta)           *
 ************************************************************/

    class NotaCredito {
        
        //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
        private $ruta_relativa      = "";
        private $id_nota_credito    = "";
        private $id_venta           = "";
        private $empresa            = "";
        private $local_cliente      = "";
        private $vendedor           = "";
        private $num_factura        = "";
        private $num_nota_credito   = "";
        private $nom_forma_pago     = "";
        private $ano_venta          = "";
        private $mes_venta          = "";
        private $dia_venta          = "";
        private $id_vendedor        = "";
        private $productos          = "";
        private $informes           = "";
        private $sub_total          = "";
        private $total              = "";
        private $num_ventas         = "";
        private $iva_venta          = "";
        private $iaba_venta         = "";
        private $espec_venta        = "";
        private $fecha_venta        = "";
        private $total_registros    = "";
        private $total_nota_credito = "";
        private $motivo             = "";
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
            if(func_num_args() > 0) $this->ruta_relativa = func_get_arg(0);
            
            //<editor-fold defaultstate="collapsed" desc="Si se usa el numero de factura">
            if(func_num_args() == 3) {
                $query = "SELECT nc.id_nota_credito,
                                 nc.id_venta,
                                 nc.rut_empresa,
                                 v.id_local_cliente,
                                 v.id_usuario_venta,
                                 v.num_docto_emitido,
                                 nc.iva,
                                 nc.iaba,
                                 nc.espec,
                                 nc.sub_total,
                                 nc.precio_total,
                                 td.nom_tipo_docto,
                                 mnc.nom_motivo,
                                 YEAR(nc.fecha_nota_credito) AS ano_venta,
                                 MONTH(nc.fecha_nota_credito) AS mes_venta,
                                 DAY(nc.fecha_nota_credito) AS dia_venta
                          FROM 40_m_venta v
                              INNER JOIN 10_p_tipo_docto td ON v.id_forma_pago = td.id_tipo_docto
                              INNER JOIN 40_m_nota_credito nc ON v.id_venta = nc.id_venta
                              INNER JOIN 40_m_motivo_nota_credito mnc ON nc.id_motivo = mnc.id_motivo
                          WHERE nc.num_nota_credito = " . func_get_arg(1) . "
                              AND nc.rut_empresa = " . func_get_arg(2);
                $db = conectarse();
                $resDB = mysql_query($query, $db) or die(mysql_error());
                
                while ($filaDB = mysql_fetch_assoc($resDB)) {
                    include_once($this->ruta_relativa . "Clases/LocalCliente.php");
                    include_once($this->ruta_relativa . "Clases/Empresa.php");
                    
                    $this->id_nota_credito = $filaDB["id_nota_credito"];
                    $this->id_venta        = $filaDB["id_venta"];
                    $this->empresa         = new Empresa($filaDB["rut_empresa"]);
                    $this->local_cliente   = new LocalCliente($filaDB["id_local_cliente"]);
                    $this->vendedor        = new Usuario($filaDB["id_usuario_venta"]);
                    $this->num_factura     = $filaDB["num_docto_emitido"];
                    $this->iva_venta       = $filaDB["iva"];
                    $this->iaba_venta      = $filaDB["iaba"];
                    $this->espec_venta     = $filaDB["espec"];
                    $this->sub_total       = $filaDB["sub_total"];
                    $this->total           = $filaDB["precio_total"];
                    $this->nom_forma_pago  = $filaDB["nom_tipo_docto"];
                    $this->motivo          = $filaDB["nom_motivo"];
                    $this->ano_venta       = $filaDB["ano_venta"];
                    $this->mes_venta       = $filaDB["mes_venta"];
                    $this->dia_venta       = $filaDB["dia_venta"];
                    //$this->fecha_venta     = $rs->fields("fecha_venta");
                }
                
                if($this->id_venta > 0) {
                    $this->num_nota_credito = func_get_arg(1);
                }
                /*include_once($this->ruta_relativa . "Clases/PrecioProducto.php");
                
                $query = "SELECT pv.id_producto,
                                 p.nom_producto,
                                 m.nom_marca,
                                 um.nom_UM,
                                 pv.cantidad,
                                 pv.porcen_desc,
                                 pv.precio + ((pv.precio * pv.porcen_desc) / 100) AS precio,
                                 (pv.cantidad * (pv.precio + ((pv.precio * pv.porcen_desc) / 100))) AS sub_total
                          FROM 40_m_producto_venta pv
                              INNER JOIN 40_m_venta v ON pv.id_venta = v.id_venta
                              INNER JOIN 20_m_producto p ON pv.id_producto = p.id_producto
                              INNER JOIN 20_p_marca m ON p.id_marca = m.id_marca
                              INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM
                          WHERE v.num_docto_emitido = " . func_get_arg(1);
                $db = conectarse();
                mysql_query($query, $db) or die(mysql_error());
                
                $i = 0;
                while (!$rs->EOF) {
                    $this->productos[$i] = new PrecioProducto($rs->fields("id_producto"), $rs->fields("nom_producto"), 
                                                              $rs->fields("nom_marca"), $rs->fields("nom_UM"),
                                                              $rs->fields("cantidad"), $rs->fields("porcen_desc"), 
                                                              $rs->fields("precio"), $rs->fields("sub_total"));
                    $rs->moveNext();
                    $i++;
                }
                
                $this->total_registros = $i - 1;*/
            //</editor-fold>
                
            //<editor-fold defaultstate="collapsed" desc="Constructor de la Lista de Ventas">
            } else if(func_num_args() == 9) {
                include_once($this->ruta_relativa . "Clases/LocalCliente.php");
                include_once($this->ruta_relativa . "Clases/Empresa.php");
                
                $this->id_venta           = func_get_arg(1);
                $this->local_cliente      = new LocalCliente(func_get_arg(2));
                $this->vendedor           = new Usuario(func_get_arg(3));
                $this->total              = func_get_arg(4);
                $this->num_docto_emitido  = func_get_arg(5);
                $this->empresa            = new Empresa(func_get_arg(6));
                $this->fecha_venta        = func_get_arg(7);
                $this->total_nota_credito = func_get_arg(8);
            }
            //</editor-fold>
        }
        //</editor-fold>
        
        function obtNuevoNumNotaCredito($rutEmpresa) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 23-11-2011                                        *
         * Desc : Devuelve el siguiente Id Venta del sistema.       *
         ************************************************************/
            $db = conectarse();

            $query = "SELECT (MAX(num_nota_credito) + 1) as num_nota_credito
                      FROM 40_m_nota_credito
                      WHERE rut_empresa = " . $rutEmpresa;
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            while ($filaDB = mysql_fetch_assoc($resDB)) $numNotaCredito = $filaDB["num_nota_credito"];
            
            if($numNotaCredito == "") $numNotaCredito = 1;
            
            mysql_close($db);
            return $numNotaCredito;
        }
        
        //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
        public function getIdNotaCredito() {
            return $this->id_nota_credito;
        }

        function getIdVenta() {
            return $this->id_venta;
        }
        
        public function getLocalCliente() {
            return $this->local_cliente;
        }

        public function getVendedor() {
            return $this->vendedor;
        }
        
        public function getNumFactura() {
            return $this->num_factura;
        }

        public function getNumNotaCredito() {
            return $this->num_nota_credito;
        }
                
        public function getEmpresa() {
            return $this->empresa;
        }
        
        public function getNomFormaPago() {
            return $this->nom_forma_pago;
        }
        
        public function getAnoVenta() {
            return $this->ano_venta;
        }

        public function getMesVenta() {
            return $this->mes_venta;
        }

        public function getDiaVenta() {
            return $this->dia_venta;
        }
        
        function getProductos() {
            return $this->productos;
        }
        
        function getInformes() {
            return $this->informes;
        }
        
        function getTotal() {
            return $this->total;
        }
        
        function getNumVentas() {
            return $this->num_ventas;
        }
        
        function getIva() {
            $query = "SELECT iva
                      FROM 99_p_iva";
            $db = conectarse();
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            while ($filaDB = mysql_fetch_assoc($resDB)) $iva = $filaDB["iva"];
            
            return $iva;
        }
        
        function getIaba() {
            $query = "SELECT valor
                      FROM 99_p_impuesto
                      WHERE id_impuesto = 1";
            $db = conectarse();
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            while ($filaDB = mysql_fetch_assoc($resDB)) $iaba = $filaDB["valor"];
            
            return $iaba;
        }
        
        function getImpEspec() {
            $query = "SELECT valor
                      FROM 99_p_impuesto
                      WHERE id_impuesto = 2";
            $db = conectarse();
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            while ($filaDB = mysql_fetch_assoc($resDB)) $impEspec = $filaDB["valor"];
            
            return $impEspec;
        }
        
        function getImpuesto($idImpuesto) {
            $query = "SELECT valor
                      FROM 99_p_impuesto
                      WHERE id_impuesto = " . $idImpuesto;
            $db = conectarse();
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            while ($filaDB = mysql_fetch_assoc($resDB)) $impuesto = $filaDB["valor"];
            
            return $impuesto;
        }
        
        function getIvaVenta() {
            return $this->iva_venta;
        }
        
        function getIabaVenta() {
            return $this->iaba_venta;
        }
        
        function getEspecVenta() {
            return $this->espec_venta;
        }
        
        function getFechaVenta() {
            return $this->fecha_venta;
        }
        
        function getSubTotal() {
            return $this->sub_total;
        }
        
        function getTotalRegistros() {
            return $this->total_registros;
        }
        
        function getTotalNotaCredito() {
            return $this->total_nota_credito;
        }
        
        public function getMotivo() {
            return $this->motivo;
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

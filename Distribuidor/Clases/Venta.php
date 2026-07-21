<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 02-02-2012                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a la Venta (tabla 40_m_venta)           *
 ************************************************************/

    class Venta {
        
        //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
        private $ruta_relativa      = "";
        private $id_venta           = "";
        private $empresa            = "";
        private $local_cliente      = "";
        private $vendedor           = "";
        private $num_docto_emitido  = "";
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
        private $entregado          = "";
        private $id_usuario_mod     = "";
        private $fecha_modificacion = "";
        private $estado             = "";
        public $id_tipo_docto_emitido;
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
                $query = "SELECT v.id_venta,
                                 v.rut_empresa,
                                 v.id_local_cliente,
                                 v.id_usuario_venta,
                                 v.iva,
                                 v.iaba,
                                 v.espec,
                                 v.sub_total,
                                 v.precio_total,
                                 td.nom_tipo_docto,
                                 YEAR(v.fecha_venta) AS ano_venta,
                                 MONTH(v.fecha_venta) AS mes_venta,
                                 DAY(v.fecha_venta) AS dia_venta
                          FROM 40_m_venta v
                              INNER JOIN 10_p_tipo_docto td ON v.id_forma_pago = td.id_tipo_docto
                          WHERE v.num_docto_emitido = " . func_get_arg(1) . "
                              AND v.rut_empresa = " . func_get_arg(2) . "
                              AND v.id_estado > 0";
                $db = conectarse();
                $resDB = mysql_query($query, $db) or die(mysql_error());
                
                while ($filaDB = mysql_fetch_assoc($resDB)) {
                    include_once($this->ruta_relativa . "Clases/LocalCliente.php");
                    include_once($this->ruta_relativa . "Clases/Empresa.php");
                    
                    $this->id_venta        = $filaDB["id_venta"];
                    $this->empresa         = new Empresa($filaDB["rut_empresa"]);
                    $this->local_cliente   = new LocalCliente($filaDB["id_local_cliente"]);
                    $this->vendedor        = new Usuario($filaDB["id_usuario_venta"]);
                    $this->iva_venta       = $filaDB["iva"];
                    $this->iaba_venta      = $filaDB["iaba"];
                    $this->espec_venta     = $filaDB["espec"];
                    $this->sub_total       = $filaDB["sub_total"];
                    $this->total           = $filaDB["precio_total"];
                    $this->nom_forma_pago  = $filaDB["nom_tipo_docto"];
                    $this->ano_venta       = $filaDB["ano_venta"];
                    $this->mes_venta       = $filaDB["mes_venta"];
                    $this->dia_venta       = $filaDB["dia_venta"];
                    //$this->fecha_venta     = $rs->fields("fecha_venta");
                }
                
                if($this->id_venta > 0) {
                    $this->num_docto_emitido = func_get_arg(1);
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
        
        private function obtNuevoIdNotaCredito() {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 23-11-2011                                        *
         * Desc : Devuelve el siguiente Id Venta del sistema.       *
         ************************************************************/
            $db = conectarse();

            $query = "SELECT (MAX(id_nota_credito) + 1) as id_nota_credito
                      FROM 40_m_nota_credito";
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            while ($filaDB = mysql_fetch_assoc($resDB)) $idNotaCredito = $filaDB["id_nota_credito"];
            
            if($idNotaCredito == "") $idNotaCredito = 1;
            
            mysql_close($db);
            return $idNotaCredito;
        }
        
        function obtNuevoNumFactura($rutEmpresa) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 23-11-2011                                        *
         * Desc : Devuelve el siguiente Id Venta del sistema.       *
         ************************************************************/
            $db = conectarse();

            $query = "SELECT (MAX(num_docto_emitido) + 1) as num_factura
                      FROM 40_m_venta
                      WHERE id_tipo_docto_emitido = 1
                          AND rut_empresa = " . $rutEmpresa . "
                          AND id_estado > 0";
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            while ($filaDB = mysql_fetch_assoc($resDB)) $numFactura = $filaDB["num_factura"];
            
            if($numFactura == "") $numFactura = 1;
            
            mysql_close($db);
            return $numFactura;
        }
        
        function ingVenta($rutEmpresa, $idVendedor, $numDoctoEmit, $idLocalCliente, $idFormaPago, $producto, $cantidad,
                          $descuento, $iva, $iaba, $espec, $subTotal, $precioTotal, $cantProd, $fechaVenta, $idUsuIng) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Ingresa Ventas nuevas al sistema                  *
         * Resp : { >0: Venta ingresada con exito.                  *
         *           0: Numero de Documento ya existe               *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();
            $query = "SELECT * 
                      FROM 40_m_venta
                      WHERE num_docto_emitido = " . $numDoctoEmit . "
                          AND rut_empresa = " . $rutEmpresa . "
                          AND id_estado > 0
                          AND id_tipo_docto_emitido = 1";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);
            
            if($totRes == 0) {
                include_once("../../Clases/LocalCliente.php");
                include_once("../../Clases/PrecioProducto.php");
                include_once("../../Clases/Stock.php");
                
                require_once __DIR__ . '/Constantes/ImpuestoCONST.php';
                require_once __DIR__ . '/Conexion/Conexion.php';
                require_once __DIR__ . '/DAO/ImpuestoDAO.php';

                $localCliente = new LocalCliente($idLocalCliente);
                
                $oConexion = new Conexion();
                $oPDO = $oConexion->abrirConexion();
                
                $oImpuestoDAO = new ImpuestoDAO($this->ruta_relativa);
                $oIva = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::IVA);
                $iva = round($subTotal * $oIva->valor / 100);
                $precioTotal = $subTotal + $iva + $iaba + $espec;
                
                $db = conectarse();
                $query = "INSERT INTO 40_m_venta (id_lista_precio,
                                                id_usuario_venta,
                                                iva,
                                                iaba,
                                                espec,
                                                sub_total,
                                                precio_total,
                                                num_docto_emitido,
                                                id_tipo_docto_emitido,
                                                rut_empresa,
                                                rut_cliente,
                                                id_local_cliente,
                                                id_forma_pago,
                                                id_pedido,
                                                fecha_venta,
                                                id_usuario_mod,
                                                ult_fecha_mod,
                                                id_estado)
                            VALUES (" . $localCliente->getIdListaPrecio() . ",
                                    " . $idVendedor . ",
                                    " . $iva . ",
                                    " . $iaba . ",
                                    " . $espec . ",
                                    " . $subTotal . ",
                                    " . $precioTotal . ",
                                    " . $numDoctoEmit . ",
                                    1,
                                    " . $rutEmpresa . ",
                                    " . $localCliente->getRutCliente() . ",
                                    " . $idLocalCliente . ",
                                    " . $idFormaPago . ",
                                    0,
                                    '" . $fechaVenta . "',
                                    " . $idUsuIng . ",
                                    NOW(),
                                    3)";
                mysql_query($query, $db) or die(mysql_error());
                $this->id_venta = mysql_insert_id($db);

                $i = 0;
                while ($i < $cantProd) {
                    $precioProducto = new PrecioProducto($this->ruta_relativa, $localCliente->getIdListaPrecio(), $producto[$i], "idProducto");

                    $db = conectarse();
                    $query = "INSERT INTO 40_m_producto_venta (id_venta,
                                                            id_producto,
                                                            cantidad,
                                                            precio,
                                                            porcen_desc)
                                VALUES (" . $this->id_venta . ",
                                        " . $producto[$i] . ",
                                        " . $cantidad[$i] . ",
                                        " . $precioProducto->getPrecioNeto() . ",
                                        " . $descuento[$i] . ")";
                    //echo $query;
                    mysql_query($query, $db) or die(mysql_error());

                    $stock = new Stock();

                    $stock->modStock(1, $producto[$i], $cantidad[$i] * -1);
                    $i++;
                }
                return $this->id_venta;
            } else {
                return 0;
            }
        }
        
        public function ingVentaPedido($idPedido, $rutEmpresa, $numDoctoEmit, $idFormaPago, $producto, $cantidad, 
                                       $descuento, $precio, $iva, $iaba, $espec, $subTotal, $precioTotal, $cantProd, $fechaVenta, $idUsuIng) {
            
            $db = conectarse();
            $query = "SELECT * 
                      FROM 40_m_venta
                      WHERE num_docto_emitido = " . $numDoctoEmit . "
                          AND rut_empresa = " . $rutEmpresa . "
                          AND id_estado > 0
                          AND id_tipo_docto_emitido = 1";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);
            
            if($totRes == 0) {
                include_once("../../Clases/Stock.php");

                $db = conectarse();

                $query = "INSERT INTO 40_m_venta (id_lista_precio,
                                                  id_usuario_venta,
                                                  iva,
                                                  iaba,
                                                  espec,
                                                  sub_total,
                                                  precio_total,
                                                  num_docto_emitido,
                                                  id_tipo_docto_emitido,
                                                  rut_empresa,
                                                  rut_cliente,
                                                  id_local_cliente,
                                                  id_forma_pago,
                                                  id_pedido,
                                                  fecha_venta,
                                                  id_usuario_mod,
                                                  ult_fecha_mod,
                                                  id_estado)
                              SELECT p.id_lista_precio,
                                     p.id_usuario,
                                     " . $iva . ", 
                                     " . $iaba . ",
                                     " . $espec . ",
                                     " . $subTotal . ",
                                     " . $precioTotal . ",
                                     " . $numDoctoEmit . ",
                                     1,
                                     " . $rutEmpresa . ",
                                     lc.rut_cliente,
                                     p.id_local_cliente,
                                     " . $idFormaPago . ",
                                     " . $idPedido . ", 
                                     '" . $fechaVenta . "',
                                     " . $idUsuIng . ",
                                     NOW(),
                                     3
                              FROM 30_m_pedido p
                                  INNER JOIN 10_m_local_cliente lc ON p.id_local_cliente = lc.id_local_cliente
                              WHERE p.id_pedido = " . $idPedido;
                //echo $query;
                mysql_query($query, $db) or die(mysql_error());
                $this->id_venta = mysql_insert_id($db);

                $i = 0;
                while ($i < $cantProd) {

                    $db = conectarse();
                    $query = "INSERT INTO 40_m_producto_venta (id_venta,
                                                              id_producto,
                                                              cantidad,
                                                              precio,
                                                              porcen_desc)
                                  VALUES (" . $this->id_venta . ",
                                          " . $producto[$i] . ",
                                          " . $cantidad[$i] . ",
                                          " . $precio[$i] . ",
                                          " . $descuento[$i] . ")";
                    mysql_query($query, $db) or die(mysql_error());

                    $stock = new Stock();

                    $stock->modStock(1, $producto[$i], $cantidad[$i] * -1);
                    $i++;
                }

                $query = "UPDATE 30_m_pedido 
                              SET id_estado = 3
                          WHERE id_pedido = " . $idPedido;
                //echo $query;
                $db = conectarse();
                mysql_query($query, $db) or die(mysql_error());
                mysql_close($db);

                return $idVenta;
            } else {
                return 0;
            }
        }
        
        function cambiarEstadoEntrega($idVenta, $entregado, $idUsuMod) {
            $db = conectarse();
            
            $query = "UPDATE 40_m_venta
                          SET entregado      = " . $entregado . ",
                              id_usuario_mod = " . $idUsuMod . ",
                              ult_fecha_mod  = NOW()
                      WHERE id_venta = " . $idVenta;
            //echo $query;
            mysql_query($query, $db) or die(mysql_error());

            mysql_close($db);
            return 1;
        }
        
        function getProductoVenta($idProducto, $tipoId) {
            if($this->id_venta > 0) {
                include_once($this->ruta_relativa . "Clases/PrecioProducto.php");
                
                $db = conectarse();
                
                //pv.precio + ((pv.precio * pv.porcen_desc) / 100) AS precio_venta,
                $query = "SELECT p.id_producto,
                                 p.cod_serfel,
                                 p.nom_producto,
                                 p.impuesto,
                                 m.nom_marca,
                                 um.nom_UM,
                                 pv.precio,
                                 pv.cantidad,
                                 COALESCE(pv.precio / (1 + (pv.porcen_desc / 100)), 0) AS precio_venta,
                                 pv.porcen_desc
                          FROM 20_m_producto p
                              INNER JOIN 20_p_marca m ON p.id_marca = m.id_marca
                              INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM
                              INNER JOIN 40_m_producto_venta pv ON p.id_producto = pv.id_producto 
                                  AND pv.id_venta = " . $this->id_venta;

                if($tipoId == "idProducto")
                    $query .= " WHERE p.id_producto = " . $idProducto;
                else if($tipoId == "codSerfel")
                    $query .= " WHERE p.cod_serfel = " . $idProducto . "
                                    OR p.cod_barra_producto = " . $idProducto;
                //echo $query;
                $resDB = mysql_query($query, $db) or die(mysql_error());

                $producto = "";
                while ($filaDB = mysql_fetch_assoc($resDB)) {
                    $producto = new PrecioProducto($this->ruta_relativa, $filaDB["id_producto"], $filaDB["cod_serfel"], 
                                                   $filaDB["nom_producto"], $filaDB["impuesto"], $filaDB["nom_marca"], 
                                                   $filaDB["nom_UM"], 0, $filaDB["precio"], $filaDB["cantidad"], 
                                                   $filaDB["precio_venta"], $filaDB["porcen_desc"], 0);
                }
                mysql_close($db);

                return $producto;
            } else return "";
        }
        
        function ingNotaCredito($idVenta, $rutEmpresa, $numNotaCredito, $idMotivo, $producto, $cantidad, $descuento, 
                                $precio, $iva, $iaba, $espec, $subTotal, $precioTotal, $cantProd, $fechaNota, $idUsuIng) {
            
            $db = conectarse();
            $query = "SELECT * 
                      FROM 40_m_nota_credito
                      WHERE num_nota_credito = " . $numNotaCredito . "
                          AND rut_empresa = " . $rutEmpresa . "
                          AND id_estado = 1";
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);
            
            if($totRes == 0) {
                include_once("../../Clases/Stock.php");
            
                $idNotaCredito = $this->obtNuevoIdNotaCredito();

                $db = conectarse();

                $query = "INSERT INTO 40_m_nota_credito (id_nota_credito,
                                                         id_venta,
                                                         num_nota_credito,
                                                         id_tipo_docto_emitido,
                                                         rut_empresa,
                                                         iva,
                                                         iaba,
                                                         espec,
                                                         sub_total,
                                                         precio_total,
                                                         id_usuario,
                                                         fecha_nota_credito,
                                                         id_motivo,
                                                         id_estado)
                              VALUES(" . $idNotaCredito . ",
                                     " . $idVenta . ",
                                     " . $numNotaCredito . ",
                                     10,
                                     " . $rutEmpresa . ", 
                                     " . $iva . ",
                                     " . $iaba . ",
                                     " . $espec . ",
                                     " . $subTotal . ",
                                     " . $precioTotal . ",
                                     " . $idUsuIng . ",
                                     '" . $fechaNota . "',
                                     " . $idMotivo . ",
                                     3)";
                //echo $query;
                mysql_query($query, $db) or die(mysql_error());

                $i = 0;
                while ($i < $cantProd) {

                    $db = conectarse();
                    $query = "INSERT INTO 40_m_prod_nota_credito (id_nota_credito,
                                                                  id_producto,
                                                                  cantidad,
                                                                  precio,
                                                                  porcen_desc)
                                  VALUES (" . $idNotaCredito . ",
                                          " . $producto[$i] . ",
                                          " . $cantidad[$i] . ",
                                          " . $precio[$i] . ",
                                          " . $descuento[$i] . ")";
                    //echo $query;
                    mysql_query($query, $db) or die(mysql_error());

                    $stock = new Stock();

                    $stock->modStock(1, $producto[$i], $cantidad[$i]);
                    $i++;
                }

                return $idNotaCredito;
            } else {
                return 0;
            }
        }
        
        function genInformeVentas($fechaIni, $fechaFin) {
            include_once($this->ruta_relativa . "Clases/PrecioProducto.php");
            include_once($this->ruta_relativa . "Clases/Empresa.php");
            require_once($this->ruta_relativa . "Clases/Constantes/EstadoCONST.php");
            //include_once($this->ruta_relativa . "Clases/TipoProducto.php");
            //include_once($this->ruta_relativa . "Clases/Producto.php");
            
            $this->productos = Array();
                        
            $query = "SELECT  CASE
                                  WHEN v.id_tipo_docto_emitido = 1 THEN v.num_docto_emitido
                                  ELSE v.id_folio
                              END AS num_docto_emitido,
                              p.cod_serfel,
                              p.nom_producto,
                              pv.cantidad,
                              pv.precio AS precio_unit,
                              pv.porcen_desc,
                              pv.cantidad * (pv.precio - (pv.precio * pv.porcen_desc / 100)) AS sub_total,
                              YEAR(v.fecha_venta) AS ano_venta,
                              MONTH(v.fecha_venta) AS mes_venta,
                              DAY(v.fecha_venta) AS dia_venta,
                              tpp.nom_tipo_producto AS familia_padre,
                              tph.nom_tipo_producto AS familia_hija,
                              m.nom_marca,
                              um.nom_UM,
                              tp.nom_tipo_docto AS nom_forma_pago,
                              c.rut_cliente,
                              c.dv_cliente,
                              c.razon_social,
                              c.nom_fantasia,
                              lc.nom_local_cliente,
                              CASE pe.dia_ruta
                                  WHEN 0 THEN 'Sin Ruta'
                                  WHEN 1 THEN 'Lunes'
                                  WHEN 2 THEN 'Martes'
                                  WHEN 3 THEN 'Miercoles'
                                  WHEN 4 THEN 'Jueves'
                                  WHEN 5 THEN 'Viernes'
                              END AS dia_ruta,
                              u.nom_usuario,
                              v.rut_empresa,
                              tdv.nom_tipo_docto AS nom_docto_emitido
                      FROM 40_m_venta v
                          INNER JOIN 40_m_producto_venta pv ON v.id_venta = pv.id_venta
                          INNER JOIN 20_m_producto p ON pv.id_producto = p.id_producto
                          INNER JOIN 20_p_marca m ON p.id_marca = m.id_marca
                          INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM
                          INNER JOIN 20_p_tipo_producto tph ON p.id_tipo_producto = tph.id_tipo_producto
                          INNER JOIN 20_p_tipo_producto tpp ON tph.nivel_1 = tpp.id_tipo_producto
                          INNER JOIN 10_p_tipo_docto tp ON v.id_forma_pago = tp.id_tipo_docto
                          INNER JOIN 10_p_tipo_docto tdv ON v.id_tipo_docto_emitido = tdv.id_tipo_docto
                          INNER JOIN 10_m_cliente c ON v.rut_cliente = c.rut_cliente
                          INNER JOIN 10_m_local_cliente lc ON v.id_local_cliente = lc.id_local_cliente
                          INNER JOIN 30_m_pedido pe ON v.id_pedido = pe.id_pedido
                          INNER JOIN 10_m_usuario u ON v.id_usuario_venta = u.id_usuario
                      WHERE v.id_estado > 0
                        AND v.id_estado != " . EstadoCONST::ANULADO . "
                        AND (('" . $fechaIni . "' = '' AND v.fecha_venta < '" . $fechaFin . "')
                            OR ('" . $fechaFin . "' = '' AND v.fecha_venta > '" . $fechaIni . "')
                            OR ('" . $fechaIni . "' != '' 
                                AND '" . $fechaFin . "' != ''
                                AND v.fecha_venta BETWEEN '" . $fechaIni . "' AND '" . $fechaFin . "'))";
            
            //echo $query;
            $db = conectarse();
            $resDB = mysql_query($query, $db) or die(mysql_error());
                
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $this->productos[$i]["nom_docto_emitido"] = $filaDB["nom_docto_emitido"];
                $this->productos[$i]["nun_factura"]       = $filaDB["num_docto_emitido"];
                $this->productos[$i]["cod_serfel"]        = $filaDB["cod_serfel"];
                $this->productos[$i]["nom_producto"]      = $filaDB["nom_producto"];
                $this->productos[$i]["cantidad"]          = $filaDB["cantidad"];
                $this->productos[$i]["precio_unitario"]   = $filaDB["precio_unit"];
                $this->productos[$i]["porcen_desc"]       = $filaDB["porcen_desc"];
                $this->productos[$i]["sub_total"]         = $filaDB["sub_total"];
                $this->productos[$i]["ano_venta"]         = $filaDB["ano_venta"];
                $this->productos[$i]["mes_venta"]         = $filaDB["mes_venta"];
                $this->productos[$i]["dia_venta"]         = $filaDB["dia_venta"];
                $this->productos[$i]["familia_padre"]     = $filaDB["familia_padre"];
                $this->productos[$i]["familia_hija"]      = $filaDB["familia_hija"];
                $this->productos[$i]["marca"]             = $filaDB["nom_marca"];
                $this->productos[$i]["UM"]                = $filaDB["nom_UM"];
                $this->productos[$i]["forma_pago"]        = $filaDB["nom_forma_pago"];
                $this->productos[$i]["rut_cliente"]       = $filaDB["rut_cliente"];
                $this->productos[$i]["dv_cliente"]        = $filaDB["dv_cliente"];
                $this->productos[$i]["razon_social"]      = $filaDB["razon_social"];
                $this->productos[$i]["nom_fantasia"]      = $filaDB["nom_fantasia"];
                $this->productos[$i]["nom_local_cliente"] = $filaDB["nom_local_cliente"];
                $this->productos[$i]["dia_ruta"]          = $filaDB["dia_ruta"];
                $this->productos[$i]["vendedor"]          = $filaDB["nom_usuario"];
                $this->productos[$i]["empresa"]           = new Empresa($filaDB["rut_empresa"]);
                $i++;
            }
            
            $this->total_registros = $i - 1;
        }
        
        function genInformeNotaCredito($fechaIni, $fechaFin) {
            include_once($this->ruta_relativa . "Clases/Empresa.php");
            
            $query = "SELECT  u.id_usuario,
                              v.num_docto_emitido,
                              nc.num_nota_credito,
                              p.cod_serfel,
                              p.nom_producto,
                              pv.cantidad,
                              pv.precio AS precio_unit,
                              pv.porcen_desc,
                              (pv.precio + ((pv.precio * pv.porcen_desc) / 100)) * pv.cantidad AS sub_total,
                              YEAR(v.fecha_venta) AS ano_venta,
                              MONTH(v.fecha_venta) AS mes_venta,
                              DAY(v.fecha_venta) AS dia_venta,
                              YEAR(nc.fecha_nota_credito) AS ano_nota_credito,
                              MONTH(nc.fecha_nota_credito) AS mes_nota_credito,
                              DAY(nc.fecha_nota_credito) AS dia_nota_credito,
                              tpp.nom_tipo_producto AS familia_padre,
                              tph.nom_tipo_producto AS familia_hija,
                              m.nom_marca,
                              um.nom_UM,
                              tp.nom_tipo_docto AS nom_forma_pago,
                              c.rut_cliente,
                              c.dv_cliente,
                              c.razon_social,
                              c.nom_fantasia,
                              lc.nom_local_cliente,
                              CASE pe.dia_ruta
                                  WHEN 0 THEN 'Sin Ruta'
                                  WHEN 1 THEN 'Lunes'
                                  WHEN 2 THEN 'Martes'
                                  WHEN 3 THEN 'Miercoles'
                                  WHEN 4 THEN 'Jueves'
                                  WHEN 5 THEN 'Viernes'
                              END AS dia_ruta,
                              v.rut_empresa
                      FROM 40_m_nota_credito nc
                          INNER JOIN 40_m_venta v ON nc.id_venta = v.id_venta
                          INNER JOIN 40_m_prod_nota_credito pv ON nc.id_nota_credito = pv.id_nota_credito
                          INNER JOIN 20_m_producto p ON pv.id_producto = p.id_producto
                          INNER JOIN 20_p_marca m ON p.id_marca = m.id_marca
                          INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM
                          INNER JOIN 20_p_tipo_producto tph ON p.id_tipo_producto = tph.id_tipo_producto
                          INNER JOIN 20_p_tipo_producto tpp ON tph.nivel_1 = tpp.id_tipo_producto
                          INNER JOIN 10_p_tipo_docto tp ON v.id_forma_pago = tp.id_tipo_docto
                          INNER JOIN 10_m_cliente c ON v.rut_cliente = c.rut_cliente
                          INNER JOIN 10_m_local_cliente lc ON v.id_local_cliente = lc.id_local_cliente
                          INNER JOIN 30_m_pedido pe ON v.id_pedido = pe.id_pedido
                          INNER JOIN 10_m_usuario u ON v.id_usuario_venta = u.id_usuario
                      WHERE '" . $fechaIni . "' = '' 
                            OR '" . $fechaFin . "' = '' 
                            OR nc.fecha_nota_credito BETWEEN '" . $fechaIni . "' AND '" . $fechaFin . "'";
            /*
            $query = "SELECT u.rut_usuario + '-' + u.dv_usuario AS rut_completo, 
                             u.nom_usuario,
                             COUNT(nc.id_nota_credito) AS cant_notas,
                             SUM(nc.precio_total) AS precio_total
                      FROM 10_m_usuario u
                          LEFT OUTER JOIN 40_m_venta v ON v.id_usuario_venta = u.id_usuario
                          LEFT OUTER JOIN 40_m_nota_credito nc ON nc.id_venta = v.id_venta
                      WHERE '" . $fechaIni . "' = '' 
                          OR '" . $fechaFin . "' = '' 
                          OR (nc.fecha_nota_credito BETWEEN '" . $fechaIni . "' AND '" . $fechaFin . "')";
             */
            //echo $query;
            $db = conectarse();
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            $informe = Array();
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $usuario = new Usuario($filaDB["id_usuario"]);
                
                $informe[$i]["nun_factura"]       = $filaDB["num_docto_emitido"];
                $informe[$i]["nun_nota_credito"]  = $filaDB["num_nota_credito"];
                $informe[$i]["cod_serfel"]        = $filaDB["cod_serfel"];
                $informe[$i]["nom_producto"]      = $filaDB["nom_producto"];
                $informe[$i]["cantidad"]          = $filaDB["cantidad"];
                $informe[$i]["precio_unitario"]   = $filaDB["precio_unit"];
                $informe[$i]["porcen_desc"]       = $filaDB["porcen_desc"];
                $informe[$i]["sub_total"]         = $filaDB["sub_total"];
                $informe[$i]["ano_venta"]         = $filaDB["ano_venta"];
                $informe[$i]["mes_venta"]         = $filaDB["mes_venta"];
                $informe[$i]["dia_venta"]         = $filaDB["dia_venta"];
                $informe[$i]["ano_nota_credito"]  = $filaDB["ano_nota_credito"];
                $informe[$i]["mes_nota_credito"]  = $filaDB["mes_nota_credito"];
                $informe[$i]["dia_nota_credito"]  = $filaDB["dia_nota_credito"];
                $informe[$i]["familia_padre"]     = $filaDB["familia_padre"];
                $informe[$i]["familia_hija"]      = $filaDB["familia_hija"];
                $informe[$i]["marca"]             = $filaDB["nom_marca"];
                $informe[$i]["UM"]                = $filaDB["nom_UM"];
                $informe[$i]["forma_pago"]        = $filaDB["nom_forma_pago"];
                $informe[$i]["rut_cliente"]       = $filaDB["rut_cliente"];
                $informe[$i]["dv_cliente"]        = $filaDB["dv_cliente"];
                $informe[$i]["razon_social"]      = $filaDB["razon_social"];
                $informe[$i]["nom_fantasia"]      = $filaDB["nom_fantasia"];
                $informe[$i]["nom_local_cliente"] = $filaDB["nom_local_cliente"];
                $informe[$i]["dia_ruta"]          = $filaDB["dia_ruta"];
                $informe[$i]["rut_comp_vend"] = $usuario->getRutCompleto();
                $informe[$i]["nom_comp_vend"] = $usuario->getNomCompleto();
                $informe[$i]["empresa"]           = new Empresa($filaDB["rut_empresa"]);
                $i++;
            }
            $this->total_registros = $i;
            
            return $informe;
        }
        
        private function setInformeVentasPorVendedorProducto() {
            include_once($this->ruta_relativa . "Clases/PrecioProducto.php");
            
            $this->productos = Array();
                        
            $query = "SELECT DISTINCT
                             pv.id_producto,
                             p.nom_producto,
                             m.nom_marca,
                             um.nom_UM,
                             (SELECT SUM(pv2.cantidad)
                              FROM 40_m_producto_venta pv2
                                  INNER JOIN 40_m_venta v2 ON pv2.id_venta = v2.id_venta
                              WHERE pv2.id_producto = pv.id_producto
                                  AND (v2.id_usuario_venta = " . $this->id_vendedor . " OR " . $this->id_vendedor . " = 0)) AS cantidad,
                             (SELECT SUM((pv2.precio + ((pv2.precio * pv2.porcen_desc) / 100)) * pv2.cantidad)
                              FROM 40_m_producto_venta pv2
                                  INNER JOIN 40_m_venta v2 ON pv2.id_venta = v2.id_venta
                              WHERE pv2.id_producto = pv.id_producto
                                  AND (v2.id_usuario_venta = " . $this->id_vendedor . " OR " . $this->id_vendedor . " = 0)) AS total
                      FROM 40_m_venta v
                          INNER JOIN 40_m_producto_venta pv ON v.id_venta = pv.id_venta
                          INNER JOIN 20_m_producto p ON pv.id_producto = p.id_producto
                          INNER JOIN 20_p_marca m ON p.id_marca = m.id_marca
                          INNER JOIN 20_p_unidad_medida um ON p.id_UM = um.id_UM
                      WHERE v.id_estado > 0
                        AND (v.id_usuario_venta = " . $this->id_vendedor . " OR " . $this->id_vendedor . " = 0)";
            $db = conectarse();
            $resDB = mysql_query($query, $db) or die(mysql_error());
                
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $this->productos[$i] = new PrecioProducto($filaDB["id_producto"], $filaDB["nom_producto"], 
                                                          $filaDB["nom_marca"], $filaDB["nom_UM"], $filaDB["cantidad"], 
                                                          $filaDB["total"]);
                $i++;
            }
            
            $this->total_registros = $i - 1;
        }
        
        private function setInformeVentasPorVendedorCliente() {
            include_once($this->ruta_relativa . "Clases/InformeVenta.php");
            
            $this->informes = Array();
                        
            $query = "SELECT DISTINCT
                             lc.id_local_cliente,
                             (SELECT COUNT(pv2.id_producto)
                              FROM 40_m_producto_venta pv2
                                  INNER JOIN 40_m_venta v2 ON pv2.id_venta = v2.id_venta
                              WHERE v2.id_local_cliente = v.id_local_cliente) AS cantidad,
                             (SELECT SUM((pv2.precio + ((pv2.precio * pv2.porcen_desc) / 100)) * pv2.cantidad)
                              FROM 40_m_producto_venta pv2
                                  INNER JOIN 40_m_venta v2 ON pv2.id_venta = v2.id_venta
                              WHERE v2.id_local_cliente = v.id_local_cliente) AS total
                      FROM 40_m_venta v
                          INNER JOIN 10_m_local_cliente lc ON v.id_local_cliente = lc.id_local_cliente
                      WHERE v.id_estado > 0
                        AND (v.id_usuario_venta = " . $this->id_vendedor . " OR " . $this->id_vendedor . " = 0)";
            $db = conectarse();
            $resDB = mysql_query($query, $db) or die(mysql_error());
                
            $i = 0;
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $this->informes[$i] = new InformeVenta($this->ruta_relativa, $filaDB["id_local_cliente"], $filaDB["cantidad"], $filaDB["total"]);
                $i++;
            }
            
            $this->total_registros = $i - 1;
        }
        
        function genBalanceVentas($idVendedor, $tipoDesglose) {
            $this->id_vendedor = $idVendedor;
            
            if($tipoDesglose == "prod")      $this->setInformeVentasPorVendedorProducto();
            else if($tipoDesglose == "clie") $this->setInformeVentasPorVendedorCliente();
            
            $query = "SELECT SUM(precio_total) AS total_ventas
                      FROM 40_m_venta v
                      WHERE v.id_estado > 0
                        AND (v.id_usuario_venta = " . $this->id_vendedor . " OR " . $this->id_vendedor . " = 0)";
            $db = conectarse();
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            while ($filaDB = mysql_fetch_assoc($resDB)) {
                $valor = explode(".", $filaDB["total_ventas"]);
                $this->total = $valor[0];
            }
            
            $query = "SELECT COUNT(id_venta) AS num_ventas
                      FROM 40_m_venta v
                      WHERE v.id_estado > 0
                        AND (v.id_usuario_venta = " . $this->id_vendedor . " OR " . $this->id_vendedor . " = 0)";
            $db = conectarse();
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            while ($filaDB = mysql_fetch_assoc($resDB)) $this->num_ventas = $filaDB["num_ventas"];
        }
        
        //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
        function getIdVenta() {
            return $this->id_venta;
        }
        
        public function getLocalCliente() {
            return $this->local_cliente;
        }

        public function getVendedor() {
            return $this->vendedor;
        }

        public function getNumDoctoEmitido() {
            return $this->num_docto_emitido;
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
            
            $impuesto = 0;
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
        
        public function getEntregado() {
            return $this->entregado;
        }

        public function setEntregado($entregado) {
            $this->entregado = $entregado;
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

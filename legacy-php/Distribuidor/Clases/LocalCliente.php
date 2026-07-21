<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 03-01-2012                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a los Locales de los Clientes           *
 *        (tabla 10_m_local_cliente)                        *
 ************************************************************/

    class LocalCliente {
        
        //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
        private $ruta_relativa           = "";
        private $id_local_cliente        = "";       // GET
        private $rut_cliente             = "";       // GET
        private $dv_cliente              = "";
        private $razon_social            = "";
        private $nom_fantasia            = "";
        private $id_lista_precio         = "";
        private $nom_local_cliente       = "";       // GET
        private $telefono_local_cliente  = "";       // GET
        private $direccion_local_cliente = "";       // GET
        private $direccion_cliente       = "";
        private $comuna                  = "";
        private $email_local_cliente     = "";       // GET
        private $giro                    = "";
        private $nom_contacto            = "";       // GET
        private $apell_pat_contacto      = "";       // GET
        private $apell_mat_contacto      = "";       // GET
        private $telefono_contacto       = "";       // GET
        private $email_contacto          = "";       // GET
        private $tope_venta              = "";
        private $tope_credito            = "";
        private $id_vendedor             = "";
        private $id_forma_pago           = "";
        private $nom_forma_pago          = "";
        private $observaciones           = "";
        private $id_usuario_mod          = "";       // GET
        private $fecha_modificacion      = "";       // GET
        private $estado                  = 0;        // GET
        public $permite_venta_tope_mensual = 0;
        //</editor-fold>
        
        //<editor-fold defaultstate="collapsed" desc="CONSTRUCTORES">
        function __construct() {
            
            //<editor-fold defaultstate="collapsed" desc="Se carga la clase con la info del Local Cliente segun Id">
            if(func_num_args() == 1) {
                $this->id_local_cliente = func_get_arg(0);
                
                $query = "SELECT lc.rut_cliente,
                                 c.dv_cliente,
                                 c.razon_social,
                                 c.nom_fantasia,
                                 c.id_lista_precio,
                                 lc.nom_local_cliente,
                                 lc.telefono_local_cliente,
                                 lc.direccion_local_cliente,
                                 c.direccion_cliente,
                                 lc.comuna,
                                 lc.email_local_cliente,
                                 lc.giro,
                                 lc.nom_contacto,
                                 lc.apell_pat_contacto,
                                 lc.apell_mat_contacto,
                                 lc.telefono_contacto,
                                 lc.email_contacto,
                                 lc.tope_venta,
                                 lc.tope_credito,
                                 lc.id_vendedor,
                                 lc.id_forma_pago, 
                                 td.nom_tipo_docto,
                                 lc.observaciones,
                                 lc.id_usuario_mod,
                                 lc.ult_fecha_mod,
                                 lc.id_estado,
                                 lc.permite_venta_tope_mensual
                          FROM 10_m_local_cliente lc
                              INNER JOIN 10_m_cliente c ON lc.rut_cliente = c.rut_cliente 
                              INNER JOIN 10_p_tipo_docto td ON lc.id_forma_pago = td.id_tipo_docto
                          WHERE id_local_cliente = " . func_get_arg(0);
                $db = conectarse();

                $resDB = mysql_query($query, $db) or die(mysql_error());
                $totRes = mysql_num_rows($resDB);

                if($totRes > 0) {
                    while ($filaDB = mysql_fetch_assoc($resDB)) {
                        $this->rut_cliente             = $filaDB["rut_cliente"];
                        $this->dv_cliente              = $filaDB["dv_cliente"];
                        $this->razon_social            = $filaDB["razon_social"];
                        $this->nom_fantasia            = $filaDB["nom_fantasia"];
                        $this->direccion_cliente       = $filaDB["direccion_cliente"];
                        $this->id_lista_precio         = $filaDB["id_lista_precio"];
                        $this->nom_local_cliente       = $filaDB["nom_local_cliente"];
                        $this->telefono_local_cliente  = $filaDB["telefono_local_cliente"];
                        $this->direccion_local_cliente = $filaDB["direccion_local_cliente"];
                        $this->comuna                  = $filaDB["comuna"];
                        $this->email_local_cliente     = $filaDB["email_local_cliente"];
                        $this->giro                    = $filaDB["giro"];
                        $this->nom_contacto            = $filaDB["nom_contacto"];
                        $this->apell_pat_contacto      = $filaDB["apell_pat_contacto"];
                        $this->apell_mat_contacto      = $filaDB["apell_mat_contacto"];
                        $this->telefono_contacto       = $filaDB["telefono_contacto"];
                        $this->email_contacto          = $filaDB["email_contacto"];
                        $this->tope_venta              = $filaDB["tope_venta"];
                        $this->tope_credito            = $filaDB["tope_credito"];
                        $this->id_vendedor             = $filaDB["id_vendedor"];
                        $this->id_forma_pago           = $filaDB["id_forma_pago"];
                        $this->nom_forma_pago          = $filaDB["nom_tipo_docto"];
                        $this->observaciones           = $filaDB["observaciones"];
                        $this->id_usuario_mod          = $filaDB["id_usuario_mod"];
                        $this->fecha_modificacion      = $filaDB["ult_fecha_mod"];
                        $this->estado                  = $filaDB["id_estado"];
                        $this->permite_venta_tope_mensual = $filaDB["permite_venta_tope_mensual"];
                    }
                }
                //</editor-fold>
                
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase segun clase Cliente">
            } else if(func_num_args() == 15) {
                $this->id_local_cliente        = func_get_arg(0);
                $this->rut_cliente             = func_get_arg(1);
                $this->nom_local_cliente       = func_get_arg(2);
                $this->telefono_local_cliente  = func_get_arg(3);
                $this->direccion_local_cliente = func_get_arg(4);
                $this->email_local_cliente     = func_get_arg(5);
                $this->nom_contacto            = func_get_arg(6);
                $this->apell_pat_contacto      = func_get_arg(7);
                $this->apell_mat_contacto      = func_get_arg(8);
                $this->telefono_contacto       = func_get_arg(9);
                $this->email_contacto          = func_get_arg(10);
                $this->tope_venta              = func_get_arg(11);
                $this->tope_credito            = func_get_arg(12);
                $this->id_vendedor             = func_get_arg(13);
                $this->id_forma_pago           = func_get_arg(14);
            //</editor-fold>
            
            } else if(func_num_args() == 8) {
                $this->id_local_cliente        = func_get_arg(0);
                $this->nom_local_cliente       = func_get_arg(1);
                $this->direccion_local_cliente = func_get_arg(2);
                $this->telefono_local_cliente  = func_get_arg(3);
                $this->nom_contacto            = func_get_arg(4);
                $this->apell_pat_contacto      = func_get_arg(5);
                $this->apell_mat_contacto      = func_get_arg(6);
                $this->telefono_contacto       = func_get_arg(7);
            }  else if(func_num_args() == 9) {
                $this->id_local_cliente        = func_get_arg(0);
                $this->nom_local_cliente       = func_get_arg(1);
                $this->direccion_local_cliente = func_get_arg(2);
                $this->telefono_local_cliente  = func_get_arg(3);
                $this->nom_contacto            = func_get_arg(4);
                $this->apell_pat_contacto      = func_get_arg(5);
                $this->apell_mat_contacto      = func_get_arg(6);
                $this->telefono_contacto       = func_get_arg(7);
				$this->razon_social            = func_get_arg(8);
            } else if(func_num_args() == 11) {
				$this->rut_cliente			   = func_get_arg(0);
				$this->dv_cliente			   = func_get_arg(1);
				$this->razon_social			   = func_get_arg(2);
                $this->id_local_cliente        = func_get_arg(3);
                $this->nom_local_cliente       = func_get_arg(4);
                $this->direccion_local_cliente = func_get_arg(5);
                $this->telefono_local_cliente  = func_get_arg(6);
                $this->nom_contacto            = func_get_arg(7);
                $this->apell_pat_contacto      = func_get_arg(8);
                $this->apell_mat_contacto      = func_get_arg(9);
                $this->telefono_contacto       = func_get_arg(10);
            }
            //</editor-fold>
        }
        //</editor-fold>
        
        private function obtNuevoIdLocalCliente() {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 23-11-2011                                        *
         * Desc : Devuelve el siguiente Id Clientes del sistema.    *
         *        Esta funcionalidad solo trabaja si la tabla de    *
         *        Clientes tiene por lo menos un registro           *
         ************************************************************/
            $db = conectarse();

            $query = "SELECT (MAX(id_local_cliente) + 1) as id_local_cliente
                          FROM 10_m_local_cliente";
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            
            while ($filaDB = mysql_fetch_assoc($resDB)) $idLocalCliente = $filaDB["id_local_cliente"];
            
            if($idLocalCliente == "") $idLocalCliente = 1;

            mysql_close($db);
            return $idLocalCliente;
        }
        
        function ingLocalCliente($rutCliente, $nomLocalCliente, $direLocalClie, $fonoLocalClie, $emailLocalClie, 
                                 $nomContacto, $apellPatContacto, $apellMatContacto, $fonoContacto, $emailContacto, 
                                 $topeVenta, $topeCredito, $idVendedor, $idFormaPago, $observaciones, $giro, $comuna,
                                 $bPermiteVentaTopeMensual, $idUsuIng) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 10-01-2012                                        *
         * Desc : Ingresa Locales nuevos a Clientes                 *
         * Resp : { -1: Local ya existe y no esta activo.           *
         *           0: Local ya existe y esta activo.              *
         *          >0: Local ingresado con exito.                  *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();

            $query = "SELECT * 
                      FROM 10_m_local_cliente
                      WHERE rut_cliente = " . $rutCliente . "
                          AND nom_local_cliente = '" . $nomLocalCliente . "'";
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);
            
            if($totRes == 0) {
                $idLocalCliente = $this->obtNuevoIdLocalCliente();

                $db = conectarse();
                
                if($topeCredito == "") $topeCredito = 0;
                if($topeVenta == "") $topeVenta = 0;

                $iPermiteVentaTopeMensual = 0;
                if ( $bPermiteVentaTopeMensual == "true" ) {
                    $iPermiteVentaTopeMensual = 1;
                }

                $query = "INSERT INTO 10_m_local_cliente (id_local_cliente,
                                                          rut_cliente,
                                                          nom_local_cliente,
                                                          telefono_local_cliente,
                                                          direccion_local_cliente,
                                                          email_local_cliente,
                                                          nom_contacto,
                                                          apell_pat_contacto,
                                                          apell_mat_contacto,
                                                          telefono_contacto,
                                                          email_contacto,
                                                          tope_venta,
                                                          tope_credito,
                                                          id_vendedor,
                                                          id_forma_pago,
                                                          observaciones,
                                                          giro,
                                                          comuna,
                                                          id_usuario_mod,
                                                          ult_fecha_mod,
                                                          permite_venta_tope_mensual)
                            VALUES (" . $idLocalCliente . ",
                                    " . $rutCliente . ",
                                    '" . $nomLocalCliente . "',
                                    '" . $fonoLocalClie . "',
                                    '" . $direLocalClie . "',
                                    '" . $emailLocalClie . "',
                                    '" . $nomContacto . "',
                                    '" . $apellPatContacto . "',
                                    '" . $apellMatContacto . "',
                                    '" . $fonoContacto . "',
                                    '" . $emailContacto . "',
                                    " . $topeVenta . ",
                                    " . $topeCredito . ",
                                    " . $idVendedor . ",
                                    " . $idFormaPago . ",
                                    '" . $observaciones . "',
                                    '" . $giro . "',
                                    '" . $comuna . "',
                                    " . $idUsuIng . ",
                                    NOW(),
                                    " . $iPermiteVentaTopeMensual . ")";
                mysql_query($query, $db) or die(mysql_error());
                
                mysql_close($db);
                return $idLocalCliente;
            } else if($totRes > 0) {
                while ($filaDB = mysql_fetch_assoc($resDB)) $idEstado = $filaDB["id_estado"];
                
                mysql_close($db);
                
                if($idEstado == 1) return 0; 
                else return -1;
            }
        }
        
        function elimLocalCliente($idLocalCliente, $idUsuElim) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 10-01-2012                                        *
         * Desc : Elimina a un Local de Cliente                     *
         * Resp : {  1: Local eliminado.                            *
         *          -1: Local tiene pedidos en proceso de pago.     *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();
            
            $query = "SELECT v.id_venta
                      FROM 40_m_venta v
                          INNER JOIN 30_m_pedido p ON v.id_pedido = p.id_pedido
                      WHERE p.id_local_cliente = " . $idLocalCliente . "
                          AND v.id_estado = 2";
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);
            
            if($totRes == 0) {
                $query = "UPDATE 10_m_local_cliente
                              SET id_estado      = 0,
                                  ult_fecha_mod  = NOW(),
                                  id_usuario_mod = " . $idUsuElim . "
                          WHERE id_local_cliente = " . $idLocalCliente;
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                return 1;
            } else if($totRes > 0) {
                mysql_close($db);
                return -1;
            }
        }

        function modLocalClienteAndroid($idLocalCliente, $nomLocalCliente, $direLocalClie, $fonoLocalClie, $emailLocalClie, 
                                 $nomContacto, $apellPatContacto, $apellMatContacto, $fonoContacto, $emailContacto, 
                                 $idUsuMod) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 28-12-2011                                        *
         * Desc : Modifica a un local de cliente                    *
         * Resp : {  1: local modificado.                           *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();

            $query = "UPDATE 10_m_local_cliente
                          SET nom_local_cliente       = '" . $nomLocalCliente . "',
                              telefono_local_cliente  = '" . $fonoLocalClie . "',
                              direccion_local_cliente = '" . $direLocalClie . "',
                              email_local_cliente     = '" . $emailLocalClie . "',
                              nom_contacto            = '" . $nomContacto . "',
                              apell_pat_contacto      = '" . $apellPatContacto . "',
                              apell_mat_contacto      = '" . $apellMatContacto . "',
                              telefono_contacto       = '" . $fonoContacto . "',
                              email_contacto          = '" . $emailContacto . "',
                              id_usuario_mod          = '" . $idUsuMod . "',
                              ult_fecha_mod           = NOW()
                      WHERE id_local_cliente = " . $idLocalCliente;
            mysql_query($query, $db) or die(mysql_error());

            mysql_close($db);
            return 1;
        }
        
        function modLocalCliente($local, $idUsuMod) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 28-12-2011                                        *
         * Desc : Modifica a un local de cliente                    *
         * Resp : {  1: local modificado.                           *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();
            
            $iPermiteVentaTopeMensual = 0;
            if ( $local["chkTopeVenta"] == "true" ) {
                $iPermiteVentaTopeMensual = 1;
            }

            $query = "UPDATE 10_m_local_cliente
                          SET nom_local_cliente       = '" . $local["nomLocalCliente"] . "',
                              telefono_local_cliente  = '" . $local["fonoLocalClie"] . "',
                              direccion_local_cliente = '" . $local["direLocalClie"] . "',
                              email_local_cliente     = '" . $local["emailLocalClie"] . "',
                              nom_contacto            = '" . $local["nomContacto"] . "',
                              apell_pat_contacto      = '" . $local["apellPatContacto"] . "',
                              apell_mat_contacto      = '" . $local["apellMatContacto"] . "',
                              telefono_contacto       = '" . $local["fonoContacto"] . "',
                              email_contacto          = '" . $local["emailContacto"] . "',
                              tope_venta              = " . $local["topeVenta"] . ",
                              tope_credito            = " . $local["topeCredito"] . ",
                              id_forma_pago           = " . $local["idFormaPago"] . ",
                              comuna                  = '" . $local["comuna"] . "',
                              observaciones           = '" . $local["observaciones"] . "',
                              giro                    = '" . $local["giro"] . "',
                              id_usuario_mod          = '" . $idUsuMod . "',
                              id_vendedor = " . $local["idVendedor"] . ",
                              ult_fecha_mod           = NOW(),
                              permite_venta_tope_mensual = " . $iPermiteVentaTopeMensual . "
                      WHERE id_local_cliente = " . $local["idLocalCliente"];
            
            mysql_query($query, $db) or die(mysql_error());

            mysql_close($db);
            return 1;
        }
        
        //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
        function getIdLocalCliente() {
            return $this->id_local_cliente;
        }

        function getRutCliente() {
            return $this->rut_cliente;
        }
        
        function setRutCliente($rutCliente) {
            $this->rut_cliente = $rutCliente;
        }
        
        function getDVCliente() {
            return $this->dv_cliente;
        }
        
        function setDVCliente($DVCliente) {
            $this->dv_cliente = $DVCliente;
            
        }
        
        function getRutCompleto() {
            return $this->rut_cliente . "-" . $this->dv_cliente;
        }
        
        function getRazonSocial() {
            return $this->razon_social;
        }
        
        function getNomFantasia() {
            return $this->nom_fantasia;
        }
        
        function getIdListaPrecio() {
            return $this->id_lista_precio;
        }
        
        function setIdListaPrecio($id_lista_precio) {
            $this->id_lista_precio = $id_lista_precio;
        }

        function getNomLocalCliente() {
            return $this->nom_local_cliente;
        }
        
        function getTelefonoLocalCliente() {
            return $this->telefono_local_cliente;
        }
        
        function getDireccionLocalCliente() {
            return $this->direccion_local_cliente;
        }
        
        function getDireccionCliente() {
            return $this->direccion_cliente;
        }
        
        function getComuna() {
            return $this->comuna;
        }
        
        function getEmailLocalCliente() {
            return $this->email_local_cliente;
        }
        
        function getGiro() {
            return $this->giro;
        }
        
        function setGiro($giro) {
            $this->giro = $giro;
        }
        
        function getNomContacto() {
            return $this->nom_contacto;
        }
        
        function getApellPatContacto() {
            return $this->apell_pat_contacto;
        }
        
        function getApellMatContacto() {
            return $this->apell_mat_contacto;
        }
        
        function getNomCompletoContacto() {
            return $this->apell_pat_contacto . " " . $this->apell_mat_contacto . " " . $this->nom_contacto;
        }
        
        function getTelefonoContacto() {
            return $this->telefono_contacto;
        }
        
        function getEmailContacto() {
            return $this->email_contacto;
        }
        
        function getTopeVenta() {
            return $this->tope_venta;
        }
        
        function setTopeVenta($tope_venta) {
            $this->tope_venta = $tope_venta;
        }

        function getTopeCredito() {
            return $this->tope_credito;
        }
        
        function setTopeCredito($tope_credito) {
            $this->tope_credito = $tope_credito;
        }

        public function getIdVendedor() {
            return $this->id_vendedor;
        }

        public function getIdFormaPago() {
            return $this->id_forma_pago;
        }
        
        public function getNomFormaPago() {
            return $this->nom_forma_pago;
        }
        
        public function getObservaciones() {
            return $this->observaciones;
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

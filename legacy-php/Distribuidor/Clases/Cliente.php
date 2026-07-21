<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a los Clientes (tabla 10_m_cliente)     *
 ************************************************************/

    class Cliente {

        //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
        private $rut_cliente        = "";       // GET
        private $dv_cliente         = "";       // GET
        private $razon_social       = "";       // GET
        private $nom_fantasia       = "";       // GET
        private $id_lista_precio    = "";       // GET
        private $nom_lista_precio   = "";       // GET
        private $telefono_cliente   = "";       // GET
        private $direccion_cliente  = "";       // GET
        private $comuna             = "";
        private $email_cliente      = "";
        private $lunes              = "";
        private $martes             = "";
        private $miercoles          = "";
        private $jueves             = "";
        private $viernes            = "";
        private $ult_factura        = "";
        private $ult_nota_credito   = "";
        private $id_usuario_mod     = "";       // GET
        private $fecha_modificacion = "";       // GET
        private $estado             = "";       // GET
        private $locales            = Array();  // GET
        private $total_locales      = -1;        // GET
        //</editor-fold>

        //<editor-fold defaultstate="collapsed" desc="CONSTRUCTORES">
        function __construct() {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 28-12-2011                                        *
         * Modif:                                                   *
         * Desc : Constructores principales de la Clase Cliente     *
         ************************************************************/
            if(func_num_args() == 1) {
                $param = func_get_arg(0);

                $rut = explode("-", $param);

                //<editor-fold defaultstate="collapsed" desc="Se carga la clase con la info del Cliente segun Rut">
                if(isset($rut[0])) {
                    $query = "SELECT c.rut_cliente,
                                     c.dv_cliente,
                                     c.razon_social,
                                     c.nom_fantasia,
                                     c.id_lista_precio,
                                     c.telefono_cliente,
                                     c.direccion_cliente,
                                     c.email_cliente,
                                     (SELECT MAX(r.num_dia)
                                      FROM 40_m_ruta r
                                          INNER JOIN 40_m_ruta_local_cliente rlc ON r.id_ruta = rlc.id_ruta
                                          INNER JOIN 10_m_local_cliente lc ON rlc.id_local_cliente = lc.id_local_cliente
                                      WHERE r.num_dia = 1
                                          AND lc.rut_cliente = c.rut_cliente) AS lunes,
                                     (SELECT MAX(r.num_dia)
                                      FROM 40_m_ruta r
                                          INNER JOIN 40_m_ruta_local_cliente rlc ON r.id_ruta = rlc.id_ruta
                                          INNER JOIN 10_m_local_cliente lc ON rlc.id_local_cliente = lc.id_local_cliente
                                      WHERE r.num_dia = 2
                                          AND lc.rut_cliente = c.rut_cliente) AS martes,
                                     (SELECT MAX(r.num_dia)
                                      FROM 40_m_ruta r
                                          INNER JOIN 40_m_ruta_local_cliente rlc ON r.id_ruta = rlc.id_ruta
                                          INNER JOIN 10_m_local_cliente lc ON rlc.id_local_cliente = lc.id_local_cliente
                                      WHERE r.num_dia = 3
                                          AND lc.rut_cliente = c.rut_cliente) AS miercoles,
                                     (SELECT MAX(r.num_dia)
                                      FROM 40_m_ruta r
                                          INNER JOIN 40_m_ruta_local_cliente rlc ON r.id_ruta = rlc.id_ruta
                                          INNER JOIN 10_m_local_cliente lc ON rlc.id_local_cliente = lc.id_local_cliente
                                      WHERE r.num_dia = 4
                                          AND lc.rut_cliente = c.rut_cliente) AS jueves,
                                     (SELECT MAX(r.num_dia)
                                      FROM 40_m_ruta r
                                          INNER JOIN 40_m_ruta_local_cliente rlc ON r.id_ruta = rlc.id_ruta
                                          INNER JOIN 10_m_local_cliente lc ON rlc.id_local_cliente = lc.id_local_cliente
                                      WHERE r.num_dia = 5
                                          AND lc.rut_cliente = c.rut_cliente) AS viernes,
                                     COALESCE((SELECT MAX(v.num_docto_emitido)
                                               FROM 40_m_venta v
                                               WHERE v.rut_cliente = c.rut_cliente
                                                 AND v.id_estado > 0), '') AS ult_factura,
                                     COALESCE((SELECT MAX(nc.num_nota_credito)
                                               FROM 40_m_nota_credito nc
                                                   INNER JOIN 40_m_venta v2 ON nc.id_venta = v2.id_venta 
                                               WHERE v2.rut_cliente = c.rut_cliente), '') AS ult_nota_credito,
                                     c.id_usuario_mod,
                                     c.ult_fecha_mod,
                                     c.id_estado
                              FROM 10_m_cliente c
                              WHERE c.rut_cliente = " . $rut[0];
                    $db = conectarse();

                    $resDB = mysql_query($query, $db) or die(mysql_error());
                    $totRes = mysql_num_rows($resDB);

                    if($totRes > 0) {
                        while ($filaDB = mysql_fetch_assoc($resDB)) {
                            $this->rut_cliente        = $filaDB["rut_cliente"];
                            $this->dv_cliente         = $filaDB["dv_cliente"];
                            $this->razon_social       = $filaDB["razon_social"];
                            $this->nom_fantasia       = $filaDB["nom_fantasia"];
                            $this->id_lista_precio    = $filaDB["id_lista_precio"];
                            $this->telefono_cliente   = $filaDB["telefono_cliente"];
                            $this->direccion_cliente  = $filaDB["direccion_cliente"];
                            //$this->comuna             = $filaDB["comuna"];
                            $this->email_cliente      = $filaDB["email_cliente"];
                            $this->lunes              = $filaDB["lunes"];
                            $this->martes             = $filaDB["martes"];
                            $this->miercoles          = $filaDB["miercoles"];
                            $this->jueves             = $filaDB["jueves"];
                            $this->viernes            = $filaDB["viernes"];
                            $this->ult_factura        = $filaDB["ult_factura"];
                            $this->ult_nota_credito   = $filaDB["ult_nota_credito"];
                            $this->id_usuario_mod     = $filaDB["id_usuario_mod"];
                            $this->fecha_modificacion = $filaDB["ult_fecha_mod"];
                            $this->estado             = $filaDB["id_estado"];
                        }

                        $query = "SELECT id_local_cliente,
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
                                         giro
                                  FROM 10_m_local_cliente
                                  WHERE rut_cliente = " . $rut[0] . "
                                      AND id_estado = 1";
                        $resDB = mysql_query($query, $db) or die(mysql_error());

                        $i = 0;
                        while ($filaDB = mysql_fetch_assoc($resDB)) {
                            $this->locales[$i] = new LocalCliente($filaDB["id_local_cliente"],
                                                                  $rut[0],
                                                                  $filaDB["nom_local_cliente"], 
                                                                  $filaDB["telefono_local_cliente"], 
                                                                  $filaDB["direccion_local_cliente"], 
                                                                  $filaDB["email_local_cliente"], 
                                                                  $filaDB["nom_contacto"],
                                                                  $filaDB["apell_pat_contacto"], 
                                                                  $filaDB["apell_mat_contacto"], 
                                                                  $filaDB["telefono_contacto"],
                                                                  $filaDB["email_contacto"],
                                                                  $filaDB["tope_venta"],
                                                                  $filaDB["tope_credito"],
                                                                  $filaDB["id_vendedor"],
                                                                  $filaDB["id_forma_pago"]);
                            $this->locales[$i]->setGiro($filaDB["giro"]);
                            $i++;
                        }
                        $this->total_locales =  $i - 1;

                        mysql_close($db);
                    }
                }
                //</editor-fold>
            
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Lista)">
            } else if(func_num_args() == 14) {
                $this->rut_cliente      = func_get_arg(0);
                $this->dv_cliente       = func_get_arg(1);
                $this->razon_social     = func_get_arg(2);
                $this->nom_fantasia     = func_get_arg(3);
                $this->nom_lista_precio = func_get_arg(4);
                $this->telefono_cliente = func_get_arg(5);
                $this->email_cliente    = func_get_arg(6);
                $this->lunes            = func_get_arg(7);
                $this->martes           = func_get_arg(8);
                $this->miercoles        = func_get_arg(9);
                $this->jueves           = func_get_arg(10);
                $this->viernes          = func_get_arg(11);
                $this->ult_factura      = func_get_arg(12);
                $this->ult_nota_credito = func_get_arg(13);
            }
            //</editor-fold>
        }
        //</editor-fold>

        function ingCliente($rutClie, $razonSocial, $nomFantasia, $idListaPrecio, $fonoClie, $direClie, $emailClie, $idUsuIng) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 29-12-2011                                        *
         * Desc : Ingresa Clientes nuevos al sistema                *
         * Resp : { -1: Rut ya existe y no esta activo.             *
         *           0: Rut ya existe y esta activo.                *
         *          >0: Cliente ingresado con exito.                *
         *        }                                                 *
         ************************************************************/
            $cliente = new Cliente($rutClie);

            if($cliente->getEstado() == 1) {
                return 0;
            } else if($cliente->getEstado() != "" && $cliente->getEstado() == 0) {
                $db = conectarse();

                $query = "UPDATE 10_m_cliente
                              SET razon_social     = '" . $razonSocial . "',
                                  nom_fantasia     = '" . $nomFantasia . "',
                                  telefono_cliente = '" . $fonoClie . "',
                                  direccion_cliente = '" . $direClie . "',
                                  email_cliente     = '" . $emailClie . "',
                                  id_lista_precio   = " . $idListaPrecio . ",
                                  id_usuario_mod    = " . $idUsuIng . ",
                                  ult_fecha_mod     = NOW(),
                                  id_estado         = 1
                          WHERE rut_cliente = " . $cliente->getRutCliente();
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                
                return $cliente->getRutCliente();
            } else if($cliente->getEstado() == "") {
                $rut = explode("-", $rutClie);

                $db = conectarse();

                $query = "INSERT INTO 10_m_cliente (rut_cliente,
                                                    dv_cliente,
                                                    razon_social,
                                                    nom_fantasia,
                                                    telefono_cliente,
                                                    direccion_cliente,
                                                    email_cliente,
                                                    id_lista_precio,
                                                    id_usuario_mod,
                                                    ult_fecha_mod)
                            VALUES (" . $rut[0] . ",
                                    '" . $rut[1] . "',
                                    '" . $razonSocial . "',
                                    '" . $nomFantasia . "',
                                    '" . $fonoClie . "',
                                    '" . $direClie . "',
                                    '" . $emailClie . "',
                                    " . $idListaPrecio . ",
                                    " . $idUsuIng . ",
                                    NOW())";
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                return $rut[0];
            }
        }

        function elimCliente($rutCliente, $idUsuElim) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 26-12-2011                                        *
         * Desc : Elimina a un Cliente del sistema                  *
         * Resp : {  1: Cliente eliminado.                          *
         *          -1: Cliente tiene pedidos en proceso de pago.   *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();
            
            $query = "SELECT id_venta
                      FROM 40_m_venta
                      WHERE rut_cliente = " . $rutCliente . "
                          AND id_estado = 2";
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);
            
            if($totRes == 0) {
                $query = "DELETE FROM 40_m_ruta_local_cliente
                          WHERE id_local_cliente IN (SELECT id_local_cliente
                                                     FROM 10_m_local_cliente
                                                     WHERE rut_cliente = " . $rutCliente . ")";
                //echo $query;
                $resDB = mysql_query($query, $db) or die(mysql_error());

                $query = "UPDATE 10_m_cliente
                              SET id_estado      = 0,
                                  ult_fecha_mod  = NOW(),
                                  id_usuario_mod = " . $idUsuElim . "
                          WHERE rut_cliente = " . $rutCliente;
                $resDB = mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                return 1;
            } else if($totRes > 0) {
                mysql_close($db);
                return -1;
            }
        }

        function modCliente($rutCliente, $razonSocial, $nomFantasia, $fonoClie, $direClie, $emailClie, 
                            $idListaPrecio, $bPermiteVentaCDeuda, $idUsuMod) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 03-01-2012                                        *
         * Desc : Modifica a un Cliente del sistema                 *
         * Resp : {  1: Cliente modificado.                         *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();

            $iPermiteVentaCDeuda = 0;
            if ( $bPermiteVentaCDeuda == "true" ) {
                $iPermiteVentaCDeuda = 1;
            }

            $query = "UPDATE 10_m_cliente
                          SET razon_social      = '" . $razonSocial . "',
                              nom_fantasia      = '" . $nomFantasia . "',
                              telefono_cliente  = '" . $fonoClie . "',
                              direccion_cliente = '" . $direClie . "',
                              email_cliente     = '" . $emailClie . "',
                              id_lista_precio   = " . $idListaPrecio . ",
                              id_usuario_mod    = " . $idUsuMod . ",
                              ult_fecha_mod     = NOW(),
                              permite_venta_deuda = " . $iPermiteVentaCDeuda . "
                      WHERE rut_cliente = " . $rutCliente;
            mysql_query($query, $db) or die(mysql_error());

            mysql_close($db);
            return 1;
        }

        //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
        function getLocales() {
            return $this->locales;
        }

        function getTotalLocales() {
            return $this->total_locales;
        }

        function getRutCliente() {
            return $this->rut_cliente;
        }

        function getDVCliente() {
            return $this->dv_cliente;
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
        
        function getNomListaPrecio() {
            return $this->nom_lista_precio;
        }

        function getTelefonoCliente() {
            return $this->telefono_cliente;
        }

        function getDireccionCliente() {
            return $this->direccion_cliente;
        }
        
        function getComuna() {
            return $this->comuna;
        }
        
        function getLunes() {
            return $this->lunes;
        }
        
        function getMartes() {
            return $this->martes;
        }
        
        function getMiercoles() {
            return $this->miercoles;
        }
        
        function getJueves() {
            return $this->jueves;
        }
        
        function getViernes() {
            return $this->viernes;
        }
        
        function getUltFactura() {
            return $this->ult_factura;
        }
        
        function getUltNotaCredito() {
            return $this->ult_nota_credito;
        }
        
        function getIdUsuarioMod() {
            return $this->id_usuario_mod;
        }

        function getEmailCliente() {
            return $this->email_cliente;
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
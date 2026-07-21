<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 11-01-2012                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a los Proveedores (tabla 70_m_proveedor)*
 ************************************************************/

    class Proveedor {

        //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
        private $rut_proveedor       = "";
        private $dv_proveedor        = "";
        private $razon_social        = "";
        private $nom_fantasia        = "";
        private $direccion_proveedor = "";
        private $giro                = "";
        private $fono_1              = "";
        private $fono_2              = "";
        private $email               = "";
        private $cond_pago           = "";
        private $glosa_pago          = "";
        private $nom_vendedor        = "";
        private $fono_vendedor       = "";
        private $email_vendedor      = "";
        private $observaciones       = "";
        private $id_usuario_mod      = "";
        private $fecha_modificacion  = "";
        private $estado              = "";
        //</editor-fold>

        //<editor-fold defaultstate="collapsed" desc="CONSTRUCTORES">
        function __construct() {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Modif:                                                   *
         * Desc : Constructores principales de la Clase Proveedor   *
         ************************************************************/
            if(func_num_args() == 1) {
                $param = func_get_arg(0);

                $rut = explode("-", $param);

                //<editor-fold defaultstate="collapsed" desc="Se carga la clase con la info del Proveedor segun Rut">
                if(isset($rut[0])) {
                    $query = "SELECT rut_proveedor,
                                     dv_proveedor,
                                     razon_social,
                                     nom_fantasia,
                                     direccion_proveedor,
                                     giro,
                                     fono_1,
                                     fono_2,
                                     email,
                                     cond_pago,
                                     glosa_pago,
                                     nom_vendedor,
                                     fono_vendedor,
                                     email_vendedor,
                                     observaciones,
                                     id_usuario_mod,
                                     ult_fecha_mod,
                                     id_estado
                              FROM 70_m_proveedor
                              WHERE rut_proveedor = " . $rut[0];

                    $db = conectarse();

                    $resDB = mysql_query($query, $db) or die(mysql_error());
                    $totRes = mysql_num_rows($resDB);

                    if($totRes > 0) {
                        while ($filaDB = mysql_fetch_assoc($resDB)) {
                            $this->rut_proveedor       = $filaDB["rut_proveedor"];
                            $this->dv_proveedor        = $filaDB["dv_proveedor"];
                            $this->razon_social        = $filaDB["razon_social"];
                            $this->nom_fantasia        = $filaDB["nom_fantasia"];
                            $this->direccion_proveedor = $filaDB["direccion_proveedor"];
                            $this->giro                = $filaDB["giro"];
                            $this->fono_1              = $filaDB["fono_1"];
                            $this->fono_2              = $filaDB["fono_2"];
                            $this->email               = $filaDB["email"];
                            $this->cond_pago           = $filaDB["cond_pago"];
                            $this->glosa_pago          = $filaDB["glosa_pago"];
                            $this->nom_vendedor        = $filaDB["nom_vendedor"];
                            $this->fono_vendedor       = $filaDB["fono_vendedor"];
                            $this->email_vendedor      = $filaDB["email_vendedor"];
                            $this->observaciones       = $filaDB["observaciones"];
                            $this->id_usuario_mod      = $filaDB["id_usuario_mod"];
                            $this->fecha_modificacion  = $filaDB["ult_fecha_mod"];
                            $this->estado              = $filaDB["id_estado"];
                        }

                        mysql_close($db);
                    }
                }
                //</editor-fold>
            
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Lista)">
            } else if(func_num_args() == 5) {
                $this->rut_proveedor       = func_get_arg(0);
                $this->dv_proveedor        = func_get_arg(1);
                $this->razon_social        = func_get_arg(2);
                $this->nom_fantasia        = func_get_arg(3);
                $this->direccion_proveedor = func_get_arg(4);
            }
            //</editor-fold>
        }
        //</editor-fold>

        function ingProveedor($rutProv, $razonSocial, $nomFantasia, $direProv, $giroProv, $fono1, $fono2, $emailProv,
                              $condPago, $glosaPago, $nomVendedor, $fonoVendedor, $emailVendedor, $observaciones, $idUsuIng) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Ingresa Proveedores nuevos al sistema             *
         * Resp : { -1: Rut ya existe y no esta activo.             *
         *           0: Rut ya existe y esta activo.                *
         *          >0: Proveedor ingresada con exito.              *
         *        }                                                 *
         ************************************************************/
            $proveedor = new Proveedor($rutProv);

            if($proveedor->getEstado() == 1) {
                return 0;
            } else if($proveedor->getEstado() != "" && $proveedor->getEstado() == 0) {
                //Codigo de reenrolamiento de empresas
                return -1;
            } else if($proveedor->getEstado() == "") {
                $rut = explode("-", $rutProv);

                $db = conectarse();

                $query = "INSERT INTO 70_m_proveedor (rut_proveedor,
                                                      dv_proveedor,
                                                      razon_social,
                                                      nom_fantasia,
                                                      direccion_proveedor,
                                                      giro,
                                                      fono_1,
                                                      fono_2,
                                                      email,
                                                      cond_pago,
                                                      glosa_pago,
                                                      nom_vendedor,
                                                      fono_vendedor,
                                                      email_vendedor,
                                                      observaciones,
                                                      id_usuario_mod,
                                                      ult_fecha_mod)
                            VALUES (" . $rut[0] . ",
                                    '" . $rut[1] . "',
                                    '" . $razonSocial . "',
                                    '" . $nomFantasia . "',
                                    '" . $direProv . "',
                                    '" . $giroProv . "',
                                    '" . $fono1 . "',
                                    '" . $fono2 . "',
                                    '" . $emailProv . "',
                                    '" . $condPago . "',
                                    '" . $glosaPago . "',
                                    '" . $nomVendedor . "',
                                    '" . $fonoVendedor . "',
                                    '" . $emailVendedor . "',
                                    '" . $observaciones . "',
                                    " . $idUsuIng . ",
                                    NOW())";
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                return $rut[0];
            }
        }

        function elimProveedor($rutProv, $idUsuElim) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Elimina a un Proveedor del sistema                *
         * Resp : {  1: Proveedor eliminado.                        *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();
            
            $query = "UPDATE 70_m_proveedor
                          SET id_estado      = 0,
                              ult_fecha_mod  = NOW(),
                              id_usuario_mod = " . $idUsuElim . "
                      WHERE rut_proveedor = " . $rutProv;
            $resDB = mysql_query($query, $db) or die(mysql_error());

            mysql_close($db);
            return 1;
        }

        function modProveedor($rutProv, $razonSocial, $nomFantasia, $direProv, $giroProv, $fono1, $fono2, $emailProv,
                              $condPago, $glosaPago, $nomVendedor, $fonoVendedor, $emailVendedor, $observaciones, $idUsuMod) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Modifica a un Proveedor del sistema               *
         * Resp : {  1: Proveedor modificado.                       *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();

            $query = "UPDATE 70_m_proveedor
                          SET razon_social        = '" . $razonSocial . "',
                              nom_fantasia        = '" . $nomFantasia . "',
                              direccion_proveedor = '" . $direProv . "',
                              giro                = '" . $giroProv . "',
                              fono_1              = '" . $fono1 . "',
                              fono_2              = '" . $fono2 . "',
                              email               = '" . $emailProv . "',
                              cond_pago           = '" . $condPago . "',
                              glosa_pago          = '" . $glosaPago . "',
                              nom_vendedor        = '" . $nomVendedor . "',
                              fono_vendedor       = '" . $fonoVendedor . "',
                              email_vendedor      = '" . $emailVendedor . "',
                              observaciones       = '" . $observaciones . "',
                              id_usuario_mod      = " . $idUsuMod . ",
                              ult_fecha_mod       = NOW()
                      WHERE rut_proveedor = " . $rutProv;
            mysql_query($query, $db) or die(mysql_error());

            mysql_close($db);
            return 1;
        }

        //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
        function getRutProveedor() {
            return $this->rut_proveedor;
        }

        function getDVProveedor() {
            return $this->dv_proveedor;
        }
        
        function getRutCompleto() {
            return $this->rut_proveedor . "-" . $this->dv_proveedor;
        }

        function getRazonSocial() {
            return $this->razon_social;
        }

        function getNomFantasia() {
            return $this->nom_fantasia;
        }

        function getDireccionProveedor() {
            return $this->direccion_proveedor;
        }
        
        function getGiro() {
            return $this->giro;
        }

        function getFono1() {
            return $this->fono_1;
        }
        
        function getFono2() {
            return $this->fono_2;
        }
        
        function getEmail() {
            return $this->email;
        }
        
        function getCondPago() {
            return $this->cond_pago;
        }
        
        function getGlosaPago() {
            return $this->glosa_pago;
        }
        
        function getNomVendedor() {
            return $this->nom_vendedor;
        }
        
        function getFonoVendedor() {
            return $this->fono_vendedor;
        }
        
        function getEmailVendedor() {
            return $this->email_vendedor;
        }
        
        function getObservaciones() {
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

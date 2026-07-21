<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 11-01-2012                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a las Empresas (tabla 10_m_empresa)     *
 ************************************************************/

    class Empresa {

        //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
        private $rut_empresa        = "";
        private $dv_empresa         = "";
        private $razon_social       = "";
        private $nom_fantasia       = "";
        private $direccion_empresa  = "";
        private $id_usuario_mod     = "";
        private $fecha_modificacion = "";
        private $estado             = "";
        private $acceso_rapido      = "";
        //</editor-fold>

        //<editor-fold defaultstate="collapsed" desc="CONSTRUCTORES">
        function __construct() {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Modif:                                                   *
         * Desc : Constructores principales de la Clase Empresa     *
         ************************************************************/
            if(func_num_args() == 1 || func_num_args() == 2) {
                
                //<editor-fold defaultstate="collapsed" desc="Query para cuando el parametro es el Rut">
                if(func_num_args() == 1) {
                    $param = func_get_arg(0);

                    $rut = explode("-", $param);

                    $query = "SELECT rut_empresa,
                                     dv_empresa,
                                     razon_social,
                                     nom_fantasia,
                                     direccion_empresa,
                                     id_usuario_mod,
                                     ult_fecha_mod,
                                     id_estado,
                                     acceso_rapido
                              FROM 10_m_empresa
                              WHERE rut_empresa = " . $rut[0];
                //</editor-fold>
                    
                //<editor-fold defaultstate="collapsed" desc="Query para cuando el parametro es el Numero de acceso rapido">
                } else if(func_num_args() == 2) {
                    $query = "SELECT rut_empresa,
                                     dv_empresa,
                                     razon_social,
                                     nom_fantasia,
                                     direccion_empresa,
                                     id_usuario_mod,
                                     ult_fecha_mod,
                                     id_estado,
                                     acceso_rapido
                              FROM 10_m_empresa
                              WHERE acceso_rapido = " . func_get_arg(0);
                }
                //</editor-fold>
                
                $db = conectarse();
                $resDB = mysql_query($query, $db) or die(mysql_error());
                $totRes = mysql_num_rows($resDB);

                if($totRes > 0) {
                    while ($filaDB = mysql_fetch_assoc($resDB)) {
                        $this->rut_empresa        = $filaDB["rut_empresa"];
                        $this->dv_empresa         = $filaDB["dv_empresa"];
                        $this->razon_social       = $filaDB["razon_social"];
                        $this->nom_fantasia       = $filaDB["nom_fantasia"];
                        $this->direccion_empresa  = $filaDB["direccion_empresa"];
                        $this->id_usuario_mod     = $filaDB["id_usuario_mod"];
                        $this->fecha_modificacion = $filaDB["ult_fecha_mod"];
                        $this->estado             = $filaDB["id_estado"];
                        $this->acceso_rapido      = $filaDB["acceso_rapido"];
                    }
                    mysql_close($db);
                }
                //</editor-fold>
                
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Lista)">
            } else if(func_num_args() == 6) {
                $this->rut_empresa       = func_get_arg(0);
                $this->dv_empresa        = func_get_arg(1);
                $this->razon_social      = func_get_arg(2);
                $this->nom_fantasia      = func_get_arg(3);
                $this->direccion_empresa = func_get_arg(4);
                $this->acceso_rapido     = func_get_arg(5);
            }
            //</editor-fold>
        }
        //</editor-fold>

        function ingEmpresa($rutEmp, $razonSocial, $nomFantasia, $direEmp, $idUsuIng) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Ingresa Empresas nuevas al sistema                *
         * Resp : { -1: Rut ya existe y no esta activo.             *
         *           0: Rut ya existe y esta activo.                *
         *          >0: Empresa ingresada con exito.                *
         *        }                                                 *
         ************************************************************/
            $empresa = new Empresa($rutEmp);

            if($empresa->getEstado() == 1) {
                return 0;
            } else if($empresa->getEstado() != "" && $empresa->getEstado() == 0) {
                //Codigo de reenrolamiento de empresas
                return -1;
            } else if($empresa->getEstado() == "") {
                $rut = explode("-", $rutEmp);

                $db = conectarse();

                $query = "INSERT INTO 10_m_empresa (rut_empresa,
                                                    dv_empresa,
                                                    razon_social,
                                                    nom_fantasia,
                                                    direccion_empresa,
                                                    id_usuario_mod,
                                                    ult_fecha_mod)
                            VALUES (" . $rut[0] . ",
                                    '" . $rut[1] . "',
                                    '" . $razonSocial . "',
                                    '" . $nomFantasia . "',
                                    '" . $direEmp . "',
                                    " . $idUsuIng . ",
                                    NOW())";
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                return $rut[0];
            }
        }

        function elimEmpresa($rutEmp, $idUsuElim) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Elimina a una Empresa del sistema                 *
         * Resp : {  1: Empresa eliminada.                          *
         *          -1: Empresa tiene pedidos en proceso de pago.   *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();
            
            $query = "SELECT id_venta
                      FROM 40_m_venta
                      WHERE rut_empresa = " . $rutEmp . "
                          AND id_estado = 2";
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);
            
            if($totRes == 0) {
                $query = "UPDATE 10_m_empresa
                              SET id_estado      = 0,
                                  ult_fecha_mod  = NOW(),
                                  id_usuario_mod = " . $idUsuElim . "
                          WHERE rut_empresa = " . $rutEmp;
                $resDB = mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                return 1;
            } else if($totRes > 0) {
                mysql_close($db);
                return -1;
            }
        }

        function modEmpresa($rutEmp, $razonSocial, $nomFantasia, $direEmp, $idUsuMod) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Modifica a una Empresa del sistema                *
         * Resp : {  1: Empresa modificada.                         *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();

            $query = "UPDATE 10_m_empresa
                          SET razon_social      = '" . $razonSocial . "',
                              nom_fantasia      = '" . $nomFantasia . "',
                              direccion_empresa = '" . $direEmp . "',
                              id_usuario_mod    = " . $idUsuMod . ",
                              ult_fecha_mod     = NOW()
                      WHERE rut_empresa = " . $rutEmp;
            mysql_query($query, $db) or die(mysql_error());

            mysql_close($db);
            return 1;
        }

        //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
        function getAccesoRapido() {
            return $this->acceso_rapido;
        }
        
        function getRutEmpresa() {
            return $this->rut_empresa;
        }

        function getDVEmpresa() {
            return $this->dv_empresa;
        }
        
        function getRutCompleto() {
            return $this->rut_empresa . "-" . $this->dv_empresa;
        }

        function getRazonSocial() {
            return $this->razon_social;
        }

        function getNomFantasia() {
            return $this->nom_fantasia;
        }

        function getDireccionEmpresa() {
            return $this->direccion_empresa;
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

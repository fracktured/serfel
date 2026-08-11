<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 19-08-2011                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a los Usuarios (tabla 10_m_usuario)     *
 ************************************************************/
    class Usuario {

        //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
        private $id_usuario         = "";       // GET
        private $rut_usuario        = "";       // GET
        private $dv_usuario         = "";       // GET
        private $nom_usuario        = "";       // GET
        private $apell_pat_usuario  = "";       // GET
        private $apell_mat_usuario  = "";       // GET
        private $id_tipo_usuario    = "";       // GET
        private $nom_tipo_usuario   = "";       // GET
        private $telefono_usuario   = "";       // GET
        private $direccion_usuario  = "";       // GET
        private $email_usuario      = "";       // GET
        private $num_usuario        = "";
        private $id_usuario_mod     = "";       // GET
        private $fecha_modificacion = "";       // GET
        private $estado             = "";       // GET
        private $fecha_act_productos = "";
        //</editor-fold>

        //<editor-fold defaultstate="collapsed" desc="CONSTRUCTORES">
        function __construct() {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 20-08-2011                                        *
         * Modif: 28-12-2011                                        *
         * Desc : Constructores principales de la Clase Usuario     *
         ************************************************************/
            if(func_num_args() == 1) {
                $param = func_get_arg(0);

                $rut = explode("-", $param);

                //<editor-fold defaultstate="collapsed" desc="Query cuando el parametro es el Rut">
                if(isset($rut[1])) {
                    $query = "SELECT id_usuario,
                                     rut_usuario,
                                     dv_usuario,
                                     nom_usuario,
                                     apell_pat_usuario,
                                     apell_mat_usuario,
                                     id_tipo_usuario,
                                     telefono_usuario,
                                     direccion_usuario,
                                     email_usuario,
                                     num_usuario,
                                     id_usuario_mod,
                                     ult_fecha_mod,
                                     id_estado,
                                     fecha_act_productos
                              FROM 10_m_usuario
                              WHERE rut_usuario = " . $rut[0];
                //</editor-fold>

                //<editor-fold defaultstate="collapsed" desc="Query cuando el parametro es el id_usuario">
                } else if(is_numeric($param)) {
                    $query = "SELECT id_usuario,
                                     rut_usuario,
                                     dv_usuario,
                                     nom_usuario,
                                     apell_pat_usuario,
                                     apell_mat_usuario,
                                     id_tipo_usuario,
                                     telefono_usuario,
                                     direccion_usuario,
                                     email_usuario,
                                     num_usuario,
                                     id_usuario_mod,
                                     ult_fecha_mod,
                                     id_estado,
                                     fecha_act_productos
                              FROM 10_m_usuario
                              WHERE id_usuario = " . $param;
                }
                //</editor-fold>

            //<editor-fold defaultstate="collapsed" desc="Query cuando los parametros son Rut y Password">
            } else if(func_num_args() == 2) {
                $rut = func_get_arg(0);
                
                $rut = explode("-", $rut);
                $pass = func_get_arg(1);

                $query = "SELECT id_usuario,
                                 rut_usuario,
                                 dv_usuario,
                                 nom_usuario,
                                 apell_pat_usuario,
                                 apell_mat_usuario,
                                 id_tipo_usuario,
                                 telefono_usuario,
                                 direccion_usuario,
                                 email_usuario,
                                 num_usuario,
                                 id_usuario_mod,
                                 ult_fecha_mod,
                                 id_estado,
                                 fecha_act_productos
                          FROM 10_m_usuario
                          WHERE rut_usuario = " . $rut[0] . "
                              AND dv_usuario = '" . $rut[1] . "'
                              AND password = '" . $pass . "'";
            }
            //</editor-fold>

            //<editor-fold defaultstate="collapsed" desc="Se carga la clase con la info del usuario">
            if(func_num_args() == 1 || func_num_args() == 2) {
                $db = conectarse();

                $resDB = mysql_query($query, $db) or die(mysql_error());
                $totRes = mysql_num_rows($resDB);

                if($totRes > 0) {
                    while ($filaDB = mysql_fetch_assoc($resDB)) {
                        $this->id_usuario         = $filaDB["id_usuario"];
                        $this->rut_usuario        = $filaDB["rut_usuario"];
                        $this->dv_usuario         = $filaDB["dv_usuario"];
                        $this->nom_usuario        = $filaDB["nom_usuario"];
                        $this->apell_pat_usuario  = $filaDB["apell_pat_usuario"];
                        $this->apell_mat_usuario  = $filaDB["apell_mat_usuario"];
                        $this->id_tipo_usuario    = $filaDB["id_tipo_usuario"];
                        $this->telefono_usuario   = $filaDB["telefono_usuario"];
                        $this->direccion_usuario  = $filaDB["direccion_usuario"];
                        $this->email_usuario      = $filaDB["email_usuario"];
                        $this->num_usuario        = $filaDB["num_usuario"];
                        $this->id_usuario_mod     = $filaDB["id_usuario_mod"];
                        $this->fecha_modificacion = $filaDB["ult_fecha_mod"];
                        $this->estado             = $filaDB["id_estado"];
                        $this->fecha_act_productos = $filaDB["fecha_act_productos"];
                    }
                }

                mysql_close($db);
            //</editor-fold>
            
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Lista)">
            } else if(func_num_args() == 10) {
                $this->id_usuario         = func_get_arg(0);
                $this->rut_usuario        = func_get_arg(1);
                $this->dv_usuario         = func_get_arg(2);
                $this->nom_usuario        = func_get_arg(3);
                $this->apell_pat_usuario  = func_get_arg(4);
                $this->apell_mat_usuario  = func_get_arg(5);
                $this->nom_tipo_usuario   = func_get_arg(6);
                $this->telefono_usuario   = func_get_arg(7);
                $this->email_usuario      = func_get_arg(8);
                $this->fecha_act_productos = func_get_arg(9);
            }
            //</editor-fold>
        }
        //</editor-fold>

        function ingUsuario($rutUsu, $nomUsu, $apellPatUsu, $apellMatUsu, $passUsu, $idTipoUsu, $fonoUsu,
                            $direUsu, $emailUsu, $numero, $idUsuIng) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 19-08-2011                                        *
         * Desc : Ingresa Clientes nuevos al sistema                *
         * Resp : { -1: Rut ya existe y no esta activo.             *
         *           0: Rut ya existe y esta activo.                *
         *          >0: Cliente ingresado con exito.                *
         *        }                                                 *
         ************************************************************/
            $usuario = new Usuario($rutUsu);

            if($usuario->getEstado() == 1) {
                return 0;
            } else if($usuario->getEstado() != "" && $usuario->getEstado() == 0) {
                //Codigo de reenrolamiento de usuarios
                return -1;
            } else if($usuario->getEstado() == "") {
                if($numero == "") $numero = 0;
                
                $db = conectarse();
                $query = "SELECT * 
                          FROM 10_m_usuario
                          WHERE num_usuario = " . $numero . "
                              AND " . $numero . " != 0";
                $resDB = mysql_query($query, $db) or die(mysql_error());
                $totRes = mysql_num_rows($resDB);

                if($totRes == 0) {
                    $rut = explode("-", $rutUsu);

                    $db = conectarse();

                    $query = "INSERT INTO 10_m_usuario (rut_usuario,
                                                        dv_usuario,
                                                        nom_usuario,
                                                        apell_pat_usuario,
                                                        apell_mat_usuario,
                                                        password,
                                                        id_tipo_usuario,
                                                        telefono_usuario,
                                                        direccion_usuario,
                                                        email_usuario,
                                                        num_usuario,
                                                        id_usuario_mod,
                                                        ult_fecha_mod)
                                VALUES (" . $rut[0] . ",
                                        '" . $rut[1] . "',
                                        '" . $nomUsu . "',
                                        '" . $apellPatUsu . "',
                                        '" . $apellMatUsu . "',
                                        '" . $passUsu . "',
                                        " . $idTipoUsu . ",
                                        '" . $fonoUsu . "',
                                        '" . $direUsu . "',
                                        '" . $emailUsu . "',
                                        " . $numero . ",
                                        " . $idUsuIng . ",
                                        NOW())";
                    mysql_query($query, $db) or die(mysql_error());
                    $idUsuario = mysql_insert_id($db);

                    mysql_close($db);
                    return $idUsuario;
                } else return -3;
            }
        }

        function elimUsuario($idUsuario, $idUsuElim) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 26-12-2011                                        *
         * Modif: 29-12-2011                                        *
         * Desc : Elimina a un Usuario del sistema                  *
         * Resp : {  1: Usuario eliminado.                          *
         *          -1: Usuario tiene pedidos en proceso de pago.   *
         *        }                                                 *
         ************************************************************/
            $db = conectarse();
            
            $query = "SELECT v.id_venta
                      FROM 40_m_venta v
                          INNER JOIN 30_m_pedido p ON v.id_pedido = p.id_pedido
                      WHERE p.id_usuario = " . $idUsuario . "
                          AND v.id_estado = 2";
            
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);
            
            if($totRes == 0) {
                $query = "UPDATE 10_m_usuario
                              SET id_estado      = 0,
                                  ult_fecha_mod  = NOW(),
                                  id_usuario_mod = " . $idUsuElim . "
                          WHERE id_usuario = " . $idUsuario;
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                return 1;
            } else if($totRes > 0) {
                mysql_close($db);
                return -1;
            }
        }

        function modUsuario($idUsuario, $nomUsu, $apellPatUsu, $apellMatUsu, $idTipoUsu, $fonoUsu, $direUsu, $emailUsu, 
                            $numero, $passwordUsu, $idUsuMod) {
        /************************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 28-12-2011                                        *
         * Desc : Modifica a un Usuario del sistema                 *
         * Resp : {  1: Usuario modificado.                         *
         *        }                                                 *
         ************************************************************/
            if($numero == "") $numero = 0;
            
            $db = conectarse();
            $query = "SELECT * 
                      FROM 10_m_usuario
                      WHERE num_usuario = " . $numero . "
                          AND " . $numero . " != 0
                          AND id_usuario != " . $idUsuario;
            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);

            if($totRes == 0) {
                $db = conectarse();

                $query = "UPDATE 10_m_usuario
                            SET nom_usuario       = '" . $nomUsu . "',
                                apell_pat_usuario = '" . $apellPatUsu . "',
                                apell_mat_usuario = '" . $apellMatUsu . "', ";
                
                if($passwordUsu != "")
                    $query .=  "password          = '" . $passwordUsu . "', ";
                                
                $query .=      "id_tipo_usuario   = " . $idTipoUsu . ",
                                telefono_usuario  = '" . $fonoUsu . "',
                                direccion_usuario = '" . $direUsu . "',
                                email_usuario     = '" . $emailUsu . "',
                                num_usuario       = " . $numero . ",
                                id_usuario_mod    = " . $idUsuMod . ",
                                ult_fecha_mod     = NOW()
                        WHERE id_usuario = " . $idUsuario;
                mysql_query($query, $db) or die(mysql_error());

                mysql_close($db);
                return 1;
            } else return -3;
        }
        
        //<editor-fold defaultstate="collapsed" desc="GETTERS Y SETTERS">
        function getFechaActProductos() {
            return $this->fecha_act_productos;
        }
        
        function getIdUsuario() {
            return $this->id_usuario;
        }

        function getRutUsuario() {
            return $this->rut_usuario;
        }

        function getDVUsuario() {
            return $this->dv_usuario;
        }
        
        function getRutCompleto() {
            return $this->rut_usuario . "-" . $this->dv_usuario;
        }

        function getNomUsuario() {
            return $this->nom_usuario;
        }

        function getApellPatUsuario() {
            return $this->apell_pat_usuario;
        }

        function getApellMatUsuario() {
            return $this->apell_mat_usuario;
        }
        
        function getNomCompleto() {
            return $this->apell_pat_usuario . " " . $this->apell_mat_usuario . " " . $this->nom_usuario;
        }

        function getIdTipoUsuario() {
            return $this->id_tipo_usuario;
        }
        
        function getNomTipoUsuario() {
            return $this->nom_tipo_usuario;
        }

        function getTelefonoUsuario() {
            return $this->telefono_usuario;
        }

        function getDireccionUsuario() {
            return $this->direccion_usuario;
        }

        function getIdUsuarioMod() {
            return $this->id_usuario_mod;
        }

        function getEmailUsuario() {
            return $this->email_usuario;
        }
        
        function getNumUsuario() {
            return $this->num_usuario;
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

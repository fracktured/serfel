<?php

/* * **********************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 11-01-2012                                        *
 * Desc : Clase que contiene los metodos y atributos        *
 *        asociados a los Proveedores (tabla 70_m_proveedor)*
 * ********************************************************** */

class Recepcion {

    //<editor-fold defaultstate="collapsed" desc="ATRIBUTOS">
    private $id_recepcion = "";       // GET
    private $rut_proveedor = "";       // GET
    private $dv_proveedor = "";       // GET
    private $razon_social = "";       // GET        
    private $fecha_emision_docto = "";       // GET
    private $nom_tipo_docto = "";       // GET
    private $num_docto = "";       // GET
    private $nom_bodega = "";       // GET
    private $nom_tipo_pago = "";       // GET
    private $observacion = "";       // GET
    private $id_tipo_pago = "";       // GET
    public $es_compra_electronica;
    //</editor-fold>
    
    //<editor-fold defaultstate="collapsed" desc="CONSTRUCTORES">

    function __construct() {
        /*         * **********************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Modif:                                                   *
         * Desc : Constructores principales de la Clase Proveedor   *
         * ********************************************************** */

        //<editor-fold defaultstate="collapsed" desc="Se carga la clase con la info del Proveedor segun Rut">   
        if (func_num_args() == 1) {

            $query = "SELECT r.id_recepcion,				  
                        p.rut_proveedor,
                        p.dv_proveedor,
                        p.razon_social,
                        r.fecha_emision_docto,
                        td.nom_tipo_docto,
                        r.num_docto,
                        b.nom_bodega,
                        tp.nom_tipo_docto AS nom_tipo_pago,
                        r.observacion,
                        tp.id_tipo_docto AS id_tipo_pago
                    FROM 50_m_recepcion_compra r
                        INNER JOIN 10_p_tipo_docto td ON td.id_tipo_docto = r.id_tipo_docto
                        INNER JOIN 10_p_tipo_docto tp ON tp.id_tipo_docto = r.id_tipo_pago
                        INNER JOIN 70_m_proveedor p ON p.rut_proveedor = r.rut_proveedor
                        INNER JOIN 50_m_bodega b ON b.id_bodega = r.id_bodega
                    WHERE r.id_recepcion = " . func_get_arg(0);

            $db = conectarse();

            $resDB = mysql_query($query, $db) or die(mysql_error());
            $totRes = mysql_num_rows($resDB);

            if ($totRes > 0) {
                while ($filaDB = mysql_fetch_assoc($resDB)) {
                    $this->id_recepcion = $filaDB["id_recepcion"];
                    $this->rut_proveedor = $filaDB["rut_proveedor"];
                    $this->dv_proveedor = $filaDB["dv_proveedor"];
                    $this->razon_social = $filaDB["razon_social"];
                    $this->fecha_emision_docto = $filaDB["fecha_emision_docto"];
                    $this->nom_tipo_docto = $filaDB["nom_tipo_docto"];
                    $this->num_docto = $filaDB["num_docto"];
                    $this->nom_bodega = $filaDB["nom_bodega"];
                    $this->nom_tipo_pago = $filaDB["nom_tipo_pago"];
                    $this->observacion = $filaDB["observacion"];
                    $this->id_tipo_pago = $filaDB["id_tipo_pago"];
                }
            }
            //</editor-fold>
            //<editor-fold defaultstate="collapsed" desc="Constructor que carga lo basico de la clase (usado en clase Lista)">
        }
        //</editor-fold>
    }

    //</editor-fold>

    private function obtRecepcion() {
        /*         * **********************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 23-11-2011                                        *
         * Desc : Devuelve el siguiente Id Clientes del sistema.    *
         *        Esta funcionalidad solo trabaja si la tabla de    *
         *        Clientes tiene por lo menos un registro           *
         * ********************************************************** */
        $db = conectarse();

        $query = "SELECT ((MAX(id_recepcion) + 1)) AS id_recepcion
                          FROM 50_m_recepcion_compra";

        $resDB = mysql_query($query, $db) or die(mysql_error());

        while ($filaDB = mysql_fetch_assoc($resDB))
            $id_recepcion = $filaDB["id_recepcion"];

        if ($id_recepcion == "")
            $id_recepcion = 1;

        mysql_close($db);
        return $id_recepcion;
    }

    function ingRecepcion($idTipoDocumento, $idBodega, $rutProveedor, $fecDoc, $numDocto, $idUsuIng, $idProducto, $cantidad, $valor, $largo, $idTipoPago, 
            $observacion, $rutEmpresa, $cantidadRecep) {
        /*         * **********************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Ingresa Proveedores nuevos al sistema             *
         * Resp : { -1: Rut ya existe y no esta activo.             *
         *           0: Rut ya existe y esta activo.                *
         *          >0: Proveedor ingresada con exito.              *
         *        }                                                 *
         * ********************************************************** */
        include_once("../../Clases/Stock.php");

        $id_recepcion = $this->obtRecepcion();

        $db = conectarse();

        $query = "INSERT INTO 50_m_recepcion_compra
                                (
				  id_recepcion,
                                  rut_proveedor,
                                  rut_empresa,
                                  num_docto,
                                  fecha_emision_docto,
                                  id_bodega,
                                  id_usuario_recepcion,
                                  id_tipo_docto,
                                  id_estado,
                                  id_tipo_pago,
                                  observacion
                                  )
                        VALUES (
				  " . $id_recepcion . ",
                                  " . $rutProveedor . ",
                                  " . $rutEmpresa . ",
                                  " . $numDocto . ",
                                  '" . $fecDoc . "',
                                  " . $idBodega . ",
                                  " . $idUsuIng . ",
                                  " . $idTipoDocumento . ",
                                  1,
                                  " . $idTipoPago . ",
                                  '" . $observacion . "' 
                                  )";
        mysql_query($query, $db) or die(mysql_error());

        $i = 0;
        while ($i < $largo) {
            $db = conectarse();
            $query = "INSERT INTO 50_m_producto_recepcion      (id_recepcion,
                                                                id_producto,
                                                                cantidad,
                                                                valor)
                                                                VALUES 
                                                                (" . $id_recepcion . ",
                                                                " . $idProducto[$i] . ",
                                                                " . $cantidad[$i] . ",
                                                                " . $valor[$i] . ")";
            mysql_query($query, $db) or die(mysql_error());
            
            $query = "UPDATE 20_m_producto
                          SET costo_prom       = " . $valor[$i] . ",
                              ult_fecha_compra = NOW()
                      WHERE id_producto = " . $idProducto[$i];
            mysql_query($query, $db) or die(mysql_error());
            
            $stock = new Stock();
            
            $stock->modStock($idBodega, $idProducto[$i], $cantidadRecep[$i]);
            $i++;
        }

        return 1;
    }
    
    function genInfoUltCompraProducto($idProducto) {
        $db = conectarse();

        $query = "SELECT rc.rut_proveedor,
                         p.dv_proveedor,
                         p.razon_social
                  FROM 50_m_recepcion_compra rc
                      INNER JOIN 70_m_proveedor p ON rc.rut_proveedor = p.rut_proveedor
                  WHERE id_recepcion = (SELECT MAX(mrc.id_recepcion)
                                        FROM 50_m_recepcion_compra mrc
                                            INNER JOIN 50_m_producto_recepcion pr ON mrc.id_recepcion = pr.id_recepcion
                                                AND pr.id_producto = " . $idProducto . ")";
            
        $resDB = mysql_query($query, $db) or die(mysql_error());
            
        while ($filaDB = mysql_fetch_assoc($resDB)) {
            $this->rut_proveedor = $filaDB["rut_proveedor"];
            $this->dv_proveedor  = $filaDB["dv_proveedor"];
            $this->razon_social  = $filaDB["razon_social"];
        }
            
        mysql_close($db);
    }
    
    function ingPago($idRecepcion, $idTipoPago, $observacion) {
        /*         * **********************************************************
         * Autor: Christian Castro                                  *
         * Fecha: 11-01-2012                                        *
         * Desc : Ingresa Proveedores nuevos al sistema             *
         * Resp : { -1: Rut ya existe y no esta activo.             *
         *           0: Rut ya existe y esta activo.                *
         *          >0: Proveedor ingresada con exito.              *
         *        }                                                 *
         * ********************************************************** */

        $db = conectarse();
        
        $query = "UPDATE 50_m_recepcion_compra
                              SET id_tipo_pago  =   " . $idTipoPago . ",
                                  observacion   =  '" . $observacion . "' 
                          WHERE id_recepcion = " . $idRecepcion;
        mysql_query($query, $db) or die(mysql_error());

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

    public function getIdRecepcion() {
        return $this->id_recepcion;
    }

    public function getFechaEmisionDocto() {
        return $this->fecha_emision_docto;
    }

    public function getNomTipoDocto() {
        return $this->nom_tipo_docto;
    }

    public function getNumDocto() {
        return $this->num_docto;
    }

    public function getNomBodega() {
        return $this->nom_bodega;
    }

    public function getNomTipoPago() {
        return $this->nom_tipo_pago;
    }
    
    public function getObservacion() {
        return $this->observacion;
    }

    public function getIdTipoPago() {
        return $this->id_tipo_pago;
    }

    //</editor-fold>
}

?>

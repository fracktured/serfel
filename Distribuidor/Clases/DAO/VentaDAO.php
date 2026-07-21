<?php
require_once __DIR__.'/../Constantes/SisDistCONST.php';
require_once __DIR__.'/../Constantes/EstadoCONST.php';
require_once __DIR__.'/../Constantes/EstadoPagoCONST.php';
require_once __DIR__.'/../POJO/Venta.php';
require_once __DIR__.'/../POJO/RegListVenta.php';
require_once __DIR__.'/../POJO/RegTotalesVenta.php';
        
/**
 * Description of VentaDAO
 *
 * @author christian
 */
class VentaDAO {
    
    private $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;

        //include_once $this->cRutaRelativa . "Clases/POJO/Venta.php";
    }
    // </editor-fold>

    
    /**
     * Retorna Venta según id.
     * 
     * @param PDO $oPDO
     * @param int $idVenta
     * @return Venta
     */
    public static function obtVenta($oPDO, $idVenta) {
        $cSql = 
            "SELECT * 
             FROM 40_m_venta 
             WHERE id_venta = :id_venta";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_venta', $idVenta, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'Venta');

        $oVenta = null;
        foreach ($rs as $o) {
            $oVenta = $o;
        }

        return $oVenta;
    }
    
    /**
     * Retorna Venta según id_pedido.
     * 
     * @param PDO $oPDO
     * @param int $idPedido
     * @return Venta
     */
    public static function obtVentaXIDPedido($oPDO, $idPedido) {
        $cSql = 
            "SELECT * 
             FROM 40_m_venta 
             WHERE id_pedido = :id_pedido
               AND id_estado != :id_estado";

        $idEstadoInactivo = EstadoCONST::INACTIVO;
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_pedido', $idPedido, PDO::PARAM_INT);
        $oStmt->bindParam(':id_estado', $idEstadoInactivo, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'Venta');

        $oVenta = null;
        foreach ($rs as $o) {
            $oVenta = $o;
        }

        return $oVenta;
    }
    
    
    public static function ingVenta($oPDO, $oVenta) {
        $cSql = 
            "INSERT INTO 40_m_venta (id_lista_precio,
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
                                     id_estado,
                                     observaciones)
             VALUES (:id_lista_precio,
                     :id_usuario_venta,
                     :iva,
                     :iaba,
                     :espec,
                     :sub_total,
                     :precio_total,
                     :num_docto_emitido,
                     :id_tipo_docto_emitido,
                     :rut_empresa,
                     :rut_cliente,
                     :id_local_cliente,
                     :id_forma_pago,
                     :id_pedido,
                     :fecha_venta,
                     :id_usuario_mod,
                     NOW(),
                     :id_estado,
                     :observaciones)";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_lista_precio', $oVenta->id_lista_precio, PDO::PARAM_INT);
        $oStmt->bindParam(':id_usuario_venta', $oVenta->id_usuario_venta, PDO::PARAM_INT);
        $oStmt->bindParam(':iva', $oVenta->iva, PDO::PARAM_INT);
        $oStmt->bindParam(':iaba', $oVenta->iaba, PDO::PARAM_INT);
        $oStmt->bindParam(':espec', $oVenta->espec, PDO::PARAM_INT);
        $oStmt->bindParam(':sub_total', $oVenta->sub_total, PDO::PARAM_INT);
        $oStmt->bindParam(':precio_total', $oVenta->precio_total, PDO::PARAM_INT);
        $oStmt->bindParam(':num_docto_emitido', $oVenta->num_docto_emitido, PDO::PARAM_INT);
        $oStmt->bindParam(':id_tipo_docto_emitido', $oVenta->id_tipo_docto_emitido, PDO::PARAM_INT);
        $oStmt->bindParam(':rut_empresa', $oVenta->rut_empresa, PDO::PARAM_INT);
        $oStmt->bindParam(':rut_cliente', $oVenta->rut_cliente, PDO::PARAM_INT);
        $oStmt->bindParam(':id_local_cliente', $oVenta->id_local_cliente, PDO::PARAM_INT);
        $oStmt->bindParam(':id_forma_pago', $oVenta->id_forma_pago, PDO::PARAM_INT);
        $oStmt->bindParam(':id_pedido', $oVenta->id_pedido, PDO::PARAM_INT);
        $oStmt->bindParam(':fecha_venta', $oVenta->fecha_venta, PDO::PARAM_STR);
        $oStmt->bindParam(':id_usuario_mod', $oVenta->id_usuario_mod, PDO::PARAM_INT);
        $oStmt->bindParam(':id_estado', $oVenta->id_estado, PDO::PARAM_INT);
        $oStmt->bindParam(':observaciones', $oVenta->observaciones, PDO::PARAM_STR);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }

    
    /**
     * Modifica venta
     * 
     * @param PDO $oPDO
     * @param Venta $oVenta
     * @return int
     */
    public static function modVenta($oPDO, $oVenta) {
        
        /*
         * id_lista_precio = :id_lista_precio,
    id_usuario_venta = :id_usuario_venta,
    public $iva;
    public $iaba;
    public $espec;
    public $sub_total;
    public $precio_total;
    public $rut_empresa;
    public $rut_cliente;
    public $id_local_cliente;
    public $id_forma_pago;
    public $id_pedido;
    public $fecha_venta;
         */
        
        $cSql = 
            "UPDATE 40_m_venta
                SET num_docto_emitido = :num_docto_emitido,
                    id_tipo_docto_emitido = :id_tipo_docto_emitido,
                    entregado      = :entregado,
                    id_usuario_mod = :id_usuario_mod,
                    ult_fecha_mod  = NOW(),
                    id_estado      = :id_estado,
                    url_PDF        = :url_PDF,
                    url_PDF_original = :url_PDF_original,
                    url_PDF_cedible = :url_PDF_cedible,
                    id_folio = :id_folio,
                    id_estado_pago = :id_estado_pago
            WHERE id_venta = :id_venta";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':num_docto_emitido', $oVenta->num_docto_emitido, PDO::PARAM_INT);
        $oStmt->bindParam(':id_tipo_docto_emitido', $oVenta->id_tipo_docto_emitido, PDO::PARAM_INT);
        $oStmt->bindParam(':entregado', $oVenta->entregado, PDO::PARAM_INT);
        $oStmt->bindParam(':id_usuario_mod', $oVenta->id_usuario_mod, PDO::PARAM_INT);
        $oStmt->bindParam(':id_estado', $oVenta->id_estado, PDO::PARAM_INT);
        $oStmt->bindParam(':url_PDF', $oVenta->url_PDF, PDO::PARAM_STR);
        $oStmt->bindParam(':url_PDF_original', $oVenta->url_PDF_original, PDO::PARAM_STR);
        $oStmt->bindParam(':url_PDF_cedible', $oVenta->url_PDF_cedible, PDO::PARAM_STR);
        $oStmt->bindParam(':id_folio', $oVenta->id_folio, PDO::PARAM_INT);
        $oStmt->bindParam(':id_estado_pago', $oVenta->id_estado_pago, PDO::PARAM_INT);
        $oStmt->bindParam(':id_venta', $oVenta->id_venta, PDO::PARAM_INT);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }
    
    
    /**
     * Retorna lista ventas para un local cliente y fecha determinados
     * 
     * @param PDO $db
     * @param int $idLocalCliente
     * @param Fecha $fechaVenta (30/01/2015)
     * @return Array Venta
     */
    public function listVentasXLocalFecha($db, $idLocalCliente, $fechaVenta) {
        $sql = 
            "SELECT * 
             FROM 40_m_venta 
             WHERE id_local_cliente   = :id_local_cliente
               AND YEAR(fecha_venta)  = :year
               AND MONTH(fecha_venta) = :month
               AND DAY(fecha_venta)   = :day";


        $valores = explode("/", $fechaVenta);

        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id_local_cliente', $idLocalCliente, PDO::PARAM_INT);
        $stmt->bindParam(':year',  $valores[2], PDO::PARAM_INT);
        $stmt->bindParam(':month', $valores[1], PDO::PARAM_INT);
        $stmt->bindParam(':day',   $valores[0], PDO::PARAM_INT);
        $stmt->execute();

        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'Venta');

        return $rs;
    }
    

    /**
     * Marca venta como entregada por chofer
     * 
     * @param PDO $db
     * @param int $idVenta
     * @param int $idFormaPago
     * @param int $idUsuario
     * @return string
     */
    public function entregaChofer($db, $idVenta, $idFormaPago, $idUsuario) {
        $sql = 
            "UPDATE 40_m_venta
                SET id_forma_pago  = :id_forma_pago, 
                    entregado      = 1,
                    id_usuario_mod = :id_usuario_mod,
                    ult_fecha_mod  = NOW()
            WHERE id_venta = :id_venta";

        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id_venta', $idVenta, PDO::PARAM_INT);
        $stmt->bindParam(':id_forma_pago', $idFormaPago, PDO::PARAM_INT);
        $stmt->bindParam(':id_usuario_mod', $idUsuario, PDO::PARAM_INT);
        $stmt->execute();

        return $db->lastInsertId();
    }
    
    
    /**
     * Desmarca Venta como subida al LibroCV
     * 
     * @param PDO $oPDO
     * @param int $idVenta
     * @return boolean
     */
    public function desmarcarVentaEnLibroCV($oPDO, $idVenta, $idUsuario) {
        $cPeriodoLibro = "";
        
        $cSql = 
            "UPDATE 40_m_venta
                SET periodo_libro  = :periodo_libro,
                    id_usuario_mod = :id_usuario_mod,
                    ult_fecha_mod  = NOW()
            WHERE id_venta = :id_venta";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(":id_venta", $idVenta, PDO::PARAM_INT);
        $oStmt->bindParam(":periodo_libro", $cPeriodoLibro, PDO::PARAM_STR);
        $oStmt->bindParam(":id_usuario_mod", $idUsuario, PDO::PARAM_INT);
        $oStmt->execute();

        return true;
    }
    
    
    /**
     * Devuelve lista de Ventas según filtros con un máximo de 5000 registros
     * 
     * @param PDO $oPDO
     * @param VentaFB $oVentaFB
     * @return Array RegListVenta
     */
    public static function listVentas($oPDO, $oVentaFB) {
        require_once __DIR__ . '/../Util/FechaUtil.php';
        
        $cFechaDesdeBD = $oVentaFB->cFechaDesde;
        if (strpos($oVentaFB->cFechaDesde, '/') !== false) {
            $cFechaDesdeBD = FechaUtil::deFechaJQueryABD($oVentaFB->cFechaDesde);
        }
        $cFechaHastaBD = $oVentaFB->cFechaHasta;
        if (strpos($oVentaFB->cFechaHasta, '/') !== false) {
            $cFechaHastaBD = FechaUtil::deFechaJQueryABD($oVentaFB->cFechaHasta);
        }

        $cRazonSocial = "";
        if ($oVentaFB->cRazonSocialCliente != "") {
            $cRazonSocial = "%".$oVentaFB->cRazonSocialCliente."%";
        }
        
        $cSql =
           "SELECT  v.id_venta,
                    v.id_tipo_docto_emitido,
                    v.id_usuario_venta,
                    e.rut_empresa,
                    e.dv_empresa,
                    e.razon_social as razon_social_empresa,
                    v.num_docto_emitido,
                    td.nom_tipo_docto,
                    v.fecha_venta,
                    c.rut_cliente,
                    c.dv_cliente,
                    c.razon_social as razon_social_cliente,
                    v.precio_total,
                    v.entregado,
                    v.periodo_libro,
                    fp.nom_tipo_docto as nom_forma_pago,
                    v.id_estado_pago,
                    CONCAT(uv.nom_usuario, ' ', uv.apell_pat_usuario) as nomVendedor,
                    COALESCE((SELECT SUM(nc.precio_total) FROM 40_m_nota_credito nc WHERE nc.id_venta = v.id_venta), 0) as iMontoTotalNC,
                    COALESCE((SELECT SUM(p.monto) FROM 60_m_pago p WHERE p.id_venta = v.id_venta), 0) as iMontoTotalPago
            FROM 40_m_venta v
                INNER JOIN 10_p_tipo_docto td ON v.id_tipo_docto_emitido = td.id_tipo_docto
                INNER JOIN 10_m_empresa e ON v.rut_empresa = e.rut_empresa
                INNER JOIN 10_m_cliente c ON v.rut_cliente = c.rut_cliente 
                INNER JOIN 10_m_local_cliente lc ON v.id_local_cliente = lc.id_local_cliente
                INNER JOIN 10_p_tipo_docto fp ON v.id_forma_pago = fp.id_tipo_docto
                INNER JOIN 10_m_usuario uv ON v.id_usuario_venta = uv.id_usuario
            WHERE v.id_estado = 3 
              AND (:id_ruta = " . SisDistCONST::ID_FILTRO_TODOS . " OR EXISTS (
                  SELECT rlc.id_local_cliente 
                  FROM 40_m_ruta_local_cliente rlc
                  WHERE rlc.id_ruta = :id_ruta
                  AND rlc.id_local_cliente = v.id_local_cliente
              ))
              AND (:fecha_desde = '' OR v.fecha_venta >= :fecha_desde)
              AND (:fecha_hasta = '' OR v.fecha_venta <= :fecha_hasta)
              AND (:factura_desde = " . SisDistCONST::ID_FILTRO_TODOS . " OR v.num_docto_emitido >= :factura_desde)
              AND (:factura_hasta = " . SisDistCONST::ID_FILTRO_TODOS . " OR v.num_docto_emitido <= :factura_hasta)
              AND (:rut_empresa = " . SisDistCONST::ID_FILTRO_TODOS . " OR v.rut_empresa = :rut_empresa)
              AND (:rut_cliente = " . SisDistCONST::ID_FILTRO_TODOS . " OR v.rut_cliente = :rut_cliente)
              AND (:razon_social = '' OR c.razon_social LIKE :razon_social)
              AND (:id_tipo_docto_emitido = " . SisDistCONST::ID_FILTRO_TODOS . " OR v.id_tipo_docto_emitido = :id_tipo_docto_emitido)
              AND (:id_usuario_venta = " . SisDistCONST::ID_FILTRO_TODOS . " OR v.id_usuario_venta = :id_usuario_venta)
              AND (:id_estado_pago = " . SisDistCONST::ID_FILTRO_TODOS .
                " OR v.id_estado_pago = :id_estado_pago" .
                " OR ( :id_estado_pago = " . EstadoPagoCONST::CON_DEUDA . " AND v.id_estado_pago IN (1, 2) ) )
            ORDER BY " . $oVentaFB->orden . "
            LIMIT 5000";
        // print_r($oVentaFB);
        // echo "<br>";
        // print_r($cFechaDesdeBD);
        // print_r($cFechaHastaBD);
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(":id_ruta", $oVentaFB->idRuta, PDO::PARAM_INT);
        $oStmt->bindParam(":fecha_desde", $cFechaDesdeBD, PDO::PARAM_STR);
        $oStmt->bindParam(":fecha_hasta", $cFechaHastaBD, PDO::PARAM_STR);
        $oStmt->bindParam(":factura_desde", $oVentaFB->iNumFacturaDesde, PDO::PARAM_INT);
        $oStmt->bindParam(":factura_hasta", $oVentaFB->iNumFacturaHasta, PDO::PARAM_INT);
        $oStmt->bindParam(":rut_empresa", $oVentaFB->iRutEmpresa, PDO::PARAM_INT);
        $oStmt->bindParam(":rut_cliente", $oVentaFB->iRutCliente, PDO::PARAM_INT);
        $oStmt->bindParam(":id_tipo_docto_emitido", $oVentaFB->idTipoDocto, PDO::PARAM_INT);
        $oStmt->bindParam(":id_usuario_venta", $oVentaFB->idVendedor, PDO::PARAM_INT);
        $oStmt->bindParam(":id_estado_pago", $oVentaFB->idEstadoPago, PDO::PARAM_INT);
        $oStmt->bindParam(":razon_social", $cRazonSocial, PDO::PARAM_STR);
        //$oStmt->bindParam(":orden", $oVentaFB->orden, PDO::PARAM_STR);
        $oStmt->execute();
        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'RegListVenta');

        return $rs;
    }
    
    
    /**
     * Marca Ventas como subidas al LibroCV
     * 
     * @param PDO $oPDO
     * @param string $cFechaDesde
     * @param string $cFechaHasta
     * @param int $iRutEmpresa
     * @param string $cPeriodo
     * @return boolean
     */
    public function marcarVentasEnLibroCV($oPDO, $cFechaDesde, $cFechaHasta, $iRutEmpresa, $cPeriodo) {
        require_once $this->cRutaRelativa . 'Clases/Util/FechaUtil.php';
        require_once $this->cRutaRelativa . 'Clases/Constantes/TipoDoctoCONST.php';
        
        $cFechaDesdeBD = FechaUtil::deFechaJQueryABD($cFechaDesde);
        $cFechaHastaBD = FechaUtil::deFechaJQueryABD($cFechaHasta);
        $idTipoDocto = TipoDoctoCONST::FACTURA;
        
        $cSql = "UPDATE 40_m_venta
                     SET periodo_libro = :periodo_libro
                 WHERE fecha_venta >= :fecha_desde
                   AND fecha_venta <= :fecha_hasta
                   AND rut_empresa = :rut_empresa
                   AND id_tipo_docto_emitido = :id_tipo_docto";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(":fecha_desde", $cFechaDesdeBD, PDO::PARAM_STR);
        $oStmt->bindParam(":fecha_hasta", $cFechaHastaBD, PDO::PARAM_STR);
        $oStmt->bindParam(":rut_empresa", $iRutEmpresa, PDO::PARAM_INT);
        $oStmt->bindParam(":id_tipo_docto", $idTipoDocto, PDO::PARAM_INT);
        $oStmt->bindParam(":periodo_libro", $cPeriodo, PDO::PARAM_STR);
        $oStmt->execute();

        return true;
    }

    
    /**
     * Retorna siguiente número de folio electrónico según rut empresa
     * 
     * @param PDO $oPDO
     * @param int $iRutEmpresa
     * @return int
     */
    public static function obtNuevoFolio($oPDO, $iRutEmpresa) {
        $cSql = 
                "SELECT MAX(id_folio) + 1 as nuevo_folio 
                 FROM 40_m_venta 
                 WHERE rut_empresa = :rut_empresa";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(":rut_empresa", $iRutEmpresa, PDO::PARAM_INT);
        $oStmt->execute();
        $idMaxFolio = $oStmt->fetchColumn();
        
        return $idMaxFolio;
    }


    public static function obtTotalesVenta($oPDO, $oVentaFB) {
        require_once __DIR__ . '/../Util/FechaUtil.php';
        
        $cFechaDesdeBD = $oVentaFB->cFechaDesde;
        if (strpos($oVentaFB->cFechaDesde, '/') !== false) {
            $cFechaDesdeBD = FechaUtil::deFechaJQueryABD($oVentaFB->cFechaDesde);
        }
        $cFechaHastaBD = $oVentaFB->cFechaHasta;
        if (strpos($oVentaFB->cFechaHasta, '/') !== false) {
            $cFechaHastaBD = FechaUtil::deFechaJQueryABD($oVentaFB->cFechaHasta);
        }

        $cRazonSocial = "";
        if ($oVentaFB->cRazonSocialCliente != "") {
            $cRazonSocial = "%".$oVentaFB->cRazonSocialCliente."%";
        }

        $cSql = 
           "SELECT  SUM(v.sub_total) AS sum_precio_neto,
                    SUM(v.iva) AS sum_iva,
                    SUM(v.iaba) AS sum_iaba,
                    SUM(v.espec) AS sum_espec,
                    SUM(v.precio_total) AS sum_precio_total,
                    SUM(COALESCE((SELECT SUM(nc.precio_total) FROM 40_m_nota_credito nc WHERE nc.id_venta = v.id_venta), 0)) as sum_total_NC,
                    SUM(COALESCE((SELECT SUM(p.monto) FROM 60_m_pago p WHERE p.id_venta = v.id_venta), 0)) as sum_total_pago,
                    COUNT(v.id_venta) cuenta_ventas
            FROM 40_m_venta v
                INNER JOIN 10_m_cliente c ON v.rut_cliente = c.rut_cliente
            WHERE v.id_estado = 3
            AND (:id_ruta = " . SisDistCONST::ID_FILTRO_TODOS . " OR EXISTS (
                  SELECT rlc.id_local_cliente 
                  FROM 40_m_ruta_local_cliente rlc
                  WHERE rlc.id_ruta = :id_ruta
                  AND rlc.id_local_cliente = v.id_local_cliente
              ))
              AND (:fecha_desde = '' OR v.fecha_venta >= :fecha_desde)
              AND (:fecha_hasta = '' OR v.fecha_venta <= :fecha_hasta)
              AND (:factura_desde = " . SisDistCONST::ID_FILTRO_TODOS . " OR v.num_docto_emitido >= :factura_desde)
              AND (:factura_hasta = " . SisDistCONST::ID_FILTRO_TODOS . " OR v.num_docto_emitido <= :factura_hasta)
              AND (:rut_empresa = " . SisDistCONST::ID_FILTRO_TODOS . " OR v.rut_empresa = :rut_empresa)
              AND (:rut_cliente = " . SisDistCONST::ID_FILTRO_TODOS . " OR v.rut_cliente = :rut_cliente)
              AND (:razon_social = '' OR c.razon_social LIKE :razon_social)
              AND (:id_tipo_docto_emitido = " . SisDistCONST::ID_FILTRO_TODOS . " OR v.id_tipo_docto_emitido = :id_tipo_docto_emitido)
              AND (:id_local_cliente = " . SisDistCONST::ID_FILTRO_TODOS . " OR v.id_local_cliente = :id_local_cliente)
              AND (:id_estado_pago = " . SisDistCONST::ID_FILTRO_TODOS . 
                " OR v.id_estado_pago = :id_estado_pago" . 
                " OR ( :id_estado_pago = " . EstadoPagoCONST::CON_DEUDA . " AND id_estado_pago IN (1, 2) ) )";
        //print_r($oVentaFB);
        //echo $cSql;
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(":fecha_desde", $cFechaDesdeBD, PDO::PARAM_STR);
        $oStmt->bindParam(":fecha_hasta", $cFechaHastaBD, PDO::PARAM_STR);
        $oStmt->bindParam(":factura_desde", $oVentaFB->iNumFacturaDesde, PDO::PARAM_INT);
        $oStmt->bindParam(":factura_hasta", $oVentaFB->iNumFacturaHasta, PDO::PARAM_INT);
        $oStmt->bindParam(":rut_empresa", $oVentaFB->iRutEmpresa, PDO::PARAM_INT);
        $oStmt->bindParam(":id_tipo_docto_emitido", $oVentaFB->idTipoDocto, PDO::PARAM_INT);
        $oStmt->bindParam(":id_local_cliente", $oVentaFB->idLocalCliente, PDO::PARAM_INT);
        $oStmt->bindParam(":id_ruta", $oVentaFB->idRuta, PDO::PARAM_INT);
        $oStmt->bindParam(":id_estado_pago", $oVentaFB->idEstadoPago, PDO::PARAM_INT);
        $oStmt->bindParam(":rut_cliente", $oVentaFB->iRutCliente, PDO::PARAM_INT);
        $oStmt->bindParam(":razon_social", $cRazonSocial, PDO::PARAM_STR);
        $oStmt->execute();
        //$oStmt->debugDumpParams();
        $oStmt->setFetchMode(PDO::FETCH_CLASS, 'RegTotalesVenta');
        $rs = $oStmt->fetch(PDO::FETCH_CLASS);

        return $rs;
    }
    
    
    /**
     * Devuelve lista de Venta en LibroCV Facturacion.cl
     * 
     * @param PDO $oPDO
     * @param string $cPeriodo
     * @param int $iRutEmpresa
     * @return Array Venta
     */
    public function listVentasEnLibroCV($oPDO, $cPeriodo, $iRutEmpresa) {
        $idTipoDocto = FacturacionCLCONST::TIPO_DOCTO_FACTURA;
        
        $cSql = "SELECT * 
                 FROM 40_m_venta
                   WHERE periodo_libro = :periodo_libro
                   AND rut_empresa = :rut_empresa
                   AND id_tipo_docto_emitido = :id_tipo_docto";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(":periodo_libro", $cPeriodo, PDO::PARAM_STR);
        $oStmt->bindParam(":rut_empresa", $iRutEmpresa, PDO::PARAM_INT);
        $oStmt->bindParam(":id_tipo_docto", $idTipoDocto, PDO::PARAM_INT);
        $oStmt->execute();
        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'Venta');

        return $rs;
    }
}
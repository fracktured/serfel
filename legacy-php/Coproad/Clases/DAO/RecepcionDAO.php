<?php

/**
 * Description of RecepcionDAO
 *
 * @author ccastro
 */
class RecepcionDAO {
    
    private $cRutaRelativa = "";
    
    
    // <editor-fold defaultstate="collapsed" desc="CONSTRUCTOR">
    public function __construct($cRutaRelativa) {
        $this->cRutaRelativa = $cRutaRelativa;

        include_once $this->cRutaRelativa . "Clases/POJO/Recepcion.php";
    }
    // </editor-fold>
    
    
    /**
     * Retorna Recepcion según id.
     * 
     * @param PDO $oPDO
     * @param int $idRecepcion
     * @return Recepcion
     */
    public function obtRecepcion($oPDO, $idRecepcion) {
        $cSql = 
            "SELECT * 
             FROM 50_m_recepcion_compra 
             WHERE id_recepcion = :id_recepcion";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_recepcion', $idRecepcion, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'Recepcion');

        $oRecepcion = null;
        foreach ($rs as $o) {
            $oRecepcion = $o;
        }

        return $oRecepcion;
    }
    
    
    /**
     * Devuelve lista de Recepciones según filtros con un máximo de 5000 registros
     * 
     * @param PDO $oPDO
     * @param RecepcionFB $oRecepcionFB
     * @return Array Recepcion
     */
    public function listRecepciones($oPDO, $oRecepcionFB) {
        require_once __DIR__ . '/../Util/FechaUtil.php';
        
        $cFechaDesdeBD = $oRecepcionFB->cFechaDesde;
        if (strpos($oRecepcionFB->cFechaDesde, '/') !== false) {
            $cFechaDesdeBD = FechaUtil::deFechaJQueryABD($oRecepcionFB->cFechaDesde);
        }
        $cFechaHastaBD = $oRecepcionFB->cFechaHasta;
        if (strpos($oRecepcionFB->cFechaHasta, '/') !== false) {
            $cFechaHastaBD = FechaUtil::deFechaJQueryABD($oRecepcionFB->cFechaHasta);
        }

        $cRazonSocial = "";
        if ($oRecepcionFB->cRazonSocialProveedor != "") {
            $cRazonSocial = "%".$oRecepcionFB->cRazonSocialProveedor."%";
        }
        
        $cSql = "
            SELECT r.*
                FROM 50_m_recepcion_compra r
                INNER JOIN 70_m_proveedor p ON r.rut_proveedor = p.rut_proveedor
                WHERE (:fecha_desde = '' OR r.fecha_emision_docto >= :fecha_desde)
                    AND (:fecha_hasta = '' OR r.fecha_emision_docto <= :fecha_hasta)
                    AND (:factura_desde = " . SisDistCONST::ID_FILTRO_TODOS . " OR r.num_docto >= :factura_desde)
                    AND (:factura_hasta = " . SisDistCONST::ID_FILTRO_TODOS . " OR r.num_docto <= :factura_hasta)
                    AND (:rut_empresa = " . SisDistCONST::ID_FILTRO_TODOS . " OR r.rut_empresa = :rut_empresa)
                    AND (:rut_proveedor = " . SisDistCONST::ID_FILTRO_TODOS . " OR r.rut_proveedor = :rut_proveedor)
                    AND (:razon_social = '' OR p.razon_social LIKE :razon_social)
                    AND (:id_tipo_docto = " . SisDistCONST::ID_FILTRO_TODOS . " OR r.id_tipo_docto = :id_tipo_docto)
                    AND (:id_tipo_pago = " . SisDistCONST::ID_FILTRO_TODOS . " OR r.id_tipo_pago = :id_tipo_pago)
                LIMIT 5000";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(":fecha_desde", $cFechaDesdeBD, PDO::PARAM_STR);
        $oStmt->bindParam(":fecha_hasta", $cFechaHastaBD, PDO::PARAM_STR);
        $oStmt->bindParam(":factura_desde", $oRecepcionFB->iFacturaDesde, PDO::PARAM_INT);
        $oStmt->bindParam(":factura_hasta", $oRecepcionFB->iFacturaHasta, PDO::PARAM_INT);
        $oStmt->bindParam(":rut_empresa", $oRecepcionFB->iRutEmpresa, PDO::PARAM_INT);
        $oStmt->bindParam(":id_tipo_docto", $oRecepcionFB->idTipoDocto, PDO::PARAM_INT);
        $oStmt->bindParam(":id_tipo_pago", $oRecepcionFB->idTipoPago, PDO::PARAM_INT);
        $oStmt->bindParam(":rut_proveedor", $oRecepcionFB->iRutProveedor, PDO::PARAM_INT);
        $oStmt->bindParam(":razon_social", $cRazonSocial, PDO::PARAM_STR);

        $oStmt->execute();
        return $oStmt->fetchALL(PDO::FETCH_CLASS, 'Recepcion');
    }
    
    
    /**
     * Devuelve lista de Recepciones según filtros con un máximo de 5000 registros
     * 
     * @param PDO $oPDO
     * @param string $cPeriodo
     * @param int $iRutEmpresa
     * @return Array Recepcion
     */
    public function listRecepcionesEnLibroCV($oPDO, $cPeriodo, $iRutEmpresa) {
        require_once $this->cRutaRelativa . 'Clases/Constantes/TipoDoctoCONST.php';
        
        $TIPO_DOCTO_FACTURA = TipoDoctoCONST::FACTURA;
        
        $cSql = "SELECT * 
                 FROM 50_m_recepcion_compra
                   WHERE periodo_libro = :periodo_libro
                   AND rut_empresa = :rut_empresa
                   AND id_tipo_docto = :id_tipo_docto";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(":periodo_libro", $cPeriodo, PDO::PARAM_STR);
        $oStmt->bindParam(":rut_empresa", $iRutEmpresa, PDO::PARAM_INT);
        $oStmt->bindParam(":id_tipo_docto", $TIPO_DOCTO_FACTURA, PDO::PARAM_INT);
        $oStmt->execute();
        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'Recepcion');

        return $rs;
    }
 
    
    /**
     * Marca Recepciones como subidas al LibroCV
     * 
     * @param PDO $oPDO
     * @param string $cFechaDesde
     * @param string $cFechaHasta
     * @param int $iRutEmpresa
     * @param string $cPeriodo
     * @return boolean
     */
    public function marcarRecepcionesEnLibroCV($oPDO, $cFechaDesde, $cFechaHasta, $iRutEmpresa, $cPeriodo) {
        require_once $this->cRutaRelativa . 'Clases/Util/FechaUtil.php';
        require_once $this->cRutaRelativa . 'Clases/Constantes/TipoDoctoCONST.php';
        
        $cFechaDesdeBD = FechaUtil::deFechaJQueryABD($cFechaDesde);
        $cFechaHastaBD = FechaUtil::deFechaJQueryABD($cFechaHasta);
        $idTipoDocto = TipoDoctoCONST::FACTURA;
        
        $cSql = "UPDATE 50_m_recepcion_compra
                     SET periodo_libro = :periodo_libro
                 WHERE fecha_emision_docto >= :fecha_desde
                   AND fecha_emision_docto <= :fecha_hasta
                   AND rut_empresa = :rut_empresa
                   AND id_tipo_docto = :id_tipo_docto";
        
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
     * Desmarca Recepcion como subida al LibroCV
     * 
     * @param PDO $oPDO
     * @param int $idRecepcion
     * @return boolean
     */
    public function desmarcarRecepcionEnLibroCV($oPDO, $idRecepcion, $idUsuario) {
        $cPeriodoLibro = "";
        
        $cSql = "UPDATE 50_m_recepcion_compra
                     SET periodo_libro = :periodo_libro
                 WHERE id_recepcion = :id_recepcion";
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(":id_recepcion", $idRecepcion, PDO::PARAM_INT);
        $oStmt->bindParam(":periodo_libro", $cPeriodoLibro, PDO::PARAM_STR);
        $oStmt->execute();

        return true;
    }
}

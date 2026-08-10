<?php
require_once __DIR__ . '/../POJO/RegListCliente.php';

/**
 * Description of ClienteDAO
 *
 * @author ccastro
 */
class ClienteDAO {
    
    
    /**
     * Retorna Cliente según rut.
     * 
     * @param PDO $oPDO
     * @param int $iRutCliente
     * @return Cliente
     */
    public static function obtCliente($oPDO, $iRutCliente) {
        require_once __DIR__ . '/GeneralDAO.php';
        require_once __DIR__ . '/../POJO/Cliente.php';
        
        return GeneralDAO::obtPOJO($oPDO, $iRutCliente, SisDistCONST::POJO_CLIENTE);
    }
    
    
    public static function modCliente($oPDO, $oCliente) {
        $cTabla = SisDistCONST::TABLA_CLIENTE;
        
        $cSql = 
            "UPDATE $cTabla
                SET id_estado = :id_estado
            WHERE rut_cliente = :rut_cliente";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':rut_cliente', $oCliente->rut_cliente, PDO::PARAM_INT);
        $oStmt->bindParam(':id_estado', $oCliente->id_estado, PDO::PARAM_INT);
        $oStmt->execute();

        return $oPDO->lastInsertId();
    }
    
    
    /**
     * Devuelve lista de Clientes según filtros con un máximo de 5000 registros
     * 
     * @param PDO $oPDO
     * @param VentaFB $oClienteFB
     * @return Array RegListCliente
     */
    public static function listar($oPDO, $oClienteFB) {
        $cRazonSocial = "";
        if ($oClienteFB->cRazonSocialCliente != "") {
            $cRazonSocial = "%".$oClienteFB->cRazonSocialCliente."%";
        }
        $cDireccion = "";
        if ($oClienteFB->cDireccion != "") {
            $cDireccion = "%".$oClienteFB->cDireccion."%";
        }
        
        $cSql = 
           "SELECT c.rut_cliente,
                    c.dv_cliente,
                    c.razon_social,
                    c.nom_fantasia,
                    lp.nom_lista_precio,
                    c.telefono_cliente,
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
                    (SELECT MAX(v.num_docto_emitido)
                    FROM 40_m_venta v
                    WHERE v.rut_cliente = c.rut_cliente
                    AND v.id_estado > 0) AS ult_factura,
                    (SELECT MAX(nc.num_nota_credito)
                    FROM 40_m_nota_credito nc
                        INNER JOIN 40_m_venta v2 ON nc.id_venta = v2.id_venta 
                    WHERE v2.rut_cliente = c.rut_cliente) AS ult_nota_credito
            FROM 10_m_cliente c
                INNER JOIN 40_m_lista_precio lp ON c.id_lista_precio = lp.id_lista_precio
            WHERE c.id_estado = 1
                AND (:rut_cliente = " . SisDistCONST::ID_FILTRO_TODOS . " OR c.rut_cliente = :rut_cliente)
                AND (:razon_social = '' OR c.razon_social LIKE :razon_social)
                AND (:direccion = '' OR c.direccion_cliente LIKE :direccion)";
        // print_r($oVentaFB);
        
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(":rut_cliente", $oClienteFB->iRutCliente, PDO::PARAM_INT);
        $oStmt->bindParam(":razon_social", $cRazonSocial, PDO::PARAM_STR);
        $oStmt->bindParam(":direccion", $cDireccion, PDO::PARAM_STR);
        $oStmt->execute();
        return $oStmt->fetchALL(PDO::FETCH_CLASS, 'RegListCliente');
    }
    
}

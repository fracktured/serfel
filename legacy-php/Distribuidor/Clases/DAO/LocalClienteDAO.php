<?php
require_once __DIR__."/../POJO/LocalCliente.php";
require_once __DIR__.'/../POJO/RegListLocalRuta.php';

/**
 * Description of LocalClienteDAO
 *
 * @author ccastro
 */
class LocalClienteDAO {
    
    const COLUMNAS = 
        "c.rut_cliente,
        c.dv_cliente,
        lc.id_local_cliente,
        lc.nom_local_cliente,
        lc.direccion_local_cliente,
        lc.telefono_local_cliente,
        lc.nom_contacto,
        lc.apell_pat_contacto,
        lc.apell_mat_contacto,
        lc.telefono_contacto,
        c.razon_social,
        c.id_lista_precio,
        c.permite_venta_deuda,
        lc.tope_venta,
        lc.permite_venta_tope_mensual";

    const PEDIDOS = 
        "(SELECT COUNT(p.id_local_cliente)
        FROM 30_m_pedido p
        WHERE (DATE(p.fecha_pedido) + 0) = (CURRENT_DATE() + 0)
        AND p.id_local_cliente = lc.id_local_cliente) AS pedidos";
    

    /**
     * Retorna LocalCliente según id.
     * 
     * @param PDO $db
     * @param int $idLocalCliente
     * @return LocalCliente
     */
    public static function obtener($db, $idLocalCliente) {
        $sql = 
            "SELECT * 
             FROM 10_m_local_cliente 
             WHERE id_local_cliente = :id_local_cliente";

        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id_local_cliente', $idLocalCliente, PDO::PARAM_INT);
        $stmt->execute();

        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'LocalCliente');

        $oLocalCliente = null;
        foreach ($rs as $lc) {
            $oLocalCliente = $lc;
        }

        return $oLocalCliente;
    }

    /**
     * Retorna lista de LocalCliente por rut_cliente
     * 
     * @param PDO $db
     * @param int $idLocalCliente
     * @return RegListLocalRuta
     */
    public static function listarPorRut($db, $iRutCliente) {
        $sql =
            "SELECT " .
                LocalClienteDAO::COLUMNAS . ", " .
                LocalClienteDAO::PEDIDOS . "
            FROM 10_m_local_cliente lc
                INNER JOIN 10_m_cliente c ON lc.rut_cliente = c.rut_cliente
            WHERE c.rut_cliente = :rut_cliente
            AND c.rut_cliente > 0
            AND c.bloquear_venta = 0
            AND lc.id_estado = 1";

        $stmt = $db->prepare($sql);
        $stmt->bindParam(':rut_cliente', $iRutCliente, PDO::PARAM_INT);
        $stmt->execute();

        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'RegListLocalRuta');

        return $rs;
    }

    /**
     * Retorna lista de LocalCliente por razon_social o nom_local_cliente
     * 
     * @param PDO $db
     * @param String[] $palabras
     * @return RegListLocalRuta
     */
    public static function listarPorRazonSocialONombre($db, $palabras) {
        $sql =
            "SELECT " .
                LocalClienteDAO::COLUMNAS . ", " .
                LocalClienteDAO::PEDIDOS . "
            FROM 10_m_local_cliente lc
                INNER JOIN 10_m_cliente c ON lc.rut_cliente = c.rut_cliente
            WHERE (upper(c.razon_social) LIKE upper(:palabra) OR upper(lc.nom_local_cliente) LIKE upper(:palabra))
            AND c.bloquear_venta = 0
            AND lc.id_estado = 1";
        
        $nom_razon = '%';
        foreach ( $palabras as $palabra ) {
            $nom_razon .= $palabra.'%';
        }

        $stmt = $db->prepare($sql);
        $parametros = [];
        $parametros += [ ':palabra' => $nom_razon ];
        $stmt->execute($parametros);

        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'RegListLocalRuta');

        return $rs;
    }

    /**
     * Retorna LocalCliente según id.
     * 
     * @param PDO $db
     * @param int $idLocalCliente
     * @return LocalCliente
     */
    public static function get($db, $idLocalCliente) {
        $sql = 
            "SELECT " . 
                LocalClienteDAO::COLUMNAS . ", " . 
                LocalClienteDAO::PEDIDOS . "
            FROM 10_m_local_cliente lc
                INNER JOIN 10_m_cliente c ON lc.rut_cliente = c.rut_cliente
             WHERE lc.id_local_cliente = :id_local_cliente";

        $stmt = $db->prepare($sql);
        $stmt->bindParam(':id_local_cliente', $idLocalCliente, PDO::PARAM_INT);
        $stmt->execute();

        $rs = $stmt->fetchALL(PDO::FETCH_CLASS, 'RegListLocalRuta');

        $oLocalCliente = null;
        foreach ($rs as $lc) {
            $oLocalCliente = $lc;
        }

        return $oLocalCliente;
    }
}

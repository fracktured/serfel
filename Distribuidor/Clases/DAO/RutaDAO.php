<?php
require_once __DIR__.'/../POJO/Ruta.php';
require_once __DIR__.'/../POJO/RegListLocalRuta.php';

/**
 * Description of RutaDAO
 *
 * @author ccastro
 */
class RutaDAO {


    /**
     * Retorna ruta
     * 
     * @param PDO $oPDO
     * @return Ruta
     */
    public static function obtener($oPDO, $idRuta) {
        $cSql = 
            "SELECT 
                id_ruta,
                nom_ruta
            FROM 40_m_ruta
            WHERE id_ruta = :id_ruta";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_ruta', $idRuta, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'Ruta');
        $ruta = null;
        foreach ($rs as $o) {
            $ruta = $o;
        }

        return $ruta;
    }

    /**
     * Retorna todas las rutas activas
     * 
     * @param PDO $oPDO
     * @return Array Ruta
     */
    public static function listar($oPDO) {
        $cSql = 
            "SELECT 
                id_ruta,
                nom_ruta
            FROM 40_m_ruta
            WHERE id_estado = :id_estado";

        $idEstadoActivo = EstadoCONST::ACTIVO;
        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':id_estado', $idEstadoActivo, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'Ruta');

        return $rs;
    }
    
    
    public static function obtRutaDelDia($oPDO, $idUsuario, $iDiaDeLaSemana) {
        $cSql = 
            "SELECT r.id_ruta,
                    r.nom_ruta,
                    r.id_usuario,
                    r.num_dia
             FROM 40_m_ruta r
             WHERE r.id_usuario = :idUsuario
               AND r.num_dia = :iDiaDeLaSemana
               AND r.id_estado = 1";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':idUsuario', $idUsuario, PDO::PARAM_INT);
        $oStmt->bindParam(':iDiaDeLaSemana', $iDiaDeLaSemana, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'Ruta');

        $oPojo = null;
        foreach ($rs as $o) {
            $oPojo = $o;
        }

        return $oPojo;
    }
    
    
    public static function obtLocalesRutaDelDia($oPDO, $idUsuario, $iDiaDeLaSemana) {
        $cSql = 
            "SELECT c.rut_cliente,
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
                    (SELECT COUNT(p.id_local_cliente)
                     FROM 30_m_pedido p
                     WHERE (DATE(p.fecha_pedido) + 0) = (CURRENT_DATE() + 0)
                     AND p.id_local_cliente = lc.id_local_cliente) AS pedidos,
                    c.permite_venta_deuda,
                    lc.tope_venta,
                    lc.permite_venta_tope_mensual,
                    lc.id_forma_pago
             FROM 40_m_ruta r
                 INNER JOIN 40_m_ruta_local_cliente rlc ON r.id_ruta = rlc.id_ruta
                 INNER JOIN 10_m_local_cliente lc ON rlc.id_local_cliente = lc.id_local_cliente
                 INNER JOIN 10_m_cliente c ON lc.rut_cliente = c.rut_cliente
             WHERE r.id_usuario = :idUsuario
               AND r.num_dia = :iDiaDeLaSemana
               AND lc.id_estado = 1
               AND r.id_estado = 1";

        $oStmt = $oPDO->prepare($cSql);
        $oStmt->bindParam(':idUsuario', $idUsuario, PDO::PARAM_INT);
        $oStmt->bindParam(':iDiaDeLaSemana', $iDiaDeLaSemana, PDO::PARAM_INT);
        $oStmt->execute();

        $rs = $oStmt->fetchALL(PDO::FETCH_CLASS, 'RegListLocalRuta');

        return $rs;
    }
    
}

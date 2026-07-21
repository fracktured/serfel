<?php
require_once __DIR__.'/../Conexion/Conexion.php';
require_once __DIR__.'/../POJO/Ruta.php';
require_once __DIR__.'/../NegDTO/RutaNDTO.php';
require_once __DIR__.'/../DAO/RutaDAO.php';
require_once __DIR__.'/../DAO/VentaDAO.php';
require_once __DIR__.'/../FiltroBusqueda/VentaFB.php';
require_once __DIR__.'/../Factory/DTO/SelectItem.php';

/**
 * Description of RutaNEG
 *
 * @author ccastro
 */
class RutaNEG {
    
    /**
     * Retorna Ruta del día
     * RutaNDTO { Ruta, listLocalesRuta }
     * 
     * @param int $idUsuario
     * @param int $iDiaDeLaSemana
     * @return RutaNDTO
     */
    public static function obtRutaDia($idUsuario, $iDiaDeLaSemana) {
        setlocale(LC_MONETARY, 'es_CL.UTF-8');

        $oRutaNDTO = new RutaNDTO();
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oRuta = RutaDAO::obtRutaDelDia($oPDO, $idUsuario, $iDiaDeLaSemana);
        
        // No encontrado en BD
        if ( empty($oRuta) ) {
            $oRutaNDTO->cMensaje = "No existe ruta del día";
        } else {
            $oRutaNDTO->bExito = TRUE;
            $oRutaNDTO->oRuta = $oRuta;
            
            $listLocalesRuta = RutaDAO::obtLocalesRutaDelDia($oPDO, $idUsuario, $iDiaDeLaSemana);
            
            $i = 0;
            while ( count($listLocalesRuta) > $i ) {
                $listLocalesRuta[$i]->bloqueado = FALSE;
                $oLocalCliente = $listLocalesRuta[$i];
                // Codigo es validado en crear pedido
                if ( !$oLocalCliente->permite_venta_tope_mensual && $oLocalCliente->tope_venta > 0 ) {
                    // buscar venta mensual y comparar contra $tope_venta
                    $oVentaFB = new VentaFB();
                    $oVentaFB->idLocalCliente = $oLocalCliente->id_local_cliente;
                    $oVentaFB->cFechaDesde = date("Y-m") . "-01";
                    $oVentaFB->cFechaHasta = date("Y-m") . "-31";
                    $oTotalesVenta = VentaDAO::obtTotalesVenta($oPDO, $oVentaFB);
                    
                    if ( $oTotalesVenta->sum_precio_total > $oLocalCliente->tope_venta ) {
                        //TODO: Cambiar variable por money_format()
                        $iDiferenciaSobreTope = $oTotalesVenta->sum_precio_total - $oLocalCliente->tope_venta;
                        $oLocalCliente->bloqueado = TRUE;
                        $oLocalCliente->motivo_bloqueo = "Cliente supera tope mensual de ventas en " . $iDiferenciaSobreTope; //money_format('%.0n', $iDiferenciaSobreTope);
                    }
                    $listLocalesRuta[$i] = $oLocalCliente;
                    //$oRutaNDTO->listRuta->motivo_bloqueo
                }
                //if ( !$listLocalesRuta[$i]->permite_venta_deuda ) {
                    // TODO: buscar ventas no pagadas
                //}
                //Se eliminan atributos para no ser enviados en servicio
                //unset($listLocalesRuta[$i]->permite_venta_tope_mensual);
                //unset($listLocalesRuta[$i]->permite_venta_deuda);
                $i++;
            }
            
            $oRutaNDTO->listLocalesRuta = $listLocalesRuta;
        }
        
        return $oRutaNDTO;
    }

    /**
     * Retorna Ruta
     * 
     * @return Ruta
     */
    public static function obtener($idRuta) {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        return RutaDAO::obtener($oPDO, $idRuta);
    }

    /**
     * Retorna listado Ruta activas
     * 
     * @return Array Ruta
     */
    public static function listar() {
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        return RutaDAO::listar($oPDO);
    }
    
    /**
     * Retorna listado SelectItem Ruta
     * 
     * @return Array SelectItem
     */
    public static function listarSI() {
        $listRutaSI = Array();
  
        $i = 0;
        foreach( RutaNEG::listar() as $oRuta ) {
            $listRutaSI[$i] = new SelectItem($oRuta->id_ruta, $oRuta->nom_ruta);
            $i++;
        }
        
        return $listRutaSI;
    }
    
}

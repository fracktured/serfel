<?php

// Set default timezone to UTC
date_default_timezone_set('UTC');

/**
 * Description of FechaUtil
 *
 * @author ccastro
 */
class FechaUtil {
    
    
    /**
     * Retorna fecha en siguiente formato 'yyyy-mm-dd'
     * 
     * @param string $fecha
     */
    public static function aFechaYMD($fecha) {
        $dFecha = strtotime($fecha);
        
        return date("Y-m-d", $dFecha);
    }

    /**
     * Retorna fecha en siguiente formato 'yyyy-mm-dd'
     * 
     * @param string $fecha
     */
    public static function aFechaDMY($fecha) {
        $dFecha = strtotime($fecha);
        
        return date("d-m-Y", $dFecha);
    }
    
    
    /**
     * Retorna fecha en formato 'yyyy-mm-dd' para fecha en formato 'dd/mm/yyyy'
     * 
     * @param string $cFecha
     * @return string
     */
    public static function deFechaJQueryABD($cFecha) {
        if(!empty($cFecha)) {
            $arrFecha = explode("/", $cFecha);
        
            return $arrFecha[2] . "-" . $arrFecha[1] . "-" . $arrFecha[0];
        } else {
            return "";
        }
    }
    
    
    /**
     * Retorna lista de meses
     * 
     * @return Array
     */
    public static function listMeses() {
        $listaMeses = Array();
        
        $listaMeses[1]  = "Enero";
        $listaMeses[2]  = "Febrero";
        $listaMeses[3]  = "Marzo";
        $listaMeses[4]  = "Abril";
        $listaMeses[5]  = "Mayo";
        $listaMeses[6]  = "Junio";
        $listaMeses[7]  = "Julio";
        $listaMeses[8]  = "Agosto";
        $listaMeses[9]  = "Septiembre";
        $listaMeses[10] = "Octubre";
        $listaMeses[11] = "Noviembre";
        $listaMeses[12] = "Diciembre";
        
        return $listaMeses;
    }
    
    
    /**
     * Retorna periodo en formato yyyy-mm a partir de enteros
     * 
     * @param int $iMesPeriodo
     * @param int $iAñoPeriodo
     * @return string
     */
    public static function aPeriodoLibro($iMesPeriodo, $iAñoPeriodo) {
        $cPeriodo = "";
        if($iMesPeriodo < 10) {
            $cPeriodo = $iAñoPeriodo . "-0" . $iMesPeriodo;
        } else {
            $cPeriodo = $iAñoPeriodo . "-" . $iMesPeriodo;
        }
        
        return $cPeriodo;
    }
}

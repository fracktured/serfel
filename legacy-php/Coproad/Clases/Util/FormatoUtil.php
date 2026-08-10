<?php

/**
 * Description of FormatoUtil
 *
 * @author ccastro
 */
class FormatoUtil {
    
    /**
     * Retorna float en formato '$ 999.999'
     * 
     * @param float $fValor
     * @return string
     */
    public static function formatoDinero($fValor) {
        if($fValor != 0 && $fValor != "") {
            $cDineroFormateado = "";
            $cFactor = "";

            $arrayPartes = explode(".", $fValor);
            $cUnidades  = $arrayPartes[0];
            
            if($cUnidades < 0) {
                $cFactor = "-";
                $cUnidades *= -1;
            }
            
            while(strlen($cUnidades) > 3) {
                $cDineroFormateado = "." . substr($cUnidades, strlen($cUnidades) -3) . $cDineroFormateado;
                $cUnidades = substr($cUnidades, 0, strlen($cUnidades) - 3);
            }
            $cDineroFormateado = "$ " . $cUnidades . $cDineroFormateado;

            return $cFactor . " " . $cDineroFormateado;
        } else {
            return "$ 0";
        }
    }
    
    
    /**
     * Retorna float en formato '999.999,99'
     * 
     * @param float $valor
     * @return string
     */
    public static function formatoEnteroConDecimal($valor) {
        if($valor != 0 && $valor != "") {
            $cantFormateada = "";
            $decimales = "00";
            $unidades = "";
            $factor = "";

            $pos = strripos($valor, ".");
            
            if($pos > 0) {
                $valores = explode(".", $valor);
                $unidades  = $valores[0];
                $decimales = $valores[1];
            } else {
                $unidades  = $valor;
            }

            if($unidades < 0) {
                $factor = "-";
                $unidades *= -1;
            }
            
            while(strlen($unidades) > 3) {
                $cantFormateada = "." . substr($unidades, strlen($unidades) -3) . $cantFormateada;
                $unidades = substr($unidades, 0, strlen($unidades) - 3);
            }
            $cantFormateada = $unidades . $cantFormateada . "," . substr($decimales, 0, 2);

            return $factor . $cantFormateada;
        } else {
            return "0,00";
        }
    }
    
}
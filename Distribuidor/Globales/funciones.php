<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 24-11-2011                                        *
 * Desc : Funciones Globales                                *
 ************************************************************/
    function validaRut($r) {
        $r = explode("-", $r);
	$sub_rut = $r[0];
	$sub_dv  = $r[1];
	$x = 2;
	$s = 0;

	for($i = strlen($sub_rut) - 1; $i >= 0; $i--) {
            if($x > 7) $x=2;

            $s += $sub_rut[$i] * $x;
            $x++;
	}

	$dv = 11 - ($s % 11);

        if($dv == 10) $dv = 'K';
	else if($dv == 11) $dv = '0';

	if($dv == $sub_dv) return true;
	else return false;
    }
    
    function getCantEntera($valor) {
        if($valor != 0 && $valor != "") {
            $unidades = "";

            $valores = explode(".", $valor);
            $unidades  = $valores[0];

            return $unidades;
        } else return "0";
    }
    
    function getCantConPuntos($valor) {
        if($valor != 0 && $valor != "") {
            $cantFormateada = "";
            $unidades = "";
            $factor = "";

            $valores = explode(".", $valor);
            $unidades  = $valores[0];
            
            if($unidades < 0) {
                $factor = "-";
                $unidades *= -1;
            }

            while(strlen($unidades) > 3) {
                $cantFormateada = "." . substr($unidades, strlen($unidades) -3) . $cantFormateada;
                $unidades = substr($unidades, 0, strlen($unidades) - 3);
            }
            $cantFormateada = $unidades . $cantFormateada;

            return $factor . $cantFormateada;
        } else return "0";
    }
    
    function getCantConPuntosYDecimales($valor) {
        if($valor != 0 && $valor != "") {
            $cantFormateada = "";
            $decimales = "000";
            $unidades = "";
            $factor = "";

            $pos = strripos($valor, ".");
            
            if($pos > 0) {
                $valores = explode(".", $valor);
                $unidades  = $valores[0];
                $decimales = $valores[1];
            } else {
                $unidades  = $valor;
                $decimales = "00";
            }

            if($unidades < 0) {
                $factor = "-";
                $unidades *= -1;
            }
            
            while(strlen($unidades) > 3) {
                $cantFormateada = "." . substr($unidades, strlen($unidades) -3) . $cantFormateada;
                $unidades = substr($unidades, 0, strlen($unidades) - 3);
            }
            $cantFormateada = $unidades . $cantFormateada . "," . substr($decimales, 0, 3);

            return $factor . $cantFormateada;
        } else return "0.00";
    }
    
    function getFormatoDinero($valor) {
        if($valor != 0 && $valor != "") {
            $dineroFormateado = "";
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
                $decimales = "00";
            }

            if($unidades < 0) {
                $factor = "-";
                $unidades *= -1;
            }
            
            while(strlen($unidades) > 3) {
                $dineroFormateado = "." . substr($unidades, strlen($unidades) -3) . $dineroFormateado;
                $unidades = substr($unidades, 0, strlen($unidades) - 3);
            }
            $dineroFormateado = "$ " . $unidades . $dineroFormateado . "," . substr($decimales, 0, 2);

            return $factor . " " . $dineroFormateado;
        } else return "$ 0,00";
    }

    function getFormatoDineroEntero($valor) {
        if($valor != 0 && $valor != "") {
            $dineroFormateado = "";
            $unidades = "";
            $factor = "";

            $valores = explode(".", $valor);
            $unidades  = $valores[0];
            
            if($unidades < 0) {
                $factor = "-";
                $unidades *= -1;
            }
            
            while(strlen($unidades) > 3) {
                $dineroFormateado = "." . substr($unidades, strlen($unidades) -3) . $dineroFormateado;
                $unidades = substr($unidades, 0, strlen($unidades) - 3);
            }
            $dineroFormateado = "$ " . $unidades . $dineroFormateado;

            return $factor . " " . $dineroFormateado;
        } else return "$ 0";
    }
    
    function utf8ize($d) {
        if (is_array($d)) {
            foreach ($d as $k => $v) {
                $d[$k] = utf8ize($v);
            }
        } else if (is_string ($d)) {
            return utf8_encode($d);
        }
        return $d;
    }
?>

<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 23-09-2011                                        *
 * Desc : Clase que controla todos los pedidos a servidor y *
 *        sus respectivas paginas, estilos y js.            *
 ************************************************************/

class Fecha {
    
    function getNomMesAbrev($numMes) {
        $nomMes = "";
        
        if($numMes == 1)       $nomMes = "Ene";
        else if($numMes == 2)  $nomMes = "Feb";
        else if($numMes == 3)  $nomMes = "Mar";
        else if($numMes == 4)  $nomMes = "Abr";
        else if($numMes == 5)  $nomMes = "May";
        else if($numMes == 6)  $nomMes = "Jun";
        else if($numMes == 7)  $nomMes = "Jul";
        else if($numMes == 8)  $nomMes = "Ago";
        else if($numMes == 9)  $nomMes = "Sep";
        else if($numMes == 10) $nomMes = "Oct";
        else if($numMes == 11) $nomMes = "Nov";
        else if($numMes == 12) $nomMes = "Dic";
        
        return $nomMes;
    }
    
    function getNomMes($numMes) {
        $nomMes = "";
        
        if($numMes == 1)       $nomMes = "Enero";
        else if($numMes == 2)  $nomMes = "Febrero";
        else if($numMes == 3)  $nomMes = "Marzo";
        else if($numMes == 4)  $nomMes = "Abril";
        else if($numMes == 5)  $nomMes = "Mayo";
        else if($numMes == 6)  $nomMes = "Junio";
        else if($numMes == 7)  $nomMes = "Julio";
        else if($numMes == 8)  $nomMes = "Agosto";
        else if($numMes == 9)  $nomMes = "Septiembre";
        else if($numMes == 10) $nomMes = "Octubre";
        else if($numMes == 11) $nomMes = "Noviembre";
        else if($numMes == 12) $nomMes = "Diciembre";
        
        return $nomMes;
    }
    
    function getFormatoFecha($fechaIn) {
        if($fechaIn != "") {
            $fechaOut = explode("-", $fechaIn);
            $dia = explode(" ", $fechaOut[2]);
            return $dia[0] . " " . $this->getNomMesAbrev($fechaOut[1]) . " " . $fechaOut[0];
        } else return "";
    }
    
    function getListaMeses() {
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
}

?>

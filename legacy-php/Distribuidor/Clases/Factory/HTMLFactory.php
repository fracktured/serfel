<?php

/**
 * Description of HTMLFactory
 *
 * @author ccastro
 */
class HTMLFactory {
    
    public function generarSelect($listSelectItem, $cNombre, $cValor = "", $class = "") {
        $cSelected = "";
        
        $cHTML = "<select id=\"" . $cNombre . "\" name=\"" . $cNombre . "\"";
        if ($class != "") {
            $cHTML .= " class=\"" . $class . "\"";
        }
        $cHTML .= ">";
        foreach($listSelectItem as $oSelectItem) {
            if($oSelectItem->key == $cValor) {
                $cSelected = "selected='selected'";
            } else {
                $cSelected = "";
            }
            
            $cHTML .= "<option value=\"" . $oSelectItem->key . "\" $cSelected>" . $oSelectItem->value . "</option>";
        }
        $cHTML .= "</select>";
        
        echo $cHTML;
    }
    
}

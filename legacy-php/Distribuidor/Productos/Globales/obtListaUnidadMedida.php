<?php
include("../../Coneccion/coneccion.php");
include("../../Clases/Lista.php");

    $lista = new Lista();
    $listaUM = $lista->getListaUnidadMedida("../../");
    
    $i = 0;
    while($i <= $lista->getTotalRegistros()) {
        $json[$i]["id_UM"]   = $listaUM[$i]->getId_UM();
        $json[$i]["nom_UM"]  = $listaUM[$i]->getNom_UM();
        $json[$i]["desc_UM"] = $listaUM[$i]->getDesc_UM();
        $i++;
    }
    
    echo json_encode($json);
?>

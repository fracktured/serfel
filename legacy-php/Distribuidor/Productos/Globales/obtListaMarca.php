<?php
include("../../Coneccion/coneccion.php");
include("../../Clases/Lista.php");

    $lista = new Lista();
    $listaMarcas = $lista->getListaMarca("../../");
    
    $i = 0;
    while($i <= $lista->getTotalRegistros()) {
        $json[$i]["id_marca"]   = $listaMarcas[$i]->getId_marca();
        $json[$i]["nom_marca"]  = $listaMarcas[$i]->getNom_marca();
        $json[$i]["desc_marca"] = $listaMarcas[$i]->getDesc_marca();
        $i++;
    }
    
    echo json_encode($json);
?>

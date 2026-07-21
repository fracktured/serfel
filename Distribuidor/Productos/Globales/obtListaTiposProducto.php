<?php
include("../../Coneccion/coneccion.php");
include("../../Clases/Lista.php");

    if(isset($_POST["familiaPadre"]) && isset($_POST["soloPadre"])) {
        $lista = new Lista();
        $listaTiposProd = $lista->getListaTipoProducto("../../", $_POST["familiaPadre"], $_POST["soloPadre"]);
        
        $i = 0;
        $json = [];
        while($i <= $lista->getTotalRegistros()) {
            $json[$i]["id_tipo_producto"]   = $listaTiposProd[$i]->getId_tipo_producto();
            $json[$i]["nom_tipo_producto"]  = $listaTiposProd[$i]->getNom_tipo_producto();
            $json[$i]["desc_tipo_producto"] = $listaTiposProd[$i]->getDesc_tipo_producto();
            $i++;
        }

        echo json_encode($json);
    }
?>
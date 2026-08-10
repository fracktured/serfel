<?php
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Lista.php");

    session_start();

    if(isset($_POST["idBodega"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $lista = new Lista();
        $listaNivelesStock = $lista->getListaNivelesStock("../../", $_POST["idBodega"]);

        $i = 0;
        $json = [];
        while($i <= $lista->getTotalRegistros()) {
            $json[$i]["id_producto"]       = $listaNivelesStock[$i]->getIdProducto();
            $json[$i]["nom_producto"]      = $listaNivelesStock[$i]->getNomProducto();
            $json[$i]["nom_familia"]       = $listaNivelesStock[$i]->getNomTipoProducto();
            $json[$i]["nom_UM"]            = $listaNivelesStock[$i]->getNomUM();
            $json[$i]["minimo"]            = $listaNivelesStock[$i]->getMinimo();
            $json[$i]["punto_orden"]       = $listaNivelesStock[$i]->getPuntoOrden();
            $json[$i]["meses"]             = $listaNivelesStock[$i]->getMeses();
            $i++;
        }
        
        echo json_encode($json);
    }
?>
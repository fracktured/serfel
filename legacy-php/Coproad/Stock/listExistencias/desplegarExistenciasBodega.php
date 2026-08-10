<?php
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Lista.php");

    session_start();

    if(isset($_POST["idBodega"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $lista = new Lista();
        $listaExistencias = $lista->getListaExistenciasPorBodega("../../", $_POST["idBodega"]);

        $i = 0;
        $json = [];
        while($i <= $lista->getTotalRegistros()) {
            $json[$i]["id_bodega"]  = $listaExistencias[$i]->getIdBodega();
            $json[$i]["nom_bodega"] = $listaExistencias[$i]->getNomBodega();
            $json[$i]["cantidad"]   = $listaExistencias[$i]->getCantidad();
            $json[$i]["costo_prom"] = $listaExistencias[$i]->getCostoProm();
            $i++;
        }
        
        echo json_encode($json);
    }
?>
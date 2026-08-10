<?php
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Lista.php");

    session_start();

    if(isset($_POST["idBodega"]) && isset($_POST["idFamilia"]) && isset($_POST["nivel"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $lista = new Lista();
        $listaExistencias = $lista->getListaExistenciasPorBodegaFamilia("../../", $_POST["idBodega"], $_POST["idFamilia"], 
                                                                        $_POST["nivel"]);

        $i = 0;
        $json = [];
        while($i <= $lista->getTotalRegistros()) {
            $json[$i]["id_bodega"]     = $listaExistencias[$i]->getIdBodega();
            $json[$i]["id_tipo_prod"]  = $listaExistencias[$i]->getIdTipoProducto();
            $json[$i]["nom_tipo_prod"] = $listaExistencias[$i]->getNomTipoProducto();
            $json[$i]["cantidad"]      = $listaExistencias[$i]->getCantidad();
            $json[$i]["costo_prom"]    = $listaExistencias[$i]->getCostoProm();
            $i++;
        }
        
        echo json_encode($json);
    }
?>
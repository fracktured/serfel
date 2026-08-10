<?php
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Lista.php");

    session_start();

    if(isset($_POST["idBodega"]) && isset($_POST["idFamilia"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $lista = new Lista();
        $listaExistencias = $lista->getListaExistenciasPorBodegaFamiliaProducto("../../", $_POST["idBodega"], $_POST["idFamilia"]);

        $i = 0;
        $json = [];
        while($i <= $lista->getTotalRegistros()) {
            $json[$i]["id_producto"]       = $listaExistencias[$i]->getIdProducto();
            $json[$i]["nom_producto"]      = $listaExistencias[$i]->getNomProducto();
            $json[$i]["nom_UM"]            = $listaExistencias[$i]->getNomUM();
            $json[$i]["costo_prom_unidad"] = $listaExistencias[$i]->getCostoProm();
            $json[$i]["cantidad"]          = $listaExistencias[$i]->getCantidad();
            $json[$i]["color"]             = $listaExistencias[$i]->getColor();
            $json[$i]["costo_prom_total"]  = $listaExistencias[$i]->getCostoPromTotal();
            $json[$i]["ultima_compra"]     = $listaExistencias[$i]->getUltimaCompra();
            $i++;
        }
        
        echo json_encode($json);
    }
?>
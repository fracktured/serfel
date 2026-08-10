<?php
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Lista.php");
include("../../Clases/Fecha.php");

    session_start();
    
    $fecha = new Fecha();

    if(isset($_POST["idBodega"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $lista = new Lista();
        $listaMermas = $lista->getListaMermas("../../", $_POST["idBodega"]);

        $i = 0;
        $json = [];
        while($i <= $lista->getTotalRegistros()) {
            $json[$i]["id_producto"]  = $listaMermas[$i]->getIdProducto();
            $json[$i]["nom_producto"] = $listaMermas[$i]->getNomProducto();
            $json[$i]["nom_familia"]  = $listaMermas[$i]->getNomTipoProducto();
            $json[$i]["nom_UM"]       = $listaMermas[$i]->getNomUM();
            $json[$i]["cantidad"]     = $listaMermas[$i]->getCantidad();
            $json[$i]["motivo"]       = $listaMermas[$i]->getMotivoMerma();
            $json[$i]["fecha"]        = $listaMermas[$i]->getFechaMerma();
            $json[$i]["fecha_form"]   = $fecha->getFormatoFecha($listaMermas[$i]->getFechaMerma());
            $i++;
        }
        
        echo json_encode($json);
    }
?>
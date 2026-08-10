<?php
include("../../Coneccion/coneccion.php");
include("../../Clases/Lista.php");

$lista = new Lista();
$listaMarcas = $lista->getListaProductosRecepcion("../../", $_POST["idRecepcion"]);

$i = 0;
while ($i <= $lista->getTotalRegistros()) {
    $json[$i]["idProducto"] = $listaMarcas[$i]->getIdProducto();
    $json[$i]["nomProducto"] = $listaMarcas[$i]->getNomProducto();
    $json[$i]["NomUM"] = $listaMarcas[$i]->getNomUM();
    $json[$i]["Cantidad"] = $listaMarcas[$i]->getCantidad();
    $json[$i]["Valor"] = $listaMarcas[$i]->getValor();
    $json[$i]["nomMarca"] = $listaMarcas[$i]->getNomMarca();
    $i++;
}

echo json_encode($json);
?>
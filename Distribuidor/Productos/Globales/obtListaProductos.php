<?php
include("../../Coneccion/coneccion.php");
include("../../Clases/Lista.php");
require_once '../../Globales/funciones.php';

    if(isset($_POST["filtro"])) $filtro = $_POST["filtro"];
    else $filtro = "";
    
    if(isset($_POST["id"])) $id = $_POST["id"];
    else $id = "";
        
    $lista = new Lista();
    $listaProductos = $lista->getListaProductos("../../", $filtro, $id);
    
    $i = 0;
    $json = [];
    while($i <= $lista->getTotalRegistros()) {
        $json[$i]["id_producto"]         = $listaProductos[$i]->getIdProducto();
        $json[$i]["cod_serfel"]          = $listaProductos[$i]->getCodSerfel();
        $json[$i]["nom_producto"]        = $listaProductos[$i]->getNomProducto();
        $json[$i]["nom_marca"]           = $listaProductos[$i]->getNomMarca();
        $json[$i]["nom_UM"]              = $listaProductos[$i]->getNomUM();
        $json[$i]["nom_tipo_prod_padre"] = $listaProductos[$i]->getTipoProducto()->getNombreFamilia();
        $json[$i]["nom_tipo_prod"]       = $listaProductos[$i]->getTipoProducto()->getNom_tipo_producto();
        $json[$i]["cantidad"]            = getCantConPuntosYDecimales($listaProductos[$i]->cantidad);
        $i++;
    }
    
    echo json_encode(utf8ize($json));
?>

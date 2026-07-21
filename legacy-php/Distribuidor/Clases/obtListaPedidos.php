<?php
//error_reporting(E_ALL);
//ini_set('display_errors', '1');
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Lista.php");
include("../../Globales/funciones.php");

    $lista = new Lista();
    $listaPedidos = $lista->getListaPedidos("../../");
    
    $json = "";
    
    $i = 0;
    while($i <= $lista->getTotalRegistros()) {
        $json[$i]["id_pedido"]         = $listaPedidos[$i]->getIdPedido();
        $json[$i]["rut_cliente"]       = $listaPedidos[$i]->getLocalCliente()->getRutCompleto();
        $json[$i]["nom_fantasia"]      = $listaPedidos[$i]->getLocalCliente()->getNomFantasia();
        $json[$i]["nom_local_cliente"] = $listaPedidos[$i]->getLocalCliente()->getNomLocalCliente();
        $json[$i]["nom_contacto"]      = $listaPedidos[$i]->getLocalCliente()->getNomCompletoContacto();
        $json[$i]["nom_usuario"]       = $listaPedidos[$i]->getVendedor()->getNomCompleto();
        $json[$i]["precio_total"]      = getFormatoDineroEntero($listaPedidos[$i]->getPrecioTotal());
        $json[$i]["fechaPedido"]       = $listaPedidos[$i]->getFechaPedido();
        
        $i++;
    }
    print_r($json);
    echo json_encode($json);
?>

<?php
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/ListaPrecio.php");
include("../../Globales/funciones.php");

    session_start();

    if(isset($_POST["idListaPrecio"]) && $_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $listaPrecio = new ListaPrecio();
        $listaPrecioProducto = $listaPrecio->getListaPrecioProductos("../../", $_POST["idListaPrecio"]);

        $i = 0;
        $json = [];
        while($i <= $listaPrecio->getTotalRegistros()) {
            $json[$i]["id_producto"]          = $listaPrecioProducto[$i]->getIdProducto();
            $json[$i]["cod_serfel"]           = $listaPrecioProducto[$i]->getCodSerfel();
            $json[$i]["nom_producto"]         = $listaPrecioProducto[$i]->getNomProducto();
            $json[$i]["costo_ult_compra"]     = $listaPrecioProducto[$i]->getCostoProm();
            $json[$i]["str_costo_ult_compra"] = getFormatoDineroEntero($listaPrecioProducto[$i]->getCostoProm());
            $json[$i]["precio_venta"]         = $listaPrecioProducto[$i]->getPrecioVenta();
            $json[$i]["str_precio_venta"]     = getFormatoDineroEntero($listaPrecioProducto[$i]->getPrecioVenta());
            $json[$i]["porc_desc"]            = $listaPrecioProducto[$i]->getPorcenDesc();
            $json[$i]["str_porc_desc"]        = $listaPrecioProducto[$i]->getPorcenDesc() . "%";
            $json[$i]["str_precio_neto"]      = getFormatoDineroEntero($listaPrecioProducto[$i]->getPrecioNeto());
            $json[$i]["str_precio_base"]      = getFormatoDineroEntero($listaPrecioProducto[$i]->getPrecioBase());
            $json[$i]["str_margen_utilidad"]  = $listaPrecioProducto[$i]->getMargenUtilidad() . "%";

            $json[$i]["cant_tramo1"] = $listaPrecioProducto[$i]->cant_tramo1;
            $json[$i]["cant_tramo2"] = $listaPrecioProducto[$i]->cant_tramo2;
            $json[$i]["cant_tramo3"] = $listaPrecioProducto[$i]->cant_tramo3;
            $json[$i]["max_porcen_tramo1"] = $listaPrecioProducto[$i]->max_porcen_tramo1;
            $json[$i]["max_porcen_tramo2"] = $listaPrecioProducto[$i]->max_porcen_tramo2;
            $json[$i]["max_porcen_tramo3"] = $listaPrecioProducto[$i]->max_porcen_tramo3;
                    
            if($json[$i]["costo_ult_compra"] >= $json[$i]["precio_venta"]) $json[$i]["color"] = "background-color: #FE724C;";
            else $json[$i]["color"] = "";
            $i++;
        }
        
        echo json_encode(utf8ize($json));
    }
?>
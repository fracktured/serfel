<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Usuario *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/LocalCliente.php");
include("../../Clases/PrecioProducto.php");
include("../../Clases/Pedido.php");
include("../../Globales/funciones.php");

    if(isset($_POST["idPedido"])) {
        $pedido = new Pedido("../../", $_POST["idPedido"]);

        $json["idPedido"]           = $pedido->getIdPedido();
        $json["nomVendedor"]        = $pedido->getVendedor()->getNomCompleto();
        $json["rutCompletoCliente"] = $pedido->getLocalCliente()->getRutCompleto();
        $json["nomFantasia"]        = $pedido->getLocalCliente()->getNomFantasia();
        $json["nomLocalCliente"]    = $pedido->getLocalCliente()->getNomLocalCliente();
        $json["dirLocalCliente"]    = $pedido->getLocalCliente()->getDireccionLocalCliente();
        $json["topeVenta"]          = $pedido->getLocalCliente()->getTopeVenta();
        $json["topeCredito"]        = $pedido->getLocalCliente()->getTopeCredito();
        $json["idFormaPago"]        = $pedido->getIdFormaPago();
        $json["precioTotal"]        = $pedido->getPrecioTotal();
        $json["fechaPedido"]        = $pedido->getFechaPedido();
        
        require_once __DIR__ . '/../../Clases/Conexion/Conexion.php';
        require_once __DIR__ . '/../../Clases/Constantes/ImpuestoCONST.php';
        require_once __DIR__ . '/../../Clases/DAO/ImpuestoDAO.php';
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oImpuestoDAO = new ImpuestoDAO("../../");
        $oIva = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::IVA);
        
        
        $productos = $pedido->getProductos();
        $i = 0;
        while($i <= $pedido->getTotalProductos()) {
            $json["productos"][$i]["idProducto"]       = $productos[$i]->getIdProducto();
            $json["productos"][$i]["codSerfel"]        = $productos[$i]->getCodSerfel();
            $json["productos"][$i]["nomProd"]          = $productos[$i]->getNomProducto();
            $json["productos"][$i]["nomMarca"]         = $productos[$i]->getNomMarca();
            $json["productos"][$i]["nomUM"]            = $productos[$i]->getNomUM();
            $json["productos"][$i]["cantidad"]         = $productos[$i]->getCantidad();
            //$json["productos"][$i]["preciobase"]     = $productos[$i]->getPrecioBase();
            $json["productos"][$i]["cantidadStock"]    = $productos[$i]->getCantidadStock();
            $json["productos"][$i]["txtCantStock"]     = getCantConPuntosYDecimales($productos[$i]->getCantidadStock());
            $json["productos"][$i]["precioNetoEntero"] = $productos[$i]->getPrecioNeto();
            $json["productos"][$i]["precioNeto"]       = getFormatoDineroEntero($productos[$i]->getPrecioNeto());
            $json["productos"][$i]["precioEntero"]     = $productos[$i]->getPrecioBase();
            $json["productos"][$i]["precioVenta"]      = getFormatoDineroEntero($productos[$i]->getPrecioVenta());
            $json["productos"][$i]["porcenDesc"]       = $productos[$i]->getPorcenDesc();
            $json["productos"][$i]["cantDisponible"]   = $productos[$i]->getCantidadDisponible();
            $json["productos"][$i]["txtCantDisponible"] = getCantConPuntosYDecimales($productos[$i]->getCantidadDisponible());
            $json["productos"][$i]["iaba"]             = $productos[$i]->getImpIaba();
            $json["productos"][$i]["espec"]            = $productos[$i]->getImpEspec();
            $json["productos"][$i]["iva"]              = $productos[$i]->getIva();
            
            $json["productos"][$i]["iIla"] = 0;
            $json["productos"][$i]["iEspec"] = 0;
            $json["productos"][$i]["iIva"] = $oIva->valor;
            
            if($productos[$i]->getImpuesto() == ImpuestoCONST::ESPEC) {
                $oEspec = $oImpuestoDAO->obtImpuesto($oPDO, $productos[$i]->getImpuesto());
                $json["productos"][$i]["iEspec"] = $oEspec->valor;
            } else if($productos[$i]->getImpuesto() > 0) {
                $oIla = $oImpuestoDAO->obtImpuesto($oPDO, $productos[$i]->getImpuesto());
                $json["productos"][$i]["iIla"] = $oIla->valor;
            }
        
            $i++;
        }

        echo json_encode(utf8ize($json));
    }
?>

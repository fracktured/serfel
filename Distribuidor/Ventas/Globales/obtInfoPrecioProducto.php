<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Usuario *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/TipoProducto.php");
include("../../Clases/PrecioProducto.php");
include("../../Globales/funciones.php");

    if(isset($_POST["idListaPrecio"]) && isset($_POST["idProducto"])) {
        if(isset($_POST["tipoId"])) $tipoId = $_POST["tipoId"];
        else $tipoId = "idProducto";
        
        $precioProducto = new PrecioProducto("../../", $_POST["idListaPrecio"], $_POST["idProducto"], $tipoId);

        $json["idProducto"]       = $precioProducto->getIdProducto();
        $json["codSerfel"]        = $precioProducto->getCodSerfel();
        $json["nomProd"]          = $precioProducto->getNomProducto();
        $json["nomMarca"]         = $precioProducto->getNomMarca();
        $json["nomUM"]            = $precioProducto->getNomUM();
        $json["cantidadStock"]    = $precioProducto->getCantidadStock();
        $json["txtCantStock"]     = getCantConPuntosYDecimales($precioProducto->getCantidadStock());
        $json["cantDisponible"]   = $precioProducto->getCantidadDisponible();
        $json["txtCantDisponible"] = getCantConPuntosYDecimales($precioProducto->getCantidadDisponible());
        $json["precioNetoEntero"] = $precioProducto->getPrecioNeto();
        $json["precioNeto"]       = getFormatoDineroEntero($precioProducto->getPrecioNeto());
        $json["precioEntero"]     = $precioProducto->getPrecioVenta();
        $json["precioVenta"]      = getFormatoDineroEntero($precioProducto->getPrecioVenta());
        $json["porcenDesc"]       = $precioProducto->getPorcenDesc();
        $json["iaba"]             = $precioProducto->getImpIaba();
        $json["espec"]            = $precioProducto->getImpEspec();
        $json["iva"]              = $precioProducto->getIva();
        
        require_once __DIR__ . '/../../Clases/Conexion/Conexion.php';
        require_once __DIR__ . '/../../Clases/Constantes/ImpuestoCONST.php';
        require_once __DIR__ . '/../../Clases/DAO/ImpuestoDAO.php';
        
        $oConexion = new Conexion();
        $oPDO = $oConexion->abrirConexion();
        
        $oImpuestoDAO = new ImpuestoDAO("../../");
        $oIva = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::IVA);
        
        $json["iIla"] = 0;
        $json["iEspec"] = 0;
        $json["iIva"] = $oIva->valor;
        
        if($precioProducto->getImpIaba() > 0) {
            $oIla = $oImpuestoDAO->obtImpuesto($oPDO, $precioProducto->getImpuesto());
            $json["iIla"] = $oIla->valor;
        }
        
        if($precioProducto->getImpEspec() > 0) {
            $oEspec = $oImpuestoDAO->obtImpuesto($oPDO, $precioProducto->getImpuesto());
            $json["iEspec"] = $oEspec->valor;
        }

        echo json_encode($json);
    }
?>

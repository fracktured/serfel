<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Validación de ingreso de locales de clientes      *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Venta.php");
require_once __DIR__.'/../../Clases/Constantes/UsuarioCONST.php';

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == UsuarioCONST::ADMINISTRADOR
            || $_SESSION["usuario"]->getIdTipoUsuario() == UsuarioCONST::SECRETARIO) {
        $idVenta        = $_POST["idVenta"];
        $rutEmpresa     = $_POST["rutEmpresa"];
        $numNotaCredito = $_POST["numNotaCredito"];
        $idMotivo       = $_POST["idMotivo"];
        $producto       = $_POST["producto"];
        $cantidad       = $_POST["cantidad"];
        $descuento      = $_POST["descuento"];
        $precio         = $_POST["precio"];
        $iva            = $_POST["iva"];
        $iaba           = $_POST["iaba"];
        $espec          = $_POST["espec"];
        $subTotal       = $_POST["subTotal"];
        $precioTotal    = $_POST["precioTotal"];
        $cantProd       = $_POST["cantProd"];
        //echo $rutEmpresa . " - " . $idVendedor . " - " . $numDoctoEmit . " - " . $idLocalCliente . " - " . $idFormaPago . " - " . $cantProd;
        
        $arrayFecha = explode("/", $_POST["fechaNota"]);
        $fechaNota = $arrayFecha[2] . "-" . $arrayFecha[1] . "-" . $arrayFecha[0];

        if($numNotaCredito == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "numDocto";
        } else {
            $venta = new Venta("../../");
            require_once __DIR__.'/../../Clases/Conexion/Conexion.php';
            require_once __DIR__.'/../../Clases/Constantes/ImpuestoCONST.php';
            require_once __DIR__.'/../../Clases/DAO/ImpuestoDAO.php';
            
            $oConexion = new Conexion();
            $oPDO = $oConexion->abrirConexion();
            
            $oImpuestoDAO = new ImpuestoDAO("../../");
            $oImpIVA = $oImpuestoDAO->obtImpuesto($oPDO, ImpuestoCONST::IVA);

            $iva = round($subTotal * $oImpIVA->valor / 100);
            $precioTotal = $iva + $iaba + $espec + $subTotal;
            $json["resultado"] = $venta->ingNotaCredito($idVenta, $rutEmpresa, $numNotaCredito, $idMotivo, $producto, 
                                                        $cantidad, $descuento, $precio, $iva, $iaba, $espec, $subTotal, 
                                                        $precioTotal, $cantProd, $fechaNota, $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>
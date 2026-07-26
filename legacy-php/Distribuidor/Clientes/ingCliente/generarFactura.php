<?php
    include_once("../../Reporte/class/tcpdf/tcpdf.php");
    include_once("../../Reporte/class/PHPJasperXML.inc.php");
    include_once("../../Clases/Venta.php");
    include_once("../../Coneccion/coneccion.php");
    include_once("../../Clases/Usuario.php");
    include_once("../../Clases/Fecha.php");

    $xml = simplexml_load_file("Factura.jrxml");

    $PHPJasperXML = new PHPJasperXML();
    //$PHPJasperXML->debugsql=true;
    
    $fecha = new Fecha();
    $venta = new Venta("../../", $_GET["numFactura"], $_GET["rutEmpresa"]);
    
    $iva = $venta->getIva();
    //$subTotal = number_format($venta->getTotal() / (1 + ($iva / 100)), 0);
    //$ivaTotal = number_format(($venta->getTotal() * $iva) / 100, 0);
    
    //$usuario = new Usuario(4);
    
    //echo $usuario->getApellMatUsuario() . "<br />";
    //echo $usuario->getApellPatUsuario() . "<br />";
    
    $PHPJasperXML->arrayParameter=array("numFactura"=>$venta->getNumDoctoEmitido(), "fecha_dd"=>$venta->getDiaVenta(),
                                        "fecha_mes"=>$fecha->getNomMes($venta->getMesVenta()), "fecha_yy"=>$venta->getAnoVenta(),
                                        "rutCliente"=>$venta->getLocalCliente()->getRutCompleto(), 
                                        "comuna"=>$venta->getLocalCliente()->getComuna(), 
                                        "vendedor"=>$venta->getVendedor()->getNumUsuario(),
                                        "condicionVenta"=>$venta->getLocalCliente()->getNomFormaPago(),
                                        "senores"=>$venta->getLocalCliente()->getRazonSocial(),
                                        "direccion"=>$venta->getLocalCliente()->getDireccionLocalCliente(),
                                        "subTotal"=>$venta->getSubTotal(), "total"=>$venta->getTotal(), 
                                        "ivaPorcentaje"=>$iva, "ivaTotal"=>$venta->getIvaVenta(), 
                                        "iabaPorcentaje"=>$venta->getIaba(), "iabaTotal"=>$venta->getIabaVenta(), 
                                        "especPorcentaje"=>$venta->getImpEspec(), "especTotal"=>$venta->getEspecVenta(),
                                        "nomFormaPago"=>$venta->getNomFormaPago(), 
                                        "giro"=>$venta->getLocalCliente()->getGiro(), "idVenta"=>$venta->getIdVenta());

    $PHPJasperXML->xml_dismantle($xml);

    $PHPJasperXML->transferDBtoArray(getHostBD(), getUsuarioBD(), getPassBD(), getNomBD());
    $PHPJasperXML->outpage("I");    //page output method I:standard output  D:Download file
?>
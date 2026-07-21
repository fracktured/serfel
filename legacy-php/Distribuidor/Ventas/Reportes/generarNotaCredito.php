<?php
    include_once("../../Reporte/class/tcpdf/tcpdf.php");
    include_once("../../Reporte/class/PHPJasperXML.inc.php");
    include_once("../../Clases/Venta.php");
    include_once("../../Clases/NotaCredito.php");
    include_once("../../Coneccion/coneccion.php");
    include_once("../../Clases/Usuario.php");
    include_once("../../Clases/Fecha.php");

    $xml = simplexml_load_file("NotaCredito.jrxml");

    $PHPJasperXML = new PHPJasperXML();
    //$PHPJasperXML->debugsql=true;
    
    $fecha = new Fecha();
    $venta = new Venta("../../");
    $notaCredito = new NotaCredito("../../", $_GET["numNotaCredito"], $_GET["rutEmpresa"]);
    
    $iva = $venta->getIva();
    $numFactura = "EV AFCT " . $notaCredito->getNumFactura();
    //$subTotal = number_format($venta->getTotal() / (1 + ($iva / 100)), 0);
    //$ivaTotal = number_format(($venta->getTotal() * $iva) / 100, 0);

    $PHPJasperXML->arrayParameter=array("numFactura"=>$numFactura, "fecha_dd"=>$notaCredito->getDiaVenta(),
                                        "fecha_mes"=>$fecha->getNomMes($notaCredito->getMesVenta()), "fecha_yy"=>$notaCredito->getAnoVenta(),
                                        "rutCliente"=>$notaCredito->getLocalCliente()->getRutCompleto(), 
                                        "comuna"=>$notaCredito->getLocalCliente()->getComuna(), 
                                        "vendedor"=>$notaCredito->getVendedor()->getNomCompleto(),
                                        "condicionVenta"=>$notaCredito->getLocalCliente()->getNomFormaPago(),
                                        "senores"=>$notaCredito->getLocalCliente()->getRazonSocial(),
                                        "direccion"=>$notaCredito->getLocalCliente()->getDireccionCliente(),
                                        "subTotal"=>$notaCredito->getSubTotal(), "total"=>$notaCredito->getTotal(), 
                                        "ivaPorcentaje"=>$iva, "ivaTotal"=>$notaCredito->getIvaVenta(), 
                                        "iabaPorcentaje"=>$venta->getIaba(), "iabaTotal"=>$notaCredito->getIabaVenta(), 
                                        "especPorcentaje"=>$venta->getImpEspec(), "especTotal"=>$notaCredito->getEspecVenta(),
                                        "nomFormaPago"=>$notaCredito->getNomFormaPago(), "motivo"=>$notaCredito->getMotivo(),
                                        "numNotaCredito"=>$notaCredito->getNumNotaCredito(), 
                                        "giro"=>$notaCredito->getLocalCliente()->getGiro(), "idNotaCredito"=>$notaCredito->getIdNotaCredito());

    $PHPJasperXML->xml_dismantle($xml);

    $PHPJasperXML->transferDBtoArray("localhost", getUsuarioBD(), getPassBD(), getNomBD());
    $PHPJasperXML->outpage("I");    //page output method I:standard output  D:Download file
?>
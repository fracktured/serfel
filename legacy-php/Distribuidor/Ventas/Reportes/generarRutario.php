<?php
    include_once("../../Reporte/class/tcpdf/tcpdf.php");
    include_once("../../Reporte/class/PHPJasperXML.inc.php");
    include_once("../../Coneccion/coneccion.php");
    include_once("../../Clases/Usuario.php");
    include_once("../../Clases/Ruta.php");
    include_once("../../Globales/funciones.php");

    if(isset($_GET["idRuta"])) {
        $ruta = new Ruta("../../", $_GET["idRuta"]);
        $ruta->setTotalesListadoCarga();
        
        $xml = simplexml_load_file("Rutario.jrxml");
            
        $PHPJasperXML = new PHPJasperXML();
        //$PHPJasperXML->debugsql=true;
        //echo $ruta->getNomRuta();
        
        $PHPJasperXML->arrayParameter=array("idRuta"=>$ruta->getIdRuta(), "nomRuta"=>$ruta->getNomRuta(), "fechaInforme"=>date('d-m-Y'), "txtPagina"=>"Página",
                                            "numFacturas"=>$ruta->getNumFacturas(), "total"=>getFormatoDineroEntero($ruta->getTotal()));
        
        $PHPJasperXML->xml_dismantle($xml);

        $PHPJasperXML->transferDBtoArray(getHostBD(), getUsuarioBD(), getPassBD(), getNomBD());
        $PHPJasperXML->outpage("I");    //page output method I:standard output  D:Download file
    }
?>
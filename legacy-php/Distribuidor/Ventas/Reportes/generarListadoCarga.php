<?php
    include_once("../../Reporte/class/tcpdf/tcpdf.php");
    include_once("../../Reporte/class/PHPJasperXML.inc.php");
    include_once("../../Coneccion/coneccion.php");
    include_once("../../Clases/Usuario.php");
    include_once("../../Clases/Ruta.php");
    include_once("../../Globales/funciones.php");

    if(isset($_GET["rutas"])) {
        $rutas = $_GET["rutas"];
        $rutas = explode("-", $rutas);
        
        $i = 0;
        $idRutas = "";
        $nombres = "";
        $numFacturas = 0;
        $total = 0;
        while($i < $_GET["i"]) {
            $ruta = new Ruta("../../", $rutas[$i]);
            $ruta->setTotalesListadoCarga();
            
            if($i == 0) {
                $idRutas = $ruta->getIdRuta();
                $nombres = $ruta->getNomRuta();
            } else {
                $idRutas .= ", " . $ruta->getIdRuta();
                $nombres .= ", " . $ruta->getNomRuta();
            }
            
            $numFacturas += $ruta->getNumFacturas();
            $total += $ruta->getTotal();
            $i++;
        }
        
        $xml = simplexml_load_file("ListadoCarga.jrxml");
            
        $PHPJasperXML = new PHPJasperXML();
        //$PHPJasperXML->debugsql=true;
        //echo $ruta->getNomRuta();
        
        $PHPJasperXML->arrayParameter=array("idRuta"=>$idRutas, "nomRuta"=>$nombres, "fechaInforme"=>date('d-m-Y'), "txtPagina"=>"Página",
                                            "numFacturas"=>$numFacturas, "total"=>getFormatoDineroEntero($total));
        
        $PHPJasperXML->xml_dismantle($xml);

        $PHPJasperXML->transferDBtoArray("localhost", getUsuarioBD(), getPassBD(), getNomBD());
        $PHPJasperXML->outpage("I");    //page output method I:standard output  D:Download file
    }
?>
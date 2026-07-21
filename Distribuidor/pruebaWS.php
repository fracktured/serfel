<?php

require_once 'Clases/Negocio/XMLDTEEcertChileNEG.php';
require_once 'Clases/Negocio/XMLFacturaElectronicaNEG.php';
require_once 'Clases/Negocio/XMLNotaCreditoElectronicaNEG.php';

$numero = 53009;

$oFacElecNEG = new XMLFacturaElectronicaNEG("");
$oFacElecNEG->crearXMLFacturaElectronica($numero);

$xml = file_get_contents('/opt/lampp/htdocs/serfel/XML/Facturas/FacElec_'.$numero.'.xml');

$wsdl = 'http://ws.facturacion.cl/WSDS/wsplano.asmx?wsdl';
try {

    $client = new soapclient($wsdl);

    $params = array(
        'login' => array(
            'Usuario' => base64_encode("SERFEL")
            , 'Rut' => base64_encode("1-9")
            , 'Clave' => base64_encode("plano91098")
            , 'Puerto' => base64_encode("0")),
        'file' => base64_encode($xml),
        'formato' => "2");

    $response = $client->Procesar($params);

    //$respuesta = simplexml_load_string($response);
    //print_r($response);

    $xml = simplexml_load_string($response->ProcesarResult);

    //echo "<br/><br/><br/>";
    //print_r($xml);
    //echo "<br/><br/><br/>";

    echo "Resultado     : " . $xml->Resultado . "<br/>";
    echo "Mensaje       : " . $xml->Mensaje . "<br/>";
    echo "Folio         : " . $xml->Detalle->Documento->Folio . "<br/>";
    echo "TipoDte       : " . $xml->Detalle->Documento->TipoDte . "<br/>";
    echo "Operacion     : " . $xml->Detalle->Documento->Operacion . "<br/>";
    echo "Fecha         : " . $xml->Detalle->Documento->Fecha . "<br/>";
    echo "Resultado     : " . $xml->Detalle->Documento->Resultado . "<br/>";
    echo "Error         : " . $xml->Detalle->Documento->Error . "<br/>";
    
} catch (SoapFault $e) {
    echo 'Hubo un error';
}
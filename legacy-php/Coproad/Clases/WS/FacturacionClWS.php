<?php

/**
 * Description of FacturacionClWS
 *
 * @author ccastro
 */
class FacturacionClWS {
    
    const ID_IMP_HARINA = 19;
    const ID_IMP_BEBIDAS = 27;
    
    const C_TIPO_MOV_COMPRA = "C";
    const C_TIPO_MOV_VENTA  = "V";
    const C_TIPO_MOV_BOLETA = "B";

    private $cRutaRelativa = "";
    private $WSDL = "http://ws.facturacion.cl/WSDS/wsplano.asmx?wsdl";
    private $PUERTO = "0";
    
    //PRUEBA
    //private $RUT = "1-9";
    //private $CLAVE = "plano91098";
    
    private $FORMATO = "2";

    public function __construct() {
        //$this->cRutaRelativa = $cRutaRelativa;
        
        //require_once $this->cRutaRelativa . "Clases/WS/FacturacionClWSDTO.php";
        require_once __DIR__ . '/FacturacionClWSDTO.php';
        require_once __DIR__ . '/FacturacionClWSCredenciales.php';
    }

    
    /**
     * Llama al método Procesar del WS
     * 
     * @param String $cRutaNomXML
     * @return FacturacionClWSDTO
     */
    public function procesarDocumento($cRutCompleto, $cRutaNomXML) {
        $cXML = file_get_contents($cRutaNomXML);

        try {
            $client = new soapclient($this->WSDL);
            
            $oCredencial = FacturacionClWSCredenciales::create($cRutCompleto);
            $params = array(
                'login' => array(
                    'Usuario' => base64_encode($oCredencial->cUsuario)
                    , 'Rut' => base64_encode($cRutCompleto)
                    , 'Clave' => base64_encode($oCredencial->cClave)
                    , 'Puerto' => base64_encode($this->PUERTO)),
                'file' => base64_encode($cXML),
                'formato' => $this->FORMATO);
            //print_r($params);
            $response = $client->Procesar($params);

            $xml = simplexml_load_string($response->ProcesarResult);

            $facturacionClWSDTO = new FacturacionClWSDTO();
            
            $facturacionClWSDTO->bExito = $xml->Resultado;
            $facturacionClWSDTO->cMensaje = $xml->Mensaje;
            //print_r($xml);
            foreach($xml->Detalle->Documento->Error as $cError) {
                $facturacionClWSDTO->cError = $cError;
                break;
            }
            
            if($facturacionClWSDTO->cError == "") {
                $facturacionClWSDTO->cError = $xml->Detalle->Documento->Error;
            }
            //print_r($facturacionClWSDTO);
            return $facturacionClWSDTO;
        } catch (SoapFault $e) {

            $facturacionError = new FacturacionClWSDTO();

            $facturacionError->bExito = false;
            $facturacionError->cMensaje = "";
            $facturacionError->cError = "Error SoapFault " + $e->getMessage();
            echo $e->getMessage() . "<br />";
            return $facturacionError;
        }
    }
    
    
    /**
     * 
     * @param int $idFolio
     * @param String $cTipoMov
     * @return FacturacionClWSDTO
     */
    public function obtLinkDoctoElectronico($cRutCompleto, $idFolio, $cTipoMov, $idTipoDTE, $bCedible) {
        $cCedible = "False";
        if($bCedible) {
            $cCedible = "True";
        }
            
        try {
            $client = new soapclient($this->WSDL);

            $oCredencial = FacturacionClWSCredenciales::create($cRutCompleto);
            $params = array(
                'login' => array(
                    'Usuario' => base64_encode($oCredencial->cUsuario)
                    , 'Rut' => base64_encode($cRutCompleto)
                    , 'Clave' => base64_encode($oCredencial->cClave)
                    , 'Puerto' => base64_encode($this->PUERTO)),
                'tpomov' => base64_encode($cTipoMov),
                'folio' => base64_encode($idFolio),
                'tipo' => base64_encode($idTipoDTE),
                'cedible' => base64_encode($cCedible));

            $response = $client->ObtenerLink($params);
            
            $xml = simplexml_load_string($response->ObtenerLinkResult);

            $facturacionClWSDTO = new FacturacionClWSDTO();
            $facturacionClWSDTO->bExito = true;
            $facturacionClWSDTO->cMensaje = base64_decode($xml->Mensaje);

            return $facturacionClWSDTO;
        } catch (SoapFault $e) {
            $facturacionError = new FacturacionClWSDTO();

            $facturacionError->bExito = false;
            $facturacionError->cMensaje = "";
            $facturacionError->cError = "Error SoapFault: " + $e->getMessage();
            echo $e->getMessage() . "<br />";
            return $facturacionError;
        }
    }
    
    
    /**
     * Llama al método EliminarDoc del WS
     * 
     * @param string $cTipoMov
     * @param int $iNumFolio
     * @param int $iTipoDTE
     * @return FacturacionClWSDTO
     */
    public function eliminarDocumento($cRutComplero, $cTipoMov, $iNumFolio, $iTipoDTE) {
        $oDTO = new FacturacionClWSDTO();
            
        try {
            $oSoapClient = new soapclient($this->WSDL);

            $oCredencial = FacturacionClWSCredenciales::create($cRutComplero);
            $params = array(
                'login' => array(
                    'Usuario' => base64_encode($oCredencial->cUsuario)
                    , 'Rut' => base64_encode($cRutComplero)
                    , 'Clave' => base64_encode($oCredencial->cClave)
                    , 'Puerto' => base64_encode($this->PUERTO)),
                'tpomov' => base64_encode($cTipoMov),
                'folio' => base64_encode($iNumFolio),
                'tipo' => base64_encode($iTipoDTE));

            $oResponse = $oSoapClient->EliminarDoc($params);
            $oXML = simplexml_load_string($oResponse->EliminarDocResult);
            
            if($oXML->Mensaje->Resultado == "OK") {
                $oDTO->bExito = true;
            } else {
                $oDTO->cMensaje = $oXML->Mensaje->Resultado;
            }
        } catch (SoapFault $e) {
            $oDTO->bExito = false;
            $oDTO->cMensaje = "";
            $oDTO->cError = "Error SoapFault " + $e->getMessage();
            echo $e->getMessage() . "<br />";
        }
        
        return $oDTO;
    }

}

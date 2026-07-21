<?php
//error_reporting(E_ALL);
//ini_set('display_errors', '1');
require_once '../Clases/Controlador/NotaCreditoElectronicaCTRL.php';

$oNCElecCTRL = new NotaCreditoElectronicaCTRL("../");
$oNCElecCLWSDTO = $oNCElecCTRL->crearNotaCreditoElectronica();

echo $oNCElecCLWSDTO->bExito . "<br />";
echo $oNCElecCLWSDTO->cError . "<br />";
echo $oNCElecCLWSDTO->cMensaje . "<br />";
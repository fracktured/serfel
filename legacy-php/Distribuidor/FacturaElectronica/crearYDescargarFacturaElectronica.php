<?php
//error_reporting(E_ALL);
//ini_set('display_errors', '1');

require_once '../Clases/Controlador/FacturaElectronicaCTRL.php';

$oFacElecCTRL = new FacturaElectronicaCTRL("../");
$oFacElecCLWSDTO = $oFacElecCTRL->crearFacturaElectronica('download');

echo $oFacElecCLWSDTO->bExito . "<br />";
echo $oFacElecCLWSDTO->cError . "<br />";
echo $oFacElecCLWSDTO->cMensaje . "<br />";
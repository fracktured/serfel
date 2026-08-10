<?php
//error_reporting(E_ALL);
//ini_set('display_errors', '1');
require_once '../Clases/Controlador/FacturaElectronicaCTRL.php';

$oFacElecCTRL = new FacturaElectronicaCTRL("../");
$oFacElecCLWSDTO = $oFacElecCTRL->concatenarPDFs();
<?php
require_once '../../Clases/Controlador/FacturacionElectronica/LibroCVCTRL.php';

$oLibroCVCTRL = new LibroCVCTRL("../../");
$oAjaxDTO = $oLibroCVCTRL->eliminarVentaLibroCV();

echo json_encode($oAjaxDTO);
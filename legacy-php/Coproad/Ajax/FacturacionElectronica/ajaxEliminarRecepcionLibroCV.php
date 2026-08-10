<?php
require_once '../../Clases/Controlador/FacturacionElectronica/LibroCVCTRL.php';

$oLibroCVCTRL = new LibroCVCTRL("../../");
$oAjaxDTO = $oLibroCVCTRL->eliminarRecepcionLibroCV();

echo json_encode($oAjaxDTO);
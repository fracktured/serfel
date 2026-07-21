<?php

require_once '../Clases/Controlador/NotaDebitoElectronicaCTRL.php';

$oNDElecCTRL = new NotaDebitoElectronicaCTRL("../");
$oFacElecCLWSDTO = $oNDElecCTRL->verPDF();
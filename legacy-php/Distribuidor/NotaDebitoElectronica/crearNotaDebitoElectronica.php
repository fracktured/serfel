<?php

require_once '../Clases/Controlador/NotaDebitoElectronicaCTRL.php';

$oNDElecCTRL = new NotaDebitoElectronicaCTRL("../");
$oNDElecCLWSDTO = $oNDElecCTRL->crearNotaDebitoElectronica();

echo $oNCElecCLWSDTO->bExito . "<br />";
echo $oNCElecCLWSDTO->cError . "<br />";
echo $oNCElecCLWSDTO->cMensaje . "<br />";
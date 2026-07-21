<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Usuario *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Empresa.php");
include("../../Clases/Venta.php");

    if(isset($_POST["rutEmpresa"])) $empresa = new Empresa($_POST["rutEmpresa"]);
    else if(isset($_POST["idEmpresa"])) $empresa = new Empresa($_POST["idEmpresa"], "accesoRapido");
    
    if(isset($_POST["rutEmpresa"]) || isset($_POST["idEmpresa"])) {
        $venta = new Venta();
        
        $json["rut_completo"] = $empresa->getRutCompleto();
        $json["razon_social"] = $empresa->getRazonSocial();
        $json["nom_fantasia"] = $empresa->getNomFantasia();
        $json["direccion"]    = $empresa->getDireccionEmpresa();
        $json["rut"]          = $empresa->getRutEmpresa();
        $json["dv"]           = $empresa->getDVEmpresa();
        $json["numFactura"]   = $venta->obtNuevoNumFactura($empresa->getRutEmpresa());
        $json["estado"]       = $empresa->getEstado();
        
        echo json_encode($json);
    }
?>

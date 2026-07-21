<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info de un Local *
 *        de Cliente                                        *
 ************************************************************/
//error_reporting(0);
//ini_set('display_errors', 0);

include("../../Coneccion/coneccion.php");
include("../../Clases/LocalCliente.php");
include("../../Globales/funciones.php");

    if(isset($_POST["idLocalCliente"])) {
        $localCliente = new LocalCliente($_POST["idLocalCliente"]);

        $json["rut_cliente"]             = $localCliente->getRutCliente();
        $json["rut_completo"]            = $localCliente->getRutCompleto();
        $json["nom_fantasia"]            = $localCliente->getNomFantasia();
        $json["nom_local_cliente"]       = $localCliente->getNomLocalCliente();
        $json["direccion_local_cliente"] = $localCliente->getDireccionLocalCliente();
        $json["telefono_local_cliente"]  = $localCliente->getTelefonoLocalCliente();
        $json["email_local_cliente"]     = $localCliente->getEmailLocalCliente();
        $json["nom_contacto"]            = $localCliente->getNomContacto();
        $json["apell_pat_contacto"]      = $localCliente->getApellPatContacto();
        $json["apell_mat_contacto"]      = $localCliente->getApellMatContacto();
        $json["nom_completo_contacto"]   = $localCliente->getNomCompletoContacto();
        $json["telefono_contacto"]       = $localCliente->getTelefonoContacto();
        $json["email_contacto"]          = $localCliente->getEmailContacto();
        $json["tope_venta"]              = $localCliente->getTopeVenta();
        $json["tope_credito"]            = $localCliente->getTopeCredito();
        $json["id_vendedor"]             = $localCliente->getIdVendedor();
        $json["id_forma_pago"]           = $localCliente->getIdFormaPago();
        $json["comuna"]                  = $localCliente->getComuna();
        $json["observaciones"]           = $localCliente->getObservaciones();
        $json["estado"]                  = $localCliente->getEstado();
        $json["giro"]                    = $localCliente->getGiro();
        $json["permite_venta_tope_mensual"] = $localCliente->permite_venta_tope_mensual;

        echo json_encode(utf8ize($json));
    }
?>
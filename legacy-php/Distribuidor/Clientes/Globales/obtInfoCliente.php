<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Cliente *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Cliente.php");
include("../../Clases/LocalCliente.php");
include("../../Clases/Usuario.php");
include("../../Globales/funciones.php");

    if(isset($_POST["rutCliente"])) {
        $cliente = new Cliente($_POST["rutCliente"]);

        $json["rut_completo"]     = $cliente->getRutCompleto();
        $json["razon_social"]     = $cliente->getRazonSocial();
        $json["nom_fantasia"]     = $cliente->getNomFantasia();
        $json["direccion"]        = $cliente->getDireccionCliente();
        //$json["comuna"]           = $cliente->getComuna();
        $json["email"]            = $cliente->getEmailCliente();
        $json["telefono"]         = $cliente->getTelefonoCliente();
        $json["rut"]              = $cliente->getRutCliente();
        $json["dv"]               = $cliente->getDVCliente();
        $json["lunes"]            = $cliente->getLunes();
        $json["martes"]           = $cliente->getMartes();
        $json["miercoles"]        = $cliente->getMiercoles();
        $json["jueves"]           = $cliente->getJueves();
        $json["viernes"]          = $cliente->getViernes();
        $json["ult_factura"]      = $cliente->getUltFactura();
        $json["ult_nota_credito"] = $cliente->getUltNotaCredito();
        //$json["locales"]       = $cliente->getLocales();
        $json["total_locales"]    = $cliente->getTotalLocales();
        $json["id_lista_precio"]  = $cliente->getIdListaPrecio();
        $json["estado"]           = $cliente->getEstado();
        
        $locales = $cliente->getLocales();
        $i = 0;
        while($i <= $cliente->getTotalLocales()) {
            $vendedor = new Usuario($locales[$i]->getIdVendedor());
            
            $json["locales"][$i]["id_local"]       = $locales[$i]->getIdLocalCliente();
            $json["locales"][$i]["nom_local"]      = $locales[$i]->getNomLocalCliente();
            $json["locales"][$i]["telefono"]       = $locales[$i]->getTelefonoLocalCliente();
            $json["locales"][$i]["email"]          = $locales[$i]->getEmailLocalCliente();
            $json["locales"][$i]["nom_contacto"]   = $locales[$i]->getNomCompletoContacto();
            $json["locales"][$i]["fono_contacto"]  = $locales[$i]->getTelefonoContacto();
            $json["locales"][$i]["email_contacto"] = $locales[$i]->getEmailContacto();
            $json["locales"][$i]["tope_venta"]     = $locales[$i]->getTopeVenta();
            $json["locales"][$i]["tope_credito"]   = $locales[$i]->getTopeCredito();
            $json["locales"][$i]["id_vendedor"]    = $locales[$i]->getIdVendedor();
            $json["locales"][$i]["nom_vendedor"]   = $vendedor->getNomCompleto();
            $json["locales"][$i]["id_forma_pago"]  = $locales[$i]->getIdFormaPago();
            $i++;
        }

        echo json_encode(utf8ize($json));
    }
?>

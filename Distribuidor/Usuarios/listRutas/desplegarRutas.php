<?php
//error_reporting(E_ALL);
//ini_set('display_errors', '1');
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Ruta.php");
require_once __DIR__.'/../../Clases/Constantes/UsuarioCONST.php';
require_once __DIR__.'/../../Globales/funciones.php';

    session_start();

    if(isset($_POST["idRuta"]) 
            && ($_SESSION["usuario"]->getIdTipoUsuario() == UsuarioCONST::ADMINISTRADOR
                    || $_SESSION["usuario"]->getIdTipoUsuario() == UsuarioCONST::SECRETARIO)) {
        $ruta = new Ruta("../../", $_POST["idRuta"]);
        
        $i = 0;
        $json = [];
        foreach($ruta->getLocales() as $localCliente) {
	    	$json["locales"][$i]["rut_cliente"]		  = $localCliente->getRutCliente();
			$json["locales"][$i]["rut_completo"]	  = $localCliente->getRutCompleto();
			$json["locales"][$i]["razon_social"]	  = $localCliente->getRazonSocial();
            $json["locales"][$i]["id_local_cliente"]  = $localCliente->getIdLocalCliente();
            $json["locales"][$i]["nom_local_cliente"] = $localCliente->getNomLocalCliente();
            $json["locales"][$i]["dir_local_cliente"] = $localCliente->getDireccionLocalCliente();
            $json["locales"][$i]["telefono"]          = $localCliente->getTelefonoLocalCliente();
            $json["locales"][$i]["contacto"]          = $localCliente->getNomCompletoContacto();
            $json["locales"][$i]["fono_contacto"]     = $localCliente->getTelefonoContacto();
            $i++;
        }
        $json["total_locales"] = $i;
        $json["vendedor"] = $ruta->getIdUsuario();
        $json["num_dia"]  = $ruta->getNumDia();
        
        /*
        $lista = new Lista();
        $listaRutasLun = $lista->getListaRutas("../../", 1, $_POST["idUsuario"]);
        $numRutasLun   = $lista->getTotalRegistros();
        $listaRutasMar = $lista->getListaRutas("../../", 2, $_POST["idUsuario"]);
        $numRutasMar   = $lista->getTotalRegistros();
        $listaRutasMie = $lista->getListaRutas("../../", 3, $_POST["idUsuario"]);
        $numRutasMie   = $lista->getTotalRegistros();
        $listaRutasJue = $lista->getListaRutas("../../", 4, $_POST["idUsuario"]);
        $numRutasJue   = $lista->getTotalRegistros();
        $listaRutasVie = $lista->getListaRutas("../../", 5, $_POST["idUsuario"]);
        $numRutasVie   = $lista->getTotalRegistros();

        $json["lunes"]     = "";
        $json["martes"]    = "";
        $json["miercoles"] = "";
        $json["jueves"]    = "";
        $json["viernes"]   = "";
        
        $i = 0;
        while($i <= $numRutasLun) {
            $json["lunes"][$i]["id_local_cliente"]  = $listaRutasLun[$i]->getIdLocalCliente();
            $json["lunes"][$i]["nom_local_cliente"] = $listaRutasLun[$i]->getNomLocalCliente();
            $json["lunes"][$i]["dir_local_cliente"] = $listaRutasLun[$i]->getDireccionLocalCliente();
            $json["lunes"][$i]["telefono"]          = $listaRutasLun[$i]->getTelefonoLocalCliente();
            $json["lunes"][$i]["contacto"]          = $listaRutasLun[$i]->getNomCompletoContacto();
            $json["lunes"][$i]["fono_contacto"]     = $listaRutasLun[$i]->getTelefonoContacto();
            $i++;
        }
        
        $i = 0;
        while($i <= $numRutasMar) {
            $json["martes"][$i]["id_local_cliente"]  = $listaRutasMar[$i]->getIdLocalCliente();
            $json["martes"][$i]["nom_local_cliente"] = $listaRutasMar[$i]->getNomLocalCliente();
            $json["martes"][$i]["dir_local_cliente"] = $listaRutasMar[$i]->getDireccionLocalCliente();
            $json["martes"][$i]["telefono"]          = $listaRutasLun[$i]->getTelefonoLocalCliente();
            $json["martes"][$i]["contacto"]          = $listaRutasMar[$i]->getNomCompletoContacto();
            $json["martes"][$i]["fono_contacto"]     = $listaRutasMar[$i]->getTelefonoContacto();
            $i++;
        }
        
        $i = 0;
        while($i <= $numRutasMie) {
            $json["miercoles"][$i]["id_local_cliente"]  = $listaRutasMie[$i]->getIdLocalCliente();
            $json["miercoles"][$i]["nom_local_cliente"] = $listaRutasMie[$i]->getNomLocalCliente();
            $json["miercoles"][$i]["dir_local_cliente"] = $listaRutasMie[$i]->getDireccionLocalCliente();
            $json["miercoles"][$i]["telefono"]          = $listaRutasLun[$i]->getTelefonoLocalCliente();
            $json["miercoles"][$i]["contacto"]          = $listaRutasMie[$i]->getNomCompletoContacto();
            $json["miercoles"][$i]["fono_contacto"]     = $listaRutasMie[$i]->getTelefonoContacto();
            $i++;
        }
        
        $i = 0;
        while($i <= $numRutasJue) {
            $json["jueves"][$i]["id_local_cliente"]  = $listaRutasJue[$i]->getIdLocalCliente();
            $json["jueves"][$i]["nom_local_cliente"] = $listaRutasJue[$i]->getNomLocalCliente();
            $json["jueves"][$i]["dir_local_cliente"] = $listaRutasJue[$i]->getDireccionLocalCliente();
            $json["jueves"][$i]["telefono"]          = $listaRutasLun[$i]->getTelefonoLocalCliente();
            $json["jueves"][$i]["contacto"]          = $listaRutasJue[$i]->getNomCompletoContacto();
            $json["jueves"][$i]["fono_contacto"]     = $listaRutasJue[$i]->getTelefonoContacto();
            $i++;
        }
        
        $i = 0;
        while($i <= $numRutasVie) {
            $json["viernes"][$i]["id_local_cliente"]  = $listaRutasVie[$i]->getIdLocalCliente();
            $json["viernes"][$i]["nom_local_cliente"] = $listaRutasVie[$i]->getNomLocalCliente();
            $json["viernes"][$i]["dir_local_cliente"] = $listaRutasVie[$i]->getDireccionLocalCliente();
            $json["viernes"][$i]["telefono"]          = $listaRutasLun[$i]->getTelefonoLocalCliente();
            $json["viernes"][$i]["contacto"]          = $listaRutasVie[$i]->getNomCompletoContacto();
            $json["viernes"][$i]["fono_contacto"]     = $listaRutasVie[$i]->getTelefonoContacto();
            $i++;
        }
        */
        //print_r($json);
        echo json_encode(utf8ize($json));
    }
?>

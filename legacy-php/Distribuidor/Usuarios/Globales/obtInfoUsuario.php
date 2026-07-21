<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 28-12-2011                                        *
 * Desc : Archivo que permite recuperar la Info del Usuario *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");

    if(isset($_POST["idUsuario"])) {
        $usuario = new Usuario($_POST["idUsuario"]);

        $json["rut_completo"] = $usuario->getRutCompleto();
        $json["paterno"]      = $usuario->getApellPatUsuario();
        $json["materno"]      = $usuario->getApellMatUsuario();
        $json["nombres"]      = $usuario->getNomUsuario();
        $json["id_tipo_usu"]  = $usuario->getIdTipoUsuario();
        $json["direccion"]    = $usuario->getDireccionUsuario();
        $json["email"]        = $usuario->getEmailUsuario();
        $json["telefono"]     = $usuario->getTelefonoUsuario();
        $json["nom_completo"] = $usuario->getNomCompleto();
        $json["rut"]          = $usuario->getRutUsuario();
        $json["dv"]           = $usuario->getDVUsuario();
        $json["estado"]       = $usuario->getEstado();
        $json["num_usuario"]  = $usuario->getNumUsuario();

        echo json_encode($json);
    }
?>

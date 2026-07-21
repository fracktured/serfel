<?php
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Validación de ingreso de locales de clientes      *
 ************************************************************/
include("../../Coneccion/coneccion.php");
include("../../Clases/Usuario.php");
include("../../Clases/Producto.php");

    session_start();

    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
        $codSerfel = $_POST["codSerfel"];
        $nomProd  = $_POST["nomProd"];
        $idUM = $_POST["idUM"];
        $idMarca = $_POST["idMarca"];
        $descProd = $_POST["descProd"];
        $codBarra = $_POST["codBarra"];
        $idFamPadre = $_POST["idFamPadre"];
        $idFam = $_POST["idFam"];

        if($nomProd == "" || $idMarca == "" || $idFamPadre == "") {
            $json["resultado"] = -2;
            $json["tipoError"] = "vacios";
        } else {
            $producto = new Producto();
            
            if($idFam == "") $idTipoProd = $idFamPadre;
            else $idTipoProd = $idFam;
            
            $json["resultado"] = $producto->ingProducto($codSerfel, $nomProd, $descProd, $codBarra, $idTipoProd, $idMarca, 
                $idUM, $_POST["idImp"], $_POST["esPorcionado"], $_SESSION["usuario"]->getIdUsuario());
        }

        echo json_encode($json);
    }
?>
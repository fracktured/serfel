<?php
include("Clases/Controlador.php");
include("Clases/Usuario.php");
    //error_reporting(E_ALL);
    //ini_set('display_errors', '1');
    //error_reporting(0);
    //ini_set('display_errors', 0);

    session_start();

    if(!isset($_SESSION["usuario"])) header ("Location: index.html");

    if(isset($_GET["act"])) $controlador = new Controlador($_GET["act"]);
    else $controlador = new Controlador("index");

?>

<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta charset="UTF-8">
        <!--<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">-->
        <title>Sistema de Gestión COPROAD SPA</title>

	<link rel="stylesheet" type="text/css" href="css/style.css" />
        <link rel="stylesheet" type="text/css" href="css/ui-lightness/jquery-ui-1.8.15.custom.css"/>
        <link rel="stylesheet" type="text/css" href="Menu/pro_drop_1.css"/>
        <?php echo $controlador->getEstilos(); ?>

        <script type="text/javascript" src="js/jquery/jquery-1.6.2.min.js"></script>
        <script type="text/javascript" src="js/jquery/jquery-ui-1.8.15.custom.min.js"></script>
        <script type="text/javascript" src="Menu/stuHover.js"></script>
        <?php echo $controlador->getJs(); ?>
    </head>

    <body>
	<div class="wrap background">
            <ul id="nav">
                <li class="top">
                    <a class="<?php echo $controlador->marcarMenuPrincipal("usuarios"); ?>" href="#" id="usuarios">USUARIOS</a>
                    <ul class="sub">
                        <?php
                            if($_SESSION["usuario"]->getIdTipoUsuario() == 1)
                                echo '<li><a href="SisDist.php?act=ingUsuario">Ingresar Usuarios</a></li>
                                      <li><a href="SisDist.php?act=listUsuario">Lista de Usuarios</a></li>';
                        ?>
                        <li><a href="SisDist.php?act=listRutas">Lista de Rutas</a></li>
                    </ul>
                </li>
                <li class="top">
                    <a class="<?php echo $controlador->marcarMenuPrincipal("inventario"); ?>" href="#" id="usuarios">INVENTARIO</a>
                    <ul class="sub">
                        <li><a href="SisDist.php?act=listExistencias">Existencias</a></li>
                        <li><a href="#" class="fly">Recepcion</a>
                            <ul>
                                <a href="SisDist.php?act=recepcionProductos"    >Recepcion Productos</a>
                                <a href="SisDist.php?act=listRecepcionProductos">Lista Recepciones  </a>
                            </ul>
                        </li>
                        <li><a href="SisDist.php?act=listNivelStock">Alertas de Stock</a></li>
                        <li><a href="SisDist.php?act=listMermas">Lista Mermas</a></li>
                    </ul>
                </li>
                <li class="top">
                    <a class="<?php echo $controlador->marcarMenuPrincipal("ventas"); ?>" href="#" id="usuarios">VENTAS</a>
                    <ul class="sub">
                        <?php
                            if($_SESSION["usuario"]->getIdTipoUsuario() == 1)
                                echo '<li><a href="SisDist.php?act=listPrecioProducto">Precio Producto</a></li>';
                        ?>
                        <li><a href="SisDist.php?act=terminalVentas">Realizar Venta</a></li>
                        <li><a href="SisDist.php?act=terminalVentaPedidos">Facturar Pedido</a></li>
                        <li><a href="SisDist.php?act=listVentas">Lista de Ventas</a></li>
                        <li><a href="SisDist.php?act=listNotaCredito">Lista de NC</a></li>
                        <li><a href="SisDist.php?act=anularVenta">Anular Venta</a></li>
                        <?php
                            if($_SESSION["usuario"]->getIdTipoUsuario() == 1 || $_SESSION["usuario"]->getIdTipoUsuario() == 3)
                                echo '<li><a href="SisDist.php?act=terminalNotaCredito">Nota de Crédito</a></li>';
                        ?>
                        <li><a href="SisDist.php?act=imprimirNotaCredito">Imp. Nota Crédito</a></li>
                        <?php
                            if($_SESSION["usuario"]->getIdTipoUsuario() == 1)
                                echo '<li><a href="SisDist.php?act=informeVentas">Informe de Ventas</a></li>
                                      <li><a href="SisDist.php?act=informeNotaCredito">Informe Notas Crédito</a></li>';
                        ?>
                        <li><a href="SisDist.php?act=imprimirRutario">Imprimir Rutario</a></li>
                        <li><a href="SisDist.php?act=imprimirListadoCarga">Imprimir Listado Carga</a></li>
                        <li><a href="SisDist.php?act=estadoEntregas">Estado Entregas</a></li>
                        <?php
                            //echo '<li><a href="SisDist.php?act=estadoEntregasC">Estado Entregas</a></li>';
                        ?>
                    </ul>
                </li>

                <?php
                    if($_SESSION["usuario"]->getIdTipoUsuario() == 1) {
                ?>
                <li class="top">
                    <a class="<?php echo $controlador->marcarMenuPrincipal("cobranzas"); ?>" href="#" id="cobranzas">COBRANZAS</a>
                    <ul class="sub">
			            <li><a href="SisDist.php?act=cobranzas">Cobranzas</a></li>
			            <li><a href="SisDist.php?act=informeCobranza">Informe Cobranzas</a></li>
                    </ul>
                </li>
                <li class="top">
                    <a class="<?php echo $controlador->marcarMenuPrincipal("facElec"); ?>" href="#" id="clientes">FACTURACIÓN ELECTRÓNICA</a>
                    <ul class="sub">
			            <li><a href="SisDist.php?act=subirLibroCV">Subir libro C/V</a></li>
			            <li><a href="SisDist.php?act=consultarLibroCV">Consultar libro C/V</a></li>
                    </ul>
                </li>
                <?php
                    }
                ?>

                <li class="top">
                    <a class="<?php echo $controlador->marcarMenuPrincipal("mantenedores"); ?>" href="#" id="mantenedores">MANTENEDORES</a>
                    <ul class="sub">
                        <!--<li><a href="SisDist.php?act=listCliente"  >Clientes   </a></li>-->
                        <li>
                            <a href="#" class="fly">Productos</a>
                            <ul>
                                <?php
                                    if($_SESSION["usuario"]->getIdTipoUsuario() == 1)
                                        echo '<a href="SisDist.php?act=listProducto"    >Productos         </a>
                                              <a href="SisDist.php?act=listUnidadMedida">Unidades de Medida</a>
                                              <a href="SisDist.php?act=listTipoProducto">Tipos de Producto </a>
                                              <a href="SisDist.php?act=listMarca"       >Marcas            </a>';
                                ?>
                                <a href="SisDist.php?act=consultaProductos">Consulta Productos</a>
                            </ul>
                        </li>
                        <?php
                            if($_SESSION["usuario"]->getIdTipoUsuario() == 1)
                                echo '<li><a href="SisDist.php?act=listEmpresa"  >Empresas   </a></li>
                                      <li><a href="SisDist.php?act=listProveedor">Proveedores</a></li>';
                        ?>
                    </ul>
                </li>
                <li class="top">
                    <a class="<?php echo $controlador->marcarMenuPrincipal("clientes"); ?>" href="#" id="clientes">CLIENTES</a>
                    <ul class="sub">
			<li><a href="SisDist.php?act=ingCliente">Ingresar Clientes</a></li>
			<li><a href="SisDist.php?act=listCliente">Lista de Clientes</a></li>
                        <li><a href="SisDist.php?act=consultaClientes">Consulta de Clientes</a></li>
                    </ul>
                </li>
                <li class="top">
                    <a class="<?php echo $controlador->marcarMenuPrincipal("miCuenta"); ?>" href="#" id="miCuenta">MI CUENTA</a>
                    <ul class="sub">
                        <!--li><a>Editar Contraseña</a></li-->
                        <li><a href="Usuarios/login/logOut.php" id="logOut">Cerrar Sesion</a></li>
                    </ul>
                </li>
            </ul>

            <div id="logo">
                <h1><a id="tituloPagina" href="#"><?php echo $controlador->getTitulo(); ?></a></h1>
            </div>

            <?php if($controlador->getPagina() != "") include($controlador->getPagina()); ?>

	</div>

	<div id="promo">
            <div class="wrap">
		<div id="footer">
                    <p></p>
                </div>
            </div>
	</div>
    </body>
</html>

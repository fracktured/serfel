<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <!-- Meta, title, CSS, favicons, etc. -->
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>SerfelWeb :: <?php echo $cTitulo; ?> </title>

    <link href="<?= asset_url(); ?>bootstrap/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="<?= asset_url(); ?>font-awesome/css/font-awesome.min.css" rel="stylesheet">
    <link href="<?= asset_url(); ?>nprogress/nprogress.css" rel="stylesheet">
    <!-- Custom Theme Style -->
    <link href="<?= asset_url(); ?>customtheamestyle/css/custom.css" rel="stylesheet">

    <script src="<?= asset_url(); ?>jquery/dist/jquery.min.js"></script>
    <script src="<?= asset_url(); ?>bootstrap/dist/js/bootstrap.min.js"></script>
    <script src="<?= asset_url(); ?>fastclick/lib/fastclick.js"></script>
    <script src="<?= asset_url(); ?>nprogress/nprogress.js"></script>
    <script src="<?= asset_url(); ?>angular/angular.js"></script>
  <script src="<?= asset_url(); ?>ui-bootstrap-tpls-2.5.0.js"></script>
  <script src="<?= asset_url(); ?>bootstrap-notify/bootstrap-notify.js"></script>
  
	<style>
		
		html{
			height:94%;
		}
		
		.nav-md{
			height:100%;
		}
		
		.container{
			height:100%;
		}
		
		.main_container{
			height:100%;
		}
				
		.right_col{
			height:100%;
		}
		
		.title_left{
			margin-left:10px;
		}
		
		.salto-3{
			height:30px;
		}
		
		.salto-2{
			height:20px;
		}
		
		.salto-1{
			height:10px;
		}
	</style>
  </head>

  <body class="nav-md">
    <div class="container body">
      <div class="main_container">
        <div class="col-md-3 left_col">
          <div class="left_col scroll-view">
            <div class="navbar nav_title" style="border: 0;">
                <a href="<?php echo base_url(); ?>" class="site_title"><i class="fa fa-home"></i> <span>Serfel</span></a>
            </div>

            <div class="clearfix"></div>

            <!-- menu profile quick info -->
            <div class="profile clearfix">
              <div class="profile_info">
                <span><?php echo $oUsuarioSession->oTipoUsuario->desc_tipo_usuario; ?></span>
                <h2><?php echo $oUsuarioSession->oUsuario->obtNomCompleto(); ?></h2>
              </div>
              <div class="clearfix"></div>
            </div>
            <!-- /menu profile quick info -->

            <!-- sidebar menu -->
            <div id="sidebar-menu" class="main_menu_side hidden-print main_menu">
              <div class="menu_section">
                <ul class="nav side-menu">
                  <li><a><i class="fa fa-edit"></i> Pedidos <span class="fa fa-chevron-down"></span></a>
                    <ul class="nav child_menu">
                      <li><a href="<?php echo base_url("PedidoCTRL/listarPedido"); ?>">Listar Pedido</a></li>
                      <li><a href="<?php echo base_url("PedidoCTRL/crearPedido"); ?>">Crear Pedido</a></li>
                    </ul>
                  </li>
                </ul>
              </div>
              <!--
              <div class="menu_section">
                <ul class="nav side-menu">
                  <li><a><i class="fa fa-edit"></i> Pagos <span class="fa fa-chevron-down"></span></a>
                    <ul class="nav child_menu">
                      <li><a href="<?php echo base_url("PagosCTRL/listarPago"); ?>">Listar Pagos</a></li>
                    </ul>
                  </li>
                </ul>
              </div>
              -->
            </div>
            <!-- /sidebar menu -->
          </div>
        </div>

        <!-- top navigation -->
        <div class="top_nav">
          <div class="nav_menu">
            <nav>
              <div class="nav toggle">
                <a id="menu_toggle"><i class="fa fa-bars"></i></a>
              </div>

              <ul class="nav navbar-nav navbar-right">
                <li class="">
                  <a href="javascript:;" class="user-profile dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                    <?php echo $oUsuarioSession->oUsuario->obtNomCompleto(); ?>
                    <span class=" fa fa-angle-down"></span>
                  </a>
                  <ul class="dropdown-menu dropdown-usermenu pull-right">
                    <li><a href="javascript:;"> Perfil</a></li>
                    <li><a href="<?php echo base_url("Home/logout"); ?>"><i class="fa fa-sign-out pull-right"></i> Cerrar sesión</a></li>
                  </ul>
                </li>

                <!-- TODO: Notificaciones -->
                <!--
                <li role="presentation" class="dropdown">
                  <a href="javascript:;" class="dropdown-toggle info-number" data-toggle="dropdown" aria-expanded="false">
                    <i class="fa fa-envelope-o"></i>
                    <span class="badge bg-green">6</span>
                  </a>
                  <ul id="menu1" class="dropdown-menu list-unstyled msg_list" role="menu">
                    <li>
                      <a>
                        <span>
                          <span>John Smith</span>
                          <span class="time">3 mins ago</span>
                        </span>
                        <span class="message">
                          Film festivals used to be do-or-die moments for movie makers. They were where...
                        </span>
                      </a>
                    </li>
                    <li>
                      <a>
                        <span>
                          <span>John Smith</span>
                          <span class="time">3 mins ago</span>
                        </span>
                        <span class="message">
                          Film festivals used to be do-or-die moments for movie makers. They were where...
                        </span>
                      </a>
                    </li>
                    <li>
                      <a>
                        <span>
                          <span>John Smith</span>
                          <span class="time">3 mins ago</span>
                        </span>
                        <span class="message">
                          Film festivals used to be do-or-die moments for movie makers. They were where...
                        </span>
                      </a>
                    </li>
                    <li>
                      <a>
                        <span>
                          <span>John Smith</span>
                          <span class="time">3 mins ago</span>
                        </span>
                        <span class="message">
                          Film festivals used to be do-or-die moments for movie makers. They were where...
                        </span>
                      </a>
                    </li>
                    <li>
                      <div class="text-center">
                        <a>
                          <strong>See All Alerts</strong>
                          <i class="fa fa-angle-right"></i>
                        </a>
                      </div>
                    </li>
                  </ul>
                </li>
                -->
              </ul>
            </nav>
          </div>
        </div>
        <!-- /top navigation -->
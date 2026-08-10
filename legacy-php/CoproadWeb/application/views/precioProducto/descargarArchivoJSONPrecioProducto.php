<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="format-detection" content="telephone=no" />
        
        <title>SerfelWeb :: Descargar archivo JSON Precio Producto</title>
        
        <!--<link rel="shortcut icon" href="<?= asset_url(); ?>imagenes/favicon.ico" > CAMBIAR POR SERFEL -->
        <!--
        <link rel="stylesheet" href="<?= asset_url(); ?>css/camera.css">
        <link rel="stylesheet" href="<?= asset_url(); ?>css/carousel.css">
        <link rel="stylesheet" href="<?= asset_url(); ?>css/tablas.css">
        <link rel="stylesheet" href="<?= asset_url(); ?>css/font-awesome.css">
        -->
        <link rel="stylesheet" href="<?= asset_url(); ?>bootstrap/css/bootstrap.min.css">
        <link rel="stylesheet" href="<?= asset_url(); ?>bootstrap/css/bootstrap-theme.min.css">
        <!--
        <link rel="stylesheet" type="text/css" href="<?= asset_url(); ?>css/bootstrap.min.css">
        <link rel="stylesheet" type="text/css" href="<?= asset_url(); ?>css/bootstrap-theme.min.css">
        -->
        <link rel="stylesheet" href="<?= asset_url(); ?>jqueryTables/media/css/dataTables.bootstrap.min.css">
        <link rel="stylesheet" type="text/css" href="<?= asset_url(); ?>css/pure-min.css">
        <link rel="stylesheet" type="text/css" href="<?= asset_url(); ?>css/progress-bar-style.css">
        <link rel="stylesheet" type="text/css" href="<?= asset_url(); ?>css/styles.css">

        <script src="<?= asset_url(); ?>js/jquery-3.1.1.min.js"></script>
        <script src="<?= asset_url(); ?>js/jquery-migrate-1.1.1.js"></script>
        <script src="<?= asset_url(); ?>js/script.js"></script> 
        <script src="<?= asset_url(); ?>js/jquery.equalheights.js"></script>
        <script src="<?= asset_url(); ?>js/superfish.js"></script>
        <script src="<?= asset_url(); ?>js/jquery.responsivemenu.js"></script>
        <script src="<?= asset_url(); ?>js/jquery.mobilemenu.js"></script>
        <script src="<?= asset_url(); ?>js/jquery.easing.1.3.js"></script>
        <script src="<?= asset_url(); ?>jqueryTables/media/js/jquery.dataTables.min.js"></script>
        <script src="<?= asset_url(); ?>jqueryTables/media/js/dataTables.bootstrap.min.js"></script>
        <!--<script src="<?= asset_url(); ?>js/camera.js"></script>-->
        <!--[if (gt IE 9)|!(IE)]><!-->
        <!--<script src="js/jquery.mobile.customized.min.js"></script>-->
        <!--<![endif]-->
        <script src="<?= asset_url(); ?>js/jquery.carouFredSel-6.1.0-packed.js"></script>
        <script src="<?= asset_url(); ?>js/jquery.touchSwipe.min.js"></script>
        <script src="<?= asset_url(); ?>bootstrap/js/bootstrap.min.js"></script>
        <script type="text/javascript" src="<?= asset_url(); ?>js/jquery.form.min.js"></script>
        <script type="text/javascript" src="<?= asset_url(); ?>js/progress-bar.js"></script>
	<script src="<?= asset_url(); ?>angular/angular.js"></script>
	<!--<script src="../app/app.js"></script>-->
    </head>
    <body>
        <!-- status message will be appear here -->
        <div class="status"></div>
        
        <a href="<?php echo base_url(); ?>PrecioProductoCTRL/obtArchivoJSONPrecioProducto" 
           class="btn btn-success" role="button">
            Descargar archivo productos
        </a>

        <script>
            setTimeout(function() {
                $('#alertError').hide(400);
                $('#alertExito').hide(400);
            }, 1500);
        </script>

    </body>
</html>

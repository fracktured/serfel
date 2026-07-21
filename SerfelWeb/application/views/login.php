<!DOCTYPE html>
<html lang="es" ng-app="Login">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!-- Meta, title, CSS, favicons, etc. -->
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title>SerfelWeb</title>

        <!-- Bootstrap -->
        <link href="<?= asset_url(); ?>bootstrap/dist/css/bootstrap.min.css" rel="stylesheet">
        <!-- Font Awesome -->
        <link href="<?= asset_url(); ?>font-awesome/css/font-awesome.min.css" rel="stylesheet">
        <!-- NProgress -->
        <link href="<?= asset_url(); ?>nprogress/nprogress.css" rel="stylesheet">
        <!-- Animate.css -->
        <link href="<?= asset_url(); ?>animate.css/animate.min.css" rel="stylesheet">
        <!-- Custom Theme Style -->
        <link href="<?= asset_url(); ?>customtheamestyle/css/custom.min.css" rel="stylesheet">
        
        <script src="http://code.jquery.com/jquery-latest.min.js"></script>
        <script src="<?= asset_url(); ?>js/md5-min.js"></script>
        <script src="<?= asset_url(); ?>angular/angular.js"></script>
        <script src="<?= asset_url(); ?>angularApp/login-app.js"></script>
    </head>

    <body class="login" ng-controller="LoginCTRL">
        <div>
            <a class="hiddenanchor" id="signup"></a>
            <a class="hiddenanchor" id="signin"></a>

            <div class="login_wrapper">
                <div class="animate form login_form">
                    <section class="login_content">
                        <form>
                            <h1>Ingreso SerfelWeb</h1>
                            <div>
                                <input type="text" class="form-control" ng-model="txtUsuario" placeholder="Usuario" required="" />
                            </div>
                            <div>
                                <input type="password" class="form-control" ng-model="txtPassword" placeholder="Password" required="" />
                            </div>
                            <div>
                                <a href="#" class="btn btn-default submit" ng-click="login()">Ingresar</a>
                                <a class="reset_pass" href="#">¿Olvidó su contraseña?</a>
                            </div>

                            <div class="clearfix"></div>

                            <div class="separator">

                                <div class="clearfix"></div>
                                <br />
                            </div>
                            
                            <div class="alert alert-danger" ng-show="cMensajeError">
                                {{cMensajeError}}
                            </div>
                        </form>
                    </section>
                </div>
            </div>
        </div>
    </body>
</html>

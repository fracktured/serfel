var app = angular.module('Login', []);

app.controller('LoginCTRL', function ($scope, $http, $window) {
        $scope.login = function () {

            $http({
                method: 'POST',
                url: '/SerfelWeb/LoginREST/login',
                data: {
                    cRut: $scope.txtUsuario,
                    cPassword: hex_md5($scope.txtPassword)
                }
            })
                .success(function (oJson) {
                    console.log(oJson);
                    if (oJson.bExito) {
                        $window.location.href = "/SerfelWeb/Home";
                    } else {
                        $scope.cMensajeError = oJson.cMensaje;
                    }
                })
        }
    });



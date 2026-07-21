var listarPedidoModule = angular.module('ListarPedido', ['angularUtils.directives.dirPagination', 'ui.bootstrap']);

listarPedidoModule.filter('comaPorPunto', function() {
    return function(input) {
        if (input != undefined) {
            return input.replace(',', '.');
        }
    };
});

listarPedidoModule.controller('ListarPedidoController', function($scope, $uibModal, $http, $window) {
    $scope.listaPedidos = [];
    $scope.productos = [];

    $http
        .get("/SerfelWeb/PedidoREST/listPedidosDelDia")
        .success(function(response) {

            if (response.bExito && response.listPedido.length > 0) {

                response.listPedido.forEach(pedido => {

                    pedido.oPedido.razon_social = pedido.oCliente.razon_social;
                    pedido.oPedido.nom_local_cliente = pedido.oLocalCliente.nom_local_cliente;

                    $scope.listaPedidos.push(pedido.oPedido);
                });
            }
        })
        .error(function(err) {
            console.log(err);
        });

    $scope.ingresarDetallePedido = function(arrayDetalleProducto) {
        $scope.abrirModalIngresarDetallePedido(arrayDetalleProducto);
    };

    $scope.abrirModalIngresarDetallePedido = function($producto) {

        var modalInstance = $uibModal.open({
            animation: 'true',
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'modalIngresarDetallePedido.html',
            size: '',
            controller: 'modalIngresarDetallePedido',
            resolve: {
                producto: function() {
                    return $producto;
                }
            }
        });

        modalInstance.result.then(function(data) {

            if (data.accion == 'Eliminar') {
                $scope.productos.splice($producto.indice, 1);
                obtenerTotales();
            } else if (data.accion == 'Agregar Detalle') {

                if ($producto.indice == -1) {
                    $scope.productos.push(data.productoDetallePedido);
                } else {
                    if ($scope.productos.length > 0) {
                        $scope.productos[$producto.indice].cantidad_pedida = data.productoDetallePedido.cantidad_pedida;
                        $scope.productos[$producto.indice].porcen_desc = data.productoDetallePedido.porcen_desc;
                    }
                }

                obtenerTotales();
            }

        }, function() {
            console.log('Modal dismissededed at: ' + new Date());
        });
    };

    $scope.abrirModalCargando = function($clientes) {

        var modalInstance = $uibModal.open({
            animation: 'true',
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'modalCargando.html',
            size: '',
            controller: 'modalCargando'
        });

        modalInstance.result.then(function(opcion) {


        }, function() {
            console.log('Modal dismissededed at: ' + new Date());
        });
    };

    $scope.CerrarModal = function($clientes) {

        var modalInstance = $uibModal.open({
            animation: 'true',
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'modalCargando.html',
            size: '',
            controller: 'modalCargando'
        });

        modalInstance.result.then(function(opcion) {


        }, function() {
            console.log('Modal dismissededed at: ' + new Date());
        });
    };


    $scope.Modificar = function(accionModal) {

        var idPedido = this.pedido.id_pedido;

        var modalInstance = $uibModal.open({
            animation: 'true',
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'modalConfirmar.html',
            size: '',
            controller: 'modalConfirmar',
            resolve: {
                accionModal: function() {
                    return accionModal;
                }
            }
        });

        modalInstance.result.then(function(data) {
            $window.location.href = "/SerfelWeb/PedidoCTRL/modificarPedido/" + idPedido;

            //$uibModalInstance.close({productoDetallePedido: $scope.producto, accion: "Eliminar"});

        }, function() {
            console.log('Usuario cancelo la modificacion.');
        });
    };

    $scope.Eliminar = function(accionModal) {
        var $idPedido = this.pedido.id_pedido;

        var modalInstance = $uibModal.open({
            animation: 'true',
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'modalConfirmar.html',
            size: '',
            controller: 'modalConfirmar',
            resolve: {
                accionModal: function() {
                    return accionModal;
                }
            }
        });

        modalInstance.result.then(function(data) {
            var params = $.param({
                idPedido: $idPedido
            });

            var config = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
                }
            };

            $http.post('/SerfelWeb/PedidoREST/elimPedido', params, config)
                .success(function(data, status, headers, config) {
                    $scope.PostDataResponse = data;

                    if (data.bExito == true) {
                        $.notify({
                            icon: 'glyphicon glyphicon-ok',
                            message: data.cMensaje
                        }, {
                            type: 'success',
                            delay: 2000,
                            mouse_over: "pause"
                        });

                        setTimeout(function() {
                            $.notifyClose();
                            window.location.href = 'listarPedido';
                        }, 1000);
                    } else {
                        $.notify({
                            icon: 'glyphicon glyphicon-alert',
                            message: data.cMensaje
                        }, {
                            type: 'danger',
                            delay: 4000,
                            mouse_over: "pause"
                        });
                    }
                })
                .error(function(data, status, header, config) {
                    $scope.ResponseDetails = "DataError: " + data +
                        "<hr />status: " + status +
                        "<hr />headers: " + header +
                        "<hr />config: " + config;
                });

            $uibModalInstance.close({ productoDetallePedido: $scope.producto, accion: "Eliminar" });

        }, function() {
            console.log('Usuario cancelo la eliminacion.');
        });
    };

});

listarPedidoModule.controller('modalIngresarDetallePedido', function($scope, $uibModal, $http) {

});

listarPedidoModule.controller('modalConfirmar', function($scope, $uibModalInstance, accionModal) {

    if (accionModal == 'Modificar') {
        $scope.tituloModalConfirmar = "Confirmar Modificacíon";
        $scope.mensajeModalConfirmar = "¿Esta seguro que desea modificar el registro selecionado?";
    } else {
        $scope.tituloModalConfirmar = "Confirmar Eliminacíon";
        $scope.mensajeModalConfirmar = "¿Esta seguro que desea eliminar el registro selecionado?";
    }

    $scope.Aceptar = function() {
        $uibModalInstance.close(true);
    };

    $scope.Cancelar = function() {
        $uibModalInstance.dismiss();
    };

});
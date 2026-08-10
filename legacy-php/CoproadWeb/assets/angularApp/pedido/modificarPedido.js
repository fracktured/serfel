var modificarPedidoModule = angular.module('ModificarPedido', ['angularUtils.directives.dirPagination', 'ui.bootstrap']);

modificarPedidoModule.filter('comaPorPunto', function() {
    return function(input) {
        if (input != undefined) {
            return input.replace(',', '.');
        }
    }
});

modificarPedidoModule.controller('ModificarPedidoController', function($scope, $uibModal, $http, $window) {

    //$scope.listaPedidos = [];
    //$scope.productos = [];
    $scope.oPedido = null;
    $scope.precioProductos = [];
    $scope.productos = [];
    $scope.dia_ruta = new Date().getDay();
    $scope.crearPedidoClicked = false;

    $scope.razon_social_cliente = '';
    $scope.nom_local_cliente = '';
    $scope.id_local_cliente = 0;
    $scope.id_forma_pago = 0;
    $scope.id_lista_precio = 0;

    var path = $window.location.pathname.split('/');

    var parameters = {
        idPedido: path[path.length - 1]
    };

    var config = {
        params: parameters
    };

    $http
        .get("/SerfelWeb/PedidoREST/obtPedido/", config)
        .success(function(response) {
            //console.log(response);
            if (response.bExito) {

                $scope.razon_social_cliente = response.oCliente.razon_social;
                $scope.nom_local_cliente = response.oLocalCliente.nom_local_cliente;
                $scope.id_local_cliente = response.oPedido.id_local_cliente;
                $scope.id_forma_pago = response.oPedido.id_forma_pago;
                $scope.id_lista_precio = response.oPedido.id_lista_precio;

                $scope.productos = response.listRegListProductoPedido;
                $scope.oPedido = response.oPedido;
                obtenerTotales();

                $http
                    .get("/SerfelWeb/PrecioProductoREST/listPrecioProducto/idListaPrecio/" + $scope.id_lista_precio)
                    //.get("/SerfelWeb/PrecioProductoCTRL/obtArchivoJSONPrecioProducto")
                    .success(function(response) {

                        $scope.precioProductos = response.listPrecioProducto;
                    })
                    .error(function(err) {
                        console.log(err);
                    });
            }

        })
        .error(function(err) {
            console.log(err);
        });




    $scope.agregarProductoXCodSerfel = function() {

        $scope.resultado = [];

        //var auxArray = $scope.precioProductos;
        var bEncontrado = false;

        for (var i = 0; i < $scope.precioProductos.length; i++) {

            if ($scope.precioProductos[i].cod_serfel === $scope.txtCodSerfel) {
                $scope.resultado.push({
                    'id_lista_precio': $scope.precioProductos[i].id_lista_precio,
                    'id_producto': $scope.precioProductos[i].id_producto,
                    'nom_producto': $scope.precioProductos[i].nom_producto,
                    'nom_marca': $scope.precioProductos[i].nom_marca,
                    'nom_UM': $scope.precioProductos[i].nom_UM,
                    'cantidad_stock': $scope.precioProductos[i].cantidad_stock,
                    'cantidad_pedida': $scope.precioProductos[i].cantidad_pedida,
                    'cod_serfel': $scope.precioProductos[i].cod_serfel,
                    'porcen_desc': $scope.precioProductos[i].porcen_desc,
                    'precio_neto': $scope.precioProductos[i].precio_neto,
                    'precio': $scope.precioProductos[i].precio,
                    'max_porcen_desc': $scope.precioProductos[i].max_porcen_desc,
                    'busqueda': $scope.txtCodSerfel,
                    'cantidad': 0
                });

                var abreConProductoCargado = false;

                for (index = 0; index < $scope.productos.length; index++) {
                    if ($scope.productos[index].cod_serfel === $scope.resultado[0].cod_serfel) {
                        var producto = $scope.productos[index];
                        producto.indice = index;
                        abreConProductoCargado = true;
                        break;
                    }
                }

                bEncontrado = true;
                break;
            }
        }


        if (abreConProductoCargado) {
            $scope.abrirModalIngresarDetallePedido({ producto: producto, indice: producto.indice, esModificacion: true });
        } else {
            $scope.abrirModalIngresarDetallePedido({ producto: $scope.resultado[0], indice: -1, esModificacion: false });
        }

        $scope.txtCodSerfel = null;
    }

    $scope.buscarProducto = function() {
        $scope.resultados = [];

        var auxArray = eval($scope.precioProductos);
        var bEncontrado = false;

        var cantidadLetras = $scope.txtBuscador.length;

        for (var i = 0; i < auxArray.length; i++) {

            if (auxArray[i].nom_producto.substr(0, cantidadLetras).toUpperCase() === $scope.txtBuscador.toUpperCase()) {

                $scope.resultados.push({
                    'id_lista_precio': auxArray[i].id_lista_precio,
                    'id_producto': auxArray[i].id_producto,
                    'nom_producto': auxArray[i].nom_producto,
                    'nom_marca': auxArray[i].nom_marca,
                    'nom_UM': auxArray[i].nom_UM,
                    'cantidad_stock': auxArray[i].cantidad_stock,
                    'cantidad_pedida': auxArray[i].cantidad_pedida,
                    'cod_serfel': auxArray[i].cod_serfel,
                    'porcen_desc': auxArray[i].porcen_desc,
                    'precio_neto': auxArray[i].precio_neto,
                    'precio': auxArray[i].precio,
                    'max_porcen_desc': auxArray[i].max_porcen_desc,
                    'busqueda': $scope.txtBuscador.toUpperCase(),
                    'cantidad': 0
                });
            }
        }

        $scope.abrirModalBuscarProducto($scope.resultados);

        $scope.txtBuscador = null;
    };

    $scope.crearPedidoProductos = function(sendData) {
        $scope.crearPedidoClicked = true;
        var error = false;

        var oPedido = {
            id_pedido: $scope.oPedido.id_pedido,
            precio_total: $scope.lblTotalNeto,
            id_lista_precio: $scope.id_lista_precio,
            id_estado: 1,
            id_forma_pago: $scope.id_lista_precio,
            id_local_cliente: $scope.id_local_cliente,
            dia_ruta: $scope.dia_ruta
        };

        var data = $.param({
            listProductos: $scope.productos,
            oPedido: oPedido
        });

        var config = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8;'
            }
        };

        $http.post('/SerfelWeb/PedidoREST/modPedido', data, config)
            .success(function(data, status, headers, config) {
                $scope.PostDataResponse = data;

                if (data.bExito == true) {
                    $.notify({
                        // options
                        icon: 'glyphicon glyphicon-ok',
                        message: data.cMensaje
                    }, {
                        // settings
                        type: 'success',
                        delay: 2000,
                        mouse_over: "pause"
                    });

                    setTimeout(function() {
                        $.notifyClose();
                        window.location.href = '/SerfelWeb/PedidoCTRL/listarPedido';
                    }, 4000);
                } else {
                    $.notify({
                        // options
                        icon: 'glyphicon glyphicon-alert',
                        message: data.cMensaje
                    }, {
                        // settings
                        type: 'danger',
                        delay: 4000,
                        mouse_over: "pause"
                    });

                    error = true;
                }
            })
            .error(function(data, status, header, config) {
                $scope.ResponseDetails = "DataError: " + data +
                    "<hr />status: " + status +
                    "<hr />headers: " + header +
                    "<hr />config: " + config;

                error = true;
            });
        if (error) {
            $scope.crearPedidoClicked = false;
        }
    };


    $scope.abrirModalBuscarProducto = function($resultados) {

        var modalInstance = $uibModal.open({
            animation: 'true',
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'modalBuscarProductos.html',
            size: '',
            controller: 'modalBuscarProducto',
            resolve: {
                resultados: function() {
                    return $resultados;
                }
            }
        });

        modalInstance.result.then(function(selectedItem) {

            var abreConProductoCargado = false;

            for (index = 0; index < $scope.productos.length; index++) {
                if ($scope.productos[index].cod_serfel === selectedItem.cod_serfel) {
                    var producto = $scope.productos[index];
                    producto.indice = index;
                    abreConProductoCargado = true;
                    break;
                }
            }

            if (abreConProductoCargado) {
                $scope.abrirModalIngresarDetallePedido({ producto: producto, indice: producto.indice, esModificacion: true });
            } else {
                $scope.abrirModalIngresarDetallePedido({ producto: selectedItem, indice: -1, esModificacion: false });
            }

        }, function() {
            console.log('Modal dismissededed at: ' + new Date());
        });
    };

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
                        $scope.productos[$producto.indice].cantidad = data.productoDetallePedido.cantidad;
                        $scope.productos[$producto.indice].porcen_desc = data.productoDetallePedido.porcen_desc;
                    }
                }

                obtenerTotales();
            }
        }, function() {
            console.log('Modal dismissededed at: ' + new Date());
        });
    };

    function obtenerTotales() {

        var arregloProductos = eval($scope.productos);

        $scope.lblTotal = 0;
        $scope.descuentoTotal = 0;

        for (var i = 0; i < arregloProductos.length; i++) {

            $scope.lblTotal += parseFloat((parseFloat(arregloProductos[i].precio) * parseFloat(arregloProductos[i].cantidad)));

            $scope.descuentoTotal += parseFloat(($scope.lblTotal * parseFloat(arregloProductos[i].porcen_desc)) / parseFloat("100"));
        }

        $scope.lblTotalNeto = parseFloat($scope.lblTotal) - parseFloat($scope.descuentoTotal);
    }

    /*
    $scope.Modificar = function(accionModal) {

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

            $uibModalInstance.close({ productoDetallePedido: $scope.producto, accion: "Modificar" });

        }, function() {
            console.log('Usuario cancelo la eliminacion.');
        });
    };

    $scope.Eliminar = function(accionModal) {

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

            $uibModalInstance.close({ productoDetallePedido: $scope.producto, accion: "Eliminar" });

        }, function() {
            console.log('Usuario cancelo la eliminacion.');
        });
    };
    */
});

modificarPedidoModule.controller('modalConfirmar', function($scope, $uibModalInstance) {
    $scope.Aceptar = function() {
        $uibModalInstance.close(true);
    };

    $scope.Cancelar = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

modificarPedidoModule.controller('modalMensajes', function($scope, $uibModalInstance, tipo, valor) {

    if (tipo == 'PD') {
        $scope.tituloModalMensajes = 'Supero el porcentaje de descuento';
        $scope.mensajeModalMensajes = 'El porcentaje maximo de descuento que puede utilizar es: ' + valor;
    } else if (tipo = "CS") {
        $scope.tituloModalMensajes = 'Supero la cantidad maxima de stock';
        $scope.mensajeModalMensajes = 'El stock maximo para la venta es: ' + valor;
    }

    $scope.Aceptar = function() {
        $uibModalInstance.close();
    };

});

modificarPedidoModule.controller('modalBuscarProducto', function($scope, $uibModalInstance, resultados) {

    $scope.resultados = resultados;
    //console.log(resultados);
    $scope.tituloMensajeResultados = $scope.resultados[0].busqueda;

    $scope.Cancelar = function() {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.SetearSeleccionado = function() {

        $scope.selected = this.resultado;

        $uibModalInstance.close($scope.selected);
    };

});

modificarPedidoModule.controller('modalIngresarDetallePedido', function($scope, $uibModalInstance, $uibModal, producto) {

    $scope.producto = producto.producto;
    $scope.nombreProducto = producto.producto.nom_producto;

    $scope.disabled = true;

    if (producto.esModificacion == true) {
        $scope.disabled = false;

        if (!angular.isNumber(producto.producto.cantidad)) {
            $scope.txtCantidadPedido = producto.producto.cantidad.replace('.000', '');
            $scope.txtPorcentajeDescuento = producto.producto.porcen_desc;
        } else {
            $scope.txtCantidadPedido = producto.producto.cantidad;
            $scope.txtPorcentajeDescuento = producto.producto.porcen_desc;
        }
    }

    $scope.GuardarDetalle = function() {

        var fCantidad = 1;
        var iPorcenDesc = 0;

        if (!($scope.txtCantidadPedido === undefined) && !isNaN($scope.txtCantidadPedido)) {
            $scope.txtCantidadPedido = Math.abs($scope.txtCantidadPedido);
            fCantidad = parseInt(Number($scope.txtCantidadPedido));
            fCantidad = fCantidad === 0 ? 1 : fCantidad;
        }
        if (!($scope.txtPorcentajeDescuento === undefined) && !isNaN($scope.txtPorcentajeDescuento)) {
            $scope.txtPorcentajeDescuento = Math.abs($scope.txtPorcentajeDescuento);
            iPorcenDesc = parseFloat(Number($scope.txtPorcentajeDescuento));
        }

        if (iPorcenDesc > $scope.producto.max_porcen_desc) {

            var instanceModalMensajes = $uibModal.open({
                animation: 'true',
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: 'modalMensajes.html',
                size: '',
                controller: 'modalMensajes',
                resolve: {
                    tipo: function() {
                        return 'PD'
                    },
                    valor: function() {
                        return $scope.producto.max_porcen_desc;
                    }
                }
            });

            instanceModalMensajes.result.then(function(data) {

                $scope.producto.porcen_desc = $scope.producto.max_porcen_desc;

                if (fCantidad > ($scope.producto.cantidad_stock - $scope.producto.cantidad_pedida)) {
                    var instanceModalMensajes2 = $uibModal.open({
                        animation: 'true',
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        templateUrl: 'modalMensajes.html',
                        size: '',
                        controller: 'modalMensajes',
                        resolve: {
                            tipo: function() {
                                return 'CS'
                            },
                            valor: function() {
                                return ($scope.producto.cantidad_stock - $scope.producto.cantidad_pedida);
                            }
                        }
                    });

                    instanceModalMensajes2.result.then(function(data) {

                        $scope.producto.cantidad = ($scope.producto.cantidad_stock - $scope.producto.cantidad_pedida);

                        $uibModalInstance.close({ productoDetallePedido: $scope.producto, accion: 'Agregar Detalle' });

                    }, function() {

                        console.log('dimiss modal mensajes.');

                    });
                }

            }, function() {

                console.log('dimiss modal mensajes.');

            });
        } else if (fCantidad > ($scope.producto.cantidad_stock - $scope.producto.cantidad_pedida)) {
            var instanceModalMensajes = $uibModal.open({
                animation: 'true',
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: 'modalMensajes.html',
                size: '',
                controller: 'modalMensajes',
                resolve: {
                    tipo: function() {
                        return 'CS'
                    },
                    valor: function() {
                        return ($scope.producto.cantidad_stock - $scope.producto.cantidad_pedida);
                    }
                }
            });

            instanceModalMensajes.result.then(function(data) {

                $scope.producto.porcen_desc = $scope.producto.max_porcen_desc;
                $scope.producto.cantidad = ($scope.producto.cantidad_stock - $scope.producto.cantidad_pedida);

                $uibModalInstance.close({ productoDetallePedido: $scope.producto, accion: 'Agregar Detalle' });

            }, function() {

                console.log('dimiss modal mensajes.');

            });
        } else if (fCantidad <= ($scope.producto.cantidad_stock - $scope.producto.cantidad_pedida) && iPorcenDesc <= $scope.producto.max_porcen_desc) {
            $scope.producto.cantidad = fCantidad;
            $scope.producto.porcen_desc = iPorcenDesc;

            $uibModalInstance.close({ productoDetallePedido: $scope.producto, accion: 'Agregar Detalle' });
        }

    };

    $scope.Cancelar = function() {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.eliminarProducto = function() {

        var modalInstance = $uibModal.open({
            animation: 'true',
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'modalConfirmar.html',
            size: '',
            controller: 'modalConfirmar'
        });

        modalInstance.result.then(function(data) {

            $uibModalInstance.close({ productoDetallePedido: $scope.producto, accion: "Eliminar" });

        }, function() {
            console.log('Usuario cancelo la eliminacion.');
        });
    };

});
//Modulo angular Crear Pedido.
var crearPedidoModule = angular.module('CrearPedido', ['angularUtils.directives.dirPagination', 'ui.bootstrap']);

//Filtro que remplaza las comas por punto.
crearPedidoModule.filter('comaPorPunto', function() {
    return function(input) {
        if (input != undefined) {
            return input.replace(',', '.');
        }
    };
});

//
crearPedidoModule.controller('PedidoCTRL', function($scope, $uibModal, $http) {
    $scope.precioProductos = [];
    $scope.productos = [];
    $scope.dia_ruta = new Date().getDay();
    $scope.resultados = [];
    $scope.crearPedidoClicked = false;


    $scope.agregarProductoXCodSerfel = function() {
        var producto;
        var abreConProductoCargado;

        $scope.resultado = [];

        var bEncontrado = false;

        for (var i = 0; i < $scope.precioProductos.length; i++) {
            if ($scope.precioProductos[i].cod_serfel === $scope.txtCodSerfel) {
                var cantidad_disponible = parseFloat($scope.precioProductos[i].cantidad_stock) - parseFloat($scope.precioProductos[i].cantidad_pedida);


                $scope.resultado.push({
                    'id_lista_precio': $scope.precioProductos[i].id_lista_precio,
                    'id_producto': $scope.precioProductos[i].id_producto,
                    'nom_producto': $scope.precioProductos[i].nom_producto,
                    'nom_marca': $scope.precioProductos[i].nom_marca,
                    'nom_UM': $scope.precioProductos[i].nom_UM,
                    'cantidad_stock': $scope.precioProductos[i].cantidad_stock,
                    'cantidad_pedida': $scope.precioProductos[i].cantidad_pedida,
                    'cantidad_disponible': cantidad_disponible,
                    'cod_serfel': $scope.precioProductos[i].cod_serfel,
                    'porcen_desc': $scope.precioProductos[i].porcen_desc,
                    'precio_neto': $scope.precioProductos[i].precio_neto,
                    'precio': $scope.precioProductos[i].precio,
                    'max_porcen_desc': $scope.precioProductos[i].max_porcen_desc,
                    'busqueda': $scope.txtCodSerfel,
                    'cantidad': 0
                });

                abreConProductoCargado = false;
                for (index = 0; index < $scope.productos.length; index++) {
                    if ($scope.productos[index].cod_serfel === $scope.resultado[0].cod_serfel) {
                        producto = $scope.productos[index];
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
        } else if ($scope.resultado) {
            $scope.abrirModalIngresarDetallePedido({ producto: $scope.resultado[0], indice: -1, esModificacion: false });
        }

        $scope.txtCodSerfel = null;
    };


    $scope.buscarProducto = function() {
        $scope.resultados = [];

        var auxArray = eval($scope.precioProductos);
        var bEncontrado = false;

        for (var i = 0; i < auxArray.length; i++) {
            if (auxArray[i].nom_producto.toUpperCase().indexOf($scope.txtBuscador.toUpperCase()) > -1) {
                var cantidad_disponible = parseFloat(auxArray[i].cantidad_stock) - parseFloat(auxArray[i].cantidad_pedida);

                $scope.resultados.push({
                    'id_lista_precio': auxArray[i].id_lista_precio,
                    'id_producto': auxArray[i].id_producto,
                    'nom_producto': auxArray[i].nom_producto,
                    'nom_marca': auxArray[i].nom_marca,
                    'nom_UM': auxArray[i].nom_UM,
                    'cantidad_stock': auxArray[i].cantidad_stock,
                    'cantidad_pedida': auxArray[i].cantidad_pedida,
                    'cantidad_disponible': cantidad_disponible,
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

        $scope.abrirModalBuscarProducto();

        //$scope.txtBuscador = null;
    };


    $scope.crearPedidoProductos = function(sendData) {
        $scope.crearPedidoClicked = true;
        var error = false;

        var oPedido = {
            precio_total: $scope.lblTotalNeto,
            id_lista_precio: $scope.id_lista_precio,
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

        $http.post('/SerfelWeb/PedidoREST/crearPedido', data, config)
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
                        window.location.href = 'listarPedido';
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


    $scope.abrirModalBuscarProducto = function() {
        var modalInstance = $uibModal.open({
            animation: 'true',
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'modalBuscarProductos.html',
            size: '',
            controller: 'modalBuscarProducto',
            backdrop: 'static',
            resolve: {
                resultados: function() {
                    return $scope.resultados;
                }
            }
        });

        modalInstance.result.then(function(selectedItem) {
            var abreConProductoCargado = false;
            var producto = null;

            for (index = 0; index < $scope.productos.length; index++) {
                if ($scope.productos[index].cod_serfel === selectedItem.cod_serfel) {
                    producto = $scope.productos[index];
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
            backdrop: 'static',
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
        //Falta multiplicar por las cantidades de productos.
        var arregloProductos = eval($scope.productos);

        $scope.lblTotal = 0;
        $scope.descuentoTotal = 0;

        for (var i = 0; i < arregloProductos.length; i++) {

            $scope.lblTotal += Math.round(parseFloat(arregloProductos[i].precio) * parseFloat(arregloProductos[i].cantidad));

            $scope.descuentoTotal += Math.round(($scope.lblTotal * parseFloat(arregloProductos[i].porcen_desc)) / parseFloat("100"));
        }

        $scope.lblTotalNeto = $scope.lblTotal - $scope.descuentoTotal;
    }

    $scope.abrirModalOpcionesClientes = function() {

        var modalInstance = $uibModal.open({
            animation: 'true',
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'modalOpcionesClientes.html',
            size: '',
            controller: 'modalOpcionesClientes',
            backdrop: 'static'
        });

        modalInstance.result.then(function(opcion) {

            if (opcion == 'Ruta') {
                $scope.abrirModalSeleccionarClienteRuta();
            } else if (opcion == 'BuscarCliente') {
                $scope.abrirModalBuscarClientePorRutONombre();
            }

        }, function() {
            console.log('Modal dismissededed at: ' + new Date());
        });
    };

    $scope.abrirModalSeleccionarClienteRuta = function($clientes) {

        var modalInstance = $uibModal.open({
            animation: 'true',
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'modalSeleccionarClienteRuta.html',
            size: '',
            controller: 'modalSeleccionarClienteRuta',
            backdrop: 'static'
        });

        modalInstance.result.then(function(elementoSelecionado) {
            $scope.razon_social_cliente = elementoSelecionado.razon_social;
            $scope.nom_local_cliente = elementoSelecionado.nom_local_cliente;
            $scope.id_local_cliente = elementoSelecionado.id_local_cliente;
            $scope.id_forma_pago = elementoSelecionado.id_forma_pago;
            $scope.id_lista_precio = elementoSelecionado.id_lista_precio;

            $http
                .get("/SerfelWeb/PrecioProductoREST/listPrecioProducto/idListaPrecio/" + $scope.id_lista_precio)
                .success(function(response) {

                    $scope.precioProductos = response.listPrecioProducto;
                    $scope.lblTotal = 0;
                    $scope.lblTotalNeto = 0;

                })
                .error(function(err) {
                    console.log(err);
                });

        }, function() {
            console.log('Modal dismissededed at: ' + new Date());
        });
    };

    $scope.abrirModalBuscarClientePorRutONombre = function($clientes) {

        var modalInstance = $uibModal.open({
            animation: 'true',
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: 'modalBuscarClientePorRutONombre.html',
            size: '',
            controller: 'modalBuscarClientePorRutONombre',
            backdrop: 'static'
        });

        modalInstance.result.then(function(elementoSelecionado) {

            $scope.razon_social_cliente = elementoSelecionado.razon_social;
            $scope.nom_local_cliente = elementoSelecionado.nom_local_cliente;
            $scope.id_local_cliente = elementoSelecionado.id_local_cliente;
            $scope.id_forma_pago = elementoSelecionado.id_forma_pago;
            $scope.id_lista_precio = elementoSelecionado.id_lista_precio;

            $http
                .get("/SerfelWeb/PrecioProductoREST/listPrecioProducto/idListaPrecio/" + $scope.id_lista_precio)
                .success(function(response) {

                    $scope.precioProductos = response.listPrecioProducto;
                    $scope.lblTotal = 0;
                    $scope.lblTotalNeto = 0;

                })
                .error(function(err) {
                    console.log(err);
                });

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
            controller: 'modalCargando',
            backdrop: 'static'
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
            controller: 'modalCargando',
            backdrop: 'static'
        });

        modalInstance.result.then(function(opcion) {


        }, function() {
            console.log('Modal dismissededed at: ' + new Date());
        });
    };

    $scope.abrirModalOpcionesClientes();
});

crearPedidoModule.controller('modalBuscarProducto', function($scope, $uibModalInstance, resultados) {

    $scope.resultados = resultados;
    $scope.tituloMensajeResultados = $scope.resultados[0].busqueda;

    $scope.Cancelar = function() {
        $uibModalInstance.dismiss('cancel');
    };

    $scope.SetearSeleccionado = function() {

        $scope.selected = this.resultado;

        $uibModalInstance.close($scope.selected);
    };

});

crearPedidoModule.controller('modalIngresarDetallePedido', function($scope, $uibModalInstance, $uibModal, producto) {

    $scope.producto = producto.producto;
    $scope.nombreProducto = producto.producto.nom_producto;

    $scope.disabled = true;

    if (producto.esModificacion == true) {

        $scope.disabled = false;
        $scope.txtCantidadPedido = producto.producto.cantidad;
        $scope.txtPorcentajeDescuento = producto.producto.porcen_desc;
    }

    $scope.GuardarDetalle = function() {

        var fCantidad = 1;
        var iPorcenDesc = 0;

        if (!($scope.txtCantidadPedido === undefined) && !isNaN($scope.txtCantidadPedido)) {

            $scope.txtCantidadPedido = Math.abs($scope.txtCantidadPedido);
            fCantidad = parseFloat(Number($scope.txtCantidadPedido));
            fCantidad = fCantidad === 0 ? 1 : fCantidad;
        }

        if (!($scope.txtPorcentajeDescuento === undefined) && !isNaN($scope.txtPorcentajeDescuento)) {

            $scope.txtPorcentajeDescuento = Math.abs($scope.txtPorcentajeDescuento);
            iPorcenDesc = parseInt(Number($scope.txtPorcentajeDescuento));
        }

        if (iPorcenDesc > $scope.producto.max_porcen_desc) {

            var instanceModalMensajes = $uibModal.open({
                animation: 'true',
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: 'modalMensajes.html',
                size: '',
                controller: 'modalMensajes',
                backdrop: 'static',
                resolve: {
                    tipo: function() {
                        return 'PD';
                    },
                    valor: function() {
                        return $scope.producto.max_porcen_desc;
                    }
                }
            });

            instanceModalMensajes.result.then(function(data) {
                $scope.producto.porcen_desc = $scope.producto.max_porcen_desc;

                if (fCantidad > $scope.producto.cantidad_disponible) { //$scope.producto.cantidad_stock - $scope.producto.cantidad_pedida
                    var instanceModalMensajes2 = $uibModal.open({
                        animation: 'true',
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        templateUrl: 'modalMensajes.html',
                        size: '',
                        controller: 'modalMensajes',
                        backdrop: 'static',
                        resolve: {
                            tipo: function() {
                                return 'CS';
                            },
                            valor: function() {
                                return $scope.producto.cantidad_disponible;
                            }
                        }
                    });

                    instanceModalMensajes2.result.then(function(data) {
                        $scope.producto.cantidad = $scope.producto.cantidad_disponible;

                        //$uibModalInstance.close({ productoDetallePedido: $scope.producto, accion: 'Agregar Detalle' });

                    }, function() {

                        console.log('cerrar modal modalMensajes.');
                    });
                }

            }, function() {

                console.log('cerrar modal modalMensajes.');
            });

        } else if (fCantidad > $scope.producto.cantidad_disponible) {

            var instanceModalMensajes = $uibModal.open({
                animation: 'true',
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: 'modalMensajes.html',
                size: '',
                controller: 'modalMensajes',
                backdrop: 'static',
                resolve: {
                    tipo: function() {
                        return 'CS';
                    },
                    valor: function() {
                        return $scope.producto.cantidad_disponible;
                    }
                }
            });

            instanceModalMensajes.result.then(function(data) {
                $scope.producto.porcen_desc = $scope.producto.max_porcen_desc; //iPorcenDesc;
                $scope.producto.cantidad = ($scope.producto.cantidad_disponible); //fCantidad;

                //$uibModalInstance.close({ productoDetallePedido: $scope.producto, accion: 'Agregar Detalle' });

            }, function() {

                console.log('cerrar modal modalMensajes.');
            });

        } else if (fCantidad <= ($scope.producto.cantidad_disponible) && iPorcenDesc <= $scope.producto.max_porcen_desc) {
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

            console.log('El usuario cancelo la eliminación.');
        });
    };

});

crearPedidoModule.controller('modalConfirmar', function($scope, $uibModalInstance) {

    $scope.Aceptar = function() {
        $uibModalInstance.close(true);
    };

    $scope.Cancelar = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

crearPedidoModule.controller('modalMensajes', function($scope, $uibModalInstance, tipo, valor) {

    if (tipo == 'PD') {

        $scope.tituloModalMensajes = 'Supero el porcentaje de descuento';
        $scope.mensajeModalMensajes = 'El porcentaje maximo de descuento que puede utilizar es: ' + valor;

    } else if (tipo == "CS") {

        $scope.tituloModalMensajes = 'Supero la cantidad maxima de stock';
        $scope.mensajeModalMensajes = 'El stock maximo para la venta es: ' + valor;
    }

    $scope.Aceptar = function() {
        $uibModalInstance.close();
    };

});

crearPedidoModule.controller('modalOpcionesClientes', function($scope, $uibModalInstance) {

    $scope.BuscarCliente = function() {
        $uibModalInstance.close('BuscarCliente');
    };

    $scope.Ruta = function() {
        $uibModalInstance.close('Ruta');
    };

    $scope.Cancelar = function() {
        $uibModalInstance.dismiss();
    };
});

crearPedidoModule.controller('modalSeleccionarClienteRuta', function($scope, $uibModalInstance, $http) {
    $scope.clientesRutaBloqueados = [];
    $scope.clientesRutaEntregados = [];
    $scope.clientesRuta = [];
    $scope.dia_ruta = new Date().getDay();
    $scope.listaRutas = [];


    $http
        .get("/SerfelWeb/RutaREST/listRuta/iDiaDeLaSemana/" + $scope.dia_ruta)
        .success(function(response) {

            $scope.listaRutas = response.listLocalesRuta;

            if ($scope.listaRutas.length > 0) {

                $scope.listaRutas.forEach(ruta => {
                    var poseeEntregas = (ruta.pedidos > 0 ? true : false);

                    if (ruta.bloqueado) {

                        $scope.clientesRutaBloqueados.push({
                            'razon_social': ruta.razon_social,
                            'id_local_cliente': ruta.id_local_cliente,
                            'nom_local_cliente': ruta.nom_local_cliente,
                            'id_lista_precio': ruta.id_lista_precio,
                            'id_forma_pago': ruta.id_forma_pago,
                            'bloqueado': ruta.bloqueado,
                            'pedidos': ruta.pedidos > 0 ? true : false
                        });

                    } else if (poseeEntregas) {

                        $scope.clientesRutaEntregados.push({
                            'razon_social': ruta.razon_social,
                            'id_local_cliente': ruta.id_local_cliente,
                            'nom_local_cliente': ruta.nom_local_cliente,
                            'id_lista_precio': ruta.id_lista_precio,
                            'id_forma_pago': ruta.id_forma_pago,
                            'bloqueado': ruta.bloqueado,
                            'pedidos': ruta.pedidos > 0 ? true : false
                        });

                    } else {

                        $scope.clientesRuta.push({
                            'razon_social': ruta.razon_social,
                            'id_local_cliente': ruta.id_local_cliente,
                            'nom_local_cliente': ruta.nom_local_cliente,
                            'id_lista_precio': ruta.id_lista_precio,
                            'id_forma_pago': ruta.id_forma_pago,
                            'bloqueado': ruta.bloqueado,
                            'pedidos': ruta.pedidos > 0 ? true : false
                        });
                    }
                });
            }

        })
        .error(function(err) {
            console.log(err);
        });

    $scope.SeleccionarClienteRuta = function() {
        $scope.elementoSelecionado = this.cliente;
        $uibModalInstance.close($scope.elementoSelecionado);
    };

    $scope.SeleccionarCliente = function() {
        $uibModalInstance.close('BuscarCliente');
    };

    $scope.Ruta = function() {
        $uibModalInstance.close('Ruta');
    };

    $scope.Cancelar = function() {
        $uibModalInstance.dismiss();
    };

});

crearPedidoModule.controller('modalBuscarClientePorRutONombre', function($scope, $uibModalInstance, $http) {
    $scope.clientesRuta = [];
    $scope.dia_ruta = new Date().getDay();
    $scope.listaRutas = [];
    $scope.tableClientesHide = true;

    $scope.BuscarCliente = function() {

        $scope.clientesRuta = [];

        if ($scope.txtRutCliente != '') {

            $http
                .get("/SerfelWeb/LocalClienteREST/buscarPorRut/rut/" + $scope.txtRutCliente)
                .success(function(response) {

                    $scope.listaRutas = response.listLocales;

                    if ($scope.listaRutas.length) {

                        $scope.listaRutas.forEach(ruta => {
                            // var poseeEntregas = (ruta.pedidos > 0 ? true : false);

                            $scope.clientesRuta.push({
                                'razon_social': ruta.razon_social,
                                'id_local_cliente': ruta.id_local_cliente,
                                'nom_local_cliente': ruta.nom_local_cliente,
                                'id_lista_precio': ruta.id_lista_precio,
                                'id_forma_pago': ruta.id_forma_pago,
                                'bloqueado': ruta.bloqueado,
                                'pedidos': ruta.pedidos > 0 ? true : false
                            });

                        });

                        $scope.tableClientesHide = false;
                    }

                })
                .error(function(err) {
                    console.log(err);
                });

        } else if ($scope.txtNombreCliente != '') {

            $http
                .get("/SerfelWeb/LocalClienteREST/buscarPorNombre/nombre/" + $scope.txtNombreCliente)
                .success(function(response) {

                    $scope.listaRutas = response.listLocales;

                    if ($scope.listaRutas.length) {

                        $scope.listaRutas.forEach(ruta => {
                            // var poseeEntregas = (ruta.pedidos > 0 ? true : false);

                            $scope.clientesRuta.push({
                                'razon_social': ruta.razon_social,
                                'id_local_cliente': ruta.id_local_cliente,
                                'nom_local_cliente': ruta.nom_local_cliente,
                                'id_lista_precio': ruta.id_lista_precio,
                                'id_forma_pago': ruta.id_forma_pago,
                                'bloqueado': ruta.bloqueado,
                                'pedidos': ruta.pedidos > 0 ? true : false
                            });

                        });

                        $scope.tableClientesHide = false;
                    }

                })
                .error(function(err) {
                    console.log(err);
                });

        }

    };

    $scope.SeleccionarClienteRuta = function() {
        $scope.elementoSelecionado = this.cliente;
        $uibModalInstance.close($scope.elementoSelecionado);
    };

    $scope.Cancelar = function() {
        $uibModalInstance.dismiss();
    };

    $scope.FormatearRut = function(e) {
        var variable = false;

        var num = e.target.value.replace(/\./g, '');
        num = num.replace(/\-/g, '');
        var num2 = null;

        if (num.length > 1) {

            variable = true;
            num2 = num.substring(num.length - 1, num.length);
            num = num.substring(0, num.length - 1);
        }

        num = num.toString().split('').reverse().join('').replace(/(?=\d*\.?)(\d{3})/g, '$1.');
        num = num.split('').reverse().join('').replace(/^[\.]/, '');

        if (variable) {

            if (num2 === null) {

                e.target.value = num.toString() + "-";
            } else {

                e.target.value = num.toString() + "-" + num2;
            }
        } else {

            e.target.value = num;
        }
    };

    $scope.CampoTipoRut = function(e) {
        var a = [];
        var k = e.which;

        for (i = 48; i < 58; i++) //digitos 0-9
            a.push(i);

        a.push(75, 107);

        if (!(a.indexOf(k) >= 0))
            e.preventDefault();
    };

    $scope.ValidarRut = function(e) {
        console.log('validar rut');

        // var rutC = $(this).val();
        var rutC = $scope.txtRutCliente;

        if (rutC.length === 0) {
            return false;
        }

        rutC = rutC.replace('-', '');
        rutC = rutC.replace(/\./g, '');

        if (parseInt(rutC) === 0) {
            return false;
        }

        var suma = 0;
        var caracteres = "1234567890kK";
        var contador = 0;

        for (var i = 0; i < rutC.length; i++) {
            u = rutC.substring(i, i + 1);
            if (caracteres.indexOf(u) !== -1)
                contador++;
        }

        if (contador === 0) { return false; }

        var rut = rutC.substring(0, rutC.length - 1);
        var drut = rutC.substring(rutC.length - 1);
        var dvr = '0';
        var mul = 2;

        for (i = rut.length - 1; i >= 0; i--) {
            suma = suma + rut.charAt(i) * mul;
            if (mul === 7) mul = 2;
            else mul++;
        }

        res = suma % 11;

        if (res === 1) dvr = 'k';
        else if (res === 0) dvr = '0';
        else {
            dvi = 11 - res;
            dvr = dvi + "";
        }

        if (dvr !== angular.lowercase(drut)) {

            alert('El rut ingresado no es valido.');
            $scope.txtRutCliente = '';
            return false;
        } else {
            return true;
        }
    };

});

crearPedidoModule.controller('modalCargando', function($scope, $uibModalInstance) {});
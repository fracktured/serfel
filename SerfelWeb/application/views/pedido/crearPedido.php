<html ng-app="CrearPedido">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="format-detection" content="telephone=no" />

        <title>SerfelWeb :: Crear Pedido</title>
        
        <script src="<?= asset_url(); ?>js/autocomplete-jquery-ui.js"></script>
        <script src="<?= asset_url(); ?>angularApp/pedido/crearPedido.js"></script>
        <script src="<?= asset_url(); ?>angularApp/pedido/directives.js"></script>
        <script src="<?= asset_url(); ?>dirPagination.js"></script>

<script>

			$(function(event) {
				
				var bandera = true;
				
				if (window.history && window.history.pushState) 
				{
					if(bandera == true)
					{
						window.history.pushState('', null, 'crearPedido');
					}
				
					$(window).on('popstate', function(e) {
						
						if(bandera == true)
						{
							var confirmacion = confirm('Esta seguro que desea volver atras ? si acepta todos los cambios no guardados se perderan.');
							
							if(confirmacion == true)
							{
								window.history.go(-1);
							}
							else
							{
								bandera = confirmacion;
								document.location.href = '#';
							}
						}
						else
						{
							bandera = true;
						}
					});
				}
			});
		</script>
		
		<style>
			#ui-id-1{
				width:75%;
				background-color:white;
				list-style-type: none;
				font-weight: bold;
				padding-left:0px;
				z-index: 1000;
				max-height: 100px;
				overflow-x: hidden;
				overflow-y: scroll;
			}
			
			li.ui-menu-item {
				margin-left:0px;
				padding-left:10px;
				width:100%;
			}
			
			li.ui-menu-item.ui-state-focus {
				background-color: gray;
				width:100%;
				color: white;
			}
			
			.ui-helper-hidden-accessible{
				display: none;
			}
			
			span button.btn-group{
				width: 80px;
			}

		</style>
    </head>

    
</html>

<!-- page content -->
<div class="right_col" role="main">
    <div class="">
        <div class="page-title">
            <div class="title_left">
                <h3>Crear Pedidos</h3>
            </div>
        </div>

		<div class="clearfix"></div>
		<div class="row">
            <div class="col-md-12 col-sm-12 col-xs-12">
                <div class="x_panel" ng-controller="PedidoCTRL">
				
                    <form id="formularioCrearPedido" data-parsley-validate="" class="form-horizontal form-label-left" novalidate="" ng-cloak>
                        <div class="x_title">
<!--                             <div class="col-md-12 col-sm-12 col-xs-6" style="background-color:red; height: 20px;">
                            </div> -->
							<div class="form-group">
								<label>Razon social cliente:</label><br/>
								{{razon_social_cliente}}
							</div>
							<div>
								<label>Nombre Local Cliente:</label></br> 
								{{nom_local_cliente}}
							</div>
							<br/>
							<div class="form-group">
								<div class="input-group">
									<input type="text" id="txtBuscador" ng-model="txtBuscador" class="form-control" placeholder="Buscar Producto" >
									<span class="input-group-btn">
										<button class="btn btn-primary btn-group" type="button" ng-click="buscarProducto()"> Buscar &nbsp;</button>
									</span>
								</div>
							</div>
							<div class="form-group">
								<div class="input-group">
									<input type="text" id="txtCodSerfel" ng-model="txtCodSerfel"  class="form-control" placeholder="Ingresar Codigo Producto">
									<span class="input-group-btn">
										<button class="btn btn-primary btn-group" type="button" ng-click="agregarProductoXCodSerfel()">Agregar</button>
									</span>
								</div>
							</div>
							<div class="clearfix"></div>
						</div>
						<div class="table-responsive col-md-12 col-sm-12 col-xs-12">
							<div ng-repeat="producto in productos track by $index" class="ng-cloak col-md-12 col-sm-12 col-xs-12 table-striped table-hover" ng-click="ingresarDetallePedido({ producto:producto, indice: $index, esModificacion: true});">
								<div class="col-md-1 col-sm-1 col-xs-5">{{producto.cod_serfel}} </div>
								<div class="col-md-2 col-sm-2 col-xs-7">{{producto.nom_producto}}</div>
								<div class="col-md-2 col-sm-2 col-xs-7 col-md-push-0 col-xs-push-5">{{producto.nom_marca}}</div>
								<div class="col-md-1 hidden-xs">{{producto.nom_UM}}</div>
								<div class="col-md-1 col-sm-1 hidden-xs">{{producto.cantidad_disponible| number | comaPorPunto}}</div>
								<div class="col-md-1 col-sm-1 col-xs-5 col-md-pull-0 col-xs-pull-7">{{producto.precio | currency:undefined:0 | comaPorPunto}}</div>
								<div class="col-md-1 col-sm-1 hidden-xs">{{producto.max_porcen_desc}}</div>
								<div class="col-md-1 col-sm-1 col-xs-5">UNI: {{producto.cantidad | number | comaPorPunto}}</div>
								<div class="col-md-1 col-sm-1 col-xs-7">% DESC: {{producto.porcen_desc}}</div>
								<hr class="col-md-11 col-sm-11 col-xs-11"/>
							</div>
						</div>
						<div class="col-md-12 col-sm-12 col-xs-12">
							<table class="ng-cloak" style="float:right;">
								<tbody>
									<tr style="border-top: 1px solid grey;">
										<td style="text-align: right; padding-right: 10px;">
											<label>Total:</label>
										</td>
										<td>
											<label for="lblTotalNeto">{{ lblTotalNeto | currency:undefined:0 | comaPorPunto }}</label>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
						<br/>
						<div class="col-md-12 col-sm-12 col-xs-12 text-right" style="padding-right: 0px">
							<button class="btn btn-primary" ng-click="crearPedidoProductos(productos)" ng-disabled="crearPedidoClicked">Crear Pedido</button>
						</div>
                    </form>
                </div>
            </div>
		</div>
    </div>
</div>
<!-- /page content -->

<!--MODAL Resultados Busqueda-->
<script type="text/ng-template" id="modalBuscarProductos.html">
	<div class="modal-header">
	  <!-- <button type="button" class="close" data-dismiss="modal" ng-click="Cancelar()"><span aria-hidden="true">×</span> -->
	  </button>
	  <h4 class="modal-title" id="tituloModalResultados">Buscar Productos</h4>
	</div>
	<div class="modal-body">
	  <h4 id="tituloMensajeResultados">Resultado de busqueda para: {{tituloMensajeResultados}}</h4>
	  <p id="mensajeResultados">
		<table class="table table-striped table-hover table-condensed">
			<thead>
				<tr>
					<th></th>
					<th></th>
                    <th></th>
				</tr>
			</thead>
			<tbody>
				<tr ng-repeat="resultado in resultados" ng-click="SetearSeleccionado()">
					<td>{{resultado.cod_serfel}} <br> {{resultado.nom_producto}}</td>
					<td>{{resultado.precio | currency:undefined:0 | comaPorPunto}} <br> {{resultado.max_porcen_desc}}</td>
          <td>{{resultado.cantidad_disponible}} <br> {{resultado.nom_marca}}</td>
				</tr>
			</tbody>
		</table>
	  </p>
	 </div>
	<div class="modal-footer">
	  <button type="button" class="btn btn-primary" ng-click="Cancelar()">Cancelar</button>
	</div>
  </script>
<!--FIN MODAL-->

<!--MODAL Ingresar Pedido Detalle-->
<script type="text/ng-template" id="modalIngresarDetallePedido.html">
    <div class="modal-header">
      <!-- <button type="button" class="close" data-dismiss="modal" ng-click="Cancelar()"><span aria-hidden="true">×</span> -->
      </button>
      <h4 class="modal-title" id="tituloModalIngresarDetalle">Ingrese Detalle Pedido</h4>
    </div>
    <div class="modal-body">
      <h4 id="tituloMensajeIngresarDetalle">Producto: <label>{{nombreProducto}}</label></h4>
      <p id="mensajeResultados">
            <div class="col-md-4 col-sm-4 col-xs-4">
                <div class="form-group">
                    <label for="lblUnidades">Unidades:</label>
                    <input type="text" id="txtCantidadPedido" class="form-control" ng-model="txtCantidadPedido">
                </div>
            </div>
            <div class="col-md-4 col-sm-4 col-xs-4">
                <div class="form-group">
                    <label for="lblUnidades">% Desc:</label>
                    <input type="text" id="txtPorcentajeDescuento" class="form-control" ng-model="txtPorcentajeDescuento">
                </div>
            </div>
            <div class="form-group">
                <label for="lblUnidades">Eliminar</label><br>
                <button name="delete" class="btn btn-danger" ng-click="eliminarProducto(producto)" ng-disabled="disabled"> 
                    <span class="glyphicon glyphicon-trash" aria-hidden="true">
                    </span>
                </button>
            </div>
      </p>
     </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-primary" ng-click="GuardarDetalle()">Guardar</button>
      <button type="button" class="btn btn-primary" ng-click="Cancelar()">Cancelar</button>
    </div>
  </script>
<!--FIN MODAL-->

<!--MODAL Confirmar-->
<script type="text/ng-template" id="modalConfirmar.html">
    <div class="modal-header">
      <button type="button" class="close" data-dismiss="modal" ng-click="Cancelar()"><span aria-hidden="true">×</span>
      </button>
      <h4 class="modal-title" id="tituloModalConfirmar">Eliminar Registro</h4>
    </div>
    <div class="modal-body">
      <p id="mensajeModalConfirmar">
            ¿Esta seguro que desea eliminar el registro seleccionado?
      </p>
     </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-primary" ng-click="Aceptar()">Aceptar</button>
      <button type="button" class="btn btn-primary" ng-click="Cancelar()">Cancelar</button>
    </div>
  </script>
<!--FIN MODAL-->

<!--MODAL Opciones Clientes-->
<script type="text/ng-template" id="modalOpcionesClientes.html">
    <div class="modal-header">
      <!-- <button type="button" class="close" data-dismiss="modal" ng-click="Cancelar()"><span aria-hidden="true">×</span> -->
      </button>
      <h4 class="modal-title" id="tituloModalOpcionesClientes">Opciones Clientes</h4>
    </div>
    <div class="modal-body">
        <p id="mensajeModalOpcionesClientes">
            <div class="col-md-12 col-sm-12 col-xs-12" style="text-align:center;">
                <button type="button" class="btn btn-primary" ng-click="BuscarCliente()">Buscar Cliente</button>
                <button type="button" class="btn btn-primary" ng-click="Ruta()">Clientes de Ruta</button>
            </div>
            </br>
        </p>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-primary" ng-click="Cancelar()">Cancelar</button>
    </div>
</script>
<!--FIN MODAL-->

<!--MODAL Seleccionar Cliente Ruta-->
<script type="text/ng-template" id="modalSeleccionarClienteRuta.html">
    <div class="modal-header">
      <!-- <button type="button" class="close" data-dismiss="modal" ng-click="Cancelar()"><span aria-hidden="true">×</span> -->
      </button>
      <h4 class="modal-title" id="tituloModalSeleccionarClienteRuta">Seleccionar Cliente</h4>
    </div>
    <div class="modal-body">
      <p id="mensajeModalSeleccionarClienteRuta">
        <h4>Clientes</h4>
        <div class="form-group">
            <input type="text" id="txtCliente" ng-model="txtCliente" class="form-control" placeholder="Filtrar Clientes" >
            <!--<span class="input-group-btn">
              <button class="btn btn-primary btn-group" type="button" ng-click="filtrarClientes()"> Buscar &nbsp;</button>
            </span>-->
        </div>
        <table class="table table-striped table-hover">
            <thead>
                <tr>
                    <th></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <tr ng-repeat="cliente in clientesRuta | filter:txtCliente" ng-click="SeleccionarClienteRuta()">
                    <td>{{cliente.razon_social}} </td>
                    <td>{{cliente.nom_local_cliente}}</td>
                </tr>
            </tbody>
        </table>
        <h4>Clientes Entregados</h4>
        <table class="table table-striped table-hover">
            <thead>
                <tr>
                    <th></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <tr ng-repeat="cliente in clientesRutaEntregados | filter:txtCliente" ng-click="SeleccionarClienteRuta()">
                    <td>{{cliente.razon_social}} </td>
                    <td>{{cliente.nom_local_cliente}}</td>
                </tr>
            </tbody>
        </table>
        <h4>Clientes Bloqueados</h4>
        <table class="table table-striped table-hover">
            <thead>
                <tr>
                    <th></th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <tr ng-repeat="cliente in clientesRutaBloqueados | filter:txtCliente" ng-click="SeleccionarClienteRuta()">
                    <td>{{cliente.razon_social}} </td>
                    <td>{{cliente.nom_local_cliente}}</td>
                </tr>
            </tbody>
        </table>
      </p>
     </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-primary" ng-click="Cancelar()">Cancelar</button>
    </div>
  </script>
<!--FIN MODAL-->

<!--MODAL Buscar Cliente por RUT o Nombre-->
<script type="text/ng-template" id="modalBuscarClientePorRutONombre.html">
    <div class="modal-header">
      <!-- <button type="button" class="close" data-dismiss="modal" ng-click="Cancelar()"><span aria-hidden="true">×</span> -->
      </button>
      <h4 class="modal-title" id="tituloModalBuscarClientePorRutONombre">Buscar Cliente</h4>
    </div>
    <div class="modal-body">
      <p id="mensajeModalBuscarClientePorRutONombre">
        <div class="form-group">
            <input type="text" id="txtRutCliente" ng-keyup="FormatearRut($event)" ng-keypress="CampoTipoRut($event)" ng-blur="ValidarRut($event)" ng-readonly="txtRutClienteReadOnly" ng-focus="txtNombreClienteReadOnly=true;txtRutClienteReadOnly=false;txtNombreCliente=''" ng-model="txtRutCliente" class="form-control rut" placeholder="Rut Cliente" >
        </div>
        <div class="form-group">
          <input type="text" ng-readonly="txtNombreClienteReadOnly" ng-focus="txtNombreClienteReadOnly=false;txtRutClienteReadOnly=true;txtRutCliente=''" id="txtNombreCliente" ng-model="txtNombreCliente" class="form-control" placeholder="Nombre Cliente" >
        </div>
        <div class="form-group col-6">
          <input type="button" ng-click="BuscarCliente()" id="btnBuscarCliente" ng-model="btnBuscarCliente" class="btn btn-primary" value="Buscar">
          <input type="button" ng-click="txtNombreClienteReadOnly=false;txtRutClienteReadOnly=false;txtRutCliente='';txtNombreCliente=''" id="btnLimpiarCampos" ng-model="btnLimpiarCampos" class="btn btn-primary" value="Limpiar">
        </div>     
        <div id="divTablaBuscarClienteRutONombre" ng-hide="tableClientesHide">
          <br/>
          <h4>Clientes</h4>
          <table class="table table-striped table-hover">
            <thead>
                <tr>
                  <tr></tr>
                  <tr></tr>
                </tr>
            </thead>
            <tbody>
                <tr ng-if="clientesRuta.length > 0" ng-repeat="cliente in clientesRuta" ng-click="SeleccionarClienteRuta()">
                  <td>{{cliente.razon_social}} </td>
                  <td>{{cliente.nom_local_cliente}}</td>
                </tr>
                <tr ng-if="clientesRuta.length <= 0">
                  <td>No se han encontrado elementos que coincidan con la busqueda !</td>
                  <td></td>
                </tr>
            </tbody>
          </table>
        </div>
      </p>
     </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-primary" ng-click="Cancelar()">Cancelar</button>
    </div>
  </script>
<!--FIN MODAL-->


<!--MODAL Cargando-->
<script type="text/ng-template" id="modalCargando.html">
    <div class="modal-header">
      <button type="button" class="close" data-dismiss="modal" ng-click="Cancelar()"><span aria-hidden="true">×</span>
      </button>
      <h4 class="modal-title" id="tituloModalCargando">Cargando...</h4>
    </div>
    <div class="modal-body">
        <p id="mensajeModalCargando" style="text-align:center;">
                <img src="<?= asset_url(); ?>imagenes/loading.gif" style="width:70px; height:70px;">
        </p>
    </div>
    <div class="modal-footer">
    </div>
  </script>
<!--FIN MODAL-->

<!--MODAL Mensajes-->
<script type="text/ng-template" id="modalMensajes.html">
    <div class="modal-header">
      <button type="button" class="close" data-dismiss="modal" ng-click="Cancelar()"><span aria-hidden="true">×</span>
      </button>
      <h4 class="modal-title" id="tituloModalMensajes">{{tituloModalMensajes}}</h4>
    </div>
    <div class="modal-body">
      <p id="mensajeModalMensajes" ng-model="mensajeModalMensajes">
      {{mensajeModalMensajes}}
      </p>
     </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-primary" ng-click="Aceptar()">Aceptar</button>
    </div>
  </script>
<!--FIN MODAL-->
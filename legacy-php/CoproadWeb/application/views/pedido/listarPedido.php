<html ng-app="ListarPedido">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="format-detection" content="telephone=no" />

        <title>SerfelWeb :: Listar</title>

        <script src="<?= asset_url(); ?>angularApp/pedido/listarPedido.js"></script>
        <script src="<?= asset_url(); ?>dirPagination.js"></script>
        
		<!-- <script>
			$(function(event) {
				
				var bandera = true;
				
				if (window.history && window.history.pushState) 
				{
					if(bandera == true)
					{
						window.history.pushState('', null, 'listarPedido');
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
		</script> -->
		
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
                <h3>Listar Pedidos</h3>
            </div>
        </div>

		<div class="clearfix"></div>
		<div class="row">
            <div class="col-md-12 col-sm-12 col-xs-12">
                <div class="x_panel" ng-controller="ListarPedidoController">
						<div class="table-responsive">
                            <div ng-repeat="pedido in listaPedidos track by $index" class="ng-cloak col-md-12 col-sm-12 col-xs-12 table-striped table-hover">
                                <div class="col-md-1 col-sm-2 col-xs-6">{{ pedido.id_pedido }}</div>
                                <div class="col-md-2 col-sm-2 col-xs-6">{{ pedido.fecha_pedido }}</div>
                                <div class="col-md-2 col-sm-2 col-xs-12">{{ pedido.precio_total | currency:undefined:0 | comaPorPunto }}</div>
								<div class="col-md-2 col-sm-2 col-xs-12">{{ pedido.razon_social }}</div>
								<div class="col-md-3 col-sm-2 col-xs-12">{{ pedido.nom_local_cliente }}</div>
                                <div class="col-md-1 col-sm-2 col-xs-6 text-center">
                                    <label for="lblModificar">Modificar</label><br>
                                    <button name="update" class="btn btn-info" ng-click="Modificar('Modificar')" ng-disabled="disabled"> 
                                        <span class="glyphicon glyphicon-edit" aria-hidden="true">
                                        </span>
                                    </button>
                                </div>
                                <div class="col-md-1 col-sm-1 col-xs-5 text-center">
                                    <label for="lblEliminar">Eliminar</label><br>
                                    <button name="delete" class="btn btn-danger" ng-click="Eliminar('Eliminar')" ng-disabled="disabled"> 
                                        <span class="glyphicon glyphicon-trash" aria-hidden="true">
                                        </span>
                                    </button>
                                </div>
                                <hr class="col-md-12 col-sm-12 col-xs-12">
                            </div>
						</div>
                </div>
            </div>
		</div>
    </div>
</div>
<!-- /page content -->



<!--MODAL Confirmar-->
<script type="text/ng-template" id="modalConfirmar.html">
    <div class="modal-header">
      <button type="button" class="close" data-dismiss="modal" ng-click="Cancelar()"><span aria-hidden="true">×</span>
      </button>
      <h4 class="modal-title" id="tituloModalConfirmar">{{tituloModalConfirmar}}</h4>
    </div>
    <div class="modal-body">
      <p id="mensajeModalConfirmar">
      {{mensajeModalConfirmar}}
      </p>
     </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-primary" ng-click="Aceptar()">Aceptar</button>
      <button type="button" class="btn btn-primary" ng-click="Cancelar()">Cancelar</button>
    </div>
  </script>
<!--FIN MODAL-->
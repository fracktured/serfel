<script type="text/javascript">
    $(function() {
        $("#popUpAdvPopPedido").dialog({
            autoOpen: false,
            modal   : true,
            buttons : {
                "Cancelar": function() { $(this).dialog("close"); },
                "Ok" : anularPedidoBD
            }
        });
    });
    
    function popUpBuscarPedidoAnularPedido(idPedido) {
        $("#popUpBuscarPedidoIdPedidoElim").val(idPedido);
        $("#popUpAdvPopPedido").dialog("open");
    }
    
    function anularPedidoBD() {
        $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            url     : "Pedidos/Globales/anularPedido.php",
            data    : {
                idPedido: $("#popUpBuscarPedidoIdPedidoElim").val()
            },
            success: function(json) {
                if(json.resultado > 0) {
                    location.href = location.href;
                    //$("#popUpAdvPopPedido").dialog("close");
                    //$("#popUpBuscarPedido").dialog("close");
                    //mostrarPopUpBuscarPedido();
                }
            },
            error: function() {alert("Error desconocido");}
        });
    }
    
    function mostrarPopUpBuscarPedido() {
        var cont = 0;

        $.each($("#popUpBuscarPedido").find("div"), function() {
            cont++;
        });

        if(cont == 0) {
            $.ajax({
                async   : true,
                type    : "POST",
                dataType: "json",
                url     : "Pedidos/Globales/obtListaPedidos.php",
                success: function(json) {
                    var tabla = "<br />" +
                                "<table id='popUpBuscarPedidoListaPedidos' cellpadding='0' cellspacing='0' border='0' class='display'>" +
                                    "<thead>" +
                                        "<tr>" +
                                            "<th>N              </th>" +
                                            "<th>Fecha Pedido   </th>" +
                                            "<th>Rut Cliente    </th>" +
                                            "<th>Nombre Fantasia</th>" +
                                            "<th>Nombre Local   </th>" +
                                            "<th>Nombre Contacto</th>" +
                                            "<th>Nombre Vendedor</th>" +
                                            "<th>Precio Total   </th>" +
                                            "<th>A</th>" +
                                            "<th>S</th>" +
                                        "</tr>" +
                                    "</thead>" +
                                    "<tbody>";

                    $.each(json, function() {
                        tabla += "<tr>" +
                                     "<td>" + this.id_pedido         + "</td>" +
                                     "<td>" + this.fechaPedido       + "</td>" +
                                     "<td>" + this.rut_cliente       + "</td>" +
                                     "<td>" + this.nom_fantasia      + "</td>" +
                                     "<td>" + this.nom_local_cliente + "</td>" +
                                     "<td>" + this.nom_contacto      + "</td>" +
                                     "<td>" + this.nom_usuario       + "</td>" +
                                     "<td align='center'>" + this.precio_total + "</td>" +
                                     "<td class='linkElim'>" +
                                         "<a class='linkElim' href='javascript:popUpBuscarPedidoAnularPedido(" + this.id_pedido + ")'" +
                                                             "title='Anular'></a></td>" +
                                     "<td class='linkTicket'>" +
                                         "<a class='linkTicket' href='javascript:popUpBuscarPedidoSelecPedido(" + this.id_pedido + ")'" +
                                                               "title='Seleccionar'></a></td>" +
                                 "</tr>";
                    });

                    tabla +=    "</tbody>" +
                            "</table>" +
                            "<br />";

                    $("#popUpBuscarPedido").append(tabla);

                    $("#popUpBuscarPedidoListaPedidos").dataTable({
                        "bJQueryUI": true,
                        "sPaginationType": "full_numbers",
                        "bLengthChange": true,
                        "bFilter": true,
                        "bSort": true,
                        "bInfo": false,
                        "bAutoWidth": true,
                        "oLanguage": {
                            "sLengthMenu": "Mostrando _MENU_ resultados por página",
                            "sZeroRecords": "No se han encontrado resultados",
                            "sInfo": "Mostrando desde _START_ hasta _END_ de un total de _TOTAL_ registros",
                            "sInfoEmpty": "Mostrando desde 0 hasta 0 de un total de 0 registros",
                            "sInfoFiltered": "(Filtrado de un total de _MAX_ registros)",
                            "sSearch": "Buscar"
                        }
                    });
                },
                error: function() {alert("Error desconocido");}
            });
        }
        
        $("#popUpBuscarPedido").dialog({
            autoOpen: false,
            modal   : true,
            width   : 1100
        });
        
        $("#popUpBuscarPedido").dialog("open");
    }
</script>

<input type="hidden" id="popUpBuscarPedidoIdPedidoElim" value="" />

<div id="popUpBuscarPedido" title="Busqueda de Pedidos">
    
</div>

<div id="popUpAdvPopPedido" title="Advertencia">
    <p id="popUpAdvPopPedidoMensaje" class="popUp">
        ¿Está seguro que desea anular el Pedido?
    </p>
</div>
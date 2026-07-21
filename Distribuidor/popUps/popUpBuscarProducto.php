<script type="text/javascript">
    function iniPopUpBuscarProducto() {
        $("#popUpBuscarProducto").dialog({
            autoOpen: false,
            modal   : true,
            width   : 900
        });
    }
    
    function mostrarPopUpBuscarProducto() {
        var cont = 0;
        /*
        $.each($("#popUpBuscarProducto").find("div"), function() {
            cont++;
        });
        */
        //if(cont == 0) {
            $.ajax({
                async   : false,
                type    : "POST",
                dataType: "json",
                url     : "Productos/Globales/obtListaProductos.php",
                data    : {
                    filtro: $("#popUpBuscarProdFiltro").val(),
                    id    : $("#popUpBuscarProdId").val()
                },
                success: function(json) {
                    var tabla = "<br />" +
                                "<table id='popUpBuscarProductoListaProd' cellpadding='0' cellspacing='0' border='0' class='display'>" +
                                    "<thead>" +
                                        "<tr>" +
                                            "<th>N            </th>" +
                                            "<th>Nombre Producto</th>" +
                                            "<th>Marca    </th>" +
                                            "<th>UM     </th>" +
                                            "<th>Stock</th>" +
                                            "<th>Familia Padre</th>" +
                                            "<th>Familia</th>" +
                                            "<th>S</th>" +
                                        "</tr>" +
                                    "</thead>" +
                                    "<tbody>";

                    $.each(json, function() {
                        tabla += "<tr>" +
                                     "<td>" + this.cod_serfel          + "</td>" +
                                     "<td>" + this.nom_producto        + "</td>" +
                                     "<td>" + this.nom_marca           + "</td>" +
                                     "<td>" + this.nom_UM              + "</td>" +
                                     "<td>" + this.cantidad            + "</td>" +
                                     "<td>" + this.nom_tipo_prod_padre + "</td>" +
                                     "<td>" + this.nom_tipo_prod       + "</td>" +
                                     "<td class='linkTicket'>" +
                                         "<a class='linkTicket' href='javascript:popUpBuscarProductoSelecProd(" + this.id_producto + ")'" +
                                                               "title='Seleccionar'></a></td>" +
                                 "</tr>";
                    });

                    tabla +=    "</tbody>" +
                            "</table>" +
                            "<br />";

                    $("#popUpBuscarProducto").empty();
                    $("#popUpBuscarProducto").append(tabla);

                    $("#popUpBuscarProductoListaProd").dataTable({
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
        //}
        $("#popUpBuscarProducto").dialog("open");
    }
</script>

<input type="hidden" id="popUpBuscarProdFiltro" value="" />
<input type="hidden" id="popUpBuscarProdId" value="" />

<div id="popUpBuscarProducto" title="Busqueda de Productos">
    
</div>
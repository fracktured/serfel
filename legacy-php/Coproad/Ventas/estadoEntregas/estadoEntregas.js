/*************************************************/
/* Autor: ccastro                                */
/* Fecha: 21/10/2010                             */
/*************************************************/

$(document).ready(iniciarEventos);

function iniciarEventos() {
    iniPopUpError();
    iniPopUpExito();
                        
    $("button").button();
}

function desplegarEstadoEntregas() {
    if($("#cmbListaRutas").val() == null) {
        $("#popUpErrorMensaje").html("Debe crear una Ruta primero.");
        $("#popUpError").dialog("open");
    } else {
        $("#tituloLista").text("Lista de Precios: " + $("#cmbListaPrecio option:selected").text());
        $("#detalleEstadoEntregas").find("div").remove();
        $("#idRuta").val($("#cmbListaRutas").val());
        $("#entregado").val($("#cmbEstadoEntrega").val());
        
        var textoBoton = "";
        
        if($("#entregado").val() == 0) textoBoton = "Marcar Entregados";
        else if($("#entregado").val() == 1) textoBoton = "Desmarcar Entregados";
        
        $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            url     : "Ventas/estadoEntregas/desplegarEstadoEntregas.php",
            data: {
                idRuta   : $("#idRuta").val(),
                entregado: $("#entregado").val()
            },
            success: function(json) {
                var tabla = "<div id='marcarEntregados'>" + textoBoton + "</div>" + 
                            "<div align='right'><a id='linkSeleccionar' href='javascript:seleccionarTodos()'>Seleccionar Todos</a></div>" +
                            "<table id='tablaRuta' class='display' align='center'>" +
                                "<thead>" +
                                    "<tr>" +
                                        "<th>Rut Empresa</th>" +
                                        "<th>Rut Cliente</th>" +
                                        "<th>Razon Social Cliente</th>" +
                                        "<th>Factura</th>" +
                                        "<th>Precio Total</th>" +
                                        "<th>S</th>" +
                                    "</tr>" +
                                "</thead>" +
                                "<tbody>";
                $.each(json, function() {
                    tabla +=    "<tr>" +
                                    "<td align='center'>" + this.rut_empresa + "</td>" +
                                    "<td align='center'>" + this.rut_cliente + "</td>" +
                                    "<td>" + this.razon_social + "</td>" +
                                    "<td align='center'>" + this.factura + "</td>" +
                                    "<td align='right'>" + this.precio_total + "</td>" +
                                    "<td><input type='checkbox' id='chk-" + this.id_venta + "' /></td>" +
                                "</tr>";
                });

                tabla +=    "</tbody>" +
                        "</table>";

                $("#detalleEstadoEntregas").append(tabla);

                $("#marcarEntregados").button();
                $("#marcarEntregados").click(marcarEntregados);
                
                $("#tablaRuta").dataTable({
                    "bJQueryUI": true,
                    "sPaginationType": "full_numbers",
                    "bLengthChange": true,
                    "bFilter": true,
                    "bSort": true,
                    "bInfo": false,
                    "bAutoWidth": false,
                    "oLanguage": {
                        "sLengthMenu": "Mostrando _MENU_ resultados por página",
                        "sZeroRecords": "No se han encontrado resultados",
                        "sInfo": "Mostrando desde _START_ hasta _END_ de un total de _TOTAL_ registros",
                        "sInfoEmpty": "Mostrando desde 0 hasta 0 de un total de 0 registros",
                        "sInfoFiltered": "(Filtrado de un total de _MAX_ registros)",
                        "sSearch": "Buscar"
                    }
                });
            }
        });
        $("#detallePrecioProducto").show();
    }
}

function seleccionarTodos() {
    $.each($("#tablaRuta").find("input"), function() {
        $("#" + this.id).attr("checked", "true");
    });

    $("#linkSeleccionar").text("Deseleccionar Todos");
    $("#linkSeleccionar").attr("href", "javascript:deseleccionarTodos()");
}

function deseleccionarTodos() {
    $.each($("#tablaRuta").find("input"), function() {
        $("#" + this.id).removeAttr("checked");
    });

    $("#linkSeleccionar").text("Seleccionar Todos");
    $("#linkSeleccionar").attr("href", "javascript:seleccionarTodos()");
}

function marcarEntregados() {
    var datos = new Array();
    var ventas = new Array();
    var i = 0;


    $.each($("#tablaRuta").find("input"), function() {
        if($("#" + this.id).attr("checked")) {
            datos = this.id.split("-");
                   
            ventas[i] = datos[1];
            i++;
        }
    });
        
    if(i == 0) {
        $("#popUpErrorMensaje").html("Debe seleccionar al menos una Venta de la lista.");
        $("#popUpError").dialog("open");
    } else {
        var textoPregunta = "";
        var entregado = 0;
        
        if($("#entregado").val() == 0) textoPregunta = "Marcar como Entregadas";
        else if($("#entregado").val() == 1) textoPregunta = "Eliminar de la Lista de Entregadas";
            
        var acepto = confirm(String.fromCharCode(191) + "Esta seguro que desea " + textoPregunta + " las Ventas seleccionadas?");
        
        if($("#entregado").val() == 0) entregado = 1;
        else if($("#entregado").val() == 1) entregado = 0;
        
        if(acepto) {
            $.ajax({
                async   : true,
                type    : "POST",
                dataType: "json",
                url     : "Ventas/estadoEntregas/ingCambioEstadoEntregas.php",
                data:{
                    ventas   : ventas,
                    entregado: entregado
                },
                success: function(json) {
                    if(json.resultado == 1) {
                        $("#popUpExito").dialog({ title: "Actualización de Estado de Entregas" });
                        $("#popUpExitoMensaje").html("Entregas actualizadas con éxito.");
                        $("#popUpExito").dialog("open");
                    } else if(json.resultado == -2) {
                        mensajesPopUpError(json.tipoError);
                    }
                },
                error: function() { alert("Error desconocido"); }
            });
        }
    }
}
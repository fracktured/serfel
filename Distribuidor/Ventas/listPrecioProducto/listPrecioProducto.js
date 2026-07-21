/*************************************************/
/* Autor: ccastro                                */
/* Fecha: 21/10/2010                             */
/*************************************************/

$(document).ready(iniciarEventos);

function iniciarEventos() {
    iniPopUpError();
    iniPopUpExito();
    
    $("button").button();
    $("#signoPorcen").hide();
    $("#btnAsociarPorcenVariacion").hide();
    $("#detallePrecioProducto").hide();
    $("#btnBorrarVariacion").hide();
    
    $("#btnAsociarPrecioProductos").click(asociarPrecioProductos);
    $("#btnAsociarPorcenVariacion").click(asociarVariacion);
    $("#btnBorrarVariacion").click(borrarVariacion);
    $("#nuevoPrecio").numeric("");
    
    $("#popUpIngListaPrecio").dialog({
        bgiframe: true,
	resizable: false,
	autoOpen: false,
	modal: true,
        width: 550,
        heigth: 300,
	overlay: {
            backgroundColor: '#000',
            opacity: 0.5
	},
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIng();
            },
            'Agregar esta Lista de Precio': function() {
                ingListaPrecioBD();
            }
        },
        close   : limpiarPopUpIng
    });

    $("#popUpElimListaPrecio").dialog({
        bgiframe: true,
	resizable: false,
	autoOpen: false,
	modal: true,
        width: 400,
	overlay: {
            backgroundColor: '#000',
            opacity: 0.5
	},
	buttons: {
            'Cancelar': function() { 
                $(this).dialog('close'); 
                $("#idlistaPrecio").val("");
            },
            'Eliminar esta Lista de Precio': function() {
                elimListaPrecioBD();
		$(this).dialog('close');
            }
	}
    });
}

function agregarLista() {
    $("#popUpIngListaPrecio").dialog("open");
}

function ingListaPrecioBD() {
    var errores = false;

    // Se hacen varios if para q coloree todos los campos con errores
    if(validaInputVacio("nomNuevaLista", "")) errores = true;

    if(errores) mensajesPopUpError("vacios");
    else {
        $.ajax({
            data: {
                nomListaPrecio: $("#nomNuevaLista").val()
            },
            type    : "POST",
            dataType: "json",
            url     : "Ventas/listPrecioProducto/ingListaPrecio.php",
            success : function(json) {
                $("#popUpExito").dialog({ title: "Ingreso de Listas de Precio" });

                if(json.resultado > 0) {
                    $("#popUpExitoMensaje").html("Nueva Lista de Precio ingresada exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if(json.resultado == 0) {
                    $("#popUpErrorMensaje").html("La Lista de Precio ya se encuentra ingresada al Sistema.");
                    $("#popUpError").dialog("open");
                } else if(json.resultado == -2) {
                    mensajesPopUpError(json.tipoError);
                }
            },
            error: function() { alert("Error desconocido"); }
        });
    }
}

function limpiarPopUpIng() {
    $("#nomNuevaLista").val("");
}

function eliminarLista() {
    $("#idListaPrecioElim").val($("#cmbListaPrecio").val());
    $("#nomListaPrecioElim").html($("#cmbListaPrecio option:selected").text());
    $("#popUpElimListaPrecio").dialog("open");
}

function elimListaPrecioBD() {
    $.ajax({
        data: {
            idListaPrecio: $("#idListaPrecioElim").val()
        },
        type    : "POST",
        dataType: "json",
        url     : "Ventas/listPrecioProducto/elimListaPrecio.php",
        success : function(json) {
            $("#popUpExito").dialog({ title: "Eliminación de Listas de Precio" });
            
            if(json.resultado == 1) {
                $("#popUpExitoMensaje").html("La Lista de Precio ha sido eliminada del Sistema.");
                $("#popUpExito").dialog("open");
            }
        },
        error: function() { alert("Error desconocido"); }
    });
}

function desplegarProductos() {
    if($("#cmbListaPrecio").val() == 0) {
        $("#popUpErrorMensaje").html("Debe escoger una Lista de Precios.");
        $("#popUpError").dialog("open");
    } else {
        
        $("#popUpCargando").dialog("open");
        $("#tituloLista").text("Lista de Precios: " + $("#cmbListaPrecio option:selected").text());
        $("#divTablaPreciosProducto").find("div").remove();
        $("#idLista").val($("#cmbListaPrecio").val());
        
        $.ajax({
            async   : false,
            type    : "POST",
            dataType: "json",
            url     : "Ventas/listPrecioProducto/desplegarPrecioProducto.php",
            data: {
                idListaPrecio : $("#cmbListaPrecio").val()
            },
            success: function(json) {
                var tabla = "<div align='right'><a id='linkSeleccionar' href='javascript:seleccionarTodos()'>Seleccionar Todos</a></div>" +
                            "<table id='tablaPrecioProducto' class='display' align='center'>" +
                                "<thead>" +
                                    "<tr>" +
                                        "<th>N</th>" +
                                        "<th width='25%'>Nombre Producto</th>" +
                                        "<th>Costo Ult. Compra</th>" +
                                        "<th>Precio Neto</th>" +
                                        "<th>Precio Base</th>" +
                                        "<th>Máx. % Desc.</th>" +
                                        "<th>Precio Venta Cliente</th>" +
                                        //"<th>Margen Utilidad</th>" +
                                        "<th>S</th>" +
                                    "</tr>" +
                                "</thead>" +
                                "<tbody>";
                $.each(json, function() {
                    tabla +=    "<tr>" +
                                    "<input type='hidden' id='costo-" + this.id_producto + "' value=" + this.costo_ult_compra + " />" +
                                    "<input type='hidden' id='precio-" + this.id_producto + "' value=" + this.precio_venta + " />" +
                                    "<input type='hidden' id='porcen-" + this.id_producto + "' value=" + this.porc_desc + " />" +
                                    "<td align='center' style='" + this.color + "'>" + this.cod_serfel          + "</td>" +
                                    "<td style='" + this.color + "'>" + this.nom_producto         + "</td>" +
                                    "<td align='center' style='" + this.color + "'>" + this.str_costo_ult_compra + "</td>" +
                                    "<td align='center' style='" + this.color + "'>" + this.str_precio_neto      + "</td>" +
                                    "<td align='center' style='" + this.color + "'>" + this.str_precio_base      + "</td>" +
                                    "<td align='center' style='" + this.color + "'>" + this.str_porc_desc        + "</td>" +
                                    "<td align='center' style='" + this.color + "'>" + this.str_precio_venta     + "</td>" +
                                    //"<td align='center' style='" + this.color + "'>" + this.str_margen_utilidad  + "</td>" +
                                    "<td style='" + this.color + "'><input type='checkbox' id='chk-" + this.id_producto + "' /></td>" +
                                "</tr>";
                });

                tabla +=    "</tbody>" +
                        "</table>";

                $("#divTablaPreciosProducto").append(tabla);

                $("#tablaPrecioProducto").dataTable({
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
        $("#popUpCargando").dialog("close");
    }
}

function nuevoPrecio() {
    $("#textoNuevoPrecio").text("Nuevo Precio");
    $("#btnAsociarPrecioProductos").show();
    $("#btnAsociarPorcenVariacion").hide();
    $("#signoPorcen").hide();
    $("#btnBorrarVariacion").hide();
    $("#tablaCambio").show();
    $("#signoPeso").show();
}

function nuevoDescuento() {
    $("#textoNuevoPrecio").text("Nuevo Máx. % de Descuento");
    $("#btnAsociarPrecioProductos").hide();
    $("#btnAsociarPorcenVariacion").button({
        label: "Asociar Máx. % de Descuento"
    });
    $("#btnAsociarPorcenVariacion").show();
    $("#signoPeso").hide();
    $("#btnBorrarVariacion").hide();
    $("#tablaCambio").show();
    $("#signoPorcen").show();
}

function nuevoRecargo() {
    $("#textoNuevoPrecio").text("Nuevo % de Recargo");
    $("#btnAsociarPrecioProductos").hide();
    $("#btnAsociarPorcenVariacion").button({
        label: "Asociar % de Recargo"
    });
    $("#btnAsociarPorcenVariacion").show();
    $("#signoPeso").hide();
    $("#btnBorrarVariacion").hide();
    $("#tablaCambio").show();
    $("#signoPorcen").show();
}

function borrarPorcentaje() {
    $("#tablaCambio").hide();
    $("#btnBorrarVariacion").show();
}

function seleccionarTodos() {
    $.each($("#tablaPrecioProducto").find("input"), function() {
        $("#" + this.id).attr("checked", "true");
    });

    $("#linkSeleccionar").text("Deseleccionar Todos");
    $("#linkSeleccionar").attr("href", "javascript:deseleccionarTodos()");
}

function deseleccionarTodos() {
    $.each($("#tablaPrecioProducto").find("input"), function() {
        $("#" + this.id).removeAttr("checked");
    });

    $("#linkSeleccionar").text("Seleccionar Todos");
    $("#linkSeleccionar").attr("href", "javascript:seleccionarTodos()");
}

function asociarPrecioProductos() {
    if($("#nuevoPrecio").val() == "") {
        $("#popUpErrorMensaje").html("Debe ingresar un Precio de Venta.");
        $("#popUpError").dialog("open");
    } else if($("#nuevoPrecio").val() == 0) {
        $("#popUpErrorMensaje").html("El Precio de Venta debe ser mayor que 0 (cero).");
        $("#popUpError").dialog("open");
    } else {
        var nuevoPrecio = $("#nuevoPrecio").val();
        //var existePrecioMenor = false;
        var datos = new Array();
        var productos = new Array();
        var i = 0;


        $.each($("#tablaPrecioProducto").find("input"), function() {
            if($("#" + this.id).attr("checked")) {
                datos = this.id.split("-");
                    
                productos[i] = datos[1];
                i++;
                /*
                if(parseInt($("#costo-" + datos[1]).val()) >= (nuevoPrecio / (1 - ($("#porcen-" + datos[1]).val() / 100)))) {
                    existePrecioMenor = true;
                }*/
            }
        });

        //if(existePrecioMenor) {
        //    $("#popUpErrorMensaje").html("Ese Precio de Venta deja a uno de sus Productos con un Precio menor o igual al valor del Costo.");
        //    $("#popUpError").dialog("open");
        //        alert("ERROR!!!...Ese Precio de Venta deja a uno de sus Productos con un Precio Neto de Venta menor o igual al valor del Costo Promedio");
        //    } else 
        if(i == 0) {
            $("#popUpErrorMensaje").html("Debe seleccionar al menos un Producto de la lista.");
            $("#popUpError").dialog("open");
        } else {
            var acepto = confirm(String.fromCharCode(191) + "Esta seguro que desea cambiar el Precio de Venta de los Productos seleccionados?");
            
            if(acepto) {
                $.ajax({
                    async   : true,
                    type    : "POST",
                    dataType: "json",
                    url     : "Ventas/listPrecioProducto/ingPrecioProductos.php",
                    data:{
                        precioVenta   : nuevoPrecio,
                        productos     : productos,
                        totalProductos: i -1,
                        idListaPrecio : $("#idLista").val()
                    },
                    success: function(json) {
                        if(json.resultado == 1) {
                            $("#popUpExito").dialog({
                                autoOpen: false,
                                modal   : true,
                                buttons : {
                                    "Ok": function() { location.href = "SisDist.php?act=listPrecioProducto"; }
                                },
                                close   : function() { location.href = "SisDist.php?act=listPrecioProducto"; }
                            });
                            $("#popUpExito").dialog({ title: "Actualización de Precios" });
                            $("#popUpExitoMensaje").html("Precios actualizados con éxito.");
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
}

function asociarVariacion() {
    var tipoVariacion;
    var acepto;

    if($("#cambiarVariacionDesc").attr("checked")) tipoVariacion = "Descuento";
    else if($("#cambiarVariacionRec").attr("checked")) tipoVariacion = "Recargo";

    if($("#nuevoPrecio").val() == "") {
        $("#popUpErrorMensaje").html("Debe ingresar un % de " + tipoVariacion + ".");
        $("#popUpError").dialog("open");
    } else if($("#nuevoPrecio").val() <= 0) {
        $("#popUpErrorMensaje").html("EL % de " + tipoVariacion + " debe ser mayor que 0 (cero).");
        $("#popUpError").dialog("open");
    } else {
        var nuevaVariacion = $("#nuevoPrecio").val();
        //var existePrecioMenor = false;
        var datos     = new Array();
        var productos = new Array();
        var i = 0;
        //var nuevoPrecio;

        //if(tipoVariacion == "Descuento") nuevaVariacion = nuevaVariacion * -1;

        $.each($("#tablaPrecioProducto").find("input"), function() {
            if($("#" + this.id).attr("checked")) {
                datos = this.id.split("-");

                productos[i] = datos[1];
                i++;
                /*
                nuevoPrecio = parseInt(($("#precio-" + datos[1]).val()) / (1 + ((iva + parseFloat($("#impAsoc-" + datos[1]).val())) / 100))
                                          ) * (1 + (nuevaVariacion / 100));
                    if(nuevaVariacion < 0
                            && parseInt($("#costo-" + datos[1]).val()) >= nuevoPrecio) {
                        existePrecioMenor = true;
                    }*/
            }
        });

        if(i == 0) {
            $("#popUpErrorMensaje").html("Debe seleccionar al menos un Producto de la lista.");
            $("#popUpError").dialog("open");
        } else {
            //if(existePrecioMenor) {
            //        acepto = confirm("El % de Descuento que acaba de asignar deja al Producto con un Margen de Utilidad negativo.\n"
            //                         + String.fromCharCode(191) + "Esta seguro que desea asignarlo de todas formas?");
            //    } else {
            acepto = confirm(String.fromCharCode(191) + "Esta seguro que desea cambiar el % de " + tipoVariacion + " de los Productos seleccionados?");

            if(acepto) {
                $.ajax({
                    async   : true,
                    type    : "POST",
                    dataType: "json",
                    url     : "Ventas/listPrecioProducto/ingPorcenVariacion.php",
                    data:{
                        porcenVariacion: nuevaVariacion,
                        productos      : productos,
                        totalProductos : i -1,
                        idListaPrecio  : $("#idLista").val()
                    },
                    success: function(json) {
                        if(json.resultado == 1) {
                            $("#popUpExito").dialog({
                                autoOpen: false,
                                modal   : true,
                                buttons : {
                                    "Ok": function() { location.href = "SisDist.php?act=listPrecioProducto"; }
                                },
                                close   : function() { location.href = "SisDist.php?act=listPrecioProducto"; }
                            });
                            $("#popUpExito").dialog({ title: "Actualización de Precios" });
                            $("#popUpExitoMensaje").html("Porcentajes de " + tipoVariacion + " actualizados con éxito.");
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
}

function borrarVariacion() {
    var acepto = confirm(String.fromCharCode(191) + "Esta seguro que desea eliminar el % de Descuento/Recargo de los Productos seleccionados?");

    if(acepto) {
        var datos     = new Array();
        var productos = new Array();
        var i = 0;

        $.each($("#tablaPrecioProducto").find("input"), function() {
            if($("#" + this.id).attr("checked")) {
                datos = this.id.split("-");

                productos[i] = datos[1];
                i++;
            }
        });

        if(i == 0) {
            $("#popUpErrorMensaje").html("Debe seleccionar al menos un Producto de la lista.");
            $("#popUpError").dialog("open");
        } else {
            $.ajax({
                async   : true,
                type    : "POST",
                dataType: "json",
                url     : "Ventas/listPrecioProducto/ingPorcenVariacion.php",
                data:{
                    porcenVariacion: 0,
                    productos      : productos,
                    totalProductos : i -1,
                    idListaPrecio  : $("#idLista").val()
                },
                success: function(json) {
                    if(json.resultado == 1) {
                        $("#popUpExito").dialog({
                            autoOpen: false,
                            modal   : true,
                            buttons : {
                                "Ok": function() { location.href = "SisDist.php?act=listPrecioProducto"; }
                            },
                            close   : function() { location.href = "SisDist.php?act=listPrecioProducto"; }
                        });
                        $("#popUpExito").dialog({ title: "Actualización de Precios" });
                        $("#popUpExitoMensaje").html("Porcentajes de Descuento/Recargo eliminados con éxito.");
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
/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 24-02-2012                                        *
 * Desc : Funciones de pagina de lista de niveles de        *
 *        stock                                             *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    iniPopUpBuscarProducto();
    
    $("button").button();
    $("#cantidad").numeric("");
    
    $("#popUpElim").dialog({
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
                $("#idProdElim").val("");
                $("#idBodElim").val("");
            },
            'Eliminar esta Merma': function() {
                elimMermaBD();
		$(this).dialog('close');
            }
	}
    });

    $("#popUpIngMod").dialog({
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
                limpiarPopUpIngMod();
            },
            'Ingresar Merma': function() {
                ingMermaBD();
            }
        },
        close   : limpiarPopUpIngMod
    });
    
    $("#popUpExito").dialog({
        autoOpen: false,
        modal   : true,
        buttons : {
            "Ok": function() { document.location.href = document.location.href; }
        },
        close   : function() { document.location.href = document.location.href; }
    });
});

function despMermas() {
    $("#detalleMermas").find("div").remove();
    $("#detalleMermas").find("br").remove();
    $("#detalleMermas").find("button").remove();
    $("#idBodegaMod").val($("#cmbListaBodegas").val());

    $.ajax({
        async   : true,
        type    : "POST",
        dataType: "json",
        url     : "Stock/listMermas/desplegarMermas.php",
        data: {
            idBodega : $("#cmbListaBodegas").val()
        },
        success: function(json) {
            var tabla = "<button id='ingMerma'>Ingresar Nueva Merma</button>" +
                        "<br /><br />" +
                        "<table id='mermas' class='display' align='center'>" +
                            "<thead>" +
                                "<tr>" +
                                    "<th>N</th>" +
                                    "<th>Nombre Producto</th>" +
                                    "<th>Familia</th>" +
                                    "<th>UM</th>" +
                                    "<th>Cantidad</th>" +
                                    "<th>Motivo</th>" +
                                    "<th>Fecha</th>" +
                                    "<th>E</th>" +
                                "</tr>" +
                            "</thead>" +
                            "<tbody>";
            $.each(json, function() {
                tabla +=    "<tr>" +
                                "<td>" + this.id_producto       + "</td>" +
                                "<td>" + this.nom_producto      + "</td>" +
                                "<td>" + this.nom_familia       + "</td>" +
                                "<td align='center'>" + this.nom_UM + "</td>" +
                                "<td align='center'>" + this.cantidad + "</td>" +
                                "<td align='center'>" + this.motivo + "</td>" +
                                "<td align='center'>" + this.fecha_form  + "</td>" +
                                "<td class='linkElim'>" +
                                    "<a class='linkElim' href='javascript:elimMerma(" + this.id_producto + ", \"" + this.fecha + "\")' " +
                                                       "title='Eliminar'></a></td>" +
                            "</tr>";
            });

            tabla +=    "</tbody>" +
                    "</table>";
                
            $("#detalleMermas").append(tabla);
            
            $("button").button();
            $("#ingMerma").click(mostrarPopUpBuscarProducto);
                
            $("#mermas").dataTable({
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
}

function popUpBuscarProductoSelecProd(idProducto) {
    $("#popUpBuscarProducto").dialog("close");
    ingMerma(idProducto);
}

function ingMerma(idProducto) {
    $("#popUpIngMod").dialog({
        bgiframe: true,
	resizable: false,
	autoOpen: false,
	modal: true,
        width: 550,
        heigth: 300,
        title: "Ingreso de Mermas",
	overlay: {
            backgroundColor: '#000',
            opacity: 0.5
	},
        buttons : {
            'Cancelar': function() {
                $(this).dialog('close');
                limpiarPopUpIngMod();
            },
            'Ingresar nueva Merma': function() {
                ingMermaBD();
            }
        },
        close   : limpiarPopUpIngMod
    });
    
    $.ajax({
        data: {
            idProducto: idProducto
        },
        type    : "POST",
        dataType: "json",
        url     : "Productos/Globales/obtInfoProducto.php",
        success : function(json) {
            $("#idProductoMod").val(idProducto);
            $("#spanNomProductoMod").html(json.nomProd);
        },
        error: function() { alert("Error desconocido"); }
    });
    
    $.ajax({
        data: {
            idBodega: $("#idBodegaMod").val()
        },
        type    : "POST",
        dataType: "json",
        url     : "Stock/Globales/obtInfoBodega.php",
        success : function(json) {
            $("#spanNomBodegaMod").html(json.nombre);
        },
        error: function() { alert("Error desconocido"); }
    });
    
    $("#popUpIngMod").dialog("open");
}

function ingMermaBD() {
    var errores = false;

    // Se hacen varios if para q coloree todos los campos con errores
    if(validaInputVacio("cantidad", "")) errores = true;
    if(validaInputVacio("motivo", ""))   errores = true;

    if(errores) mensajesPopUpError("vacios");
    else {
        $.ajax({
            data: {
                idBodega  : $("#idBodegaMod").val(),
                idProducto: $("#idProductoMod").val(),
                cantidad  : $("#cantidad").val(),
                motivo    : $("#motivo").val()
            },
            type    : "POST",
            dataType: "json",
            url     : "Stock/listMermas/ingMerma.php",
            success : function(json) {
                $("#popUpExito").dialog({ title: "Ingreso de Mermas" });

                if(json.resultado > 0) {
                    $("#popUpExitoMensaje").html("Nueva Merma ingresada exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if(json.resultado == -2) {
                    mensajesPopUpError(json.tipoError);
                }
            },
            error: function() { alert("Error desconocido"); }
        });
    }
}

function limpiarPopUpIngMod() {
    $("#spanNomBodegaMod").html("");
    $("#spanNomProductoMod").html("");
    $("#cantidad").val("");
    $("#motivo").val("");
}

function elimMerma(idProducto, fechaMerma) {
    $("#idProdElim").val(idProducto);
    $("#idBodElim").val($("#idBodegaMod").val());
    $("#fechaElim").val(fechaMerma);
    $("#popUpElim").dialog("open");
}

function elimMermaBD() {
    $.ajax({
        data: {
            idProducto: $("#idProdElim").val(),
            idBodega  : $("#idBodElim").val(),
            fechaMerma: $("#fechaElim").val()
        },
        type    : "POST",
        dataType: "json",
        url     : "Stock/listMermas/elimMerma.php",
        success : function(json) {
            $("#popUpExito").dialog({ title: "Eliminación de Mermas" });
            
            if(json.resultado == 1) {
                $("#popUpExitoMensaje").html("La Merma ha sido eliminada del Sistema.");
                $("#popUpExito").dialog("open");
            }
            $("#idProdElim").val("");
            $("#idBodElim").val("");
        },
        error: function() { alert("Error desconocido"); }
    });
}
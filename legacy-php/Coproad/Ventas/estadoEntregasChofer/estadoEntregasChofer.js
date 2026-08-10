/*************************************************/
/* Autor: ccastro                                */
/* Fecha: 21/10/2010                             */
/*************************************************/

$(document).ready(iniciarEventos);

function iniciarEventos() {
    iniPopUpError();
    iniPopUpExito();
    iniPopUpBuscarProducto();
                        
    $("#fechaEntrega").datepicker({
        dateFormat : 'dd/mm/yy'
    });
    
    if($("#detalleEstadoEntregas").find("table")) {
        $("#tablaEntregasC").dataTable({
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
    
    $("button").button();
    
    $("#popUpEstadoEntregaContainer").dialog({
        autoOpen: false,
        modal   : true,
        height  : "auto",
        width   : "auto",
        buttons : {
            "Guardar": doFinalizarEntrega
        }
    });
    
    $("#popUpBuscarProdFiltro").val("prodVenta");
}

function popUpEstadoEntregaChofer(idVenta) {
    $("#popUpBuscarProdId").val(idVenta);
    
    $("#popUpEstadoEntregaContainer").empty();
    $("#popUpEstadoEntregaContainer").load(
        "Ventas/estadoEntregasChofer/popUpEstadoEntregaChofer.php",
        {idVenta: idVenta},
        function( response, status, xhr ) {
            if (status == "error") {
                var msg = "Ha ocurrido un error: ";
                alert( msg + xhr.status + " " + xhr.statusText );
            } else {
                $("#btnAgregarDevolucion").button();
                $("#btnAgregarDevolucion").click(mostrarPopUpBuscarProducto);
                
                $("#popUpEstadoEntregaContainer").dialog("open");
            }
        }
    );
    
}

function popUpBuscarProductoSelecProd(idProducto) {
    $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            url     : "Ventas/Globales/obtInfoProductoVenta.php",
            data    : {
                rutEmpresa: $("#rutEmpresa").val(),
                numFactura: $("#numFactura").val(),
                idProducto: idProducto,
                tipoId    : "idProducto"
            },
            success: function(json) {
                var contProd   = 0;
                var tabla      = "";
                var existeProd = false;

                $.each($("#tblProdDevueltosBody").find("tr"), function() {
                    contProd++;
                    if(this.id == "fila-" + json.idProducto) existeProd = true;
                });

                if(json.resultado == 0) {
                    $("#popUpErrorMensaje").html("El código no corresponde a ningun producto de la Venta.");
                    $("#popUpError").dialog("open");
                    $("#idProducto").val("");
                    $("#idProducto").focus();
                } else {

                    if(!existeProd) {
                        tabla += "<tr id='fila-" + json.idProducto + "'>" +
                                    "<input type='hidden' id='cantDisp-" + json.idProducto + "' value='" + json.cantVenta + "' />" +
                                    "<input type='hidden' id='precioVenta-" + json.idProducto + "' value='" + json.precioEntero + "' />" +
                                    "<input type='hidden' id='porcen-" + json.idProducto + "' value='" + json.porcenDesc + "' />" +
                                    
                                    "<td>" + json.codSerfel  + "</td>" +
                                    "<td align='left'>&nbsp;&nbsp;" + json.nomProd + "</td>" +
                                    "<td>&nbsp;&nbsp;" + json.nomMarca + "</td>" +
                                    "<td>&nbsp;&nbsp;" + json.nomUM + "</td>" +
                                    "<td align='center'>" + json.cantVenta + "</td>" +
                                    "<td><input type='text' id='cant-" + json.idProducto + "' value='0' class='cantVenta'" +
                                               "onchange='javascript:cambioCantidad(" + json.idProducto + ", parseFloat(this.value))' /></td>" +
                                    "<td id='tdFila-" + json.idProducto + "'></td>" +
                                    "<td>" + json.porcenDesc + "%</td>" +
                                    "<td><input type='hidden' id='precio-" + json.idProducto + "' value='" + json.precioNetoEntero + "' />" + 
                                        json.precioNeto + "&nbsp;&nbsp;</td>" +
                                    "<td><span id='total-" + json.idProducto + "' name='" + json.precioNetoEntero + "'>" +
                                        0 + "</span>&nbsp;&nbsp;</td>" +
                                    "<td class='linkElim'>" +
                                        "<a href='javascript:quitarProducto(" + json.idProducto + ")' class='linkElim'></a></td>"
                            + "</tr>";
                    } else {
                        alert("El producto [" + json.codSerfel + "] " + json.nomProd + " ya se encuentra ingresado.");
                    }

                    $("#tblProdDevueltosBody").append(tabla);
                    
                    var oCmbMotivoDevolucion = $("#cmbMotivoDevolucion").clone();
                    oCmbMotivoDevolucion.attr("id", "motDev-" + json.idProducto);
                    oCmbMotivoDevolucion.css("display", "inline");
                    $("#tdFila-" + json.idProducto).append(oCmbMotivoDevolucion);

                    $("#cant-" + json.idProducto).numeric();
                    $("#porcen-" + json.idProducto).numeric();
                    
                }
                
                $("#popUpBuscarProducto").dialog("close");
            },
            error: function() {
                alert("Error desconocido");
            }
        });
}

function quitarProducto(idProducto) {
    $("#fila-" + idProducto).remove();
}

function cambioCantidad(idProducto, cant) {
    if(cant > $("#cantDisp-" + idProducto).val()) {
        cant = $("#cantDisp-" + idProducto).val();
        
        $("#popUpAdvertenciaMensaje").html("La Cantidad es mayor que la Cantidad Disponible.");
        $("#popUpAdvertencia").dialog("open");
        $("#cant-" + idProducto).val(cant);
    }
    
    if(cant < 0) {
        cant *= -1;
        $("#cant-" + idProducto).val(cant);
    }
    
    var precio = parseInt($("#precio-" + idProducto).val());
    var porcen = parseFloat($("#porcen-" + idProducto).val());
    
    $("#total-" + idProducto).text(formatoDinero(calcularPrecioDescEntero(precio, porcen, cant)));
}

function doFinalizarEntrega() {
    var datos     = Array();
    var productos = Array();
    var i = 0;
        
    $.each($("#tblProdDevueltosBody").find("tr"), function() {
        if(this.id.substring(0, 5) == "fila-") {
            datos = this.id.split("-");
                
            productos[i] = { 
                idProducto      : datos[1], 
                cantidad        : $("#cant-" + datos[1]).val(),
                motivoDevolucion: $("#motDev-" + datos[1]).val()
            };
        }
        i++;
    });
    
    $.ajax({
        async   : true,
        type    : "POST",
        dataType: "json",
        url     : "Ajax/Venta/ajaxIngModEntregaChofer.php",
        data    : {
            idVenta     : $("#idVenta").val(),
            idFormaPago : $("#cmbFormaPago").val(),
            productos   : productos
        },
        success: function(json) {
            if(json.exito) {
                $("#popUpExitoMensaje").html(json.mensaje);
                $("#popUpExito").dialog("open");
            } else if(json.error) {
                $("#popUpErrorMensaje").html(json.mensaje);
                $("#popUpError").dialog("open");
            }
        },
        error: function() {alert("Error desconocido");}
    });
}
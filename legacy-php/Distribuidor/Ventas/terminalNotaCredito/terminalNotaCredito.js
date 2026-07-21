/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 24-02-2012                                        *
 * Desc : Funciones de pagina de terminal de Ventas         *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    iniPopUpBuscarProducto();

    $("#datosVenta").hide();
    $("#filaTotales").hide();

    $("button").button();
    $("#buscarProducto").button();
    $("#buscarProducto").click(mostrarPopUpBuscarProducto);

    $("#numFactura").numeric();
    $("#numNotaCredito").numeric();

    $("#aceptarNumFactura").button();
    $("#aceptarNumFactura").click(aceptarNumFactura);

    $("#realizarGuiaCredito").button();
    $("#realizarGuiaCredito").click(realizarGuiaCredito);

    $("#fechaNota").datepicker({
        changeMonth: true,
        changeYear: true,
        dateFormat: 'dd/mm/yy'
    });

    var fechaActual = new Date();
    fechaActual.setDate(fechaActual.getDate() + 1);
    $("#fechaNota").datepicker("setDate", fechaActual);

    $("#popUpAdvertencia").dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            'Ok': function() {
                $(this).dialog('close');
            }
        }
    });

    $("#popUpExito").dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            "Ver Nota de Crédito": function() {
                //document.location.href = "Reporte/hola.pdf";
                document.location = "Ventas/Reportes/generarNotaCredito.php?numNotaCredito=" + $("#numNotaCredito").val() + "&rutEmpresa=" + $("#rutEmpresa").val();
            },
            "Ok": function() {
                document.location.href = "SisDist.php?act=terminalNotaCredito";
            }
        },
        close: function() { //document.location = "Ventas/Globales/generarFactura.php?numFactura=" + $("#numFactura").val(); 

        }
    });

    $("#idProducto").focus();

    if ($("#numFactura").val() > 0) {
        aceptarNumFactura();
    }
});

function aceptarNumFactura() {
    if ($("#numFactura").val() == "") {
        $("#popUpErrorMensaje").html("Debe ingresar un Número de Factura para continuar.");
        $("#popUpError").dialog("open");
    } else {
        var numFactura = parseInt($("#numFactura").val());
        $("#numFactura").val(numFactura);

        $.ajax({
            async: true,
            type: "POST",
            dataType: "json",
            url: "Ventas/Globales/obtInfoVenta.php",
            data: {
                rutEmpresa: $("#cmbEmpresa").val(),
                numFactura: numFactura
            },
            success: function(json) {
                if (json.resultado == 1) {
                    $("#popUpBuscarProdFiltro").val("prodVenta");
                    $("#popUpBuscarProdId").val(json.idVenta);

                    $("#idVenta").val(json.idVenta);
                    $("#rutEmpresa").val($("#cmbEmpresa").val());
                    $("#fechaVenta").html(json.fechaVenta);
                    $("#nomVendedor").html(json.nomVendedor);
                    $("#datosCliente").html(json.rutCompletoCliente + " " + json.razonSocialCliente);
                    $("#datosLocalCliente").html(json.nomLocalCliente + " " + json.dirLocalCliente);
                    $("#nomFormaPago").html(json.nomFormaPago);
                    $("#datosEmpresa").html(json.rutCompletoEmpresa + " " + json.razonSocialEmpresa);
                    $("#filaTotalesNumFactura").html(numFactura);
                    $("#numNotaCredito").val(json.numNotaCredito)

                    $("#datosFactura").hide();
                    $("#datosVenta").show();

                    $("#idProducto").val("");
                    $("#idProducto").focus();
                } else if (json.resultado == 0) {
                    $("#popUpErrorMensaje").html("No se encuentra Venta registrada para esa Empresa y ese Número de Factura.");
                    $("#popUpError").dialog("open");
                }
            },
            error: function() { alert("Error desconocido"); }
        });
    }
}

function agregarProductoCarrito(idProducto, tipoId) {
    if (idProducto == "") {
        $("#popUpErrorMensaje").html("Debe ingresar un Código Interno de Producto o un Código de Barra.");
        $("#popUpError").dialog("open");
        $("#idProducto").focus();
    } else {
        $.ajax({
            async: true,
            type: "POST",
            dataType: "json",
            url: "Ventas/Globales/obtInfoProductoVenta.php",
            data: {
                rutEmpresa: $("#rutEmpresa").val(),
                numFactura: $("#numFactura").val(),
                idProducto: idProducto,
                tipoId: tipoId
            },
            success: function(json) {
                var contProd = 0;
                var tabla = "";
                var existeProd = false;

                $.each($("#detalleVenta").find("tr"), function() {
                    contProd++;
                    if (this.id == "fila-" + json.idProducto) existeProd = true;
                });

                if (json.resultado == 0) {
                    $("#popUpErrorMensaje").html("El código no corresponde a ningun producto de la Venta.");
                    $("#popUpError").dialog("open");
                    $("#idProducto").val("");
                    $("#idProducto").focus();
                } else {
                    if (contProd == 0) {
                        tabla = "<table class='listaProductos'>" +
                            "<thead>" +
                            "<tr>" +
                            "<th>N</th>" +
                            "<th>Nombre Producto</th>" +
                            "<th>Marca</th>" +
                            "<th>UM</th>" +
                            "<th>Cantidad Venta</th>" +
                            "<th>Cantidad</th>" +
                            "<th>% Desc</th>" +
                            "<th>Precio Neto</th>" +
                            "<th>SubTotal</th>" +
                            "<th>Quitar</th>" +
                            "</tr>" +
                            "</thead>" +
                            "<tbody id='listaProdVenta'>";
                    }

                    if (!existeProd) {
                        tabla += "<tr id='fila-" + json.idProducto + "'>" +
                            "<input type='hidden' id='cantDisp-" + json.idProducto + "' value='" + json.cantVenta + "' />" +
                            "<input type='hidden' id='precioVenta-" + json.idProducto + "' value='" + json.precioEntero + "' />" +
                            "<input type='hidden' id='iaba-" + json.idProducto + "' value='" + json.iaba + "' />" +
                            "<input type='hidden' id='espec-" + json.idProducto + "' value='" + json.espec + "' />" +
                            "<input type='hidden' id='iva-" + json.idProducto + "' value='" + json.iva + "' />" +
                            "<td>" + json.codSerfel + "</td>" +
                            "<td align='left'>&nbsp;&nbsp;" + json.nomProd + "</td>" +
                            "<td>&nbsp;&nbsp;" + json.nomMarca + "</td>" +
                            "<td>&nbsp;&nbsp;" + json.nomUM + "</td>" +
                            "<td align='center'>" + json.cantVenta + "</td>" +
                            "<td><input type='text' id='cant-" + json.idProducto + "' value='0' class='cantVenta'" +
                            "onchange='javascript:cambioCantidad(" + json.idProducto + ", parseFloat(this.value))' /></td>" +
                            "<td><input type='hidden' id='porcen-" + json.idProducto + "' value='" + json.porcenDesc + "' />" +
                            json.porcenDesc + "%</td>" +
                            "<td><input type='hidden' id='precio-" + json.idProducto + "' value='" + json.precioNetoEntero + "' />" +
                            json.precioNeto + "&nbsp;&nbsp;</td>" +
                            "<td><span id='total-" + json.idProducto + "' name='" + json.precioNetoEntero + "'>" +
                            0 + "</span>&nbsp;&nbsp;</td>" +
                            "<td class='linkElim'>" +
                            "<a href='javascript:quitarProducto(" + json.idProducto + ")' class='linkElim'></a></td>" +
                            "</tr>";
                    } else {
                        $("#cant-" + json.idProducto).val(parseFloat($("#cant-" + json.idProducto).val()) + 1);

                        var cant = parseInt($("#cant-" + json.idProducto).val());

                        //$("#total-" + json.idProducto).text(formatoDinero(parseFloat($("#cant-" + json.idProducto).val()) * json.precioEntero));
                        $("#total-" + json.idProducto).text(formatoDinero(calcularPrecioDescEntero(json.precioEntero, json.porcenDesc, cant)));
                    }

                    if (contProd == 0) {
                        tabla += "</tbody>" +
                            "</table>";
                    }

                    if (contProd == 0) $("#detalleVenta").append(tabla);
                    else $("#listaProdVenta").append(tabla);

                    $("#cant-" + json.idProducto).numeric();
                    $("#porcen-" + json.idProducto).numeric();

                    $("#detalleVenta").show();

                    calcularTotal();

                    $("#idProducto").val("");
                    $("#idProducto").focus();
                }

                $("#popUpBuscarProducto").dialog("close");
            },
            error: function() { alert("Error desconocido"); }
        });
    }
}

function agregarProducto() {
    agregarProductoCarrito($("#idProducto").val(), "codSerfel");
}

function popUpBuscarProductoSelecProd(idProducto) {
    agregarProductoCarrito(idProducto, "idProducto");
}

function quitarProducto(idProducto) {
    $("#fila-" + idProducto).remove();

    var cont = 0;
    $.each($("#detalleVenta").find("tr"), function() {
        if (this.id.substring(0, 5) == "fila-") cont++;
    });

    if (cont == 0) {
        $("#detalleVenta").hide();
        $("#filaTotales").hide();
    } else calcularTotal();
}

function cambioCantidad(idProducto, cant) {
    if (cant > $("#cantDisp-" + idProducto).val()) {
        cant = $("#cantDisp-" + idProducto).val();

        $("#popUpAdvertenciaMensaje").html("La Cantidad es mayor que la Cantidad Disponible.");
        $("#popUpAdvertencia").dialog("open");
        $("#cant-" + idProducto).val(cant);
    }

    if (cant < 0) {
        cant *= -1;
        $("#cant-" + idProducto).val(cant);
    }

    var precio = parseInt($("#precio-" + idProducto).val());
    var porcen = parseFloat($("#porcen-" + idProducto).val());

    $("#total-" + idProducto).text(formatoDinero(calcularPrecioDescEntero(precio, porcen, cant)));

    calcularTotal();
}

function calcularTotal() {
    var subTotal = 0;
    var suma = 0;
    var sumaIva = 0;
    var sumaIaba = 0;
    var sumaEspec = 0;
    var datos = Array();

    $.each($("#detalleVenta").find("tr"), function() {
        if (this.id.substring(0, 5) == "fila-") {
            datos = this.id.split("-");

            var precio = parseFloat($("#precio-" + datos[1]).val());
            var precioVenta = parseFloat($("#precioVenta-" + datos[1]).val());
            var cant = parseFloat($("#cant-" + datos[1]).val());
            var porcen = parseFloat($("#porcen-" + datos[1]).val());
            //var iva         = parseInt($("#iva-" + datos[1]).val());
            var iaba = parseFloat($("#iaba-" + datos[1]).val());
            var espec = parseFloat($("#espec-" + datos[1]).val());

            /*
            sumaIaba  += parseFloat((iaba / (1 + (porcen / 100))) * cant);
            sumaEspec += parseFloat((espec / (1 + (porcen / 100))) * cant);
            subTotal  += parseFloat((precio / (1 + (porcen / 100))) * cant);
            suma      += parseFloat((precioVenta / (1 + (porcen / 100))) * cant); 
            */
            sumaIaba += calcularPrecioDesc(iaba, porcen, cant);
            sumaEspec += calcularPrecioDesc(espec, porcen, cant);
            subTotal += calcularPrecioDesc(precio, porcen, cant);
            suma += calcularPrecioDesc(precioVenta, porcen, cant);
        }
    });
    //alert(suma);
    //alert(subTotal);
    //sumaIva = Math.round(suma - (sumaIaba + sumaEspec + subTotal));
    sumaIva = suma - (sumaIaba + sumaEspec + subTotal);

    $("#valorSubTotal").val(Math.round(subTotal));
    $("#subTotal").text(formatoDinero(Math.round(subTotal)));
    $("#valorIva").val(Math.round(sumaIva));
    $("#subTotalIva").text(formatoDinero(Math.round(sumaIva)));
    $("#valorIaba").val(Math.round(sumaIaba));
    $("#subTotalIaba").text(formatoDinero(Math.round(sumaIaba)));
    $("#valorEspec").val(Math.round(sumaEspec));
    $("#subTotalEspec").text(formatoDinero(Math.round(sumaEspec)));
    $("#valorTotal").val(Math.round(suma));
    $("#total").text(formatoDinero(Math.round(suma)));

    $("#idProducto").val("").focus();
    $("#filaTotales").show();
}

function realizarGuiaCredito() {
    if ($("#rutEmpresa").val() == "") {
        $("#popUpErrorMensaje").html("Debe seleccionar una Empresa.");
        $("#popUpError").dialog("open");
    } else if ($("#numNotaCredito").val() == "") {
        $("#popUpErrorMensaje").html("Debe ingresar un Número de Nota de Crédito.");
        $("#popUpError").dialog("open");
    } else {
        var datos = Array();
        var cantidad = Array();
        var producto = Array();
        var descuento = Array();
        var precio = Array();
        var i = 0;

        $.each($("#listaProdVenta").find("tr"), function() {
            if (this.id.substring(0, 5) == "fila-") {
                datos = this.id.split("-");

                producto[i] = datos[1];
                cantidad[i] = $("#cant-" + datos[1]).val();
                descuento[i] = $("#porcen-" + datos[1]).val();
                precio[i] = $("#precio-" + datos[1]).val();
            }
            i++;
        });

        $.ajax({
            async: true,
            type: "POST",
            dataType: "json",
            //url     : "Ventas/terminalNotaCredito/ingNotaCredito.php",
            url: "Ajax/NotaCredito/ajaxIngNotaCredito.php",
            data: {
                idVenta: $("#idVenta").val(),
                rutEmpresa: $("#cmbEmpresa").val(),
                numNotaCredito: $("#numNotaCredito").val(),
                idMotivo: $("#cmbMotivo").val(),
                fechaNota: $("#fechaNota").val(),
                producto: producto,
                cantidad: cantidad,
                descuento: descuento,
                precio: precio,
                iva: $("#valorIva").val(),
                iaba: $("#valorIaba").val(),
                espec: $("#valorEspec").val(),
                subTotal: $("#valorSubTotal").val(),
                precioTotal: $("#valorTotal").val(),
                cantProd: i
            },
            success: function(oJson) {
                $("#" + oJson.cPopUp + "Mensaje").html(oJson.cMensaje);
                $("#" + oJson.cPopUp).dialog("open");
                /*
                if(json.resultado == 0) {
                    $("#popUpErrorMensaje").html("El Número de Nota de Crédito ya existe.");
                    $("#popUpError").dialog("open");
                } else if(json.resultado > 0) {
                    $("#popUpExitoMensaje").html("Nota de Crédito realizada con éxito.");
                    $("#popUpExito").dialog("open");
                }
                */
            },
            error: function(xhr, status, error) {
                $("#popUpCargando").dialog("close");

                var err = JSON.parse(xhr.responseText);
                alert("terminalNotaCredito:realizarNotaCredito \n " + err.Message);
            }
        });
    }
}
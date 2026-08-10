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
    
    $("#buscarPedidos").button();
    $("#buscarPedidos").click(mostrarPopUpBuscarPedido);
    
    $("#realizarVenta").button();
    $("#realizarVenta").click(realizarVenta);
    
    $("#fechaVenta").datepicker({
        changeMonth: true,
        changeYear : true,
        dateFormat: 'dd/mm/yy'
    });
    
    var fechaActual = new Date();
    fechaActual.setDate(fechaActual.getDate() + 1);
    $("#fechaVenta").datepicker("setDate", fechaActual);
    
    //alert(fechaActual);
    
    $("#popUpAdvertencia").dialog({
        autoOpen: false,
        modal   : true,
        buttons : {
            'Ok': function() { 
                $(this).dialog('close');
            }
        }
    });
    
    $("#popUpExito").dialog({
        autoOpen: false,
        modal   : true,
        buttons : {
            "Ver Factura 1": function() { 
                //document.location.href = "Reporte/hola.pdf";
                document.location = "Ventas/Reportes/generarFactura.php?numFactura=" + $("#numFactura").val() + "&rutEmpresa=" + $("#rutEmpresa").val() + "&imp=1";
            },
            "Ver Factura 2": function() { 
                //document.location.href = "Reporte/hola.pdf";
                document.location = "Ventas/Reportes/generarFactura.php?numFactura=" + $("#numFactura").val() + "&rutEmpresa=" + $("#rutEmpresa").val() + "&imp=2";
            },
            "Ok" : function() { 
                document.location.href = "SisDist.php?act=terminalVentaPedidos";
            }
        },
        close   : function() { //document.location = "Ventas/Globales/generarFactura.php?numFactura=" + $("#numFactura").val(); 
            
        }
    });
    
    $("#idProducto").focus();
});

function cambiarEmpresa(idEmpresa) {
    //if(idEmpresa == 0) $("#idEmpresa").val("");
    //else {
        $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            url     : "Empresas/Globales/obtInfoEmpresa.php",
            data    : {
                idEmpresa: idEmpresa
            },
            success: function(json) {
                if(json.rut > 0) {
                    $("#rutEmpresa").val(json.rut);
                    $("#numFactura").val(json.numFactura);
                } else {
                    $("#popUpErrorMensaje").html("Ese código no esta asociado a ninguna Empresa.");
                    $("#popUpError").dialog("open");
                }
            },
            error: function() {alert("Error desconocido");}
        });
    //}
}

function popUpBuscarPedidoSelecPedido(idPedido) {
    $.ajax({
        async   : true,
        type    : "POST",
        dataType: "json",
        url     : "Pedidos/Globales/obtInfoPedido.php",
        data    : {
            idPedido : idPedido
        },
        success: function(json) {
            $("#idPedido").val(idPedido);
            $("#nomVendedor").html(json.nomVendedor);
            $("#datosCliente").html(json.rutCompletoCliente + " " + json.nomFantasia);
            $("#datosLocalCliente").html(json.nomLocalCliente + " " + json.dirLocalCliente);
            $("#datosVenta").show();
            $("#popUpBuscarPedido").dialog("close");
            $("#topeVenta").val(json.topeVenta);
            $("#topeCredito").val(json.topeCredito);
            
            if(json.idFormaPago == 1)
                $("#cmbFormaPago option[value='7']").attr("selected", "selected");
            else
                $("#cmbFormaPago option[value='" + json.idFormaPago + "']").attr("selected", "selected");
            
            $("#detalleVenta").find("table").remove();
            
            var tabla = "<table class='listaProductos'>" +
                            "<thead>" +
                                "<tr>" +
                                    "<th>N</th>" +
                                    "<th>Nombre Producto</th>" +
                                    "<th>Marca</th>" +
                                    "<th>UM</th>" +
                                    "<th>Stock</th>" +
                                    "<th>Cantidad</th>" +
                                    "<th>% Desc</th>" +
                                    "<th>Precio Neto</th>" +
                                    "<th>SubTotal</th>" +
                                    "<th>Quitar</th>" +
                                "</tr>" + 
                            "</thead>" + 
                            "<tbody id='listaProdVenta'>";
            
            $.each(json.productos, function() {
                var iSubTotal = Math.round(this.precioNetoEntero * parseFloat(this.cantidad));
                var iMontoDesc = Math.round(iSubTotal * parseFloat(this.porcenDesc) / 100);
                var iSubTotalFinal = iSubTotal - iMontoDesc; 
    
                tabla +=    "<tr id='fila-" + this.idProducto + "'>" +
                                "<input type='hidden' id='cantDisp-" + this.idProducto + "' value='" + this.cantDisponible + "' />" +
                                "<input type='hidden' id='precioVenta-" + this.idProducto + "' value='" + this.precioEntero + "' />" +
                                "<input type='hidden' id='iaba-" + this.idProducto + "' value='" + this.iaba + "' />" +
                                "<input type='hidden' id='espec-" + this.idProducto + "' value='" + this.espec + "' />" +
                                "<input type='hidden' id='iva-" + this.idProducto + "' value='" + this.iva + "' />" +
                                
                                "<input type='hidden' id='iIla-" + this.idProducto + "' value='" + this.iIla + "' />" +
                                "<input type='hidden' id='iEspec-" + this.idProducto + "' value='" + this.iEspec + "' />" +
                                "<input type='hidden' id='iIva-" + this.idProducto + "' value='" + this.iIva + "' />" +
                                "<input type='hidden' id='iSubTotal-" + this.idProducto + "' value='" + iSubTotalFinal + "' />" +
                                
                                "<td>" + this.codSerfel  + "</td>" +
                                "<td align='left'>&nbsp;&nbsp;" + this.nomProd + "</td>" +
                                "<td>&nbsp;&nbsp;" + this.nomMarca + "</td>" +
                                "<td>&nbsp;&nbsp;" + this.nomUM + "</td>" +
                                "<td>" + this.txtCantStock + "</td>" +
                                "<td><input type='text' id='cant-" + this.idProducto + "' value='" + this.cantidad + "' class='cantVenta'" +
                                           "onchange='javascript:cambioCantidad(" + this.idProducto + ", parseFloat(this.value))' /></td>";
                                   
                if($("#bPuedeCambiarDesc").val()) {
                    tabla += "<td><input type='text' id='porcen-" + this.idProducto + "' value='" + this.porcenDesc + "' class='cantVenta'" +
                                           "onchange='javascript:cambioPorcentaje(" + this.idProducto + ", parseFloat(this.value))' />%</td>";
                } else {
                    tabla += "<td><input type='hidden' id='porcen-" + this.idProducto + "' value='" + this.porcenDesc + "' class='cantVenta' />" + this.porcenDesc + " %</td>";
                }
                        
                tabla +=        "<td><input type='hidden' id='precio-" + this.idProducto + "' value='" + this.precioNetoEntero + "' />" + 
                                     this.precioNeto + "&nbsp;&nbsp;</td>" +
                                "<td><span id='total-" + this.idProducto + "' name='" + iSubTotalFinal + "'>" +
                                     formatoDinero(iSubTotalFinal) + "</span>&nbsp;&nbsp;</td>" +
                                "<td class='linkElim'>" +
                                    "<a href='javascript:quitarProducto(" + this.idProducto + ")' class='linkElim'></a></td>"
                          + "</tr>";
            });
            
            tabla +=    "</tbody>" +
                    "</table>";
                
            $("#detalleVenta").append(tabla);
            
            var datos;
            $.each($("#detalleVenta").find("tr"), function() {
                if(this.id.substring(0, 5) == "fila-") {
                    datos = this.id.split("-");

                    $("#cant-" + datos[1]).numeric();
                    $("#porcen-" + datos[1]).numeric();
                    
                    var cant   = parseInt($("#cant-" + datos[1]).val());
                    var precio = parseInt($("#precio-" + datos[1]).val());
                    var porcen = parseFloat($("#porcen-" + datos[1]).val());
                    
                    var iSubTotal = Math.round(precio * cant);
                    var iMontoDesc = Math.round(iSubTotal * porcen / 100);
    
                    $("#total-" + datos[1]).text(formatoDinero(iSubTotal - iMontoDesc));

                    //$("#total-" + datos[1]).text(formatoDinero(calcularPrecioDescEntero(precio, porcen, cant)));
                }
            });
            
            $("#detalleVenta").show();
            
            calcularTotal();
            
            $("#idProducto").val("");
            $("#idProducto").focus();
            
            cambiarEmpresa($("#cmbEmpresa").val());
        },
        error: function() {alert("Error desconocido");}
    });
}

function agregarProductoCarrito(idProducto, tipoId) {
    if(idProducto == "") {
        $("#popUpErrorMensaje").html("Debe ingresar un Código Interno de Producto o un Código de Barra.");
        $("#popUpError").dialog("open");
        $("#idProducto").focus();
    } else {
        $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            url     : "Ventas/Globales/obtInfoPrecioProducto.php",
            data    : {
                idListaPrecio: 1,
                idProducto   : idProducto,
                tipoId       : tipoId
            },
            success: function(json) {
                var contProd   = 0;
                var tabla      = "";
                var existeProd = false;

                $.each($("#detalleVenta").find("tr"), function() {
                    contProd++;
                    if(this.id == "fila-" + json.idProducto) existeProd = true;
                });

                if(json.nomProd == "") {
                    $("#popUpErrorMensaje").html("El código no corresponde a ningun producto.");
                    $("#popUpError").dialog("open");
                    $("#idProducto").val("");
                    $("#idProducto").focus();
                } else if(json.precioEntero <= 0) {
                    $("#popUpErrorMensaje").html("El Producto no tiene precio de venta establecido.");
                    $("#popUpError").dialog("open");
                    $("#idProducto").val("");
                    $("#idProducto").focus();
                } else {
                    if(contProd == 0) {
                        tabla = "<table class='listaProductos'>" +
                                    "<thead>" +
                                        "<tr>" +
                                            "<th>N</th>" +
                                            "<th>Nombre Producto</th>" +
                                            "<th>Marca</th>" +
                                            "<th>UM</th>" +
                                            "<th>Stock</th>" +
                                            "<th>Cantidad</th>" +
                                            "<th>% Desc</th>" +
                                            "<th>Precio Neto</th>" +
                                            "<th>SubTotal</th>" +
                                            "<th>Quitar</th>" +
                                        "</tr>" + 
                                    "</thead>" + 
                                    "<tbody id='listaProdVenta'>";
                    }

                    if(contProd > 23) {
                        $("#popUpErrorMensaje").html("Ha llegado al máximo de productos por Factura.");
                        $("#popUpError").dialog("open");
                    } else if(!existeProd) {
                        var iSubTotal = json.precioNetoEntero;
                        var iMontoDesc = Math.round(iSubTotal * json.porcenDesc / 100);
                        var iSubTotalFinal = iSubTotal - iMontoDesc; 
    
                        tabla += "<tr id='fila-" + json.idProducto + "'>" +
                                    "<input type='hidden' id='cantDisp-" + json.idProducto + "' value='" + json.cantDisponible + "' />" +
                                    "<input type='hidden' id='precioVenta-" + json.idProducto + "' value='" + json.precioEntero + "' />" +
                                    "<input type='hidden' id='iaba-" + json.idProducto + "' value='" + json.iaba + "' />" +
                                    "<input type='hidden' id='espec-" + json.idProducto + "' value='" + json.espec + "' />" +
                                    "<input type='hidden' id='iva-" + json.idProducto + "' value='" + json.iva + "' />" +
                                    
                                    "<input type='hidden' id='iIla-" + json.idProducto + "' value='" + json.iIla + "' />" +
                                    "<input type='hidden' id='iEspec-" + json.idProducto + "' value='" + json.iEspec + "' />" +
                                    "<input type='hidden' id='iIva-" + json.idProducto + "' value='" + json.iIva + "' />" +
                                    "<input type='hidden' id='iSubTotal-" + json.idProducto + "' value='" + iSubTotalFinal + "' />" +
                                    
                                    "<td>" + json.codSerfel  + "</td>" +
                                    "<td align='left'>&nbsp;&nbsp;" + json.nomProd + "</td>" +
                                    "<td>&nbsp;&nbsp;" + json.nomMarca + "</td>" +
                                    "<td>&nbsp;&nbsp;" + json.nomUM + "</td>" +
                                    "<td>" + json.txtCantStock + "</td>" +
                                    "<td><input type='text' id='cant-" + json.idProducto + "' value='1' class='cantVenta'" +
                                               "onchange='javascript:cambioCantidad(" + json.idProducto + ", parseFloat(this.value))' /></td>";
                                       
                        if($("#bPuedeCambiarDesc").val()) {
                            tabla += "<td><input type='text' id='porcen-" + json.idProducto + "' value='" + json.porcenDesc + "' class='cantVenta'" +
                                               "onchange='javascript:cambioPorcentaje(" + json.idProducto + ", parseFloat(this.value))' />%</td>";
                        } else {
                            tabla += "<td><input type='hidden' id='porcen-" + json.idProducto + "' value='0' class='cantVenta' />0 %</td>";
                        }
                        
                        tabla +=    "<td><input type='hidden' id='precio-" + json.idProducto + "' value='" + json.precioNetoEntero + "' />" + 
                                        json.precioNeto + "&nbsp;&nbsp;</td>" +
                                    "<td><span id='total-" + json.idProducto + "' name='" + json.precioNetoEntero + "'>" +
                                        formatoDinero(iSubTotalFinal) + "</span>&nbsp;&nbsp;</td>" +
                                    "<td class='linkElim'>" +
                                        "<a href='javascript:quitarProducto(" + json.idProducto + ")' class='linkElim'></a></td>"
                            + "</tr>";
                    } else {
                        $("#cant-"  + json.idProducto).val(parseFloat($("#cant-" + json.idProducto).val()) + 1);
                        $("#total-" + json.idProducto).text(formatoDinero(parseFloat($("#cant-" + json.idProducto).val()) * json.precioEntero));
                    }

                    if(contProd == 0) {
                        tabla +=    "</tbody>" +
                                "</table>";
                    }

                    if(contProd == 0) $("#detalleVenta").append(tabla);
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
            error: function() {alert("Error desconocido");}
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
        if(this.id.substring(0, 5) == "fila-") cont++;
    });

    if(cont == 0) {
        $("#detalleVenta").hide();
        $("#filaTotales").hide();
    } else calcularTotal();
}

function cambioCantidad(idProducto, cant) {
    if(cant > $("#cantDisp-" + idProducto).val()) {
        $("#popUpAdvertenciaMensaje").html("La Cantidad es mayor que la Cantidad Disponible.");
        $("#popUpAdvertencia").dialog("open");
    }
    
    if(cant < 0) {
        cant *= -1;
        $("#cant-" + idProducto).val(cant);
    }
    
    var precio = parseFloat($("#precio-" + idProducto).val());
    var porcen = parseFloat($("#porcen-" + idProducto).val());
    
    var iSubTotal = Math.round(precio * cant);
    var iMontoDesc = Math.round(iSubTotal * porcen / 100);
    var iSubTotalFinal = iSubTotal - iMontoDesc; 
    
    $("#iSubTotal-" + idProducto).val(iSubTotalFinal);
    $("#total-" + idProducto).text(formatoDinero(iSubTotalFinal));

    calcularTotal();
}

function calcularTotal() {
    var sumaSubTotal  = 0;
    var suma      = 0;
    var sumaIva   = 0;
    var sumaIaba  = 0;
    var sumaEspec = 0;
    var sumaIVA   = 0;
    var datos     = Array();
    
    $.each($("#detalleVenta").find("tr"), function() {
        if(this.id.substring(0, 5) == "fila-") {
            datos = this.id.split("-");
            
            //var precio      = parseFloat($("#precio-" + datos[1]).val());
            //var precioVenta = parseFloat($("#precioVenta-" + datos[1]).val());
            //var cant        = parseFloat($("#cant-" + datos[1]).val());
            //var porcen      = parseFloat($("#porcen-" + datos[1]).val());
            //var iva         = parseInt($("#iva-" + datos[1]).val());
            //var iaba        = parseFloat($("#iaba-" + datos[1]).val());
            //var espec       = parseFloat($("#espec-" + datos[1]).val());
            
            /*
            sumaIaba  += parseFloat((iaba / (1 + (porcen / 100))) * cant);
            sumaEspec += parseFloat((espec / (1 + (porcen / 100))) * cant);
            subTotal  += parseFloat((precio / (1 + (porcen / 100))) * cant);
            suma      += parseFloat((precioVenta / (1 + (porcen / 100))) * cant); 
            */
            //sumaIaba  += calcularPrecioDesc(iaba, porcen, cant);
            //sumaEspec += calcularPrecioDesc(espec, porcen, cant);
            //sumaIVA   += calcularPrecioDesc(iva, porcen, cant);
            //subTotal  += calcularPrecioDesc(precio, porcen, cant);
            //suma      += calcularPrecioDesc(precioVenta, porcen, cant);
            
            var iIla = parseInt($("#iIla-" + datos[1]).val());
            var iEspec = parseInt($("#iEspec-" + datos[1]).val());
            //var iIva = parseInt($("#iIva-" + datos[1]).val());
            var iSubTotal = parseInt($("#iSubTotal-" + datos[1]).val());
            
            if(iIla > 0) {
                sumaIaba += Math.round(iSubTotal * iIla / 100);
            }
            if(iEspec > 0) {
                sumaEspec += Math.round(iSubTotal * iEspec / 100);
            }
            
            sumaSubTotal += iSubTotal;
        }
    });
    //suma = sumaIVA + sumaIaba + sumaEspec + subTotal;
    //sumaIva = suma - (sumaIaba + sumaEspec + subTotal);
    sumaIva = sumaSubTotal * 0.19;
    suma = sumaEspec + sumaIva + sumaIaba + sumaSubTotal;

    $("#valorSubTotal").val(Math.round(sumaSubTotal));
    $("#subTotal").text(formatoDinero(Math.round(sumaSubTotal)));
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
    
    validarTopeVentaCredito(Math.round(suma));
}

function cambioPorcentaje(idProducto, porcen) {
    if(porcen < 0) {
        porcen *= -1;
        $("#porcen-" + idProducto).val(porcen);
    }
    
    var precio = parseInt($("#precio-" + idProducto).val());
    var cant   = parseFloat($("#cant-" + idProducto).val());
    
    var iSubTotal = Math.round(precio * cant);
    var iMontoDesc = Math.round(iSubTotal * porcen / 100);
    var iSubTotalFinal = iSubTotal - iMontoDesc; 
    
    $("#iSubTotal-" + idProducto).val(iSubTotalFinal);
    $("#total-" + idProducto).text(formatoDinero(iSubTotalFinal));
    
    //$("#total-" + idProducto).text(formatoDinero(calcularPrecioDescEntero(precio, porcen, cant)));

    calcularTotal();
}

function validarTopeVentaCredito(sumaTotal) {
    if($("#topeVenta").val() > 0 && $("#topeVenta").val() < sumaTotal) {
        $("#popUpAdvertenciaMensaje").html("La suma total de la Venta es mayor que el Máximo Disponible para ese Cliente.");
        $("#popUpAdvertencia").dialog("open");
    }
    
    if($("#topeCredito").val() > 0 && $("#topeCredito").val() < sumaTotal && ($("#cmbFormaPago").val() == 3 
                                                                                    || $("#cmbFormaPago").val() == 4 
                                                                                    || $("#cmbFormaPago").val() == 5 
                                                                                    || $("#cmbFormaPago").val() == 8)) {
        $("#popUpAdvertenciaMensaje").html("La suma total de la Venta es mayor que el Máximo Disponible de Crédito para ese Cliente.");
        $("#popUpAdvertencia").dialog("open");
    }
}

function realizarVenta() {
    if($("#rutEmpresa").val() == "") {
        $("#popUpErrorMensaje").html("Debe seleccionar una Empresa.");
        $("#popUpError").dialog("open");
    } else if($("#numFactura").val() == "") {
        $("#popUpErrorMensaje").html("Debe ingresar un Numero de Factura.");
        $("#popUpError").dialog("open");
    } else {
        $("#popUpCargando").dialog("open");
        
        var datos     = Array();
        var cantidad  = Array();
        var producto  = Array();
        var descuento = Array();
        var precio    = Array();
        var i = 0;
        
        $.each($("#listaProdVenta").find("tr"), function() {
            if(this.id.substring(0, 5) == "fila-") {
                datos = this.id.split("-");
                /*
                producto[i]["id_producto"]  = datos[1];
                producto[i]["cantidad"]  = $("#cant-" + datos[1]).val();
                producto[i]["descuento"]  = $("#porcen-" + datos[1]).val();
                producto[i]["precio"]  = $("#precio-" + datos[1]).val();
                */
                producto[i]  = datos[1];
                cantidad[i]  = $("#cant-" + datos[1]).val();
                descuento[i] = $("#porcen-" + datos[1]).val();
                precio[i]    = $("#precio-" + datos[1]).val();
                
                if(descuento[i] < 0) descuento[i] *= -1;
            }
            i++;
        });
        
        $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            //url     : "Ventas/terminalVentaPedidos/ingVenta.php",
            url     : "Ajax/Venta/ajaxIngVenta.php",
            data    : {
                idPedido      : $("#idPedido").val(),
                rutEmpresa    : $("#cmbEmpresa option:selected").attr("name"),
                idFormaPago   : $("#cmbFormaPago").val(),
                numDoctoEmit  : $("#numFactura").val(),
                fechaVenta    : $("#fechaVenta").val(),
                producto      : producto,
                cantidad      : cantidad,
                descuento     : descuento,
                precio        : precio,
                iva           : $("#valorIva").val(),
                iaba          : $("#valorIaba").val(),
                espec         : $("#valorEspec").val(),
                subTotal      : $("#valorSubTotal").val(),
                precioTotal   : $("#valorTotal").val(),
                cantProd      : i,
                cObservaciones: $("#txtObservaciones").val()
            },
            success: function(oJson) {
                $("#popUpCargando").dialog("close");
                
                $("#" + oJson.cPopUp + "Mensaje").html(oJson.cMensaje);
                $("#" + oJson.cPopUp).dialog("open");
                /*
                if(json.resultado == 0) {
                    $("#popUpErrorMensaje").html("El Número de Factura ya existe.");
                    $("#popUpError").dialog("open");
                } else if(json.resultado > 0) {
                    $("#popUpExitoMensaje").html("Venta realizada con éxito.");
                    $("#popUpExito").dialog("open");
                }
                */
            },
            error: function(xhr, status, error) {
                $("#popUpCargando").dialog("close");

                var err = JSON.parse(xhr.responseText);
                alert("terminalVentas:realizarVenta \n " + err.Message);
            }
        });
    }
}

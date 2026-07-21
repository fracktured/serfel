/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 24-02-2012                                        *
 * Desc : Funciones de pagina de terminal de Ventas         *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();
    iniPopUpBuscarProducto();
    
    $("#cliente").hide();
    $("#filaTotales").hide();
    
    $("button").button();
    $("#buscarProducto").button();
    $("#buscarProducto").click(buscarProducto);
    
    $("#buscarLocalCliente").button();
    $("#buscarLocalCliente").click(mostrarPopUpBuscarCliente);
    
    $("#realizarVenta").button();
    $("#realizarVenta").click(realizarVenta);
    
    $("#idEmpresa").numeric();
    
    $("#fechaVenta").datepicker({
        changeMonth: true,
        changeYear : true,
        dateFormat: 'dd/mm/yy'
    });
    
    var fechaActual = new Date();
    fechaActual.setDate(fechaActual.getDate() + 1);
    $("#fechaVenta").datepicker("setDate", fechaActual);
    
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
                document.location.href = "SisDist.php?act=terminalVentas";
            }
        },
        close   : function() { //document.location = "Ventas/Globales/generarFactura.php?numFactura=" + $("#numFactura").val(); 
            
        }
    });
    
    $("#popUpAdvertencia").dialog({
        autoOpen: false,
        modal   : true,
        buttons : {
            'Ok': function() { 
                $(this).dialog('close');
            }
        }
    });
    
    $("#idEmpresa").focus();
});

function cambiarEmpresa(idEmpresa) {
    if(idEmpresa == 0) $("#idEmpresa").val("");
    else {
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
                    $("#nomEmpresa").html(json.rut_completo + " " + json.nom_fantasia);
                    $("#numFactura").val(json.numFactura);
                } else {
                    $("#popUpErrorMensaje").html("Ese código no esta asociado a ninguna Empresa.");
                    $("#popUpError").dialog("open");
                    $("#rutEmpresa").val("");
                    $("#nomEmpresa").html("");
                }
            },
            error: function() {alert("Error desconocido");}
        });
    }
}

function cambiarCliente(rutCliente) {
    if(rutCliente != "") {
        $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            url     : "Clientes/Globales/obtInfoCliente.php",
            data    : {
                rutCliente: rutCliente
            },
            success: function(json) {
                if(json.rut > 0) {
                    $("#datosCliente").html(json.nom_fantasia);
                    $("#cmbLocalCliente").find("option").remove();

                    var option = "";
                    $.each(json.locales, function() {
                        option += "<option id='local-" + this.id_local + "' " +
                                        "value='" + this.id_local + "' " +
                                        "name='local-" + this.tope_venta + "-" + this.tope_credito + "-" 
                                                        + this.id_vendedor + "-" + this.id_forma_pago + "'>" + 
                                    this.nom_local + "</option>";
                    });

                    $("#cmbLocalCliente").append(option);

                    if($("#cmbLocalCliente").val() != "") {
                        var datos = $("#local-" + $("#cmbLocalCliente").val()).attr("name").split("-");
                        $("#cmbFormaPago option[value='" + datos[4] + "']").attr("selected", "selected");
                        $("#cmbListaVendedores option[value='" + datos[3] + "']").attr("selected", "selected");
                    }

                    $("#cliente").show();
                } else {
                    $("#popUpErrorMensaje").html("El Rut ingresado no corresponde a ningun Cliente.");
                    $("#popUpError").dialog("open");
                    $("#rutCliente").val("");
                    $("#datosCliente").html("");
                    $("#cmbLocalCliente").find("option").remove();
                    $("#cliente").hide();
                }
            },
            error: function() {alert("Error desconocido");}
        });
    }
}

function seleccionarLocalCliente(idLocalCliente) {
    $.ajax({
        async   : true,
        type    : "POST",
        dataType: "json",
        url     : "Clientes/Globales/obtInfoLocalCliente.php",
        data    : {
            idLocalCliente : idLocalCliente
        },
        success: function(json) {
            $("#rutCliente").val(json.rut_completo);
            cambiarCliente(json.rut_cliente);
            $("#cmbLocalCliente option[value = '" + idLocalCliente + "']").attr("selected", "selected");
            
            $("#popBuscarLocalCliente").dialog("close");
        },
        error: function() {alert("Error desconocido");}
    });
}

function buscarProducto() {
    if($("#rutEmpresa").val() == "") {
        $("#popUpErrorMensaje").html("Debe ingresar una Empresa primero.");
        $("#popUpError").dialog("open");
        $("#rutEmpresa").focus();
    } else if($("#datosCliente").html() == "") {
        $("#popUpErrorMensaje").html("Debe ingresar un Cliente primero.");
        $("#popUpError").dialog("open");
        $("#rutCliente").focus();
    } else {
        mostrarPopUpBuscarProducto();
    }
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
                        tabla += "<tr id='fila-" + json.idProducto + "'>" +
                                    "<input type='hidden' id='cantDisp-" + json.idProducto + "' value='" + json.cantDisponible + "' />" +
                                    "<input type='hidden' id='precioVenta-" + json.idProducto + "' value='" + json.precioEntero + "' />" +
                                    "<input type='hidden' id='iaba-" + json.idProducto + "' value='" + json.iaba + "' />" +
                                    "<input type='hidden' id='espec-" + json.idProducto + "' value='" + json.espec + "' />" +
                                    "<input type='hidden' id='iva-" + json.idProducto + "' value='" + json.iva + "' />" +
                                    
                                    "<input type='hidden' id='iIla-" + json.idProducto + "' value='" + json.iIla + "' />" +
                                    "<input type='hidden' id='iEspec-" + json.idProducto + "' value='" + json.iEspec + "' />" +
                                    "<input type='hidden' id='iIva-" + json.idProducto + "' value='" + json.iIva + "' />" +
                                    "<input type='hidden' id='iSubTotal-" + json.idProducto + "' value='0' />" +
                                    
                                    "<td>" + json.codSerfel  + "</td>" +
                                    "<td align='left'>&nbsp;&nbsp;" + json.nomProd + "</td>" +
                                    "<td>&nbsp;&nbsp;" + json.nomMarca + "</td>" +
                                    "<td>&nbsp;&nbsp;" + json.nomUM + "</td>" +
                                    "<td>" + json.txtCantStock + "</td>" +
                                    "<td><input type='text' id='cant-" + json.idProducto + "' value='' class='cantVenta'" +
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
                                        json.precioNeto + "</span>&nbsp;&nbsp;</td>" +
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
                    $("#cant-" + json.idProducto).focus();

                    calcularTotal();

                    $("#idProducto").val("");
                    //$("#idProducto").focus();
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
    
    var precio = parseInt($("#precio-" + idProducto).val());
    var porcen = parseFloat($("#porcen-" + idProducto).val());
    
    var iSubTotal = Math.round(precio * cant);
    var iMontoDesc = Math.round(iSubTotal * porcen / 100);
    var iSubTotalFinal = iSubTotal - iMontoDesc; 
    
    $("#iSubTotal-" + idProducto).val(iSubTotalFinal);
    $("#total-" + idProducto).text(formatoDinero(iSubTotalFinal));
    
    //$("#total-" + idProducto).text(formatoDinero(calcularPrecioDescEntero(precio, porcen, cant)));

    calcularTotal();
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
            /*
            var precio      = parseFloat($("#precio-" + datos[1]).val());
            var precioVenta = parseFloat($("#precioVenta-" + datos[1]).val());
            var cant        = parseFloat($("#cant-" + datos[1]).val());
            var porcen      = parseFloat($("#porcen-" + datos[1]).val());
            var iva         = parseInt($("#iva-" + datos[1]).val());
            var iaba        = parseInt($("#iaba-" + datos[1]).val());
            var espec       = parseInt($("#espec-" + datos[1]).val());
            */
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

function validarTopeVentaCredito(sumaTotal) {
    var datos = $("#local-" + $("#cmbLocalCliente").val()).attr("name").split("-");
    
    if(datos[1] > 0 && datos[1] < sumaTotal) {
        $("#popUpAdvertenciaMensaje").html("La suma total de la Venta es mayor que el Máximo Disponible para ese Cliente.");
        $("#popUpAdvertencia").dialog("open");
    }
    
    if(datos[2] > 0 && datos[2] < sumaTotal && ($("#cmbFormaPago").val() == 3 
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
    } else if($("#cmbLocalCliente").val() == "") {
        $("#popUpErrorMensaje").html("Debe seleccionar un Local de Cliente.");
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
            //url     : "Ventas/terminalVentas/ingVenta.php",
            url     : "Ajax/Venta/ajaxIngVenta.php",
            data    : {
                rutEmpresa    : $("#rutEmpresa").val(),
                idVendedor    : $("#cmbListaVendedores").val(),
                idFormaPago   : $("#cmbFormaPago").val(),
                numDoctoEmit  : $("#numFactura").val(),
                fechaVenta    : $("#fechaVenta").val(),
                idLocalCliente: $("#cmbLocalCliente").val(),
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

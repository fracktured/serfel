/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 08-01-2012                                        *
 * Desc : Funciones de pagina de lista de locales de        *
 *        cliente                                           *
 ************************************************************/

$(document).ready(function() {
    iniPopUpError();    
    
    iniPopUpBuscarProducto();
    
    $("button").button();
    $("#ingProveedor").show();
    $("#ingProveedor").click(ingProveedor);
    $("#cancelar").click(cancelar);    
    $("#recepcion").hide();
    $("#cancelar").hide();
    $("#fecDoc").datepicker({
        changeMonth: true,
        changeYear : true,
        yearRange  : '1980:2060',
        dateFormat: 'dd/mm/yy'
    });
    $("#agregarProducto").click(mostrarPopUpBuscarProducto);
    $("#recepcionar").click(recepcionar);
   
    
    $("#rutProveedor").numeric("-");
    $("#numDocto").numeric("0");
    
    $("#popUpExito").dialog({
        autoOpen: false,
        modal   : true,
        buttons : {
            "Ok": function() {
                document.location.href = document.location.href;
            }
        },
        close   : function() {
            document.location.href = document.location.href;
        }
    });
    
    $("#popUpAdvertencia").dialog({
        autoOpen: false,
        modal   : true,
        buttons : {
            "Ok": function() {
                $("#popUpAdvertencia").dialog("close");
            }
        }
    });    
});

function ingProveedor() {

    var existeError = false;
    
    if($("#rutProveedor").val().charAt(0)==""){
        existeError = true;
        
        $("#popUpAdvertencia").dialog({
            title: "Advertencia"
        });                
        $("#popUpAdvertenciaMensaje").html("Ingrese rut de proveedor.");
        $("#popUpAdvertencia").dialog("open");
        
    }else if($("#rutProveedor").val().charAt(0)=="-"){
        existeError = true;
        
        $("#popUpAdvertencia").dialog({
            title: "Advertencia"
        });                
        $("#popUpAdvertenciaMensaje").html("Formato de rut incorrecto.");
        $("#popUpAdvertencia").dialog("open");
    }
    
    if(!existeError) {
        $.ajax({
            data: {                   
                rutProveedor : $("#rutProveedor").val()
            },
            type    : "POST",
            dataType: "json",
            url     : "Proveedores/Globales/obtInfoProveedor.php",
            success : function(json) {  
                 
                if(json.rut_completo!="-"){
                    $("#razonSocial").html(json.razon_social);
                    $("#rut").html(json.rut_completo);
                    $("#selecProveedor").hide();
                    $("#recepcion").show();
                    $("#cancelar").show();
                }else{
                    
                    $("#popUpAdvertencia").dialog({
                        title: "Advertencia"
                    });                
                    $("#popUpAdvertenciaMensaje").html("Rut "+$("#rutProveedor").val()+" no se encuentra en el sistema.");
                    $("#popUpAdvertencia").dialog("open");
                }
            
                 
            },
            error: function() {
                alert("Error desconocido");
            }
        });
    }
}

function borrarProducto(idProducto){
    $("#fila-"+idProducto).remove();
}

function cancelar() {
    document.location.href = document.location.href;
}

function recepcionar() {

    var existeError = false;
    var valoresVacios = false;
    
    if($("#fecDoc").val()==""){
        $("#popUpAdvertencia").dialog({
            title: "Advertencia"
        });                
        $("#popUpAdvertenciaMensaje").html("Ingrese Fecha Emision de Documento.");
        $("#popUpAdvertencia").dialog("open");
        existeError = true;
    }else if($("#numDocto").val()==""){
        $("#popUpAdvertencia").dialog({
            title: "Advertencia"
        });                
        $("#popUpAdvertenciaMensaje").html("Ingrese Numero Documento de Recepcion.");
        $("#popUpAdvertencia").dialog("open");
        existeError = true;
    } else {
        
        var datos          = new Array();
        var idProducto      = new Array();
        var cantidad       = new Array();
        var cantidadRecep = new Array();
        var valor       = new Array();
        var i=0;  
    
        $.each($("#listaProductos").find("tr"), function() {
            datos = this.id.split("-");
            if(datos[0] == "fila") {
                idProducto[i] = datos[1];
                cantidad[i]  = $("#cantidad" + datos[1]).val();
                cantidadRecep[i] = $("#cantidadRecep" + datos[1]).val();
                valor[i]  = $("#valor" + datos[1]).val();
                if( cantidad[i]=="" ||  cantidad[i] <= 0 || valor[i]=="" || valor[i] <= 0){
                    existeError = true;
                    valoresVacios = true;
                }
                i++;
            }

        });
        
        if(valoresVacios){
            $("#popUpAdvertencia").dialog({
                title: "Advertencia"
            });                
            $("#popUpAdvertenciaMensaje").html("Ingrese Cantidad y/o Valor (Mayores que Cero) del Producto(s).");
            $("#popUpAdvertencia").dialog("open");
        }
        
        if(i==0){
            existeError = true;
            
            $("#popUpAdvertencia").dialog({
                title: "Advertencia"
            });                
            $("#popUpAdvertenciaMensaje").html("Ingrese Producto(s) a Recepcionar.");
            $("#popUpAdvertencia").dialog("open");
                    
        }
        
        if(!existeError){
            var rut = ($("#rut").html());    
            var rutProveedor = new Array();
            rutProveedor = rut.split("-");     
               
            $.ajax({
                data: {
                    idTipoDocumento : $("#cmbTipoDocumento option:selected").val(),
                    idTipoPago : $("#cmbTipoPago option:selected").val(),
                    idBodega : $("#cmbBodega option:selected").val(),
                    rutEmpresa: $("#cmbEmpresa").val(),
                    rutProveedor : rutProveedor[0],
                    fecDoc : convertirAFechaBD($("#fecDoc").val()),
                    numDocto : $("#numDocto").val(),
                    observacion : $("#observacion").val(),
                    idProducto:idProducto,
                    cantidad:cantidad,
                    cantidadRecep: cantidadRecep,
                    valor:valor,
                    largo:i
                },
                type    : "POST",
                dataType: "json",
                async   : false,
                url     : "Stock/recepcionProductos/ingRecepcionProductos.php",
                success : function(json) {                
                    $("#popUpExito").dialog({
                        title: "Ingreso Recepcion"
                    });                
                    $("#popUpExitoMensaje").html("Recepcion exitosa.");
                    $("#popUpExito").dialog("open");
                },
                error: function() {
                    alert("Error desconocido");
                }
            });
        }
    }
}

function popUpBuscarProductoSelecProd(idProducto) {
    
    var existeError = false;
   
    $.each($("#listaProductos").find("tr"), function() {
        if( $("#idProd"+idProducto).val()==idProducto){
            existeError=true;
        }
    });    
    
    $.ajax({
        data: {                   
            idProducto : idProducto
        },
        type    : "POST",
        dataType: "json",
        url     : "Productos/Globales/obtInfoProducto.php",
        success : function(json) {  
         
            if(!existeError) {
                $("#listaProductos").append("<tr id='fila-"+ idProducto +"'>" +
                    "<td>" + idProducto +"</td>" +
                    "<td style='text-align:left'>" + json.nomProd +
                    "<input type='hidden' id='idProd"+idProducto+"' value='"+idProducto+"' />"+"</td>" +
                    "<td align='center'>" + json.nomMarca + "</td>" +
                    "<td align='center'>" + json.nomUM + "</td>" +
                    "<td><input id='cantidad"+idProducto+"'value=''style='text-align:right' size='10' " +
                               "onchange='javascript:cambioCantidad(" + idProducto + ", this.value)' /> </td>" +
                    "<td><input id='cantidadRecep"+idProducto+"'value=''style='text-align:right' size='10' " +
                               "onchange='javascript:cambioCantidadRecep(" + idProducto + ", this.value)' /> </td>" +
                    "<td><input id='valor"+idProducto+"'value=''style='text-align:right' size='10' " +
                               "onchange='javascript:cambioPrecio(" + idProducto + ", this.value)' /> </td>" +
                    "<td><a href=\"javascript:borrarProducto("+ idProducto +")\"> QUITAR </a> </td>" +
                    "</tr>");
                $("#cantidad"+idProducto).numeric(".");
                $("#valor"+idProducto).numeric(".");
                
                 $("#popUpBuscarProducto").dialog("close");
                 
            }else{
                $("#popUpAdvertencia").dialog({
                    title: "Advertencia"
                });                
                $("#popUpAdvertenciaMensaje").html("Producto Se Encuentra Agregado.");
                $("#popUpAdvertencia").dialog("open");
            }
        },
        error: function() {
            alert("Error desconocido");
        }
    });
       
}

function calcularTotal() {
    var iTotalNeto = 0;
    
    $.each($("#listaProductos").find("tr"), function() {
        var datos = this.id.split("-");
        
        var idProducto = datos[1];
        var iCantidad  = $("#cantidad" + idProducto).val();
        var iValorNeto = $("#valor" + idProducto).val();
                
        if(iCantidad > 0 && iValorNeto > 0) {
            iTotalNeto += Math.floor(iCantidad * iValorNeto);
        }
    });
    
    $("#txtTotalNeto").html(formatoDinero(iTotalNeto));
}

function cambioCantidad(idProducto, valor) {
    if(valor < 0) $("#cantidad" + idProducto).val(valor * -1);
    
    calcularTotal();
}

function cambioCantidadRecep(idProducto, valor) {
    if(valor < 0) $("#cantidadRecep" + idProducto).val(valor * -1);
}

function cambioPrecio(idProducto, valor) {
    if(valor < 0) $("#valor" + idProducto).val(valor * -1);
    
    calcularTotal();
}
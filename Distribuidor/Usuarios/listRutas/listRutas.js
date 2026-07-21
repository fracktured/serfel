/*************************************************/
/* Autor: ccastro                                */
/* Fecha: 12/08/2010                             */
/*************************************************/

$(document).ready(function() {
    iniPopUpError();
    
    $("#detalleRutas").hide();
    
    $("button").button();
    
    $("#popUpIngRuta").dialog({
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
            'Agregar esta Ruta': function() {
                ingRutaBD();
            }
        },
        close   : limpiarPopUpIng
    });

    $("#popUpElimRuta").dialog({
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
            'Eliminar esta Ruta': function() {
                elimRutaBD();
		$(this).dialog('close');
            }
	}
    });
    
    $("#popUpExito").dialog({
        autoOpen: false,
        modal   : true,
        buttons : {
            "Ok": function() {document.location.href = document.location.href;}
        },
        close   : function() {document.location.href = document.location.href;}
    });
    
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
                $("#idLocalElim").val("");
            },
            'Eliminar esta Ruta': function() {
                elimLocalARutaBD($("#idLocalElim").val(), $("#idRuta").val());
		$(this).dialog('close');
            }
	}
    });
});

function ingRuta() {
    $("#txtNomRuta").hide();
    $("#nomNuevaRuta").show();
    
    $("#popUpIngRuta").dialog({
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
            'Agregar esta Ruta': function() {
                ingRutaBD();
            }
        },
        close   : limpiarPopUpIng
    });
    
    $("#popUpIngRuta").dialog("open");
}

function ingRutaBD() {
    var errores = false;
    
    // Se hacen varios if para q coloree todos los campos con errores
    if(validaInputVacio("nomNuevaRuta", "")) errores = true;

    if(errores) mensajesPopUpError("vacios");
    else {
        $.ajax({
            data: {
                nomNuevaRuta: $("#nomNuevaRuta").val(),
                idVendedor  : $("#cmbListaVendedores").val(),
                numDia      : $("#cmbDias").val()
            },
            type    : "POST",
            dataType: "json",
            url     : "Usuarios/listRutas/ingRuta.php",
            success : function(json) {
                $("#popUpExito").dialog({title: "Ingreso de Rutas"});

                if(json.resultado > 0) {
                    $("#popUpExitoMensaje").html("Nueva Ruta ingresada exitosamente.");
                    $("#popUpExito").dialog("open");
                } else if(json.resultado == 0) {
                    $("#popUpErrorMensaje").html("La Ruta ya se encuentra ingresada al Sistema.");
                    $("#popUpError").dialog("open");
                } else if(json.resultado == -2) {
                    mensajesPopUpError(json.tipoError);
                }
            },
            error: function() {alert("Error desconocido");}
        });
    }
}

function modRuta() {
    $("#nomNuevaRuta").hide();
    $("#txtNomRuta").show();
    
    $("#popUpIngRuta").dialog({
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
            'Modificar esta Ruta': function() {
                modRutaBD();
            }
        },
        close   : limpiarPopUpIng
    });
    
    $("#popUpIngRuta").dialog("open");
}

function modRutaBD() {
    var errores = false;

    // Se hacen varios if para q coloree todos los campos con errores
    if(errores) mensajesPopUpError("vacios");
    else {
        $.ajax({
            data: {
                idRuta    : $("#idRuta").val(),
                idVendedor: $("#cmbListaVendedores").val(),
                numDia    : $("#cmbDias").val()
            },
            type    : "POST",
            dataType: "json",
            url     : "Usuarios/listRutas/modRuta.php",
            success : function(json) {
                $("#popUpExito").dialog({title: "Modificación de Rutas"});

                if(json.resultado > 0) {
                    $("#popUpExitoMensaje").html("Ruta modificada exitosamente.");
                    $("#popUpExito").dialog("open");
                }
            },
            error: function() {alert("Error desconocido");}
        });
    }
}

function limpiarPopUpIng() {
    $("#nomNuevaRuta").val("");
}

function eliminarRuta() {
    $("#idRutaElim").val($("#cmbListaRutas").val());
    $("#nomRutaElim").html($("#cmbListaRutas option:selected").text());
    $("#popUpElimRuta").dialog("open");
}

function elimRutaBD() {
    $.ajax({
        data: {
            idRuta: $("#idRutaElim").val()
        },
        type    : "POST",
        dataType: "json",
        url     : "Usuarios/listRutas/elimRuta.php",
        success : function(json) {
            $("#popUpExito").dialog({title: "Eliminación de Rutas"});
            
            if(json.resultado == 1) {
                $("#popUpExitoMensaje").html("La Ruta ha sido eliminada del Sistema.");
                $("#popUpExito").dialog("open");
            }
        },
        error: function() {alert("Error desconocido");}
    });
}

function desplegarRutas() {
    $("#detalleRutas").find("fieldset").remove();
    $("#detalleRutas").find("br").remove();
    
    if($("#cmbListaRutas").val() == "" || $("#cmbListaRutas").val() == null) {
        $("#popUpErrorMensaje").html("No existen Rutas ingresadas al Sistema.");
        $("#popUpError").dialog("open");
    } else {
        $.ajax({
            async   : true,
            type    : "POST",
            dataType: "json",
            url     : "Usuarios/listRutas/desplegarRutas.php",

            data: {
                idRuta: $("#cmbListaRutas").val()
            },
            success: function(json) {
                //Bloque de tabla de Rutas
                var fieldSet = "<fieldset id='fieldSetRutasLocales' style='padding: 15px'>" +
                                   "<legend><span id='nomRuta'></legend>" +
                                   "Vendedor: <span id='nomVendedor'></span>" + 
                                   "<br />" +
                                   "Día: <span id='nomDia'></span>" +
                                   "<br /><br />" +
                                   "<button id='modificarRuta'>Modificar Ruta</button>" +
                                   "<button id='agregarRutaLocales'>Agregar Local a Ruta</button>";

                if(json.total_locales > 0) {
                    fieldSet += "<br /><br />" +
                                "<table id='rutasLocales' cellpadding='0' cellspacing='0' border='0' class='display'>" +
                                    "<thead>" +
                                        "<tr>" +
											"<th>Rut          </th>" +
											"<th>Razon Social </th>" +
                                            //"<th>N            </th>" +
                                            "<th>Nombre Local </th>" +
                                            "<th>Dirección    </th>" +
                                            //"<th>Telefono     </th>" +
                                            "<th>Contacto     </th>" +
                                            //"<th>Fono Contacto</th>" +
                                            "<th>E</th>" +
                                        "</tr>" +
                                    "</thead>" +
                                    "<tbody>";

                    $.each(json.locales, function() {
                        fieldSet += "<tr>" +
										"<td>" + this.rut_completo	    + "</td>" +
										"<td>" + this.razon_social	    + "</td>" +
                                        //"<td>" + this.id_local_cliente  + "</td>" +
                                        "<td>" + this.nom_local_cliente + "</td>" +
                                        "<td>" + this.dir_local_cliente + "</td>" +
                                        //"<td>" + this.telefono          + "</td>" +
                                        "<td>" + this.contacto          + "</td>" +
                                        //"<td>" + this.fono_contacto     + "</td>" +
                                        "<td class='linkElim'>" +
                                            "<a class='linkElim' href='javascript:elimLocalARuta(" + this.id_local_cliente + ")'" +
                                                                "title='Eliminar'></a></td>" +
                                    "</tr>";
                    });

                    fieldSet +=    "</tbody>" +
                            "</table>";
                }

                fieldSet += "</fieldset>" +
                            "<br />";
                        
                $("#detalleRutas").append(fieldSet);
                
                $("#idRuta").val($("#cmbListaRutas").val());
                $("#nomRuta").html($("#cmbListaRutas option:selected").text());
                $("#txtNomRuta").html($("#cmbListaRutas option:selected").text());
                
                $("#idVendedor").val(json.vendedor);
                $("#cmbListaVendedores option[value='" + json.vendedor + "']").attr("selected", "selected");
                $("#nomVendedor").html($("#cmbListaVendedores option:selected").text());
                
                //$("#cmbDias option[value='" + json.num_dia + "']").attr("selected", "selected");
                $("#cmbDias").val(json.num_dia);
                $("#nomDia").html($("#cmbDias option:selected").text());
                
                $("button").button();
                $("#agregarRutaLocales").click(mostrarPopUpBuscarCliente);
                $("#modificarRuta").click(modRuta);
                
                /*$("#agregarRutaMartes").click(   function() {agregarRuta(2, $("#cmbListaVendedores").val())});
                $("#agregarRutaMiercoles").click(function() {agregarRuta(3, $("#cmbListaVendedores").val())});
                $("#agregarRutaJueves").click(   function() {agregarRuta(4, $("#cmbListaVendedores").val())});
                $("#agregarRutaViernes").click(  function() {agregarRuta(5, $("#cmbListaVendedores").val())});*/

                $("#rutasLocales").dataTable({
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
                
                $("#detalleRutas").show();
                
                //Fin Bloque de tabla de Rutas LUNES
                /*
                //Bloque de tabla de Rutas MARTES
                fieldSet += "<fieldset id='fieldSetRutasMartes' style='padding: 15px'>" +
                                "<legend>Martes</legend>" +
                                "<button id='agregarRutaMartes'>Agregar Ruta</button>";

                if(json.martes != "") {
                    fieldSet += "<br /><br />" +
                                "<table id='rutasMartes' cellpadding='0' cellspacing='0' border='0' class='display'>" +
                                    "<thead>" +
                                        "<tr>" +
                                            "<th>N            </th>" +
                                            "<th>Nombre Local </th>" +
                                            "<th>Dirección    </th>" +
                                            "<th>Telefono     </th>" +
                                            "<th>Contacto     </th>" +
                                            "<th>Fono Contacto</th>" +
                                            "<th>E</th>" +
                                        "</tr>" +
                                    "</thead>" +
                                    "<tbody>";

                    $.each(json.martes, function() {
                        fieldSet += "<tr>" +
                                        "<td>" + this.id_local_cliente  + "</td>" +
                                        "<td>" + this.nom_local_cliente + "</td>" +
                                        "<td>" + this.dir_local_cliente + "</td>" +
                                        "<td>" + this.telefono          + "</td>" +
                                        "<td>" + this.contacto          + "</td>" +
                                        "<td>" + this.fono_contacto     + "</td>" +
                                        "<td class='linkElim'>" +
                                            "<a class='linkElim' href='javascript:elimLocalARuta(" + this.id_local_cliente + ", " +
                                                                                                $("#cmbListaVendedores").val() + ", " +
                                                                                                "2)'" +
                                                                "title='Eliminar'></a></td>" +
                                    "</tr>";

                    });

                    fieldSet +=    "</tbody>" +
                            "</table>";
                }

                fieldSet += "</fieldset>" +
                            "<br />";
                //Fin Bloque de tabla de Rutas MARTES

                //Bloque de tabla de Rutas MIERCOLES
                fieldSet += "<fieldset id='fieldSetRutasMiercoles' style='padding: 15px'>" +
                                "<legend>Miércoles</legend>" +
                                "<button id='agregarRutaMiercoles'>Agregar Ruta</button>";

                if(json.miercoles != "") {
                    fieldSet += "<br /><br />" +
                                "<table id='rutasMiercoles' cellpadding='0' cellspacing='0' border='0' class='display'>" +
                                    "<thead>" +
                                        "<tr>" +
                                            "<th>N            </th>" +
                                            "<th>Nombre Local </th>" +
                                            "<th>Dirección    </th>" +
                                            "<th>Telefono     </th>" +
                                            "<th>Contacto     </th>" +
                                            "<th>Fono Contacto</th>" +
                                            "<th>E</th>" +
                                        "</tr>" +
                                    "</thead>" +
                                    "<tbody>";

                    $.each(json.miercoles, function() {
                        fieldSet += "<tr>" +
                                        "<td>" + this.id_local_cliente  + "</td>" +
                                        "<td>" + this.nom_local_cliente + "</td>" +
                                        "<td>" + this.dir_local_cliente + "</td>" +
                                        "<td>" + this.telefono          + "</td>" +
                                        "<td>" + this.contacto          + "</td>" +
                                        "<td>" + this.fono_contacto     + "</td>" +
                                        "<td class='linkElim'>" +
                                            "<a class='linkElim' href='javascript:elimLocalARuta(" + this.id_local_cliente + ", " +
                                                                                                $("#cmbListaVendedores").val() + ", " +
                                                                                                "3)'" +
                                                                "title='Eliminar'></a></td>" +
                                    "</tr>";

                    });

                    fieldSet +=    "</tbody>" +
                            "</table>";
                }

                fieldSet += "</fieldset>" +
                            "<br />";
                //Fin Bloque de tabla de Rutas MIERCOLES

                //Bloque de tabla de Rutas JUEVES
                fieldSet += "<fieldset id='fieldSetRutasJueves' style='padding: 15px'>" +
                                "<legend>Jueves</legend>" +
                                "<button id='agregarRutaJueves'>Agregar Ruta</button>";

                if(json.jueves != "") {
                    fieldSet += "<br /><br />" +
                                "<table id='rutasJueves' cellpadding='0' cellspacing='0' border='0' class='display'>" +
                                    "<thead>" +
                                        "<tr>" +
                                            "<th>N            </th>" +
                                            "<th>Nombre Local </th>" +
                                            "<th>Dirección    </th>" +
                                            "<th>Telefono     </th>" +
                                            "<th>Contacto     </th>" +
                                            "<th>Fono Contacto</th>" +
                                            "<th>E</th>" +
                                        "</tr>" +
                                    "</thead>" +
                                    "<tbody>";

                    $.each(json.jueves, function() {
                        fieldSet += "<tr>" +
                                        "<td>" + this.id_local_cliente  + "</td>" +
                                        "<td>" + this.nom_local_cliente + "</td>" +
                                        "<td>" + this.dir_local_cliente + "</td>" +
                                        "<td>" + this.telefono          + "</td>" +
                                        "<td>" + this.contacto          + "</td>" +
                                        "<td>" + this.fono_contacto     + "</td>" +
                                        "<td class='linkElim'>" +
                                            "<a class='linkElim' href='javascript:elimLocalARuta(" + this.id_local_cliente + ", " +
                                                                                                $("#cmbListaVendedores").val() + ", " +
                                                                                                "4)'" +
                                                                "title='Eliminar'></a></td>" +
                                    "</tr>";

                    });

                    fieldSet +=    "</tbody>" +
                            "</table>";
                }

                fieldSet += "</fieldset>" +
                            "<br />";
                //Fin Bloque de tabla de Rutas JUEVES

                //Bloque de tabla de Rutas VIERNES
                fieldSet += "<fieldset id='fieldSetRutasViernes' style='padding: 15px'>" +
                                "<legend>Viernes</legend>" +
                                "<button id='agregarRutaViernes'>Agregar Ruta</button>";

                if(json.viernes != "") {
                    fieldSet += "<br /><br />" +
                                "<table id='rutasViernes' cellpadding='0' cellspacing='0' border='0' class='display'>" +
                                    "<thead>" +
                                        "<tr>" +
                                            "<th>N            </th>" +
                                            "<th>Nombre Local </th>" +
                                            "<th>Dirección    </th>" +
                                            "<th>Telefono     </th>" +
                                            "<th>Contacto     </th>" +
                                            "<th>Fono Contacto</th>" +
                                            "<th>E</th>" +
                                        "</tr>" +
                                    "</thead>" +
                                    "<tbody>";

                    $.each(json.viernes, function() {
                        fieldSet += "<tr>" +
                                        "<td>" + this.id_local_cliente  + "</td>" +
                                        "<td>" + this.nom_local_cliente + "</td>" +
                                        "<td>" + this.dir_local_cliente + "</td>" +
                                        "<td>" + this.telefono          + "</td>" +
                                        "<td>" + this.contacto          + "</td>" +
                                        "<td>" + this.fono_contacto     + "</td>" +
                                        "<td class='linkElim'>" +
                                            "<a class='linkElim' href='javascript:elimLocalARuta(" + this.id_local_cliente + ", " +
                                                                                                $("#cmbListaVendedores").val() + ", " +
                                                                                                "5)'" +
                                                                "title='Eliminar'></a></td>" +
                                    "</tr>";

                    });

                    fieldSet +=    "</tbody>" +
                            "</table>";
                }

                fieldSet += "</fieldset>" +
                            "<br />";
                //Fin Bloque de tabla de Rutas VIERNES

                $("#detalleRutas").append(fieldSet);
                $("button").button();
                $("#agregarRutaLunes").click(    function() {agregarRuta(1, $("#cmbListaVendedores").val())});
                $("#agregarRutaMartes").click(   function() {agregarRuta(2, $("#cmbListaVendedores").val())});
                $("#agregarRutaMiercoles").click(function() {agregarRuta(3, $("#cmbListaVendedores").val())});
                $("#agregarRutaJueves").click(   function() {agregarRuta(4, $("#cmbListaVendedores").val())});
                $("#agregarRutaViernes").click(  function() {agregarRuta(5, $("#cmbListaVendedores").val())});

                $("#rutasLunes").dataTable({
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

                $("#rutasMartes").dataTable({
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

                $("#rutasMiercoles").dataTable({
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

                $("#rutasJueves").dataTable({
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

                $("#rutasViernes").dataTable({
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
                });*/
            },
            error: function() {alert("Error desconocido");}
        });
    }
}

function seleccionarLocalCliente(idLocal) {
    $.ajax({
        async   : true,
        type    : "POST",
        dataType: "json",
        url     : "Usuarios/listRutas/ingLocalRuta.php",
        data    : {
            idLocal   : idLocal,
            idRuta    : $("#idRuta").val(),
            idVendedor: $("#idVendedor").val()
        },
        success: function(json) {
            $("#popUpExito").dialog({title: "Ingreso de Rutas"});

            if(json.resultado > 0) {
                $("#popUpExitoMensaje").html("Nueva Ruta ingresada exitosamente.");
                $("#popUpExito").dialog("open");
            } else if(json.resultado == 0) {
                $("#popUpErrorMensaje").html("La Ruta ya se encuentra ingresada al Sistema.");
                $("#popUpError").dialog("open");
            }
        },
        error: function() {alert("Error desconocido");}
    });
}

function elimLocalARuta(idLocal) {
    $("#idLocalElim").val(idLocal);
    $("#popUpElim").dialog("open");
}

function elimLocalARutaBD(idLocal, idRuta) {
    $.ajax({
        async   : true,
        type    : "POST",
        dataType: "json",
        url     : "Usuarios/listRutas/elimLocalRuta.php",
        data    : {
            idLocal: idLocal,
            idRuta : idRuta
        },
        success: function(json) {
            $("#popUpExito").dialog({title: "Eliminación de Productos"});
            
            if(json.resultado == 1) {
                $("#popUpExitoMensaje").html("La Ruta ha sido eliminada del Sistema.");
                $("#popUpExito").dialog("open");
            }
            
            $("#idRutaElim").val("");
            $("#idVendedorElim").val("");
            $("#idNumDiaElim").val("");
        },
        error: function() {alert("Error desconocido");}
    });
}

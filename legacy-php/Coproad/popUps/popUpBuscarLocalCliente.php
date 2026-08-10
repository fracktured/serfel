<script type="text/javascript">
    $(function() {
        $("#popBuscarLocalCliente").dialog({
            bgiframe: true,
            resizable: true,
            autoOpen: false,
            modal: true,
            width: 1100,
            overlay: {
                backgroundColor: '#000',
                opacity: 0.5
            }
        });
    });

    function mostrarPopUpBuscarCliente() {
        $("#popBuscarLocalCliente").dialog("open");
    }

    function buscarClientes() {
        var tabla = "";
        $("#listaLocales").find("div").remove();

        $.ajax({
            async   : false,
            type    : "POST",
            dataType: "json",
            url     : "Ajax/Cliente/ajaxClientes.php",
            data    : {
                btnFiltrar: true,
                rutCliente: $("#rutCliente").val(),
                nombre : $("#nombre").val(),
                direccion: $("#direccion").val()
            },
            success: function(json) {
                if(json != "") {
                    tabla = "<table id='tablaClientes' cellpadding='0' cellspacing='0' border='0' class='display'>" +
                                "<thead>" +
                                    "<tr>" +
                                        "<th>Rut</th>" +
                                        "<th>Razon Social</th>" +
                                        "<th>Nombre Fantasía</th>" +
                                        "<th>Telefono</th>" +
                                        "<th>Email</th>" +
                                        "<th>L</th> " +
                                    "</tr>" +
                                "</thead>" +
                                "<tbody>";

                    $.each(json.clientes, function() {
                        tabla += "<tr>" +
                                    "<td>" + this.rut_cliente + "-" + this.dv_cliente + "</td>" +
                                    "<td>" + this.razon_social + "</td>" +
                                    "<td>" + this.nom_fantasia + "</td>" +
                                    "<td align='center'>" + this.telefono_cliente + "</td>" +
                                    "<td>" + this.email_cliente + "</td>" +
                                    "<td class='linkLista'>" +
                                        "<a class='linkLista' href='javascript:cargarListaLocales(" + this.rut_cliente + ")'" + 
                                                            "title='Ver Locales'></a></td>" +
                                "</tr>";
                    });

                    tabla +=     "</tbody>" +
                            "</table>";

                    $("#listaLocales").append(tabla);

                    $("#tablaClientes").dataTable({
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
                }
            },
            error: function() {alert("Error desconocido");}
        });
    }
    
    function cargarListaLocales(rutCliente) {
        var tabla = "";

        $("#listaLocales").find("div").remove();

        $.ajax({
            async   : false,
            type    : "POST",
            dataType: "json",
            url     : "Clientes/Globales/obtInfoCliente.php",
            data    : {
                rutCliente : rutCliente
            },
            success: function(json) {
                tabla = "<table id='tablaLocalesClientes' cellpadding='0' cellspacing='0' border='0' class='display'>" +
                            "<thead>" +
                                "<tr>" +
                                    "<th>Nº</th>" +
                                    "<th>Nombre Local</th>" +
                                    "<th>Telefono</th>" +
                                    "<th>Email</th>" +
                                    "<th>Contacto</th>" +
                                    "<th>Fono Contacto</th> " +
                                    "<th>Email Contacto</th> " +
                                    "<th>S</th> " +
                                "</tr>" +
                            "</thead>" +
                            "<tbody>";

                $.each(json.locales, function() {
                    tabla += "<tr>" +
                                "<td>" + this.id_local + "</td>" +
                                "<td>" + this.nom_local + "</td>" +
                                "<td align='center'>" + this.telefono + "</td>" +
                                "<td align='center'>" + this.email + "</td>" +
                                "<td>" + this.nom_contacto + "</td>" +
                                "<td align='center'>" + this.fono_contacto  + "</td>" +
                                "<td align='center'>" + this.email_contacto + "</td>" +
                                "<td class='linkLista'>" +
                                    "<a class='linkLista' href='javascript:seleccionarLocalCliente(" + this.id_local + ")'" + 
                                                        "title='Seleccionar Local'></a></td>" +
                            "</tr>";
                });

                tabla +=     "</tbody>" +
                        "</table>";

                $("#listaLocales").append(tabla);

                $("#tablaLocalesClientes").dataTable({
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
    }
</script>

<div id="popBuscarLocalCliente" title="Buscar Local">
    <div id="divFiltros">
        <form id="formFiltros" action="javascript:buscarClientes()" class="form-container">
            <div class="form-grid">
                <div class="form-group">
                    <label for="rutCliente">RUT:</label>
                    <input type="text" id="rutCliente" name="rutCliente" class="form-control" value="<?php echo $oModel->cRutCliente; ?>" placeholder="Ej: 12345678-9">
                </div>
                <div class="form-group">
                    <label for="nombre">Nombre:</label>
                    <input type="text" id="nombre" name="nombre" class="form-control" value="<?php echo $oModel->cRazonSocialCliente; ?>" placeholder="Ingrese nombre">
                </div>
                <div class="form-group">
                    <label for="direccion">Dirección:</label>
                    <input type="text" id="direccion" name="direccion" value="<?php echo $oModel->cDireccion; ?>" class="form-control">
                </div>

                <div class="form-group"></div>
                <div class="form-group"></div>
                <div class="button-container">
                    <input type="submit" value="Filtrar" id="btnFiltrar" name="btnFiltrar" class="btn-submit" />
                </div>
            </div>
        </form>
    </div>

    <div id="listaLocales">
        
    </div>
</div>
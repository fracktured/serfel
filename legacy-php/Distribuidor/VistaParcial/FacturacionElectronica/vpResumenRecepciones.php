<?php 
require_once 'Clases/Util/FormatoUtil.php';
?>

<script type="text/javascript">
    function iniTablaRecepciones() {
        var tabla = 
                $("#tablaLibro").dataTable({
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
                    }/*,
                    fnRowCallback: function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                        // Row click
                        $(nRow).on('click', function() {
                          console.log('Row Clicked. Look I have access to all params, thank You closures.', this, aData, iDisplayIndex, iDisplayIndexFull);
                        });

                        // Cell click
                        $('td', nRow).on('click', function() {
                          console.log('Col Clicked.', this, aData, iDisplayIndex, iDisplayIndexFull);
                        });
                    }*/
                });
    }
    
    function confirmEliminarRecepcionLibro(idRecepcion, iNumDocto, cNomProveedor) {
        $("#popUp").dialog({
            autoOpen: false,
            modal   : true,
            buttons : {
                "Ok": function() {
                    $(this).dialog("close");
                    doEliminarRecepcionLibroCV(idRecepcion);
                },
                "Cancelar": function() {
                    $(this).dialog("close")
                }
            }
        });

        $("#popUpMsg").html("¿Esta seguro que desea eliminar del Libro COMPRA el documento " + iNumDocto + " del proveedor " + cNomProveedor + "?")
        $("#popUp").dialog("open");
    }

    function doEliminarRecepcionLibroCV(idRecepcion) {
        $("#popUpCargando").dialog("open");

        $.ajax({
            data: {
                idRecepcion: idRecepcion
            },
            type    : "POST",
            dataType: "json",
            url     : "Ajax/FacturacionElectronica/ajaxEliminarRecepcionLibroCV.php",
            success : function(oJson) {
                $("#popUpCargando").dialog("close");

                $("#popUp").dialog({
                    autoOpen: false,
                    modal   : true,
                    buttons : {
                        "Ok": function() {
                            if(oJson.bReload) {
                                location.reload();
                            } else {
                                $(this).dialog("close");
                            }
                        }
                    }
                });

                $("#popUp").dialog({title: "Eliminar Recepción Libro Compra"});
                $("#popUpMsg").html(oJson.cMensaje);
                $("#popUp").dialog("open");
            },
            error: function(xhr, status, error) {
                $("#popUpCargando").dialog("close");

                var err = JSON.parse(xhr.responseText);
                alert(document.location.href.match(/[^\/]+$/)[0] + ":doEliminarRecepcionLibroCV\n" + err.Message);
            }
        });
    }
</script>

<table id='tablaLibro' cellpadding='0' cellspacing='0' border='0' class='display'>
    <thead>
        <tr>
            <th>Tipo Documento</th>
            <th>N° Documento</th>
            <th>Rut Proveedor</th>
            <th>Razon Social Proveedor</th>
            <th>Total Docto</th>
            <th>E</th>
        </tr>
    </thead>
    <tbody>

        <?php
        foreach ($oModel->listRecepcionNDTO as $oRecepcionNDTO) {
            $oRecepcion = $oRecepcionNDTO->oRecepcion;
            $oTipoDocto = $oRecepcionNDTO->oTipoDocto;
            $oProveedor = $oRecepcionNDTO->oProveedor;

            echo "<tr>";
            echo "<td>" . $oTipoDocto->nom_tipo_docto . "</td>";
            echo "<td align='center'>" . $oRecepcion->num_docto . "</td>";
            echo "<td align='right'>" . $oProveedor->obtRutCompleto() . "</td>";
            echo "<td>" . $oProveedor->razon_social . "</td>";
            echo "<td align='right'>" . FormatoUtil::formatoDinero($oRecepcion->total_neto) . "</td>";
            echo "<td class='linkElim'>";
            
            if($oRecepcion->periodo_libro != '') {
                echo "<a class='linkElim' href='javascript:confirmEliminarRecepcionLibro(" . $oRecepcion->id_recepcion . ", " 
                                                                                           . $oRecepcion->num_docto . ", \"" 
                                                                                           . $oProveedor->razon_social . "\");' title='Eliminar'></a>";
            }
            
            echo "</td>";
            echo "</tr>";
        }
        ?>

    </tbody>
</table>
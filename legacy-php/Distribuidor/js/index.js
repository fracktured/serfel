/************************************************************
 * Autor: Christian Castro                                  *
 * Fecha: 09-08-2011                                        *
 * Desc : Funciones de pagina de registro                   *
 ************************************************************/

$(document).ready(function() {
    $("button").button();
});

function ingresar() {
    var vacios = false;
    
    if(validaInputVacio("rutLogin"))  vacios = true;
    if(validaInputVacio("passLogin")) vacios = true;
    
    if(vacios) {
        $("#txtVacio").html("Ingrese su Rut y su contraseña para ingresar.");
    } else {
        $.ajax({
            data: {
                rut : $("#rutLogin").val(),
                pass: hex_md5($("#passLogin").val())
            },
            type    : "POST",
            dataType: "json",
            url     : "Usuarios/login/validaLoginUsuario.php",
            success : function(json) {
                if(json.resultado == "")     $("#txtVacio").html("El Rut o la contraseña es inválida.");
                else if(json.resultado == 1) location.href = "SisDist.php";
                else if(json.resultado == 0) $("#txtVacio").html("Esa Cuenta se encuentra inactiva.");
            },
            error: function() {
                alert("error");
            }
        });
    }
}
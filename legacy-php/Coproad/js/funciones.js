

function validaEmail(valor) {
    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(valor)) {
        return true
    } else {
        return false;
    }
}

function validaInputVacio(idElemento, largo) {
    if($("#" + idElemento).val() == "") {
        if(largo == "")           $("#" + idElemento).attr("class", "inputError");
        else if(largo == "largo") $("#" + idElemento).attr("class", "inputLargoError");
        
        return true;
    } else {
        if(largo == "")           $("#" + idElemento).attr("class", "");
        else if(largo == "largo") $("#" + idElemento).attr("class", "inputLargo");
        
        return false;
    }
}

function rutValido(rut, dv){

    if(rut == "" || dv =="") {
        return false;
    }

    var x         = 2;
    var sumatorio = 0;

    var rutAux= rut;
    var k = 0;
    var aux;

    while((rutAux) != 0){
        aux=rutAux/10;
        rutAux=parseInt(aux,10);
        k++;
    }
    rutAux= rut;
    var auxmod;
    for(var i = k -1; i >= 0; i--) {

        if(x > 7) x = 2;
        auxmod= rutAux % 10;
        aux=rutAux/10;
        rutAux=parseInt(aux,10);
        sumatorio += auxmod * x;
        x++;
    }

    var digito = 11 - (sumatorio % 11);

    switch(digito) {
        case 10:
            digito = "k";
            break;
        case 11:
            digito = "0";
            break;
    }

    if(dv == "K"){
        dv = "k";
    }

    if(dv == digito) return true;
    else return false;
}

function obtPaginaInicio() {
    return "/coproad/Coproad/SisDist.php?act=index";
}

function convertirAFechaBD(fechaIng) {
    if(fechaIng != "") {
        var fecha = new Array();
        fecha = fechaIng.split("/"); 
        var resultado = fecha[2]+"-"+fecha[1]+"-"+fecha[0];  
        return resultado;
    } else return "";
}

function convertirAFechaJS(fechaIng) {
    var fecha = new Array();
    fecha = fechaIng.split("-"); 
    var resultado = fecha[2].substr(0, 2)+"-"+fecha[1]+"-"+fecha[0];  
    return resultado;
}

function formatoDinero(num) {
    if(num == "") {
        return "$ 0";
    } else {
        var decimales = "";
        var posComa;
        var cadena = "";
        var aux;
        var cont = 1,m,k;

        if(num < 0) aux = 1; else aux = 0;

        num = String(num).replace(".", ",");
        posComa = String(num).indexOf(",");

        if(posComa  > 0) {
            decimales = num.substring(num.indexOf(","),  num.indexOf(",") + 3);
            num = num.substring(0, num.indexOf(","));
        }

        for(m=num.length-1; m>=0; m--){
            cadena = num.charAt(m) + cadena;
            if(cont%3 == 0 && m >aux)  cadena = "." + cadena; else cadena = cadena;
            if(cont== 3) cont = 1; else cont++;
        }
        cadena = cadena.replace(/.,/,",");
        return "$ " + cadena + decimales;
    }
}

function calcularPrecioDescEntero(precio, desc, cant) {
    //return Math.round((precio / (1 + (desc / 100))) * cant);
    return Math.round(Math.round((precio - (precio * desc / 100))) * cant);
}

function calcularPrecioDesc(precio, desc, cant) {
    //return parseFloat((precio / (1 + (desc / 100))) * cant);
    return parseFloat(Math.round((precio - (precio * desc / 100))) * cant);
}
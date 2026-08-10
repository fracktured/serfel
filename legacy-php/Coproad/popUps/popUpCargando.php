<style>
    #circularG{
        position:relative;
        width:128px;
        height:128px}

    .circularG{
        position:absolute;
        background-color:#031381;
        width:29px;
        height:29px;
        -webkit-border-radius:19px;
        -moz-border-radius:19px;
        -webkit-animation-name:bounce_circularG;
        -webkit-animation-duration:1.1199999999999999s;
        -webkit-animation-iteration-count:infinite;
        -webkit-animation-direction:linear;
        -moz-animation-name:bounce_circularG;
        -moz-animation-duration:1.1199999999999999s;
        -moz-animation-iteration-count:infinite;
        -moz-animation-direction:linear;
        border-radius:19px;
        -o-animation-name:bounce_circularG;
        -o-animation-duration:1.1199999999999999s;
        -o-animation-iteration-count:infinite;
        -o-animation-direction:linear;
        -ms-animation-name:bounce_circularG;
        -ms-animation-duration:1.1199999999999999s;
        -ms-animation-iteration-count:infinite;
        -ms-animation-direction:linear;
    }

    #circularG_1{
        left:0;
        top:50px;
        -webkit-animation-delay:0.41999999999999993s;
        -moz-animation-delay:0.41999999999999993s;
        -o-animation-delay:0.41999999999999993s;
        -ms-animation-delay:0.41999999999999993s;
    }

    #circularG_2{
        left:14px;
        top:14px;
        -webkit-animation-delay:0.5599999999999999s;
        -moz-animation-delay:0.5599999999999999s;
        -o-animation-delay:0.5599999999999999s;
        -ms-animation-delay:0.5599999999999999s;
    }

    #circularG_3{
        top:0;
        left:50px;
        -webkit-animation-delay:0.7s;
        -moz-animation-delay:0.7s;
        -o-animation-delay:0.7s;
        -ms-animation-delay:0.7s;
    }

    #circularG_4{
        right:14px;
        top:14px;
        -webkit-animation-delay:0.8399999999999999s;
        -moz-animation-delay:0.8399999999999999s;
        -o-animation-delay:0.8399999999999999s;
        -ms-animation-delay:0.8399999999999999s;
    }

    #circularG_5{
        right:0;
        top:50px;
        -webkit-animation-delay:0.9799999999999999s;
        -moz-animation-delay:0.9799999999999999s;
        -o-animation-delay:0.9799999999999999s;
        -ms-animation-delay:0.9799999999999999s;
    }

    #circularG_6{
        right:14px;
        bottom:14px;
        -webkit-animation-delay:1.1199999999999999s;
        -moz-animation-delay:1.1199999999999999s;
        -o-animation-delay:1.1199999999999999s;
        -ms-animation-delay:1.1199999999999999s;
    }

    #circularG_7{
        left:50px;
        bottom:0;
        -webkit-animation-delay:1.26s;
        -moz-animation-delay:1.26s;
        -o-animation-delay:1.26s;
        -ms-animation-delay:1.26s;
    }

    #circularG_8{
        left:14px;
        bottom:14px;
        -webkit-animation-delay:1.4s;
        -moz-animation-delay:1.4s;
        -o-animation-delay:1.4s;
        -ms-animation-delay:1.4s;
    }

    @-webkit-keyframes bounce_circularG{
        0%{
        -webkit-transform:scale(1)}

    100%{
        -webkit-transform:scale(.3)}

    }

    @-moz-keyframes bounce_circularG{
        0%{
        -moz-transform:scale(1)}

    100%{
        -moz-transform:scale(.3)}

    }

    @-o-keyframes bounce_circularG{
        0%{
        -o-transform:scale(1)}

    100%{
        -o-transform:scale(.3)}

    }

    @-ms-keyframes bounce_circularG{
        0%{
        -ms-transform:scale(1)}

    100%{
        -ms-transform:scale(.3)}

    }

</style>

<script type="text/javascript">
    $(function() {
        $("#popUpCargando").dialog({
            autoOpen : false,
            modal    : true,
            width    : "155",
            height   : "200",
            resizable: false,
        }).parent('.ui-dialog').find('.ui-dialog-titlebar-close').remove();
    });
    /*
    $("#ui-dialog-title-popUpCargando").find("div").remove();
    $("#ui-dialog-title-popUpCargando").append(
    "<div id='circularG'>" +
        "<div id='circularG_1' class='circularG'></div>" +
        "<div id='circularG_2' class='circularG'></div>" +
        "<div id='circularG_3' class='circularG'></div>" +
        "<div id='circularG_4' class='circularG'></div>" +
        "<div id='circularG_5' class='circularG'></div>" +
        "<div id='circularG_6' class='circularG'></div>" +
        "<div id='circularG_7' class='circularG'></div>" +
        "<div id='circularG_8' class='circularG'></div>" +
        "</div>");
    */
</script>

<div id="popUpCargando" title="Cargando" align="center" style="text-align: center; vertical-align: middle">
    <!--<img src="images/cargando.gif" />-->
    
    <div id="circularG" width="100%" align="center">
        <div id="circularG_1" class="circularG"></div>
        <div id="circularG_2" class="circularG"></div>
        <div id="circularG_3" class="circularG"></div>
        <div id="circularG_4" class="circularG"></div>
        <div id="circularG_5" class="circularG"></div>
        <div id="circularG_6" class="circularG"></div>
        <div id="circularG_7" class="circularG"></div>
        <div id="circularG_8" class="circularG"></div>
    </div>
    
</div>
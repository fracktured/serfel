<script type="text/javascript">
    function iniPopUpExito() {
        $("#popUpExito").dialog({
            autoOpen: false,
            modal   : true,
            buttons : {
                "Ok": function() { location.reload(true); }
            },
            close   : function() { location.reload(true); }
        });
    }
</script>

<div id="popUpExito" title="">
    <p id="popUpExitoMensaje" class="popUp"></p>
</div>
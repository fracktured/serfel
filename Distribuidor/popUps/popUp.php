<script type="text/javascript">
    $(function() {
        $("#popUp").dialog({
            autoOpen: false,
            modal   : true
        });
    });
    
    function puCrearDialogPopUp(oJson) {
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
    }
</script>

<div id="popUp" title="">
    <p id="popUpMsg" class="popUp"></p>
</div>
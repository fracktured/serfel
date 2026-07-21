var app = angular.module('CrearPedido');

app.directive('myAutocomplete', function(){

	function link(scope, elemento, atributo){
		
		$(elemento).autocomplete({
			source: scope.$eval(atributo.myAutocomplete),
			select: function(ev, ui){
				ev.preventDefault();
				if(ui.item){
					scope.optionSelected(ui.item.value);
				}
			},
			focus: function(ev, ui){
				ev.preventDefault();
				$(this).val(ui.item.label);
			}
		});
	};
	return {
		link: link
	};
});
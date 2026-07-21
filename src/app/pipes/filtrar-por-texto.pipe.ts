// TODO: corregir para hacer generico con nombres a filtrar como parametros de entrada
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filtrarPorTexto'
})
export class FiltrarPorTextoPipe implements PipeTransform {

  transform(items: any[], textoParaFiltrar: string): any {

    textoParaFiltrar = textoParaFiltrar.toUpperCase();

    if (items && textoParaFiltrar) {

      return items.filter(
                      item => item.razon_social.toUpperCase().includes(textoParaFiltrar)
                      || item.nom_local_cliente.toUpperCase().includes(textoParaFiltrar)
                  );
    }

    return items;
  }

}

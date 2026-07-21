import { Pipe, PipeTransform } from '@angular/core';
import { ClienteModel } from '@app/models/cliente.model';

@Pipe({
   name: 'clientFullRut',
   pure: true
})
export class ClientFullRutPipe implements PipeTransform {
   transform(cliente: ClienteModel, args?: any): any {
      return `${cliente.rutCliente}-${cliente.dvCliente}`;
   }
}
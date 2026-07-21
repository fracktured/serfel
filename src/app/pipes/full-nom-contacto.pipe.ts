import { Pipe, PipeTransform } from '@angular/core';
import { LocalModel } from '@app/models/local.model';

@Pipe({
   name: 'contactFullName',
   pure: true
})
export class ContactFullName implements PipeTransform {
   transform(local: LocalModel, args?: any): any {
      return `${local.apePatContacto} ${local.apeMatContacto} ${local.nomContacto}`;
   }
}
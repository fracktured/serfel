import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
   name: 'fullName',
   pure: true
})
export class FullName implements PipeTransform {
   transform(persona: any, args?: any): any {
      return `${persona.apPaterno} ${persona.apMaterno} ${persona.nombre}`;
   }
}
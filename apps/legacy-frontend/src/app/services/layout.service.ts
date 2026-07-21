import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/internal/Subject';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {

  private emitChangeModulo = new Subject<any>();
  changeModuloEmitted$ = this.emitChangeModulo.asObservable();

  constructor() { }

  setModulo(modulo: any) {
    this.emitChangeModulo.next(modulo);
  }
}

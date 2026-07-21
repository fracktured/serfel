import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserModel } from '../models/user.model';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TipoUsuario } from '../models/tipo-usuario.model';

declare function hex_md5(parametro: string): any;

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private userSubject: BehaviorSubject<UserModel>;
  public user: Observable<UserModel>;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.userSubject = new BehaviorSubject<UserModel>(JSON.parse(localStorage.getItem('user')));
    this.user = this.userSubject.asObservable();
  }

  public get userValue(): UserModel {
    return this.userSubject.value;
  }


  login(user: UserModel) {
    user.cPassword = hex_md5(user.cPassword);
    return this.http.post(`${ environment.apiUrlSerfelWeb }/LoginREST/login2`, user)
      .pipe(map( (response: any) => {
        if ( response.exito ) {
          // store user details and basic auth credentials in local storage to keep user logged in between page refreshes
          user.authdata = window.btoa(user.cRut + ':' + user.cPassword);

          if ( response.tipoUsuario.nomTipoUsuario === 'Administrador' ) {
            user.tipoUsuario = TipoUsuario.Administrador;
          } else if ( response.tipoUsuario.nomTipoUsuario === 'Vendedor' ) {
            user.tipoUsuario = TipoUsuario.Vendedor;
          } else if ( response.tipoUsuario.nomTipoUsuario === 'Secretaria' ) {
            user.tipoUsuario = TipoUsuario.Secretaria;
          }

          localStorage.setItem('usuario', JSON.stringify(response.usuario));
          localStorage.setItem('tipoUsuario', JSON.stringify(response.tipoUsuario));
          localStorage.setItem('user', JSON.stringify(user));
          this.userSubject.next(user);
          return user;
        } else {
          return response.mensaje;
        }
      }));
  }

  estaLogueado(): boolean {
    const usuario: string = localStorage.getItem('usuario');
    return (usuario && usuario.length > 20);
  }

  logOut() {
    localStorage.removeItem('usuario');
    localStorage.removeItem('tipoUsuario');
    localStorage.removeItem('user');
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }
}

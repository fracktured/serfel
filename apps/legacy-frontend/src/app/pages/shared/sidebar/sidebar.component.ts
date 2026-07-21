import { Component, OnInit } from '@angular/core';
import { UsuarioModel } from '../../../models/usuario.model';
import { TipoUsuarioModel, TipoUsuario } from '../../../models/tipo-usuario.model';
import { UserModel } from '@app/models/user.model';
import { LoginService } from '@app/services/login.service';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  user: UserModel;
  nomUsuario: string;
  nomTipoUsuario: string;
  esCoproad: boolean;
  esSerfel: boolean;

  constructor(private loginService: LoginService) {
    this.esCoproad = environment.esCoproad;
    this.esSerfel = !this.esCoproad;
    this.loginService.user.subscribe(x => this.user = x);
  }

  ngOnInit(): void {
    const usuario: UsuarioModel = JSON.parse(localStorage.getItem('usuario'));
    this.nomUsuario = usuario.nomUsuario + ' ' + usuario.apellPatUsuario + ' ' + usuario.apellMatUsuario;
    const tipoUsuario: TipoUsuarioModel = JSON.parse(localStorage.getItem('tipoUsuario'));
    this.nomTipoUsuario = tipoUsuario.nomTipoUsuario;
  }

  get isAdmin() {
    return this.user && this.user.tipoUsuario === TipoUsuario.Administrador;
  }

  get isAdminOrSecre() {
    return this.user && 
      ( this.user.tipoUsuario === TipoUsuario.Administrador 
        || this.user.tipoUsuario === TipoUsuario.Secretaria );
  }
}

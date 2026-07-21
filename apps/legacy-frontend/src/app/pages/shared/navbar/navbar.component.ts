import { Component, OnInit } from '@angular/core';
import * as $ from 'jquery';
import { LoginService } from 'src/app/services/login.service';
import { UsuarioModel } from '../../../models/usuario.model';
import { LayoutService } from 'src/app/services/layout.service';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  nomUsuario: string;
  modulo: string;
  esCoproad: boolean;
  esSerfel: boolean;

  constructor(
    private loginService: LoginService,
    private layoutService: LayoutService
  ) {
  }

  ngOnInit(): void {
    this.esCoproad = environment.esCoproad;
    this.esSerfel = !this.esCoproad;
    this.layoutService.changeModuloEmitted$.subscribe(
      newModulo => {
        this.modulo = newModulo;
      });

    this.layoutService.setModulo('');
    const usuario: UsuarioModel = JSON.parse(localStorage.getItem('usuario'));
    this.nomUsuario = usuario.nomUsuario + ' ' + usuario.apellPatUsuario + ' ' + usuario.apellMatUsuario;

    // tslint:disable-next-line:only-arrow-functions
    $('ul.child_menu').find('a.list-group-item').on('click', function(e){
      e.preventDefault();
      $('#wrapper').toggleClass('toggled');
    });
  }

  menu(e) {
    e.preventDefault();
    $('#wrapper').toggleClass('toggled');
  }

  logout() {
    this.loginService.logOut();
  }

}

import { Component, OnInit } from '@angular/core';
import { LoginService } from '../../services/login.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  formularioLogin: FormGroup;
  cMensajeError: string;
  error: boolean;
  esCoproad: boolean;
  esSerfel: boolean;

  constructor(
    private formBulder: FormBuilder,
    private loginService: LoginService,
    private router: Router
  ) {
    this.esCoproad = environment.esCoproad;
    this.esSerfel = !this.esCoproad;
    this.error = false;
    if ( this.loginService.userValue ) {
      this.router.navigate(['/home']);
    }
    this.crearFormulario();
  }

  get esRutInvalido(){
    return this.formularioLogin.get('cRut').invalid && this.formularioLogin.get('cRut').touched;
  }

  get esPasswordInvalido(){
    return this.formularioLogin.get('cPassword').invalid && this.formularioLogin.get('cPassword').touched;
  }

  crearFormulario(){
    this.formularioLogin = this.formBulder.group({
      cRut     : ['', [Validators.required, Validators.minLength(5)]],
      cPassword: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
  }

  login() {
    if ( this.formularioLogin.invalid ) {
      Object.values( this.formularioLogin.controls ).forEach( control => {
          control.markAsTouched();
      });

      return;
    }
    /*
    this.loginService.login(this.formularioLogin.value).subscribe( (response: any) => {
      if ( response.exito ) {
        localStorage.setItem('usuario', JSON.stringify(response.usuario));
        localStorage.setItem('tipoUsuario', JSON.stringify(response.tipoUsuario));
        this.router.navigate(['/home']);
      } else {
        alert( response.mensaje );
      }
    });*/
    this.loginService.login(this.formularioLogin.value)
      .pipe(first())
      .subscribe(
        data => {
          this.router.navigate(['/home']);
        },
        error => {
          this.cMensajeError = error.error.mensaje;
          this.error = true;
          //this.loading = false;
        });
  }

}

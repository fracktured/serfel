import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LayoutService } from '@app/services/layout.service';
import { ProductoService } from '@app/services/producto.service';
import { of } from 'rxjs';
import { first } from 'rxjs/operators';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit {
  error = false;
  mensajeError = '';
  nombreProducto = '';
  codigoProducto: number;
  productos: any[];
  spinnerBuscar: boolean;

  constructor(
    private layoutService: LayoutService,
    private productoService: ProductoService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.layoutService.setModulo('Productos');
  }

  limpiarNombre() {
    this.nombreProducto = '';
  }

  limpiarCodigo() {
    this.codigoProducto = undefined;
  }

  buscarProductosXNombre() {
    this.spinnerBuscar = true;
    this.productoService.buscarXNombre( this.nombreProducto )
      .pipe(
        catchError(err => {
          this.error = true;
          this.mensajeError = err.mensaje;
          this.spinnerBuscar = false;
          return of([]);
        })
      )
      .subscribe(response => {
        this.error = false;
        this.productos = response;
        this.spinnerBuscar = false;
      });
  }

  buscarProductoXCodigo() {
    this.productoService.buscarXCodigo( this.codigoProducto )
      .pipe(
        catchError(err => {
          this.error = true;
          this.mensajeError = err.mensaje;
          return of([]);
        })
      )
      .subscribe(response => {
        this.error = false;
        this.productos = response;
      });
  }

  porciones(idProducto: number) {
    this.router.navigate(['/producto/porciones', idProducto]);
  }

}

import { Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LayoutService } from '@app/services/layout.service';
import { PorcionService } from '@app/services/porcion.service';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PorcionModel } from '@app/models/porcion.model';
import { FormBuilder, Validators } from '@angular/forms';
import { ProductoModel } from '@app/models/producto.model';
import { PorcionSortableHeader, SortEvent } from './porcion-sortable.directive';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalPorcionComponent } from '../modal-porcion/modal-porcion.component';
import { ProductoService } from '@app/services/producto.service';

const compare = (v1: string | number | Date, v2: string | number | Date) => v1 < v2 ? -1 : v1 > v2 ? 1 : 0;

@Component({
  selector: 'app-porciones',
  templateUrl: './porciones.component.html',
  styleUrls: ['./porciones.component.css']
})
export class PorcionesComponent implements OnInit {
  idProducto: number;
  producto: ProductoModel;
  porciones: PorcionModel[];
  switchPorciones: boolean;
  formCrear = this.formBuilder.group({
    numero: [null as number | null, [Validators.required, Validators.min(1), Validators.max(100)]],
    cantidad: [null as number | null, [Validators.required, Validators.min(0.05)]]
  });
  formBuscar = this.formBuilder.group({
    idProducto: [null as number | null],
    opcionBuscar: [null as string | null],
    numero: [null as number | null, [Validators.required, Validators.min(1), Validators.max(100)]],
    factura: [null as number | null, [Validators.required, Validators.min(1)]],
    estado: ['1']
  });
  error = false;
  mensajeError = '';
  
  @ViewChildren(PorcionSortableHeader) headers: QueryList<PorcionSortableHeader>;

  constructor(
    private formBuilder: FormBuilder,
    private layoutService: LayoutService,
    private activatedRoute: ActivatedRoute,
    private modalService: NgbModal,
    private productoService: ProductoService,
    private porcionService: PorcionService
  ) { }

  ngOnInit(): void {
    this.layoutService.setModulo('Porciones / Pesajes');
    this.buscarTodas()
  }

  buscarTodas() {
    this.activatedRoute.params.subscribe( (params: any) => {
      this.porcionService.buscarTodas( params.idProducto )
        .pipe(
          catchError(err => {
            this.handleError(err);
            return of([]);
          })
        )
        .subscribe(response => {
          this.producto = response.producto;
          this.switchPorciones = this.producto.usaPorciones;
          this.porciones = response.porciones;
          this.idProducto = params.idProducto;
          this.formCrear.patchValue({
            numero: response.nextNumero
          });
          this.formBuscar.patchValue({
            idProducto: params.idProducto
          });
        });
    });
  }

  onSwitchChange(event) {
    const data = {
      usaPorciones: this.switchPorciones
    };
    this.productoService.switchPorciones( this.idProducto, data )
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of([]);
        })
      )
      .subscribe(response => {
        if( !this.error ) {
          console.log(response);
        }
      });
  }

  agregar() {
    this.error = false;
    const formValue = {
      ...this.formCrear.value,
      idProducto: this.idProducto
    } as any;
    this.porcionService.crear( this.idProducto, formValue )
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of([]);
        })
      )
      .subscribe(response => {
        if( !this.error ) {
          this.porciones.unshift(response);
          this.porciones.sort( (a, b) => { return b.numero - a.numero  });
          this.formCrear.patchValue({
              numero: this.porciones[0].numero + 1,
              cantidad: null
            });
        }
      });
  }

  modificar(porcion: PorcionModel) {
    const modalPorcion = this.modalService.open(ModalPorcionComponent, {size: 'md'});
    modalPorcion.componentInstance.porcion = {...porcion};

    modalPorcion.result.then((porcion: PorcionModel) => {
      this.porciones.forEach((value, index) => {
        if(value.idPorcion == porcion.idPorcion) this.porciones.splice(index, 1);
      });
      this.porciones.unshift(porcion);
      this.porciones.sort( (a, b) => { return b.numero - a.numero  });
    }, (err) => {
      
    });
  }
  
  eliminar(idPorcion: number) {
    this.error = false;
    this.porcionService.eliminar( this.idProducto, idPorcion )
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of([]);
        })
      )
      .subscribe(response => {
        if ( !this.error ) {
          this.porciones.forEach((value, index) => {
              if(value.idPorcion == idPorcion) this.porciones.splice(index, 1);
          });
        }
      });
  }

  get isFormBuscarInvalid() {
    const tipoBusqueda: string = this.formBuscar.controls.opcionBuscar.value;
    return tipoBusqueda === ''
      || (tipoBusqueda === 'numero' && this.formBuscar.controls.numero.invalid)
      || (tipoBusqueda === 'factura' && this.formBuscar.controls.factura.invalid);
  }

  buscar() {
    this.error = false;
    const tipoBusqueda: string = this.formBuscar.controls.opcionBuscar.value;
    if ( tipoBusqueda === 'numero' ) {
      this.buscarXNumero();
    } else if ( tipoBusqueda === 'factura' ) {
      this.buscarXFactura();
    } else if ( tipoBusqueda === 'estado' ) {
      this.buscarXEstado();
    }
  }

  buscarXNumero() {
    const idProducto = this.formBuscar.controls.idProducto.value!;
    const numero = this.formBuscar.controls.numero.value!;
    this.porcionService.buscarXNumero( idProducto, numero )
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of([]);
        })
      )
      .subscribe(response => {
        if ( !this.error ) {
          this.porciones = response;
        }
      });
  }

  buscarXFactura() {
    const idProducto = this.formBuscar.controls.idProducto.value!;
    const factura = this.formBuscar.controls.factura.value!;
    this.porcionService.buscarXFactura( idProducto, factura )
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of([]);
        })
      )
      .subscribe(response => {
        if ( !this.error ) {
          this.porciones = response;
        }
      });
  }

  buscarXEstado() {
    const idProducto = this.formBuscar.controls.idProducto.value!;
    const idEstado = Number(this.formBuscar.controls.estado.value);
    this.porcionService.buscarXEstado( idProducto, idEstado )
      .pipe(
        catchError(err => {
          this.handleError(err);
          return of([]);
        })
      )
      .subscribe(response => {
        if ( !this.error ) {
          this.porciones = response;
        }
      });
  }

  handleError(err) {
    console.error(err.error.message);
    this.error = true;
    this.mensajeError = err.error.message;
  }

  onSort({column, direction}: SortEvent) {
    // resetting other headers
    this.headers.forEach(header => {
      if (header.sortable !== column) {
        header.direction = '';
      }
    });

    // sorting countries
    if (direction != '' && column != '') {
      const porcionesSort = [...this.porciones].sort((a, b) => {
        const res = compare(a[column], b[column]);
        return direction === 'asc' ? res : -res;
      });
      this.porciones = porcionesSort;
    }
  }
}

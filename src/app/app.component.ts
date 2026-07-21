import { Component, OnInit } from '@angular/core';
//import { Idle, DEFAULT_INTERRUPTSOURCES } from '@ng-idle/core';
//import { Keepalive } from '@ng-idle/keepalive';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ModalTimeOutComponent } from './pages/shared/modal-time-out/modal-time-out.component';
import { Title } from '@angular/platform-browser';
import { filter, map } from 'rxjs/operators';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent{
  title = 'SerfelWeb';

  idleState  =  'No iniciado';
  timedOut  =  false;
  lastPing ?: Date  =  null;

  private modalTimeOut: NgbModalRef;

  constructor( 
    //private idle: Idle,
    //private keepalive: Keepalive,
    private router: Router,
    private modalService: NgbModal,
    private titleService: Title,
    private activatedRoute: ActivatedRoute
  ) {
    if ( environment.esCoproad ) {
      this.title = 'CoproadWeb';
    } else {
      this.title = 'SerfelWeb';
    }
  //   // establece un tiempo de espera inactivo de 5 segundos, para fines de prueba.
  //   idle.setIdle(10);
  //   // establece un tiempo de espera de 5 segundos. Después de 10 segundos de inactividad, el usuario será considerado agotado.
  //   idle.setTimeout(10);
  //   // establece las interrupciones predeterminadas, en este caso, cosas como clics, desplazamientos, toques del documento
  //   idle.setInterrupts(DEFAULT_INTERRUPTSOURCES);

  //   idle.onIdleEnd.subscribe(() => {
  //     this.idleState = 'Ya no está inactivo';
  //     console.log(this.idleState);
  //     this.reset();
  //   });

  //   idle.onTimeout.subscribe(() => {
  //     this.idleState = '¡Tiempo de espera agotado!';
  //     this.timedOut = true;
  //     console.log(this.idleState);
  //     this.modalTimeOut.close();
  //     this.router.navigate(['/']);
  //   });

  //   idle.onIdleStart.subscribe(() => {
  //       this.idleState = '¡Te has quedado inactivo!';
  //       console.log(this.idleState);
  //       // abrir modal de timeout.
  //       this.modalTimeOut = this.modalService.open(ModalTimeOutComponent, {size: 'lg'});
  //       // this.childModal.show();
  //   });

  //   idle.onTimeoutWarning.subscribe((countdown) => {
  //     this.idleState = 'Tiempo de espera en ' + countdown + ' segundos!';
  //     // actualizar estatus modal time out.
  //     this.modalTimeOut.componentInstance.idleState = this.idleState;
  //     console.log(this.idleState);
  //   });

  //   // sets the ping interval to 15 seconds
  //   keepalive.interval(15);

  //   keepalive.onPing.subscribe(() => this.lastPing = new Date());

  //   this.reset();
  }

  ngOnInit() {
    const appTitle = this.titleService.getTitle();
    this.router
      .events.pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => {
          let child = this.activatedRoute.firstChild;
          while (child.firstChild) {
            child = child.firstChild;
          }
          if (child.snapshot.data['title']) {
            return child.snapshot.data['title'];
          }
          return appTitle;
        })
      ).subscribe((ttl: string) => {
        this.titleService.setTitle(ttl);
      });
  }

  reset() {
    //this.idle.watch();
    this.idleState = 'Started.';
    this.timedOut = false;
  }
}

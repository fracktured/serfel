import { Component, OnInit, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-modal-time-out',
  templateUrl: './modal-time-out.component.html',
  styleUrls: ['./modal-time-out.component.css']
})
export class ModalTimeOutComponent implements OnInit {

  @Input() idleState: number;

  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit(): void {
  }

}

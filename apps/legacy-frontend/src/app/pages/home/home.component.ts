import { Component, OnInit } from '@angular/core';
import { LayoutService } from 'src/app/services/layout.service';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  esCoproad: boolean;
  esSerfel: boolean;

  constructor(
    private layoutService: LayoutService
  ) { 
    this.esCoproad = environment.esCoproad;
    this.esSerfel = !this.esCoproad;
  }

  ngOnInit(): void {
    this.layoutService.setModulo('Home');
  }

}

import { Component, OnInit } from '@angular/core';
import { Database } from './services/database';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(private database: Database) {}

  async ngOnInit() {
    try {
      await this.database.inicializarDatabase();
      console.log('App inicializada correctamente');
    } catch (err) {
      console.error('Error inicializando app:', err);
    }
  }
}

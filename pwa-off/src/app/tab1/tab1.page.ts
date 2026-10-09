import { Component, OnInit } from '@angular/core';
import { Database, Tarea } from '../services/database';
import { Sync } from '../services/sync';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  tareas: Tarea[] = [];
  pendientesCount = 0;
  filtroActual: 'todas' | 'pendientes' | 'sincronizadas' = 'todas';
  cargando = false;

  constructor(
    private database: Database,
    private sync: Sync,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    await this.cargarTareas();
  }

  async ionViewWillEnter() {
    await this.cargarTareas();
  }

  async cargarTareas() {
    this.cargando = true;
    try {
      const todas = await this.database.obtenerTareas();
      this.pendientesCount = await this.database.contarPendientes();

      if (this.filtroActual === 'pendientes') {
        this.tareas = todas.filter(t => t.sincronizado === 0);
      } else if (this.filtroActual === 'sincronizadas') {
        this.tareas = todas.filter(t => t.sincronizado === 1);
      } else {
        this.tareas = todas;
      }
    } catch (error) {
      console.error('Error al cargar tareas:', error);
    } finally {
      this.cargando = false;
    }
  }

  cambiarFiltro(filtro: 'todas' | 'pendientes' | 'sincronizadas') {
    this.filtroActual = filtro;
    this.cargarTareas();
  }

  async sincronizar() {
    const loading = await this.loadingCtrl.create({
      message: 'Sincronizando con Laravel...',
      duration: 5000
    });
    await loading.present();

    try {
      const totalSincronizadas = await this.sync.sincronizarPendientes();
      await loading.dismiss();

      if (totalSincronizadas > 0) {
        this.mostrarToast(`¡${totalSincronizadas} tareas sincronizadas con éxito!`, 'success');
      } else {
        this.mostrarToast('No había tareas pendientes por sincronizar.', 'primary');
      }
      await this.cargarTareas();
    } catch (error) {
      await loading.dismiss();
      this.mostrarToast('Error al conectar con servidor Laravel.', 'danger');
    }
  }

  async refrescar(event: any) {
    await this.cargarTareas();
    event.target.complete();
  }

  async confirmarEliminar(tarea: Tarea) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar Tarea',
      message: `¿Seguro que deseas eliminar "${tarea.titulo}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            if (tarea.id) {
              await this.database.eliminarTarea(tarea.id);
              if (tarea.server_id) {
                try {
                  await this.sync.eliminarDelServidor(tarea.server_id);
                } catch (e) {
                  console.warn('No se pudo borrar del servidor en este momento');
                }
              }
              this.mostrarToast('Tarea eliminada', 'medium');
              await this.cargarTareas();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private async mostrarToast(mensaje: string, color: 'success' | 'danger' | 'warning' | 'primary' | 'medium') {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2500,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }
}

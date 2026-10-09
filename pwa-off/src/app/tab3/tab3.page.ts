import { Component, OnInit } from '@angular/core';
import { Database, Tarea } from '../services/database';
import { Sync } from '../services/sync';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit {
  apiUrl = environment.apiUrl;
  conectado = false;
  verificando = false;
  totalTareas = 0;
  pendientesCount = 0;
  sincronizadasCount = 0;
  tareasServidor: any[] = [];

  constructor(
    private database: Database,
    private sync: Sync,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    await this.cargarEstado();
  }

  async ionViewWillEnter() {
    await this.cargarEstado();
  }

  async cargarEstado() {
    try {
      const todas = await this.database.obtenerTareas();
      this.totalTareas = todas.length;
      this.pendientesCount = todas.filter(t => t.sincronizado === 0).length;
      this.sincronizadasCount = todas.filter(t => t.sincronizado === 1).length;
    } catch (error) {
      console.error('Error al cargar estado local:', error);
    }

    await this.comprobarConexion();
  }

  async comprobarConexion() {
    this.verificando = true;
    try {
      this.conectado = await this.sync.verificarConexion();
    } catch {
      this.conectado = false;
    } finally {
      this.verificando = false;
    }
  }

  async sincronizar() {
    const loading = await this.loadingCtrl.create({
      message: 'Subiendo tareas a Laravel...',
      duration: 5000
    });
    await loading.present();

    try {
      const cantidad = await this.sync.sincronizarPendientes();
      await loading.dismiss();

      if (cantidad > 0) {
        this.mostrarToast(`${cantidad} tareas sincronizadas correctamente`, 'success');
      } else {
        this.mostrarToast('No hay tareas pendientes por subir', 'primary');
      }
      await this.cargarEstado();
    } catch (error) {
      await loading.dismiss();
      this.mostrarToast('Error al sincronizar con Laravel', 'danger');
    }
  }

  async descargarServidor() {
    const loading = await this.loadingCtrl.create({
      message: 'Consultando servidor...',
      duration: 5000
    });
    await loading.present();

    try {
      this.tareasServidor = await this.sync.descargarTareas();
      await loading.dismiss();
      this.mostrarToast(`${this.tareasServidor.length} tareas encontradas en servidor`, 'success');
    } catch (error) {
      await loading.dismiss();
      this.mostrarToast('Error al descargar del servidor', 'danger');
    }
  }

  async importarDelServidor() {
    if (this.tareasServidor.length === 0) {
      await this.descargarServidor();
    }

    if (this.tareasServidor.length === 0) {
      this.mostrarToast('No hay tareas en el servidor para importar', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Importando tareas...',
      duration: 5000
    });
    await loading.present();

    try {
      const locales = await this.database.obtenerTareas();
      let importadas = 0;

      for (const st of this.tareasServidor) {
        const yaExiste = locales.some(lt => lt.server_id === st.id);
        if (!yaExiste) {
          const id = await this.database.insertarTarea(
            st.titulo,
            st.descripcion,
            st.fotografia,
            st.fecha
          );
          await this.database.marcarSincronizada(id, st.id);
          importadas++;
        }
      }

      await loading.dismiss();
      this.mostrarToast(`${importadas} tareas nuevas importadas`, 'success');
      await this.cargarEstado();
    } catch (error) {
      await loading.dismiss();
      this.mostrarToast('Error al importar tareas', 'danger');
    }
  }

  async confirmarLimpiarLocal() {
    const alert = await this.alertCtrl.create({
      header: 'Vaciar base de datos local',
      message: 'Se borrarán todas las tareas guardadas localmente en este dispositivo.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Vaciar',
          role: 'destructive',
          handler: async () => {
            await this.database.limpiarBaseDatos();
            this.mostrarToast('Base de datos local vaciada', 'medium');
            await this.cargarEstado();
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

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Database } from '../services/database';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {
  titulo = '';
  descripcion = '';
  fotografia: string | null = null;
  fecha = '';
  guardando = false;

  constructor(
    private database: Database,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.reiniciarFecha();
  }

  ionViewWillEnter() {
    this.reiniciarFecha();
  }

  reiniciarFecha() {
    const hoy = new Date();
    this.fecha = hoy.toISOString().split('T')[0];
  }

  onSeleccionarArchivo(event: any) {
    const archivo = event.target.files[0];
    if (archivo) {
      const reader = new FileReader();
      reader.onload = () => {
        this.fotografia = reader.result as string;
      };
      reader.readAsDataURL(archivo);
    }
  }

  eliminarFoto() {
    this.fotografia = null;
  }

  async guardarTarea() {
    if (!this.titulo.trim()) {
      this.mostrarToast('Por favor escribe un título', 'warning');
      return;
    }

    if (!this.descripcion.trim()) {
      this.mostrarToast('Por favor escribe una descripción', 'warning');
      return;
    }

    this.guardando = true;
    try {
      const id = await this.database.insertarTarea(
        this.titulo.trim(),
        this.descripcion.trim(),
        this.fotografia,
        this.fecha || new Date().toISOString().split('T')[0]
      );

      this.mostrarToast(`Tarea #${id} guardada (Offline)`, 'success');

      // Limpiar formulario
      this.titulo = '';
      this.descripcion = '';
      this.fotografia = null;
      this.reiniciarFecha();

      // Ir a la lista de tareas
      this.router.navigate(['/tabs/tab1']);
    } catch (error) {
      console.error('Error al guardar tarea:', error);
      this.mostrarToast('Error al guardar tarea', 'danger');
    } finally {
      this.guardando = false;
    }
  }

  private async mostrarToast(mensaje: string, color: 'success' | 'danger' | 'warning' | 'primary') {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2500,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Database, Tarea } from './database';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

interface SyncResponse {
  message: string;
  sincronizadas: { local_id: number; server_id: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class Sync {

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private database: Database
  ) {}

  /**
   * Verificar conexión con servidor Laravel.
   */
  async verificarConexion(): Promise<boolean> {
    try {
      await firstValueFrom(this.http.get(`${this.apiUrl}/tareas`));
      return true;
    } catch (error) {
      console.error('Sin conexión al servidor:', error);
      return false;
    }
  }

  /**
   * Sincronizar tareas pendientes hacia Laravel.
   * Obtiene tareas con sincronizado=0, las envía al endpoint /sync,
   * y marca cada una como sincronizada con su server_id.
   */
  async sincronizarPendientes(): Promise<number> {
    try {
      const pendientes = await this.database.obtenerTareasPendientes();

      if (pendientes.length === 0) {
        console.log('No hay tareas pendientes por sincronizar');
        return 0;
      }

      const payload = pendientes.map(tarea => ({
        titulo: tarea.titulo,
        descripcion: tarea.descripcion,
        fotografia: tarea.fotografia || null,
        fecha: tarea.fecha,
        local_id: tarea.id!
      }));

      const response = await firstValueFrom(
        this.http.post<SyncResponse>(`${this.apiUrl}/tareas/sync`, { tareas: payload })
      );

      for (const item of response.sincronizadas) {
        await this.database.marcarSincronizada(item.local_id, item.server_id);
      }

      console.log(`${response.sincronizadas.length} tareas sincronizadas`);
      return response.sincronizadas.length;
    } catch (error) {
      console.error('Error al sincronizar:', error);
      throw error;
    }
  }

  /**
   * Descargar tareas desde Laravel al SQLite local.
   */
  async descargarTareas(): Promise<Tarea[]> {
    try {
      const tareas = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/tareas`)
      );
      console.log(`${tareas.length} tareas descargadas del servidor`);
      return tareas;
    } catch (error) {
      console.error('Error al descargar tareas:', error);
      return [];
    }
  }

  /**
   * Eliminar tarea del servidor Laravel.
   */
  async eliminarDelServidor(serverId: number): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/tareas/${serverId}`)
      );
      console.log(`Tarea eliminada del servidor: ${serverId}`);
    } catch (error) {
      console.error('Error al eliminar del servidor:', error);
      throw error;
    }
  }

  /**
   * Actualizar tarea en servidor Laravel.
   */
  async actualizarEnServidor(serverId: number, tarea: Partial<Tarea>): Promise<void> {
    try {
      await firstValueFrom(
        this.http.put(`${this.apiUrl}/tareas/${serverId}`, {
          titulo: tarea.titulo,
          descripcion: tarea.descripcion,
          fotografia: tarea.fotografia || null,
          fecha: tarea.fecha
        })
      );
      console.log(`Tarea actualizada en servidor: ${serverId}`);
    } catch (error) {
      console.error('Error al actualizar en servidor:', error);
      throw error;
    }
  }
}

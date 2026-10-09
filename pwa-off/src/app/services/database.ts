import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection
} from '@capacitor-community/sqlite';

export interface Tarea {
  id?: number;
  titulo: string;
  descripcion: string;
  fotografia?: string | null;
  fecha: string;
  sincronizado?: number;
  server_id?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class Database {
  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;
  private isInitialized = false;
  private isWeb = false;
  private webStorageKey = 'pwa_tareas_offline';

  async inicializarDatabase(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.isWeb = Capacitor.getPlatform() === 'web';

    if (this.isWeb) {
      if (!localStorage.getItem(this.webStorageKey)) {
        localStorage.setItem(this.webStorageKey, JSON.stringify([]));
      }
      this.isInitialized = true;
      console.log('Base de datos modo Web (localStorage) inicializada');
      return;
    }

    try {
      this.db = await this.sqlite.createConnection(
        'tareasDB',
        false,
        'no-encryption',
        1,
        false
      );
      await this.db.open();

      const queryCrearTablas = `
        CREATE TABLE IF NOT EXISTS tareas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          titulo TEXT NOT NULL,
          descripcion TEXT NOT NULL,
          fotografia TEXT,
          fecha TEXT NOT NULL,
          sincronizado INTEGER DEFAULT 0,
          server_id INTEGER
        );
      `;

      await this.db.execute(queryCrearTablas);
      this.isInitialized = true;
      console.log('Base de datos SQLite nativa inicializada');
    } catch (error) {
      console.warn('Fallo SQLite nativo, usando almacenamiento web de respaldo:', error);
      this.isWeb = true;
      if (!localStorage.getItem(this.webStorageKey)) {
        localStorage.setItem(this.webStorageKey, JSON.stringify([]));
      }
      this.isInitialized = true;
    }
  }

  getDb(): SQLiteDBConnection {
    return this.db;
  }

  private getWebTareas(): Tarea[] {
    const raw = localStorage.getItem(this.webStorageKey);
    return raw ? JSON.parse(raw) : [];
  }

  private setWebTareas(tareas: Tarea[]): void {
    localStorage.setItem(this.webStorageKey, JSON.stringify(tareas));
  }

  // Insertar tarea
  async insertarTarea(
    titulo: string,
    descripcion: string,
    fotografia: string | null,
    fecha: string
  ): Promise<number> {
    await this.inicializarDatabase();

    if (this.isWeb) {
      const tareas = this.getWebTareas();
      const maxId = tareas.reduce((max, t) => (t.id && t.id > max ? t.id : max), 0);
      const nuevoId = maxId + 1;
      const nueva: Tarea = {
        id: nuevoId,
        titulo,
        descripcion,
        fotografia: fotografia || null,
        fecha,
        sincronizado: 0,
        server_id: null
      };
      tareas.unshift(nueva);
      this.setWebTareas(tareas);
      console.log('Tarea insertada (Web) ID:', nuevoId);
      return nuevoId;
    }

    try {
      const sql = `INSERT INTO tareas (titulo, descripcion, fotografia, fecha, sincronizado) VALUES (?, ?, ?, ?, 0);`;
      const res = await this.db.run(sql, [titulo, descripcion, fotografia, fecha]);
      console.log('Tarea insertada con ID:', res.changes?.lastId);
      return res.changes?.lastId || 0;
    } catch (error) {
      console.error('Error al insertar tarea:', error);
      throw error;
    }
  }

  // Obtener todas las tareas
  async obtenerTareas(): Promise<Tarea[]> {
    await this.inicializarDatabase();

    if (this.isWeb) {
      return this.getWebTareas();
    }

    try {
      const res = await this.db.query('SELECT * FROM tareas ORDER BY id DESC;');
      return res.values || [];
    } catch (error) {
      console.error('Error al obtener tareas:', error);
      return [];
    }
  }

  // Obtener una tarea por ID
  async obtenerTarea(id: number): Promise<Tarea | null> {
    await this.inicializarDatabase();

    if (this.isWeb) {
      const tareas = this.getWebTareas();
      return tareas.find(t => t.id === id) || null;
    }

    try {
      const res = await this.db.query('SELECT * FROM tareas WHERE id = ?;', [id]);
      return res.values && res.values.length > 0 ? res.values[0] : null;
    } catch (error) {
      console.error('Error al obtener tarea por ID:', error);
      return null;
    }
  }

  // Obtener pendientes por sincronizar
  async obtenerTareasPendientes(): Promise<Tarea[]> {
    await this.inicializarDatabase();

    if (this.isWeb) {
      return this.getWebTareas().filter(t => t.sincronizado === 0);
    }

    try {
      const res = await this.db.query('SELECT * FROM tareas WHERE sincronizado = 0;');
      return res.values || [];
    } catch (error) {
      console.error('Error al obtener tareas pendientes:', error);
      return [];
    }
  }

  // Actualizar tarea
  async actualizarTarea(
    id: number,
    titulo: string,
    descripcion: string,
    fotografia: string | null,
    fecha: string
  ): Promise<void> {
    await this.inicializarDatabase();

    if (this.isWeb) {
      const tareas = this.getWebTareas();
      const idx = tareas.findIndex(t => t.id === id);
      if (idx !== -1) {
        tareas[idx].titulo = titulo;
        tareas[idx].descripcion = descripcion;
        tareas[idx].fotografia = fotografia || null;
        tareas[idx].fecha = fecha;
        this.setWebTareas(tareas);
      }
      return;
    }

    try {
      const sql = `UPDATE tareas SET titulo = ?, descripcion = ?, fotografia = ?, fecha = ? WHERE id = ?;`;
      await this.db.run(sql, [titulo, descripcion, fotografia, fecha, id]);
      console.log('Tarea actualizada:', id);
    } catch (error) {
      console.error('Error al actualizar tarea:', error);
      throw error;
    }
  }

  // Marcar tarea sincronizada con el ID del servidor Laravel
  async marcarSincronizada(id: number, serverId: number): Promise<void> {
    await this.inicializarDatabase();

    if (this.isWeb) {
      const tareas = this.getWebTareas();
      const idx = tareas.findIndex(t => t.id === id);
      if (idx !== -1) {
        tareas[idx].sincronizado = 1;
        tareas[idx].server_id = serverId;
        this.setWebTareas(tareas);
      }
      return;
    }

    try {
      const sql = `UPDATE tareas SET sincronizado = 1, server_id = ? WHERE id = ?;`;
      await this.db.run(sql, [serverId, id]);
      console.log(`Tarea ${id} sincronizada con server_id ${serverId}`);
    } catch (error) {
      console.error('Error al marcar tarea como sincronizada:', error);
      throw error;
    }
  }

  // Marcar tarea pendiente
  async marcarPendiente(id: number): Promise<void> {
    await this.inicializarDatabase();

    if (this.isWeb) {
      const tareas = this.getWebTareas();
      const idx = tareas.findIndex(t => t.id === id);
      if (idx !== -1) {
        tareas[idx].sincronizado = 0;
        this.setWebTareas(tareas);
      }
      return;
    }

    try {
      const sql = `UPDATE tareas SET sincronizado = 0 WHERE id = ?;`;
      await this.db.run(sql, [id]);
      console.log(`Tarea ${id} marcada como pendiente`);
    } catch (error) {
      console.error('Error al marcar tarea como pendiente:', error);
      throw error;
    }
  }

  // Eliminar tarea
  async eliminarTarea(id: number): Promise<void> {
    await this.inicializarDatabase();

    if (this.isWeb) {
      const tareas = this.getWebTareas().filter(t => t.id !== id);
      this.setWebTareas(tareas);
      console.log('Tarea eliminada (Web):', id);
      return;
    }

    try {
      const sql = `DELETE FROM tareas WHERE id = ?;`;
      await this.db.run(sql, [id]);
      console.log('Tarea eliminada:', id);
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
      throw error;
    }
  }

  // Contar pendientes
  async contarPendientes(): Promise<number> {
    await this.inicializarDatabase();

    if (this.isWeb) {
      return this.getWebTareas().filter(t => t.sincronizado === 0).length;
    }

    try {
      const res = await this.db.query('SELECT COUNT(*) as total FROM tareas WHERE sincronizado = 0;');
      return res.values && res.values.length > 0 ? res.values[0].total : 0;
    } catch (error) {
      console.error('Error al contar pendientes:', error);
      return 0;
    }
  }

  // Limpiar base de datos
  async limpiarBaseDatos(): Promise<void> {
    if (this.isWeb) {
      this.setWebTareas([]);
      console.log('Base de datos web vaciada');
      return;
    }

    try {
      await this.db.execute('DROP TABLE IF EXISTS tareas;');
      console.log('Base de datos limpiada');
      await this.inicializarDatabase();
    } catch (error) {
      console.error('Error al limpiar la base de datos:', error);
      throw error;
    }
  }
}

# Contexto del Proyecto PWA Offline-First

## Objetivos
- Aplicación PWA construida en Ionic Angular con soporte Offline-First.
- Almacenamiento local mediante `@capacitor-community/sqlite`.
- Sincronización con backend servidor Laravel cuando exista conexión a internet.

## Estructura de Base de Datos Local (tareasDB)

### Tabla: tareas
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `titulo`: TEXT NOT NULL
- `descripcion`: TEXT NOT NULL
- `fotografia`: TEXT NULLable
- `fecha`: TEXT NOT NULL
- `sincronizado`: INTEGER DEFAULT 0 (0: Pendiente, 1: Sincronizado)
- `server_id`: INTEGER NULLable

## Métodos del Servicio Database (`src/app/services/database.ts`)

1. `inicializarDatabase()`: Inicializa conexión SQLite, crea tablas y registra logs de éxito o error.
2. `insertarTarea(titulo, descripcion, fotografia, fecha)`: Inserta una nueva tarea con estado pendiente.
3. `obtenerTareas()`: Retorna todas las tareas.
4. `obtenerTarea(id)`: Retorna una tarea específica por su ID.
5. `obtenerTareasPendientes()`: Retorna tareas no sincronizadas (`sincronizado = 0`).
6. `actualizarTarea(id, titulo, descripcion, fotografia, fecha)`: Actualiza datos de una tarea.
7. `marcarSincronizada(id, serverId)`: Marca la tarea como sincronizada (`sincronizado = 1`) guardando el ID del servidor Laravel.
8. `marcarPendiente(id)`: Marca la tarea como pendiente (`sincronizado = 0`).
9. `eliminarTarea(id)`: Elimina una tarea por ID.
11. `limpiarBaseDatos()`: Elimina o limpia las tablas de la base de datos.

- Creado proyecto Laravel backend en carpeta `backend` (versión 12.12.2). Servirá como API para sincronizar tareas con la app Ionic.

## Guía proyecto Laravel
1. Instalar Composer PHP.
2. Ejecutar `composer create-project laravel/laravel backend`.
3. Entrar carpeta `backend`.
4. Copiar `.env.example` a `.env`.
5. Configurar DB SQLite en `.env`.
6. Crear migración tabla `tareas`.
7. Ejecutar `php artisan migrate`.
8. Definir modelo `Tarea` con campos `titulo`, `descripcion`, `fotografia`, `fecha`, `sincronizado`, `server_id`.
9. Crear controlador API `TareaController` con endpoints `index`, `store`, `show`, `update`, `destroy`, `sync`.
10. Registrar rutas API en `routes/api.php`.
11. Habilitar CORS para origen Ionic.
12. Iniciar servidor `php -S localhost:8000 -t public`.
13. Probar endpoints con Postman o Insomnia.
14. Conectar app Ionic a API base URL.
15. Sincronizar tareas usando servicio `Database`.

## Historial de cambios

- **Paso 1-2**: Composer ya instalado. Proyecto Laravel creado en `backend/` (v12.12.2).
- **Paso 3-5**: `.env` configurado con `DB_CONNECTION=sqlite`. Base SQLite creada automáticamente.
- **Paso 6**: Migración `create_tareas_table` creada con columnas: `titulo`, `descripcion`, `fotografia`, `fecha`, `sincronizado`.
- **Paso 7**: Migraciones ejecutadas (`php artisan migrate`). Tabla `tareas` lista en SQLite.
- **Paso 8**: Modelo `Tarea` definido con `$fillable` y `$casts` en `app/Models/Tarea.php`.
- **Paso 9**: Controlador `TareaController` creado en `app/Http/Controllers/Api/` con métodos `index`, `store`, `show`, `update`, `destroy`, `sync`.
- **Paso 10**: Rutas API registradas en `routes/api.php`: `apiResource('tareas')` + `POST tareas/sync`.
- **Paso 11**: CORS configurado. Creado `config/cors.php` con `allowed_origins: ['*']`. Middleware `HandleCors` agregado en `bootstrap/app.php`.
- **Paso 12**: Servidor Laravel corriendo en `http://127.0.0.1:8000` con `php artisan serve`.
- **Paso 13**: Endpoints probados. `GET /api/tareas` retorna array vacío. `POST /api/tareas` crea tarea correctamente.
- **Paso 14**: Conexión Ionic-Laravel. Se agregó `apiUrl` en `environment.ts`, `HttpClientModule` en `app.module.ts`.
- **Paso 15**: Servicio `Sync` implementado en `src/app/services/sync.ts` con métodos: `verificarConexion()`, `sincronizarPendientes()`, `descargarTareas()`, `eliminarDelServidor()`, `actualizarEnServidor()`. Compilación exitosa.
- **Paso 16**: Soporte web añadido a `Database` (`src/app/services/database.ts`). Usa `localStorage` de respaldo en navegador manteniendo API idéntica a SQLite nativo.
- **Paso 17**: Vistas completas creadas en Ionic: Tab 1 (listado, filtros, sincronización, eliminar), Tab 2 (formulario crear con foto y fecha), Tab 3 (diagnóstico servidor Laravel, subir pendientes, importar).
- **Paso 18**: `AppComponent` inicializa base de datos automáticamente al inicio.
- **Paso 19**: Eliminada carpeta `.git` interna en `pwa-off`. Submódulo corregido y subido correctamente a GitHub.



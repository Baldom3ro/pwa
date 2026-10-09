<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tarea;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TareaController extends Controller
{
    /**
     * Listar todas las tareas.
     */
    public function index(): JsonResponse
    {
        $tareas = Tarea::orderBy('id', 'desc')->get();
        return response()->json($tareas);
    }

    /**
     * Crear nueva tarea.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => 'required|string|max:255',
            'descripcion' => 'required|string',
            'fotografia' => 'nullable|string',
            'fecha' => 'required|string',
        ]);

        $tarea = Tarea::create($validated);
        return response()->json($tarea, 201);
    }

    /**
     * Mostrar tarea específica.
     */
    public function show(string $id): JsonResponse
    {
        $tarea = Tarea::findOrFail($id);
        return response()->json($tarea);
    }

    /**
     * Actualizar tarea.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $tarea = Tarea::findOrFail($id);

        $validated = $request->validate([
            'titulo' => 'sometimes|required|string|max:255',
            'descripcion' => 'sometimes|required|string',
            'fotografia' => 'nullable|string',
            'fecha' => 'sometimes|required|string',
        ]);

        $tarea->update($validated);
        return response()->json($tarea);
    }

    /**
     * Eliminar tarea.
     */
    public function destroy(string $id): JsonResponse
    {
        $tarea = Tarea::findOrFail($id);
        $tarea->delete();
        return response()->json(['message' => 'Tarea eliminada'], 200);
    }

    /**
     * Sincronizar tareas desde Ionic.
     * Recibe array de tareas, las crea o actualiza.
     */
    public function sync(Request $request): JsonResponse
    {
        $tareasRecibidas = $request->validate([
            'tareas' => 'required|array',
            'tareas.*.titulo' => 'required|string|max:255',
            'tareas.*.descripcion' => 'required|string',
            'tareas.*.fotografia' => 'nullable|string',
            'tareas.*.fecha' => 'required|string',
            'tareas.*.local_id' => 'required|integer',
        ]);

        $resultado = [];

        foreach ($tareasRecibidas['tareas'] as $tareaData) {
            $localId = $tareaData['local_id'];
            unset($tareaData['local_id']);

            $tarea = Tarea::create($tareaData);

            $resultado[] = [
                'local_id' => $localId,
                'server_id' => $tarea->id,
            ];
        }

        return response()->json([
            'message' => 'Sincronización completada',
            'sincronizadas' => $resultado,
        ]);
    }
}

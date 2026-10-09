<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tarea extends Model
{
    protected $fillable = [
        'titulo',
        'descripcion',
        'fotografia',
        'fecha',
        'sincronizado',
    ];

    protected $casts = [
        'sincronizado' => 'boolean',
    ];
}

<?php

declare(strict_types=1);

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WorkshopController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

    Route::middleware(['auth:sanctum', 'active'])->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

Route::middleware(['auth:sanctum', 'active', 'role:admin'])->group(function (): void {
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::patch('/users/{user}', [UserController::class, 'update']);
    Route::get('/audit-logs', [AuditLogController::class, 'index']);
});

Route::middleware(['auth:sanctum', 'active'])->group(function (): void {
    Route::middleware('role:admin,manager,staff')->group(function (): void {
        Route::get('/workshops', [WorkshopController::class, 'index']);
        Route::get('/workshops/{workshop}', [WorkshopController::class, 'show']);
    });

    Route::middleware('role:admin,manager')->group(function (): void {
        Route::post('/workshops', [WorkshopController::class, 'store']);
        Route::patch('/workshops/{workshop}', [WorkshopController::class, 'update']);
    });
});

Route::middleware(['auth:sanctum', 'active', 'role:manager,staff'])->group(function (): void {
    Route::post('/workshops/{workshop}/registrations', [RegistrationController::class, 'store']);
    Route::get('/workshops/{workshop}/registrations', [RegistrationController::class, 'index']);
    Route::post('/registrations/{registration}/cancel', [RegistrationController::class, 'cancel']);
});

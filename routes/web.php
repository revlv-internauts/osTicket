<?php
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Models\User;
use App\Http\Controllers\TicketController;


Route::get('/', function () {
    return redirect()->route('login'); 
})->name('home');


Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
    
    Route::get('list', function () {
        return Inertia::render('list');
    })->name('list');

    Route::get('/records', [App\Http\Controllers\RecordsController::class, 'index'])->name('records');

    Route::get('ticket', function () {
        return Inertia::render('ticket');
    })->name('ticket');
    
    Route::get('computation', function () {
        return Inertia::render('computation');
    })->name('computation');
    

    Route::get('/users', function () {
        return Inertia::render('list', [
            'users' => User::all()
        ]);
    })->name('users.index');

    
    Route::resource('tickets', TicketController::class);

   Route::get('/tickets', [TicketController::class, 'index'])->name('tickets.index');
    
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

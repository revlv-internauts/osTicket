<?php
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\EmailController;
use App\Http\Controllers\HelpTopicController;
use App\Http\Controllers\ComputationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Models\User;
use App\Http\Controllers\TicketController;
use SebastianBergmann\CodeCoverage\Report\Html\Dashboard;


Route::get('/', function () {
    return redirect()->route('login'); 
})->name('home');


Route::middleware(['auth', 'verified'])->group(function () {
     Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    Route::get('list', function () {
        return Inertia::render('list');
    })->name('list');

   
    Route::get('ticket', [TicketController::class, 'index'])->name('ticket');

    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    Route::get('computation', [ComputationController::class, 'index'])->name('computation');
    

    Route::get('/users', function () {
        return Inertia::render('list', [
            'users' => User::all()
        ]);
    })->name('users.index');

    
    Route::resource('tickets', TicketController::class);
    
    // Email routes for CC
    Route::resource('emails', EmailController::class);
    
    // Help Topic routes
    Route::resource('help-topics', HelpTopicController::class);
    
    
    
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

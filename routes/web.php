<?php
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\EmailController;
use App\Http\Controllers\HelpTopicController;
use App\Http\Controllers\ComputationController;
use App\Http\Controllers\ListController;
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
    
    Route::get('/list', [ListController::class, 'index'])->name('list');
    Route::post('/list', [ListController::class, 'store'])->name('admin.user.store');

   
    Route::get('ticket', [TicketController::class, 'index'])->name('ticket');

    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    Route::get('/computation', [ComputationController::class, 'index'])->name('computation.index');
    

    Route::get('/users', function () {
        return Inertia::render('list', [
            'users' => User::all()
        ]);
    })->name('users.index');

    
    Route::resource('tickets', TicketController::class);
    
    // Separate routes for close and reopen
    Route::patch('tickets/{ticket}/close', [TicketController::class, 'closeTicket'])->name('tickets.close');
    Route::patch('tickets/{ticket}/reopen', [TicketController::class, 'reopenTicket'])->name('tickets.reopen');
    
    // Attachment routes
    Route::get('tickets/{ticket}/attachments/{attachmentId}/download', [TicketController::class, 'downloadAttachment'])->name('tickets.attachments.download');
    Route::get('tickets/{ticket}/attachments/{attachmentId}/preview', [TicketController::class, 'previewAttachment'])->name('tickets.attachments.preview');
    Route::delete('tickets/{ticket}/attachments/{attachment}', [TicketController::class, 'deleteAttachment'])->name('tickets.attachments.destroy');
    

    Route::resource('emails', EmailController::class);
    

    Route::resource('help-topics', HelpTopicController::class);
    
    
    
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

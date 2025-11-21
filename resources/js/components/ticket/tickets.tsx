import AppLayout from '@/layouts/app-layout';
import { ticket } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Search, CheckCircle, XCircle, Paperclip } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import TicketEdit from './edit';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TiptapImage from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Input } from '@/components/ui/input';

interface User {
    id: number;
    name: string;
}

interface HelpTopic {
    id: number;
    name: string;
}

interface Email {
    id: number;
    email_address: string;
    name?: string;
}

interface Ticket {
    id: number;
    ticket_name: string;
    user_id: number;
    user?: User;
    recipient?: string;
    cc?: number[];
    cc_emails?: Email[];
    ticket_notice?: string;
    ticket_source: string;
    help_topic: number;
    help_topic_relation?: HelpTopic;
    department: string;
    due_date?: string;
    downtime?: string;
    opened_by?: number;
    opened_by_user?: User;
    uptime?: string;
    closed_by?: number;
    closed_by_user?: User;
    assigned_to?: number;
    assigned_to_user?: User;
    canned_response?: string;
    body?: string;
    image_paths?: string;
    status: string;
    priority?: string;
    created_at: string;
    updated_at: string;
}

interface TicketProps {
    tickets: Ticket[];
    showUserId?: boolean;
    showAssignedTo?: boolean;
    caption?: string;
}

type SortField = 'ticket_name' | 'user' | 'assigned_to' | 'priority' | 'status' | 'downtime' | 'uptime' | 'opened_by';
type SortDirection = 'asc' | 'desc' | null;

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ticket',
        href: ticket().url,
    },
];

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export default function TicketsTable({ 
    tickets: propTickets, 
    showUserId = true, 
    showAssignedTo = true,
    caption = "ALL TICKETS"
}: TicketProps) {
    const pageProps = usePage().props as any;
    const tickets = propTickets ?? (pageProps.tickets ?? []);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editMode, setEditMode] = useState<'update' | 'close' | 'reopen' | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);

    useEffect(() => {
        const success = pageProps?.flash?.success ?? pageProps?.flash?.message;
        if (success) {
            toast.success(String(success));
        }
    }, [pageProps?.flash?.success, pageProps?.flash?.message]);

    const sortedTickets = [...tickets].sort((a, b) => {
        if (!sortField || !sortDirection) return 0;

        let aValue: any;
        let bValue: any;

        switch (sortField) {
            case 'ticket_name':
                aValue = a.ticket_name?.toLowerCase() || '';
                bValue = b.ticket_name?.toLowerCase() || '';
                break;
            case 'user':
                aValue = a.user?.name?.toLowerCase() || '';
                bValue = b.user?.name?.toLowerCase() || '';
                break;
            case 'opened_by':
                aValue = a.user?.name?.toLowerCase() || '';
                bValue = b.user?.name?.toLowerCase() || '';
                break;
            case 'assigned_to':
                aValue = a.assigned_to_user?.name?.toLowerCase() || '';
                bValue = b.assigned_to_user?.name?.toLowerCase() || '';
                break;
            case 'priority':
                aValue = a.priority?.toLowerCase() || '';
                bValue = b.priority?.toLowerCase() || '';
                break;
            case 'status':
                aValue = a.status?.toLowerCase() || '';
                bValue = b.status?.toLowerCase() || '';
                break;
            case 'downtime':
                aValue = a.downtime ? new Date(a.downtime).getTime() : 0;
                bValue = b.downtime ? new Date(b.downtime).getTime() : 0;
                break;
            case 'uptime':
                aValue = a.uptime ? new Date(a.uptime).getTime() : 0;
                bValue = b.uptime ? new Date(b.uptime).getTime() : 0;
                break;
            default:
                return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const filteredAndSortedTickets = sortedTickets.filter(ticket => 
        ticket.ticket_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.assigned_to_user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.priority?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortDirection(null);
                setSortField(null);
            }
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
        }
        if (sortDirection === 'asc') {
            return <ArrowUp className="ml-2 h-4 w-4" />;
        }
        if (sortDirection === 'desc') {
            return <ArrowDown className="ml-2 h-4 w-4" />;
        }
        return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    };

    const colSpan = 7 + (showUserId ? 1 : 0) + (showAssignedTo ? 1 : 0);

    const handleRowClick = (ticket: Ticket, event: React.MouseEvent) => {
        if ((event.target as HTMLElement).closest('button')) {
            return;
        }
        setSelectedTicket(ticket);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedTicket(null);
    };

    const handleUpdateFromDialog = () => {
        if (selectedTicket) {
            setEditMode('update');
            setDialogOpen(false);
            setEditDialogOpen(true);
        }
    };

    const handleCloseFromDialog = () => {
        if (selectedTicket) {
            setEditMode(selectedTicket.status === 'Closed' ? 'reopen' : 'close');
            setDialogOpen(false);
            setEditDialogOpen(true);
        }
    };

    const handleDeleteFromDialog = () => {
        if (selectedTicket) {
            setDialogOpen(false);
            setTicketToDelete(selectedTicket);
            setDeleteDialogOpen(true);
        }
    };

    const handleDeleteClick = (ticket: Ticket, event: React.MouseEvent) => {
        event.stopPropagation();
        setTicketToDelete(ticket);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!ticketToDelete) return;

        setIsDeleting(true);
        router.delete(`/tickets/${ticketToDelete.id}`, {
            onSuccess: () => {
                toast.success('Ticket deleted successfully');
                setDeleteDialogOpen(false);
                setTicketToDelete(null);
                setIsDeleting(false);
            },
            onError: (errors) => {
                toast.error('Failed to delete ticket');
                console.error(errors);
                setIsDeleting(false);
            },
        });
    };

    const handleEditSuccess = () => {
        setEditDialogOpen(false);
        setSelectedTicket(null);
        setEditMode(null);
        router.reload({ only: ['tickets'] });
    };

    const handleCloseEditDialog = () => {
        setEditDialogOpen(false);
        setEditMode(null);
    };

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'No body provided',
            }),
            Underline,
            TiptapImage.configure({
                inline: true,
                allowBase64: true,
            }),
            Link.configure({
                openOnClick: false,
            }),
        ],
        content: selectedTicket?.body || '<p>No body provided</p>',
        editable: false,
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px]',
            },
        },
    }, [selectedTicket]);

    // Update editor content when ticket changes
    useEffect(() => {
        if (editor && selectedTicket) {
            editor.commands.setContent(selectedTicket.body || '<p>No body provided</p>');
        }
    }, [editor, selectedTicket]);

    return (
        <>
            {/* Search Input */}
            <div className="mb-4 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input 
                    type="text" 
                    placeholder="Search tickets" 
                    className="h-10 w-full max-w-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableCaption>{caption}</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    onClick={() => handleSort('ticket_name')}
                                    className="h-8 px-2 hover:bg-transparent"
                                >
                                    Ticket Name
                                    {getSortIcon('ticket_name')}
                                </Button>
                            </TableHead>
                            {showUserId && (
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleSort('opened_by')}
                                        className="h-8 px-2 hover:bg-transparent"
                                    >
                                        Opened By
                                        {getSortIcon('opened_by')}
                                    </Button>
                                </TableHead>
                            )}
                            {showAssignedTo && (
                                <TableHead>
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleSort('assigned_to')}
                                        className="h-8 px-2 hover:bg-transparent"
                                    >
                                        Assigned To
                                        {getSortIcon('assigned_to')}
                                    </Button>
                                </TableHead>
                            )}
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    onClick={() => handleSort('priority')}
                                    className="h-8 px-2 hover:bg-transparent"
                                >
                                    Priority
                                    {getSortIcon('priority')}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    onClick={() => handleSort('status')}
                                    className="h-8 px-2 hover:bg-transparent"
                                >
                                    Status
                                    {getSortIcon('status')}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    onClick={() => handleSort('downtime')}
                                    className="h-8 px-2 hover:bg-transparent"
                                >
                                    Downtime
                                    {getSortIcon('downtime')}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    onClick={() => handleSort('uptime')}
                                    className="h-8 px-2 hover:bg-transparent"
                                >
                                    Uptime
                                    {getSortIcon('uptime')}
                                </Button>
                            </TableHead>
                            <TableHead className="text-center">Delete</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAndSortedTickets && filteredAndSortedTickets.length > 0 ? (
                            filteredAndSortedTickets.map((ticket) => (
                                <TableRow 
                                    key={ticket.id}
                                    onClick={(e) => handleRowClick(ticket, e)}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                >
                                    <TableCell>{ticket.ticket_name || '-'}</TableCell>
                                    {showUserId && <TableCell>{ticket.user?.name || '-'}</TableCell>}
                                    {showAssignedTo && <TableCell>{ticket.assigned_to_user?.name || '-'}</TableCell>}
                                    <TableCell>
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            ticket.priority === 'Low' ? 'bg-green-100 text-green-800' :
                                            ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                            ticket.priority === 'High' ? 'bg-red-100 text-red-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {ticket.priority || 'Unknown'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            ticket.status === 'Open' ? 'bg-green-100 text-green-800' :
                                            ticket.status === 'Closed' ? 'bg-red-100 text-red-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {ticket.status || 'Unknown'}
                                        </span>
                                    </TableCell>
                                    <TableCell>{formatDate(ticket.downtime ?? '') || '-'}</TableCell>
                                    <TableCell>{formatDate(ticket.uptime ?? '') || '-'}</TableCell>
                                    <TableCell className="text-center">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => handleDeleteClick(ticket, e)}
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
                                    {searchTerm ? 'No tickets found matching your search' : 'No tickets found'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the ticket
                            {ticketToDelete && (
                                <span className="font-semibold"> "{ticketToDelete.ticket_name}"</span>
                            )}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Ticket Details Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="w-[95vw] max-w-[1400px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-bold">Ticket Details</DialogTitle>
                        <DialogDescription className="text-base">
                            View complete information about this ticket
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTicket && (
                        <div className="space-y-8">
                            {/* Ticket Header Info */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-base font-medium text-muted-foreground mb-2">Ticket Name</p>
                                    <p className="text-2xl font-bold">{selectedTicket.ticket_name}</p>
                                </div>
                                <div>
                                    <p className="text-base font-medium text-muted-foreground mb-2">Status</p>
                                    <Badge className={`mt-1 text-base px-4 py-2 ${
                                        selectedTicket.status === 'Open' ? 'bg-green-500' :
                                        selectedTicket.status === 'Closed' ? 'bg-gray-500' :
                                        'bg-blue-500'
                                    }`}>
                                        {selectedTicket.status || 'Unknown'}
                                    </Badge>
                                </div>
                            </div>
                            <Separator />

                            {/* Main Details */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-base font-medium text-muted-foreground mb-1">Submitted By:</p>
                                    <p className="text-lg">{selectedTicket.user?.name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-base font-medium text-muted-foreground mb-1">To:</p>
                                    <p className="text-lg">{selectedTicket.recipient || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-base font-medium text-muted-foreground mb-1">Priority</p>
                                    <p className="text-lg">{selectedTicket.priority || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-base font-medium text-muted-foreground mb-1">Ticket Source</p>
                                    <p className="text-lg">{selectedTicket.ticket_source || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-base font-medium text-muted-foreground mb-1">Help Topic</p>
                                    <p className="text-lg">{selectedTicket.help_topic_relation?.name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-base font-medium text-muted-foreground mb-1">Department</p>
                                    <p className="text-lg">{selectedTicket.department || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-base font-medium text-muted-foreground mb-1">Assigned To</p>
                                    <p className="text-lg">{selectedTicket.assigned_to_user?.name || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-base font-medium text-muted-foreground mb-2">CC Emails</p>
                                    {selectedTicket.cc_emails && selectedTicket.cc_emails.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedTicket.cc_emails.map((email) => (
                                                <Badge key={email.id} variant="secondary" className="text-sm px-3 py-1">
                                                    {email.email_address}
                                                    {email.name && ` (${email.name})`}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-lg text-muted-foreground">No CC emails</p>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Dates and Tracking */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-base font-medium text-muted-foreground mb-1">Downtime</p>
                                    <p className="text-lg">{formatDate(selectedTicket.downtime ?? '') || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-base font-medium text-muted-foreground mb-1">Opened By</p>
                                    <p className="text-lg">{selectedTicket.opened_by_user?.name || '-'}</p>
                                </div>
                                {selectedTicket.uptime && (
                                    <>
                                        <div>
                                            <p className="text-base font-medium text-muted-foreground mb-1">Uptime</p>
                                            <p className="text-lg">{formatDate(selectedTicket.uptime ?? '') || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-base font-medium text-muted-foreground mb-1">Closed By</p>
                                            <p className="text-lg">{selectedTicket.closed_by_user?.name || '-'}</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <Separator />

                            {/* Body with Tiptap Editor */}
                            <div>
                                <p className="text-base font-medium text-muted-foreground mb-3">Body</p>
                                <div className="bg-background border rounded-lg p-6">
                                    <style>{`
                                        .ProseMirror {
                                            outline: none;
                                        }
                                        .ProseMirror p {
                                            margin-bottom: 1em;
                                        }
                                        .ProseMirror p:last-child {
                                            margin-bottom: 0;
                                        }
                                        .ProseMirror h1 {
                                            font-size: 2em;
                                            font-weight: bold;
                                            margin-bottom: 0.5em;
                                        }
                                        .ProseMirror h2 {
                                            font-size: 1.5em;
                                            font-weight: bold;
                                            margin-bottom: 0.5em;
                                        }
                                        .ProseMirror h3 {
                                            font-size: 1.25em;
                                            font-weight: bold;
                                            margin-bottom: 0.5em;
                                        }
                                        .ProseMirror ul, .ProseMirror ol {
                                            padding-left: 2em;
                                            margin-bottom: 1em;
                                        }
                                        .ProseMirror li {
                                            margin-bottom: 0.25em;
                                        }
                                        .ProseMirror strong {
                                            font-weight: bold;
                                        }
                                        .ProseMirror em {
                                            font-style: italic;
                                        }
                                        .ProseMirror u {
                                            text-decoration: underline;
                                        }
                                        .ProseMirror code {
                                            background-color: rgba(0, 0, 0, 0.05);
                                            padding: 0.2em 0.4em;
                                            border-radius: 3px;
                                            font-family: monospace;
                                        }
                                        .ProseMirror pre {
                                            background-color: rgba(0, 0, 0, 0.05);
                                            padding: 1em;
                                            border-radius: 5px;
                                            overflow-x: auto;
                                            margin-bottom: 1em;
                                        }
                                        .ProseMirror pre code {
                                            background: none;
                                            padding: 0;
                                        }
                                        .ProseMirror blockquote {
                                            border-left: 3px solid #ccc;
                                            padding-left: 1em;
                                            margin-left: 0;
                                            margin-bottom: 1em;
                                            color: #666;
                                        }
                                        .ProseMirror img {
                                            max-width: 100%;
                                            height: auto;
                                            border-radius: 5px;
                                            margin: 1em 0;
                                        }
                                        .ProseMirror a {
                                            color: #3b82f6;
                                            text-decoration: underline;
                                            cursor: pointer;
                                        }
                                        .ProseMirror a:hover {
                                            color: #2563eb;
                                        }
                                    `}</style>
                                    <EditorContent editor={editor} />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-6">
                        <div className="flex flex-col sm:flex-row w-full justify-between gap-2">
                            <Button variant="outline" onClick={handleCloseDialog} className="text-base px-6 py-2">
                                Close
                            </Button>
                            <div className="flex gap-2">
                                <Button onClick={handleUpdateFromDialog} className="text-base px-6 py-2">
                                    <Pencil className="h-5 w-5 mr-2" />
                                    Update Ticket
                                </Button>
                                <Button 
                                    variant={selectedTicket?.status === 'Closed' ? 'default' : 'destructive'}
                                    onClick={handleCloseFromDialog} 
                                    className="text-base px-6 py-2"
                                >
                                    {selectedTicket?.status === 'Closed' ? (
                                        <><CheckCircle className="h-5 w-5 mr-2" />Reopen Ticket</>
                                    ) : (
                                        <><XCircle className="h-5 w-5 mr-2" />Close Ticket</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Ticket Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={handleCloseEditDialog}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">
                            {editMode === 'update' ? 'Update Ticket' : editMode === 'close' ? 'Close Ticket' : 'Reopen Ticket'}
                        </DialogTitle>
                        <DialogDescription>
                            {editMode === 'update' ? 'Make changes to the ticket information' : 
                             editMode === 'close' ? 'Add final notes and close the ticket' : 
                             'Add notes and reopen the ticket'}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedTicket && (
                        <TicketEdit
                            ticket={selectedTicket}
                            onSuccess={handleEditSuccess}
                            redirectUrl={null}
                            mode={editMode}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

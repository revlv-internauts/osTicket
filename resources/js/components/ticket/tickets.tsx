import AppLayout from '@/layouts/app-layout';
import { ticket } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import TicketEdit from './edit'; 

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
    cc?: number[];
    cc_emails?: Email[];
    ticket_notice?: string;
    ticket_source: string;
    help_topic: number;
    help_topic_relation?: HelpTopic;
    department: string;
    sla_plan?: string;
    due_date?: string;
    opened_at?: string;
    assigned_to?: number;
    assigned_to_user?: User;
    canned_response?: string;
    response?: string;
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

type SortField = 'ticket_name' | 'user' | 'source' | 'assigned_to' | 'help_topic' | 'department' | 'priority' | 'status' | 'created_at';
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
            case 'source':
                aValue = a.ticket_source?.toLowerCase() || '';
                bValue = b.ticket_source?.toLowerCase() || '';
                break;
            case 'assigned_to':
                aValue = a.assigned_to_user?.name?.toLowerCase() || '';
                bValue = b.assigned_to_user?.name?.toLowerCase() || '';
                break;
            case 'help_topic':
                aValue = a.help_topic_relation?.name?.toLowerCase() || '';
                bValue = b.help_topic_relation?.name?.toLowerCase() || '';
                break;
            case 'department':
                aValue = a.department?.toLowerCase() || '';
                bValue = b.department?.toLowerCase() || '';
                break;
            case 'priority':
                aValue = a.priority?.toLowerCase() || '';
                bValue = b.priority?.toLowerCase() || '';
                break;
            case 'status':
                aValue = a.status?.toLowerCase() || '';
                bValue = b.status?.toLowerCase() || '';
                break;
            case 'created_at':
                aValue = new Date(a.created_at).getTime();
                bValue = new Date(b.created_at).getTime();
                break;
            default:
                return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

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

    const colSpan = 8 + (showUserId ? 1 : 0) + (showAssignedTo ? 1 : 0);

    const handleRowClick = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedTicket(null);
    };

    const handleEditFromDialog = () => {
        if (selectedTicket) {
            setDialogOpen(false);
            setEditDialogOpen(true);
        }
    };

    const handleCloseEditDialog = () => {
        setEditDialogOpen(false);
        setSelectedTicket(null);
    };

    const handleEditSuccess = () => {
        setEditDialogOpen(false);
        setSelectedTicket(null);
        router.reload({ only: ['tickets'] });
    };

    return (
        <>
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
                                        onClick={() => handleSort('user')}
                                        className="h-8 px-2 hover:bg-transparent"
                                    >
                                        Submitted By
                                        {getSortIcon('user')}
                                    </Button>
                                </TableHead>
                            )}
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    onClick={() => handleSort('source')}
                                    className="h-8 px-2 hover:bg-transparent"
                                >
                                    Source
                                    {getSortIcon('source')}
                                </Button>
                            </TableHead>
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
                                    onClick={() => handleSort('help_topic')}
                                    className="h-8 px-2 hover:bg-transparent"
                                >
                                    Help Topic
                                    {getSortIcon('help_topic')}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button
                                    variant="ghost"
                                    onClick={() => handleSort('department')}
                                    className="h-8 px-2 hover:bg-transparent"
                                >
                                    Department
                                    {getSortIcon('department')}
                                </Button>
                            </TableHead>
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
                                    onClick={() => handleSort('created_at')}
                                    className="h-8 px-2 hover:bg-transparent"
                                >
                                    Created At
                                    {getSortIcon('created_at')}
                                </Button>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedTickets && sortedTickets.length > 0 ? (
                            sortedTickets.map((ticket) => (
                                <TableRow 
                                    key={ticket.id}
                                    onClick={() => handleRowClick(ticket)}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                >
                                    <TableCell>{ticket.ticket_name || '-'}</TableCell>
                                    {showUserId && <TableCell>{ticket.user?.name || '-'}</TableCell>}
                                    <TableCell>{ticket.ticket_source || '-'}</TableCell>
                                    {showAssignedTo && <TableCell>{ticket.assigned_to_user?.name || '-'}</TableCell>}
                                    <TableCell>{ticket.help_topic_relation?.name || '-'}</TableCell>
                                    <TableCell>{ticket.department || '-'}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            ticket.priority === 'Low' ? 'bg-green-100 text-green-800' :
                                            ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                            ticket.priority === 'High' ? 'bg-red-100 text-red-800' :
                                            ticket.priority === 'Critical' ? 'bg-purple-100 text-purple-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {ticket.priority || 'Unknown'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            ticket.status === 'Open' ? 'bg-green-100 text-green-800' :
                                            ticket.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                                            'bg-blue-100 text-blue-800'
                                        }`}>
                                            {ticket.status || 'Unknown'}
                                        </span>
                                    </TableCell>
                                    <TableCell>{formatDate(ticket.created_at)}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
                                    No tickets found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Ticket Details Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Ticket Details</DialogTitle>
                        <DialogDescription>
                            View complete information about this ticket
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTicket && (
                        <div className="space-y-6">
                            {/* Ticket Header Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Ticket Name</p>
                                    <p className="text-lg font-semibold">{selectedTicket.ticket_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                                    <Badge className={`mt-1 ${
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Submitted By</p>
                                    <p className="text-base">{selectedTicket.user?.name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Ticket Source</p>
                                    <p className="text-base">{selectedTicket.ticket_source || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Help Topic</p>
                                    <p className="text-base">{selectedTicket.help_topic_relation?.name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Department</p>
                                    <p className="text-base">{selectedTicket.department || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Priority</p>
                                    <p className="text-base">{selectedTicket.priority || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Assigned To</p>
                                    <p className="text-base">{selectedTicket.assigned_to_user?.name || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground mb-2">CC Emails</p>
                                    {selectedTicket.cc_emails && selectedTicket.cc_emails.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedTicket.cc_emails.map((email) => (
                                                <Badge key={email.id} variant="secondary">
                                                    {email.email_address}
                                                    {email.name && ` (${email.name})`}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-base text-muted-foreground">No CC emails</p>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Opened At</p>
                                    <p className="text-base">{formatDate(selectedTicket.opened_at ?? '') || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Created At</p>
                                    <p className="text-base">{formatDate(selectedTicket.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                                    <p className="text-base">{formatDate(selectedTicket.updated_at)}</p>
                                </div>
                            </div>

                            <Separator />

                            {/* Response */}
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Response</p>
                                <div className="bg-muted p-4 rounded-md">
                                    <p className="text-base whitespace-pre-wrap">
                                        {selectedTicket.response || 'No response provided'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={handleCloseDialog}>
                            Close
                        </Button>
                        <Button onClick={handleEditFromDialog}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Ticket
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Ticket Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">Edit Ticket</DialogTitle>
                        <DialogDescription>
                            Make changes to the ticket information
                        </DialogDescription>
                    </DialogHeader>
                    {selectedTicket && (
                        <TicketEdit
                            ticket={{
                                ...selectedTicket,
                                cc: selectedTicket.cc?.[0] ?? null
                            }}
                            onSuccess={handleEditSuccess}
                            redirectUrl={null}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

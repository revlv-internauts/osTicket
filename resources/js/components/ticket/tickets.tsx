import AppLayout from '@/layouts/app-layout';
import { ticket } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Ticket {
    id: number;
    ticket_name: string;
    user_id: number;
    cc?: string;
    ticket_notice?: string;
    ticket_source: string;
    help_topic: string;
    department: string;
    sla_plan?: string;
    due_date?: string;
    assigned_to?: number;
    canned_response?: string;
    response?: string;
    status: string;
    created_at: string;
    updated_at: string;
}

interface TicketProps {
    tickets: Ticket[];
    showUserId?: boolean;
    showAssignedTo?: boolean;
    caption?: string;
}

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

    useEffect(() => {
        const success = pageProps?.flash?.success ?? pageProps?.flash?.message;
        if (success) {
            toast.success(String(success));
        }
    }, [pageProps?.flash?.success, pageProps?.flash?.message]);

    const colSpan = 8 + (showUserId ? 1 : 0) + (showAssignedTo ? 1 : 0);

    return (
        <div className="border rounded-md">
            <Table>
                <TableCaption>{caption}</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Ticket Name</TableHead>
                        {showUserId && <TableHead>User ID</TableHead>}
                        <TableHead>Source</TableHead>
                        {showAssignedTo && <TableHead>Assigned To</TableHead>}
                        <TableHead>Help Topic</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Created At</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tickets && tickets.length > 0 ? (
                        tickets.map((ticket) => (
                            <TableRow key={ticket.id}>
                                <TableCell className="font-medium">{ticket.id}</TableCell>
                                <TableCell>{ticket.ticket_name || '-'}</TableCell>
                                {showUserId && <TableCell>{ticket.user_id}</TableCell>}
                                <TableCell>{ticket.ticket_source || '-'}</TableCell>
                                {showAssignedTo && <TableCell>{ticket.assigned_to || '-'}</TableCell>}
                                <TableCell>{ticket.help_topic || '-'}</TableCell>
                                <TableCell>{ticket.department || '-'}</TableCell>
                                <TableCell>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        ticket.status === 'Open' ? 'bg-green-100 text-green-800' :
                                        ticket.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                                        'bg-blue-100 text-blue-800'
                                    }`}>
                                        {ticket.status || 'Unknown'}
                                    </span>
                                </TableCell>
                                <TableCell>{formatDate(ticket.due_date ?? '') || '-'}</TableCell>
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
    );
}

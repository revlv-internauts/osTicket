import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { dashboard, records } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import StatsCard from "@/components/StatsCard";
import { ChartPieDonutText } from "@/components/chart/chart-pie-simple";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Records',
        href: records().url,
    },
];


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

interface RecordsProps {
    tickets: Ticket[];
}


const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

export default function Records({ tickets }: RecordsProps) {
    const [searchTerm, setSearchTerm] = useState('');
    
    
    const filteredTickets = (tickets || []).filter(ticket => {
        if (!ticket) return false;
        
        const searchLower = searchTerm.toLowerCase();
        return (
            (ticket.ticket_name && ticket.ticket_name.toLowerCase().includes(searchLower)) ||
            (ticket.help_topic && ticket.help_topic.toLowerCase().includes(searchLower)) ||
            (ticket.department && ticket.department.toLowerCase().includes(searchLower)) ||
            (ticket.status && ticket.status.toLowerCase().includes(searchLower)) ||
            (ticket.ticket_source && ticket.ticket_source.toLowerCase().includes(searchLower)) ||
            (ticket.id && ticket.id.toString().includes(searchLower))
        );

    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Records" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input 
                        type="text" 
                        placeholder="Search tickets..." 
                        className="h-10 w-80"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Table>
                    <TableCaption>TICKET RECORDS</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Ticket Name</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Help Topic</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTickets.length > 0 ? (
                            filteredTickets.map(ticket => (
                                <TableRow key={ticket.id}>
                                    <TableCell className="font-medium">{ticket.id}</TableCell>
                                    <TableCell className="font-semibold text-blue-600">
                                        {ticket.ticket_name || '-'}
                                    </TableCell>
                                    <TableCell>{ticket.ticket_source || '-'}</TableCell>
                                    <TableCell>{ticket.help_topic || '-'}</TableCell>
                                    <TableCell>{ticket.department || '-'}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                            ticket.status === 'Open' ? 'bg-green-100 text-green-800' :
                                            ticket.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                                            ticket.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
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
                                <TableCell colSpan={7} className="text-center py-4">
                                    {searchTerm ? 'No tickets match your search' : 'No tickets found'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </AppLayout>
    );
}

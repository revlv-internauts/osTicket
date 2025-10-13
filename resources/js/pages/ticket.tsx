import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { dashboard, ticket, list } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TicketsTable from "@/components/ticket/tickets";  
import TicketCreate from '@/components/ticket/create';
import { useRef, useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { Inertia } from '@inertiajs/inertia';
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
    myTickets: Ticket[];
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

export default function Index(props: TicketProps) {
   
    const { tickets: propTickets, myTickets: propMyTickets } = props || {};
    const pageProps = usePage().props as any;
const tickets = propTickets ?? (pageProps.tickets ?? []);
const myTickets = propMyTickets ?? (pageProps.myTickets ?? []);

// show toast notification when backend sets a success flash message
useEffect(() => {
    const success = pageProps?.flash?.success ?? pageProps?.flash?.message;
    if (success) {
        toast.success(String(success));
    }
}, [pageProps?.flash?.success, pageProps?.flash?.message]);
 
    const [activeTab, setActiveTab] = useState("tickets");
    const tabsRef = useRef<HTMLDivElement>(null);

    const handleTicketCreated = () => {
        setActiveTab("tickets");
        if (tabsRef.current) {
            const ticketsTab = tabsRef.current.querySelector('[value="tickets"]') as HTMLButtonElement;
            if (ticketsTab) ticketsTab.click();
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ticket" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="md:col-span-3">
                        <Tabs 
                            value={activeTab} 
                            onValueChange={setActiveTab}
                            className="flex w-full flex-col"
                            ref={tabsRef}
                        >
                            <TabsList className="grid w-full grid-cols-3 h-15" >
                                <TabsTrigger value="tickets" className='h-full'>All Tickets</TabsTrigger>
                                <TabsTrigger value="myTicket" className='h-full'>My Tickets</TabsTrigger>
                                <TabsTrigger value="create" className='h-full'>Create Ticket</TabsTrigger>
                            </TabsList>
                            
                            {/* All Tickets Tab */}
                            <TabsContent value="tickets">
                                <div className="border rounded-md">
                                    <Table>
                                        <TableCaption>ALL TICKETS</TableCaption>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[80px]">ID</TableHead>
                                                <TableHead>Ticket Name</TableHead>
                                                <TableHead>User ID</TableHead>
                                                <TableHead>Source</TableHead>
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
                                                        <TableCell className="font-semibold text-blue-600">
                                                            {ticket.ticket_name || '-'}
                                                        </TableCell>
                                                        <TableCell>{ticket.user_id}</TableCell>
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
                                                        <TableCell>{formatDate(ticket.due_date ?? '') || '-'}</TableCell>
                                                        <TableCell>{formatDate(ticket.created_at)}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                                        No tickets found
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                            
                            {/* My Tickets Tab */}
                            <TabsContent value="myTicket">
                                <div className="border rounded-md">
                                    <Table>
                                        <TableCaption>MY TICKETS</TableCaption>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[80px]">ID</TableHead>
                                                <TableHead>Ticket Name</TableHead>
                                                <TableHead>Source</TableHead>
                                                <TableHead>Help Topic</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Due Date</TableHead>
                                                <TableHead>Created At</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {myTickets && myTickets.length > 0 ? (
                                                myTickets.map((ticket) => (
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
                                                        <TableCell>{formatDate(ticket.due_date ?? '') || '-'}</TableCell>
                                                        <TableCell>{formatDate(ticket.created_at)}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                        You don't have any tickets yet
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                            
                            {/* Create Ticket Tab */}
                            <TabsContent value="create">
                                <TicketCreate 
                                    redirectUrl={null} 
                                    onSuccess={() => {
                                        handleTicketCreated();
                                        toast.success('Ticket created successfully');
                                        Inertia.reload({ preserveState: false });
                                    }} 
                                />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

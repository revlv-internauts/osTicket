import AppLayout from '@/layouts/app-layout';
import { ticket } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TicketsTable from "@/components/ticket/tickets";
import TicketCreate from '@/components/ticket/create';
import { useRef, useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { Inertia } from '@inertiajs/inertia';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ticket',
        href: ticket().url,
    },
];

export default function Index() {
    const pageProps = usePage().props as any;
    const tickets = pageProps.tickets ?? [];
    const userId = pageProps.auth?.user?.id ?? null;

    const myTickets = tickets.filter((ticket: any) => ticket.user_id === userId);

    const [activeTab, setActiveTab] = useState("tickets");
    const tabsRef = useRef<HTMLDivElement>(null);

    const handleTicketCreated = () => {
        setActiveTab("tickets");
        if (tabsRef.current) {
            const tabList = tabsRef.current.querySelector('[role="tablist"]');
            if (tabList) {
                const ticketsTab = tabList.querySelector('[data-value="tickets"]') as HTMLElement;
                if (ticketsTab) {
                    ticketsTab.focus();
                }
            }
        }
    }

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
                            <TabsList className="grid w-full grid-cols-3 h-15">
                                <TabsTrigger value="tickets" className='h-full'>All Tickets</TabsTrigger>
                                <TabsTrigger value="myTicket" className='h-full'>My Tickets</TabsTrigger>
                                <TabsTrigger value="create" className='h-full'>Create Ticket</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="tickets">
                                <TicketsTable 
                                    tickets={tickets} 
                                    showUserId={true}
                                    showAssignedTo={true}
                                    caption="ALL TICKETS"
                                />
                            </TabsContent>
                            
                            <TabsContent value="myTicket">
                                <TicketsTable 
                                    tickets={myTickets} 
                                    showUserId={false}
                                    showAssignedTo={false}
                                    caption="MY TICKETS"    
                                />
                            </TabsContent>
                            
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

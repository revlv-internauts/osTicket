import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { dashboard, ticket, list } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TicketsTable from "@/components/ticket/tickets";  
import TicketCreate from '@/components/ticket/create';
import { useRef, useState } from 'react';


interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
 
}

interface Ticket {
  id: number;
  userId: number;
  cc: string;
  ticketNotice: string;
  ticketSource: string;
  helpTopic: string;
  department: string;
  slaPlan: string;
  dueDate: string;
  assignedTo: string;
  cannedResponse: string;
  response: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ListProps {
  tickets: Ticket[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ticket',
        href: ticket().url,
    },
];

export default function Index() {
    
    const [activeTab, setActiveTab] = useState("tickets");
    const tabsRef = useRef<HTMLDivElement>(null);
    let tickets: Ticket[] = []; 

    
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
                                <TabsTrigger value="tickets" className='h-full'>Tickets</TabsTrigger>
                                <TabsTrigger value="myTicket" className='h-full'>My Tickets</TabsTrigger>
                                <TabsTrigger value="create" className='h-full'>Create Ticket</TabsTrigger>
                            </TabsList>
                            <TabsContent value="tickets">
                                <TicketsTable tickets={tickets = tickets} />
                                all tickets.
                            </TabsContent>
                            <TabsContent value="myTicket">
                                <TicketsTable tickets={tickets} />
                                my tickets.
                            </TabsContent>
                            <TabsContent value="create">
                                <TicketCreate 
                                    redirectUrl={null} 
                                    onSuccess={handleTicketCreated} 
                                />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

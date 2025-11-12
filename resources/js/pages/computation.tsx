import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import ComputationView from '@/components/computation/computation-view';

interface Ticket {
    id: number;
    ticket_name: string;
    status: string;
    priority: string;
    opened_at: string;
    closed_at: string;
    resolution_time: number;
    resolution_time_formatted: string;
    user: string;
    assigned_to: string;
    help_topic: string;
    opened_by: string;
    closed_by: string;
}

interface Statistics {
    total_tickets: number;
    average_resolution_time: number;
    average_resolution_time_formatted: string;
    fastest_resolution_time: number;
    fastest_resolution_time_formatted: string;
    slowest_resolution_time: number;
    slowest_resolution_time_formatted: string;
    total_resolution_time: number;
    total_resolution_time_formatted: string;
}

interface ComputationProps {
    tickets: Ticket[];
    statistics: Statistics;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

export default function Computation({ tickets, statistics }: ComputationProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ticket Resolution Computation" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="mb-4">
                    <h1 className="text-3xl font-bold">Ticket Resolution Time</h1>
                </div>
                
                <ComputationView tickets={tickets} statistics={statistics} />
            </div>
        </AppLayout>
    );
}

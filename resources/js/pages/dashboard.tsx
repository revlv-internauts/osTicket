import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import StatsCard from "@/components/StatsCard";
import {ChartAreaInteractive} from "@/components/chart/areaChart";
import { DataTableDemo } from '@/components/dashboard/department';


const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

export default function Dashboard() {
    const page = usePage().props as any;
    const total  = page.totalTickets ?? 0;
    const opened = page.openedTickets ?? 0;
    const closed = page.closedTickets ?? 0;
    const chartData = page.chartData ?? [];
    const helpTopicStats = page.helpTopicStats ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">

                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-4">
                        <StatsCard title="Total Tickets" value={total} />
                        <StatsCard title="Opened" value={opened} />
                        <StatsCard title="Closed" value={closed} />
                    </div>
                    
                </div>
                <div className="md:col-span-2">
                        <ChartAreaInteractive data={chartData} />
                    </div>
                    <div className="md:col-span-2">
                        <DataTableDemo data={helpTopicStats} />
                    </div>
                <div className="grid flex-1 auto-rows-min gap-4 md:grid-cols-3">
                    <PlaceholderPattern className="h-48 md:col-span-2" />
                    <PlaceholderPattern className="h-48" />
                </div>

            </div>
        </AppLayout>
    );
}

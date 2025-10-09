import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import StatsCard from "@/components/StatsCard";


import { ChartPieDonutText } from "@/components/chart/chart-pie-simple";
import {ChartAreaInteractive} from "@/components/chart/areaChart";
import { DataTableDemo } from '@/components/dashboard/department';


const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">

                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-4">
                        <StatsCard title="Total Tickets" value="0" />
                        <StatsCard title="Opened" value="0" />
                        <StatsCard title="Closed" value="0" />
                    </div>
                    
                </div>
                <div className="md:col-span-2">
                        <ChartAreaInteractive />
                    </div>
                    <div className="md:col-span-2">
                        <DataTableDemo />
                    </div>
                <div className="grid flex-1 auto-rows-min gap-4 md:grid-cols-3">
                    <PlaceholderPattern className="h-48 md:col-span-2" />
                    <PlaceholderPattern className="h-48" />
                </div>

            </div>
        </AppLayout>
    );
}

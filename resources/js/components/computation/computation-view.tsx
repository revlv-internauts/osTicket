import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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

interface ComputationViewProps {
    tickets: Ticket[];
    statistics: Statistics;
}

export default function ComputationView({ tickets, statistics }: ComputationViewProps) {
    const getPriorityColor = (priority: string) => {
        switch (priority?.toLowerCase()) {
            case 'high':
                return 'destructive';
            case 'medium':
                return 'default';
            case 'low':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'closed':
                return 'secondary';
            case 'open':
                return 'default';
            case 'in progress':
                return 'default';
            default:
                return 'outline';
        }
    };

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Tickets</CardDescription>
                        <CardTitle className="text-3xl">{statistics.total_tickets}</CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Average Resolution Time</CardDescription>
                        <CardTitle className="text-2xl">{statistics.average_resolution_time} min</CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Fastest Resolution</CardDescription>
                        <CardTitle className="text-2xl">{statistics.fastest_resolution_time} min</CardTitle>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Slowest Resolution</CardDescription>
                        <CardTitle className="text-2xl">{statistics.slowest_resolution_time} min</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Tickets Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Ticket Resolution Times</CardTitle>
                    <CardDescription>
                        Resolution times for all closed tickets
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ticket</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Opened At</TableHead>
                                    <TableHead>Closed At</TableHead>
                                    <TableHead>Resolution Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tickets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center text-muted-foreground">
                                            No closed tickets found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tickets.map((ticket) => (
                                        <TableRow key={ticket.id}>
                                            <TableCell className="font-medium">{ticket.ticket_name}</TableCell>
                                            <TableCell>
                                                <Badge variant={getPriorityColor(ticket.priority)}>
                                                    {ticket.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusColor(ticket.status)}>
                                                    {ticket.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">{ticket.opened_at}</TableCell>
                                            <TableCell className="whitespace-nowrap">{ticket.closed_at}</TableCell>
                                            <TableCell className="font-semibold whitespace-nowrap">
                                                {ticket.resolution_time} minutes
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

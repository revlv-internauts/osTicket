import React from 'react';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";



// Define the Ticket type if not imported from elsewhere
type Ticket = {
    id: number;
    userId: number;
    cc?: string;
    ticketNotice?: string;
    ticketSource: string;
    helpTopic: string;
    department: string;
    slaPlan?: string;
    dueDate?: string;
    assignedTo?: string;
    cannedResponse?: string;
    response?: string;
    status?: string;
    createdAt: string;
    updatedAt: string;
};

const TicketsTable: React.FC<{ tickets: Ticket[] }> = ({ tickets }) => (
    <div className="border rounded-md">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>CC</TableHead>
                    <TableHead>Notice</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Help Topic</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>SLA Plan</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Canned Response</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Updated At</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tickets.map(ticket => (
                    <TableRow key={ticket.id}>
                        <TableCell>{ticket.id}</TableCell>
                        <TableCell>{ticket.userId}</TableCell>
                        <TableCell>{ticket.cc || '-'}</TableCell>
                        <TableCell>{ticket.ticketNotice || '-'}</TableCell>
                        <TableCell>{ticket.ticketSource}</TableCell>
                        <TableCell>{ticket.helpTopic}</TableCell>
                        <TableCell>{ticket.department}</TableCell>
                        <TableCell>{ticket.slaPlan || '-'}</TableCell>
                        <TableCell>{ticket.dueDate || '-'}</TableCell>
                        <TableCell>{ticket.assignedTo || '-'}</TableCell>
                        <TableCell>{ticket.cannedResponse || '-'}</TableCell>
                        <TableCell>{ticket.response || '-'}</TableCell>
                        <TableCell>{ticket.status || '-'}</TableCell>
                        <TableCell>{ticket.createdAt}</TableCell>
                        <TableCell>{ticket.updatedAt}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
);

export default TicketsTable;

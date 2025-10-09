import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, UserIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePage, useForm } from "@inertiajs/react";
import { toast } from "sonner"


type Ticket = {
    user_id: number;
    cc?: string | null;
    ticket_notice?: string | null;
    ticket_source: string;
    help_topic: string;
    department: string;
    sla_plan?: string | null;
    due_date?: string | null;
    canned_response?: string | null;
    response?: string | null;
    status?: string | null;
};

type Props = {
    sourceOptions?: string[];
    helpTopicOptions?: string[];
    departmentOptions?: string[];
    slaOptions?: string[];
    statusOptions?: string[];
    redirectUrl?: string | null; 
    onSuccess?: () => void; 
};


const defaultSourceOptions = ["Email", "Phone"];
const defaultHelpTopicOptions = ["ADB Concern", "DICT-PIALEOS Concern", "R4B-PRVNET-MIMAROPA"];
const defaultDepartmentOptions = ["NOC"];
const defaultSlaOptions = ["Normal", "High"];


const TicketCreate: React.FC<Props> = ({ 
    sourceOptions = defaultSourceOptions,
    helpTopicOptions = defaultHelpTopicOptions,
    departmentOptions = defaultDepartmentOptions,
    slaOptions = defaultSlaOptions,
    redirectUrl = "/tickets",
    onSuccess
}) => {
    
    const { auth } = usePage().props as any;
    const user = auth?.user;
    
    
    const { data, setData, post, processing, errors, reset } = useForm<Ticket>({
        user_id: user?.id || 0,
        ticket_source: "",
        help_topic: "",
        department: "",
        cc: null,
        ticket_notice: null,
        sla_plan: null,
        due_date: null,
        canned_response: null,
        response: null,
        status: "Open", 
    });

    const [date, setDate] = useState<Date | undefined>(undefined);
    const [formErrors, setFormErrors] = useState<{[key: string]: boolean}>({});

    // Update user_id when auth user changes
    useEffect(() => {
        if (user?.id) {
            setData("user_id", user.id);
        }
    }, [user]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setData(name as keyof Ticket, value);
    };

    const handleSelectChange = (name: keyof Ticket, value: string) => {
        setData(name, value);
    };

    const handleDateChange = (date: Date | undefined) => {
        setDate(date);
        setData("due_date", date ? format(date, "yyyy-MM-dd'T'HH:mm:ss") : null);
    };

    const validateForm = () => {
        const newErrors: {[key: string]: boolean} = {};
        
        // Required fields
        if (!data.ticket_source) newErrors.ticket_source = true;
        if (!data.help_topic) newErrors.help_topic = true;
        if (!data.department) newErrors.department = true;
        
        setFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            
            return;
        }

        post("/tickets", {
            onSuccess: () => {
                reset();
                setDate(undefined);
                
              
                if (onSuccess) {
                    onSuccess();
                }
                
                else if (redirectUrl) {
                    window.location.href = redirectUrl;
                }
            },
            onError: (errors) => {
                console.error(errors);
            }
        });
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Create New Support Ticket</CardTitle>
                <CardDescription>
                    Fill in the details below to create a new support ticket
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* User Information - Read Only */}
                        <div className="space-y-2">
                            <Label>Submitted By</Label>
                            <div className="flex items-center p-2 bg-muted rounded-md">
                                <UserIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>{user?.name || 'Loading user...'}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This ticket will be created under your account
                            </p>
                        </div>

                        {/* CC */}
                        <div className="space-y-2">
                            <Label htmlFor="cc">CC</Label>
                            <Input 
                                id="cc" 
                                name="cc" 
                                type="text" 
                                value={data.cc || ""} 
                                onChange={handleChange} 
                                placeholder="Email CC (separate with commas)"
                                className={errors.cc ? "border-red-500" : ""}
                            />
                            {errors.cc && (
                                <p className="text-xs text-red-500">{errors.cc}</p>
                            )}
                        </div>

                        {/* Ticket Source */}
                        <div className="space-y-2">
                            <Label htmlFor="ticket_source" className={formErrors.ticket_source ? "text-red-500" : ""}>
                                Ticket Source*
                            </Label>
                            <Select 
                                value={data.ticket_source} 
                                onValueChange={(value) => handleSelectChange("ticket_source", value)}
                            >
                                <SelectTrigger className={formErrors.ticket_source ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select source" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sourceOptions.map(source => (
                                        <SelectItem key={source} value={source}>{source}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.ticket_source && (
                                <p className="text-xs text-red-500">{errors.ticket_source}</p>
                            )}
                        </div>

                        {/* Ticket Notice */}
                        <div className="space-y-2">
                            <Label htmlFor="ticket_notice">Ticket Notice</Label>
                            <Input 
                                id="ticket_notice" 
                                name="ticket_notice" 
                                type="text" 
                                value={data.ticket_notice || ""} 
                                onChange={handleChange}
                                placeholder="Notification message" 
                                maxLength={50} // Match VARCHAR(50) in schema
                                className={errors.ticket_notice ? "border-red-500" : ""}
                            />
                            {errors.ticket_notice && (
                                <p className="text-xs text-red-500">{errors.ticket_notice}</p>
                            )}
                        </div>
                        
                        {/* Help Topic */}
                        <div className="space-y-2">
                            <Label htmlFor="help_topic" className={formErrors.help_topic ? "text-red-500" : ""}>
                                Help Topic*
                            </Label>
                            <Select 
                                value={data.help_topic} 
                                onValueChange={(value) => handleSelectChange("help_topic", value)}
                            >
                                <SelectTrigger className={formErrors.help_topic ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select help topic" />
                                </SelectTrigger>
                                <SelectContent>
                                    {helpTopicOptions.map(topic => (
                                        <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.help_topic && (
                                <p className="text-xs text-red-500">{errors.help_topic}</p>
                            )}
                        </div>

                        {/* Department */}
                        <div className="space-y-2">
                            <Label htmlFor="department" className={formErrors.department ? "text-red-500" : ""}>
                                Department*
                            </Label>
                            <Select 
                                value={data.department} 
                                onValueChange={(value) => handleSelectChange("department", value)}
                            >
                                <SelectTrigger className={formErrors.department ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departmentOptions.map(dept => (
                                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.department && (
                                <p className="text-xs text-red-500">{errors.department}</p>
                            )}
                        </div>
                        
                        {/* SLA Plan */}
                        <div className="space-y-2">
                            <Label htmlFor="sla_plan">SLA Plan</Label>
                            <Select 
                                value={data.sla_plan || ""} 
                                onValueChange={(value) => handleSelectChange("sla_plan", value)}
                            >
                                <SelectTrigger className={errors.sla_plan ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select SLA plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {slaOptions.map(sla => (
                                        <SelectItem key={sla} value={sla}>{sla}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.sla_plan && (
                                <p className="text-xs text-red-500">{errors.sla_plan}</p>
                            )}
                        </div>
                        
                        {/* Due Date */}
                        <div className="space-y-2">
                            <Label htmlFor="due_date">Due Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground",
                                            errors.due_date && "border-red-500"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Select due date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={handleDateChange}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            {errors.due_date && (
                                <p className="text-xs text-red-500">{errors.due_date}</p>
                            )}
                        </div>
                        
                        {/* Canned Response */}
                        <div className="space-y-2">
                            <Label htmlFor="canned_response">Canned Response</Label>
                            <Select 
                                value={data.canned_response || ""} 
                                onValueChange={(value) => handleSelectChange("canned_response", value)}
                            >
                                <SelectTrigger className={errors.canned_response ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select canned response" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sample">Sample (with variable)</SelectItem>
                                    <SelectItem value="what">what is osTicket (sample)</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.canned_response && (
                                <p className="text-xs text-red-500">{errors.canned_response}</p>
                            )}
                        </div>

                            {/* status */}
                        <div className="space-y-2 ">
                            <Label htmlFor="status" className="text-lg">Status</Label>
                            <Select 
                                value={data.status || ""} 
                                onValueChange={(value) => handleSelectChange("status", value)}
                            >
                                <SelectTrigger className={errors.status ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="Closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.status && (
                                <p className="text-xs text-red-500">{errors.status}</p>
                            )}
                        </div>

                    </div>

                    
                    {/* Response - Full width */}
                    <div className="space-y-2">
                        <Label htmlFor="response">Response</Label>
                        <Textarea 
                            id="response" 
                            name="response" 
                            value={data.response || ""} 
                            onChange={handleChange}
                            className={cn("min-h-[120px]", errors.response && "border-red-500")}
                            placeholder="Detailed response or notes"
                        />
                        {errors.response && (
                            <p className="text-xs text-red-500">{errors.response}</p>
                        )}
                    </div>

                    
                </form>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button 
                    onClick={handleSubmit} 
                    type="submit" 
                    disabled={processing}
                >
                    {processing ? "Creating..." : "Create Ticket"}
                </Button>
            </CardFooter>
        </Card>
    );
};

export default TicketCreate;
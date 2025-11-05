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
import { CalendarIcon, UserIcon, Plus, Upload, X, Image as ImageIcon, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePage, useForm, router } from "@inertiajs/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type Ticket = {
    user_id: number;
    cc?: number[] | null;
    ticket_source: string;
    help_topic: number;
    department: string;
    sla_plan?: string | null;
    opened_at?: string | null;
    assigned_to?: number | null;
    response?: string | null;
    status?: string | null;
    priority?: string | null;
    images?: File[];
};

type Props = {
    sourceOptions?: string[];
    departmentOptions?: string[];
    slaOptions?: string[];
    priorityOptions?: string[];
    redirectUrl?: string | null;
    onSuccess?: () => void;
};

const defaultSourceOptions = ["Email", "Phone"];
const defaultDepartmentOptions = ["NOC"];
const defaultSlaOptions = [
    "ADB SLA (18 hours - Active)",
    "Default SLA (18 hours - Active)",
    "DICT-MIMAROPA-PRVNET (18 hours - Active)",
    "PIALEOS 3 SLA (18 hours - Active)"
];
const defaultPriorityOptions = ["Low", "Medium", "High", "Critical"];

const TicketCreate: React.FC<Props> = ({
    sourceOptions = defaultSourceOptions,
    departmentOptions = defaultDepartmentOptions,
    slaOptions = defaultSlaOptions,
    priorityOptions = defaultPriorityOptions,
    redirectUrl = "/tickets",
    onSuccess
}) => {
    const { auth, users = [], emails = [], helpTopics = [] } = usePage().props as any;
    const user = auth?.user;

    const { data, setData, post, processing, errors } = useForm<{
        user_id: number;
        cc: number[];
        ticket_source: string;
        help_topic: number;
        department: string;
        sla_plan: string | null;
        opened_at: string | null;
        assigned_to: number | null;
        response: string | null;
        status: string | null;
        priority: string | null;
        images: File[];
    }>({
        user_id: user?.id || 0,
        cc: [] as number[],
        ticket_source: "",
        help_topic: 0,
        department: "",
        sla_plan: null,
        opened_at: null,
        assigned_to: null,
        response: null,
        status: "Open",
        priority: null,
        images: [],
    });

    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [helpTopicDialogOpen, setHelpTopicDialogOpen] = useState(false);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [ccPopoverOpen, setCcPopoverOpen] = useState(false);
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [time, setTime] = useState<string>("12:00");
    const [formErrors, setFormErrors] = useState<{ [key: string]: boolean }>({});

    const emailForm = useForm({
        email_address: "",
        name: "",
    });

    const helpTopicForm = useForm({
        name: "",
    });

    useEffect(() => {
        if (user?.id) {
            setData("user_id", user.id);
        }
    }, [user]);

    useEffect(() => {
        return () => {
            imagePreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [imagePreviews]);

    const resetForm = () => {
        setData({
            user_id: user?.id || 0,
            cc: [] as number[],
            ticket_source: "",
            help_topic: 0,
            department: "",
            sla_plan: null as string | null,
            opened_at: null as string | null,
            assigned_to: null as number | null,
            response: null as string | null,
            status: "Open" as string | null,
            priority: null as string | null,
            images: [] as File[],
        });
        setDate(undefined);
        setTime("12:00");
        setImagePreviews([]);
        setFormErrors({});
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(name as keyof Ticket, value);
    };

    const handleSelectChange = (name: keyof Ticket, value: string | number) => {
        setData(name, value as any);
    };

    const handleDateChange = (selectedDate: Date | undefined) => {
        setDate(selectedDate);
        updateOpenedAt(selectedDate, time);
    };

    const handleTimeChange = (newTime: string) => {
        setTime(newTime);
        updateOpenedAt(date, newTime);
    };

    const updateOpenedAt = (selectedDate: Date | undefined, selectedTime: string) => {
        if (selectedDate && selectedTime) {
            const [hours, minutes] = selectedTime.split(':');
            const dateTime = new Date(selectedDate);
            dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            setData("opened_at", format(dateTime, "yyyy-MM-dd'T'HH:mm:ss"));
        } else {
            setData("opened_at", null);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newFiles = Array.from(files);
        const currentImages = data.images || [];
        const updatedImages = [...currentImages, ...newFiles];

        setData("images", updatedImages);

        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
    };

    const removeImage = (index: number) => {
        const currentImages = data.images || [];
        const updatedImages = currentImages.filter((_, i) => i !== index);
        setData("images", updatedImages);

        URL.revokeObjectURL(imagePreviews[index]);
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleCcEmailToggle = (emailId: number) => {
        const currentCc = data.cc || [];
        const isSelected = currentCc.includes(emailId);

        if (isSelected) {
            setData("cc", currentCc.filter(id => id !== emailId));
        } else {
            setData("cc", [...currentCc, emailId]);
        }
    };

    const removeCcEmail = (emailId: number) => {
        const currentCc = data.cc || [];
        setData("cc", currentCc.filter(id => id !== emailId));
    };

    const getSelectedEmails = () => {
        const currentCc = data.cc || [];
        return emails.filter((email: any) => currentCc.includes(email.id));
    };

    const validateForm = () => {
        const newErrors: { [key: string]: boolean } = {};
        if (!data.ticket_source) newErrors.ticket_source = true;
        if (!data.help_topic) newErrors.help_topic = true;
        if (!data.department) newErrors.department = true;

        setFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAddEmail = (e: React.FormEvent) => {
        e.preventDefault();

        emailForm.post("/emails", {
            onSuccess: () => {
                emailForm.reset();
                setEmailDialogOpen(false);
                toast.success("Email added successfully");
                router.reload({ only: ['emails'] });
            },
            onError: (errs) => {
                console.error(errs);
                if (errs && typeof errs === 'object') {
                    Object.values(errs).forEach((m: any) => {
                        if (m) toast.error(String(m));
                    });
                }
            }
        });
    };

    const handleAddHelpTopic = (e: React.FormEvent) => {
        e.preventDefault();

        helpTopicForm.post("/help-topics", {
            onSuccess: () => {
                helpTopicForm.reset();
                setHelpTopicDialogOpen(false);
                toast.success("Help Topic added successfully");
                router.reload({ only: ['helpTopics'] });
            },
            onError: (errs) => {
                console.error(errs);
                if (errs && typeof errs === 'object') {
                    Object.values(errs).forEach((m: any) => {
                        if (m) toast.error(String(m));
                    });
                }
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        post("/tickets", {
            forceFormData: true,
            onSuccess: () => {
                resetForm();
                toast.success("Ticket created successfully!");

                if (onSuccess) {
                    onSuccess();
                } else if (redirectUrl) {
                    router.visit(redirectUrl);
                }
            },
            onError: (errs) => {
                console.error(errs);
                if (errs && typeof errs === 'object') {
                    Object.values(errs).forEach((m: any) => {
                        if (m) toast.error(String(m));
                    });
                }
            }
        });
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Create New Support Ticket</CardTitle>
                <CardDescription>
                    Fill in the details below to create a new support ticket. Ticket name will be auto-generated.
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

                        {/* Help Topic */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="help_topic" className={formErrors.help_topic ? "text-red-500" : ""}>
                                    Help Topic*
                                </Label>
                                <Dialog open={helpTopicDialogOpen} onOpenChange={setHelpTopicDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" type="button">
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add New
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add New Help Topic</DialogTitle>
                                            <DialogDescription>
                                                Create a new help topic category
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="new_help_topic_name">Help Topic Name*</Label>
                                                <Input
                                                    id="new_help_topic_name"
                                                    type="text"
                                                    value={helpTopicForm.data.name}
                                                    onChange={(e) => helpTopicForm.setData('name', e.target.value)}
                                                    placeholder="Enter help topic name"
                                                />
                                                {helpTopicForm.errors.name && (
                                                    <p className="text-xs text-red-500">{helpTopicForm.errors.name}</p>
                                                )}
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                onClick={handleAddHelpTopic}
                                                disabled={helpTopicForm.processing}
                                            >
                                                {helpTopicForm.processing ? "Adding..." : "Add Help Topic"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <Select
                                value={data.help_topic?.toString() || ""}
                                onValueChange={(value) => handleSelectChange("help_topic", parseInt(value))}
                            >
                                <SelectTrigger className={formErrors.help_topic ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select help topic" />
                                </SelectTrigger>
                                <SelectContent>
                                    {helpTopics.map((topic: any) => (
                                        <SelectItem key={topic.id} value={topic.id.toString()}>
                                            {topic.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.help_topic && (
                                <p className="text-xs text-red-500">{errors.help_topic}</p>
                            )}
                        </div>

                        {/* CC Email - Multi Select */}
                        <div className="space-y-2 md:col-span-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="cc">CC Emails (Multiple)</Label>
                                <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" type="button">
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add New
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add New CC Email</DialogTitle>
                                            <DialogDescription>
                                                Add a new email address for CC purposes
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="new_email_address">Email Address*</Label>
                                                <Input
                                                    id="new_email_address"
                                                    type="email"
                                                    value={emailForm.data.email_address}
                                                    onChange={(e) => emailForm.setData('email_address', e.target.value)}
                                                    placeholder="email@example.com"
                                                />
                                                {emailForm.errors.email_address && (
                                                    <p className="text-xs text-red-500">{emailForm.errors.email_address}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="new_email_name">Name (Optional)</Label>
                                                <Input
                                                    id="new_email_name"
                                                    type="text"
                                                    value={emailForm.data.name}
                                                    onChange={(e) => emailForm.setData('name', e.target.value)}
                                                    placeholder="Display name"
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                onClick={handleAddEmail}
                                                disabled={emailForm.processing}
                                            >
                                                {emailForm.processing ? "Adding..." : "Add Email"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            <Popover open={ccPopoverOpen} onOpenChange={setCcPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                    >
                                        <span className="text-muted-foreground">
                                            {getSelectedEmails().length > 0
                                                ? `${getSelectedEmails().length} email(s) selected`
                                                : "Select emails to CC"}
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                    <div className="max-h-64 overflow-y-auto">
                                        {emails.length > 0 ? (
                                            emails.map((email: any) => {
                                                const isSelected = (data.cc || []).includes(email.id);
                                                return (
                                                    <div
                                                        key={email.id}
                                                        className={cn(
                                                            "flex items-center px-3 py-2 cursor-pointer hover:bg-muted",
                                                            isSelected && "bg-muted"
                                                        )}
                                                        onClick={() => handleCcEmailToggle(email.id)}
                                                    >
                                                        <div className="flex items-center space-x-2 flex-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => { }}
                                                                className="h-4 w-4"
                                                            />
                                                            <span className="text-sm">{email.email_address}</span>
                                                            {email.name && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    ({email.name})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                                No emails available. Add one using the button above.
                                            </div>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {getSelectedEmails().length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {getSelectedEmails().map((email: any) => (
                                        <Badge key={email.id} variant="secondary" className="gap-1">
                                            {email.email_address}
                                            <X
                                                className="h-3 w-3 cursor-pointer hover:text-destructive"
                                                onClick={() => removeCcEmail(email.id)}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                            )}

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
                                <SelectTrigger>
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

                        {/* Opened At - Date and Time */}
                        <div className="space-y-2">
                            <Label htmlFor="opened_at">Opened At</Label>
                            <div className="flex gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant={"outline"}
                                            className={cn(
                                                "flex-1 justify-start text-left font-normal h-10",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={handleDateChange}
                                            initialFocus
                                            className="rounded-md border shadow-md"
                                            classNames={{
                                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 p-3",
                                                month: "space-y-4",
                                                caption: "flex justify-center pt-1 relative items-center h-10",
                                                caption_label: "text-base font-semibold",
                                                nav: "space-x-1 flex items-center",
                                                nav_button: cn(
                                                    "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100",
                                                    "hover:bg-accent rounded-md transition-colors"
                                                ),
                                                nav_button_previous: "absolute left-1",
                                                nav_button_next: "absolute right-1",
                                                table: "w-full border-collapse space-y-1",
                                                head_row: "flex",
                                                head_cell: "text-muted-foreground rounded-md w-10 font-normal text-sm",
                                                row: "flex w-full mt-2",
                                                cell: cn(
                                                    "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                                                    "[&:has([aria-selected])]:bg-accent",
                                                    "[&:has([aria-selected].day-outside)]:bg-accent/50",
                                                    "[&:has([aria-selected].day-range-end)]:rounded-r-md",
                                                    "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
                                                ),
                                                day: cn(
                                                    "h-10 w-10 p-0 font-normal aria-selected:opacity-100",
                                                    "hover:bg-accent hover:text-accent-foreground rounded-md transition-colors",
                                                    "focus:bg-accent focus:text-accent-foreground"
                                                ),
                                                day_range_end: "day-range-end",
                                                day_selected: cn(
                                                    "bg-primary text-primary-foreground",
                                                    "hover:bg-primary hover:text-primary-foreground",
                                                    "focus:bg-primary focus:text-primary-foreground"
                                                ),
                                                day_today: "bg-accent text-accent-foreground font-semibold",
                                                day_outside: cn(
                                                    "day-outside text-muted-foreground opacity-50",
                                                    "aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
                                                    "aria-selected:opacity-30"
                                                ),
                                                day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
                                                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                                                day_hidden: "invisible",
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <div className="relative flex-1">
                                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="time"
                                        value={time}
                                        onChange={(e) => handleTimeChange(e.target.value)}
                                        className="pl-10 h-10 w-full"
                                    />
                                </div>
                            </div>
                            {errors.opened_at && (
                                <p className="text-xs text-red-500">{errors.opened_at}</p>
                            )}
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select
                                value={data.priority || ""}
                                onValueChange={(value) => handleSelectChange("priority", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    {priorityOptions.map(priority => (
                                        <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.priority && (
                                <p className="text-xs text-red-500">{errors.priority}</p>
                            )}
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={data.status || ""}
                                onValueChange={(value) => handleSelectChange("status", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Open">Open</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.status && (
                                <p className="text-xs text-red-500">{errors.status}</p>
                            )}
                        </div>

                        {/* Assigned To */}
                        <div className="space-y-2">
                            <Label htmlFor="assigned_to">Assigned To</Label>
                            <Select
                                value={data.assigned_to?.toString() || ""}
                                onValueChange={(value) => handleSelectChange("assigned_to", parseInt(value))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select user" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((user: any) => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.assigned_to && (
                                <p className="text-xs text-red-500">{errors.assigned_to}</p>
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
                            className="min-h-[120px]"
                            placeholder="Detailed response or notes"
                        />
                        {errors.response && (
                            <p className="text-xs text-red-500">{errors.response}</p>
                        )}
                    </div>

                    {/* Image Upload Section */}
                    <div className="space-y-2">
                        <Label htmlFor="images">Attach Images</Label>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Input
                                    id="images"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('images')?.click()}
                                    className="w-full sm:w-auto"
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Images
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    {data.images && data.images.length > 0
                                        ? `${data.images.length} image(s) selected`
                                        : 'No images selected'}
                                </p>
                            </div>

                            {imagePreviews.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="relative group">
                                            <div className="aspect-square rounded-lg border overflow-hidden bg-muted">
                                                <img
                                                    src={preview}
                                                    alt={`Preview ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => removeImage(index)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center truncate">
                                                {data.images?.[index]?.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {imagePreviews.length === 0 && (
                                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        No images attached yet
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Click "Upload Images" to add screenshots or photos
                                    </p>
                                </div>
                            )}
                        </div>
                        {errors.images && (
                            <p className="text-xs text-red-500">{errors.images}</p>
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
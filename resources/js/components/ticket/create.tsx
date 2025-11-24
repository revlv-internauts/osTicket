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
import { CalendarIcon, UserIcon, Plus, X, Clock, Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Code, Quote, Underline as UnderlineIcon, Image as ImageIcon, Paperclip, Download, Trash2, File as FileIcon } from "lucide-react";
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
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TiptapImage from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';

type Ticket = {
    user_id: number;
    recipient?: number[] | null;
    cc?: number[] | null;
    ticket_source: string;
    help_topic: number;
    department: string;
    downtime?: string | null;
    assigned_to?: number | null;
    body?: string | null;
    status?: string | null;
    priority?: string | null;
    images?: File[];
};

type Props = {
    sourceOptions?: string[];
    departmentOptions?: string[];
    priorityOptions?: string[];
    redirectUrl?: string | null;
    onSuccess?: () => void;
};

const defaultSourceOptions = ["Email"];
const defaultDepartmentOptions = ["NOC"];
const defaultPriorityOptions = ["Low", "Medium", "High"];

const TicketCreate: React.FC<Props> = ({
    sourceOptions = defaultSourceOptions,
    departmentOptions = defaultDepartmentOptions,
    priorityOptions = defaultPriorityOptions,
    redirectUrl = "/tickets",
    onSuccess
}) => {
    const { auth, users = [], emails = [], helpTopics = [] } = usePage().props as any;
    const user = auth?.user;

    const { data, setData, post, processing, errors } = useForm<{
        user_id: number;
        recipient: number[];
        cc: number[];
        ticket_source: string;
        help_topic: number;
        department: string;
        downtime: string | null;
        assigned_to: number | null;
        body: string | null;
        status: string | null;
        priority: string | null;
        images: File[];
    }>({
        user_id: user?.id || 0,
        recipient: [] as number[],
        cc: [] as number[],
        ticket_source: "Email",
        help_topic: 0,
        department: "NOC",
        downtime: null,
        assigned_to: null,
        body: null,
        status: "Open",
        priority: null,
        images: [],
    });

    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [helpTopicDialogOpen, setHelpTopicDialogOpen] = useState(false);
    const [ccPopoverOpen, setCcPopoverOpen] = useState(false);
    const [recipientPopoverOpen, setRecipientPopoverOpen] = useState(false);
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

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Write your detailed response or notes here...',
            }),
            Underline,
            TiptapImage.configure({
                inline: true,
                allowBase64: true,
            }),
            Link.configure({
                openOnClick: false,
            }),
        ],
        content: data.body || '',
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4',
            },
        },
        onUpdate: ({ editor }) => {
            setData('body', editor.getHTML());
        },
    });

    useEffect(() => {
        if (user?.id) {
            setData("user_id", user.id);
        }
    }, [user]);

    const resetForm = () => {
        setData({
            user_id: user?.id || 0,
            recipient: [] as number[],
            cc: [] as number[],
            ticket_source: "Email",
            help_topic: 0,
            department: "NOC",
            downtime: null as string | null,
            assigned_to: null as number | null,
            body: null as string | null,
            status: "Open" as string | null,
            priority: null as string | null,
            images: [] as File[],
        });
        setDate(undefined);
        setTime("12:00");
        setFormErrors({});
        editor?.commands.setContent('');
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
            setData("downtime", format(dateTime, "yyyy-MM-dd'T'HH:mm:ss"));
        } else {
            setData("downtime", null);
        }
    };

    // Handle file attachment upload
    const handleEditorImageUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.jpeg,.jpg,.png,.gif,.pdf,.doc,.docx,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        input.multiple = true;
        
        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (!files) return;

            const currentImages = data.images || [];
            const newFiles: File[] = [];
            const allowedExtensions = ['jpeg', 'jpg', 'png', 'gif', 'pdf', 'doc', 'docx'];
            
            for (const file of Array.from(files)) {
                // Get file extension
                const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
                
                // Check file extension
                if (!allowedExtensions.includes(fileExtension)) {
                    toast.error(`File "${file.name}" is not a valid format. Only JPEG, JPG, PNG, GIF, PDF, DOC, and DOCX are allowed.`);
                    continue;
                }

                // Check individual file size (8MB)
                const maxFileSize = 8 * 1024 * 1024; // 8MB
                if (file.size > maxFileSize) {
                    toast.error(`File "${file.name}" exceeds 8MB limit.`);
                    continue;
                }
                
                newFiles.push(file);
            }

            if (newFiles.length === 0) {
                return;
            }
            
            // Check total size (8MB)
            const totalSize = [...currentImages, ...newFiles].reduce((sum, f) => sum + f.size, 0);
            const maxTotalSize = 8 * 1024 * 1024; // 8MB
            
            if (totalSize > maxTotalSize) {
                toast.error('Total file size exceeds 8MB limit. Please remove some files or select smaller files.');
                return;
            }

            setData("images", [...currentImages, ...newFiles]);
            toast.success(`${newFiles.length} file(s) added successfully`);
        };

        input.click();
    };

    // Handle file removal
    const removeAttachedFile = (index: number) => {
        const updatedFiles = data.images.filter((_, i) => i !== index);
        setData("images", updatedFiles);
        toast.success("File removed successfully");
    };

    // Handle file download
    const downloadFile = (file: File) => {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Get file icon based on extension
    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
            return '🖼️';
        } else if (ext === 'pdf') {
            return '📄';
        } else if (['doc', 'docx'].includes(ext || '')) {
            return '📝';
        }
        return '📎';
    };

    // Format file size for display
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const handleRecipientEmailToggle = (emailId: number) => {
        const currentRecipient = data.recipient || [];
        const isSelected = currentRecipient.includes(emailId);

        if (isSelected) {
            setData("recipient", currentRecipient.filter(id => id !== emailId));
        } else {
            setData("recipient", [...currentRecipient, emailId]);
        }
    };

    const removeRecipientEmail = (emailId: number) => {
        const currentRecipient = data.recipient || [];
        setData("recipient", currentRecipient.filter(id => id !== emailId));
    };

    const getSelectedRecipientEmails = () => {
        const currentRecipient = data.recipient || [];
        return emails.filter((email: any) => currentRecipient.includes(email.id));
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
        if (!data.recipient || data.recipient.length === 0) newErrors.recipient = true;
        if (!data.help_topic) newErrors.help_topic = true;
        if (!data.department) newErrors.department = true;
        if (!data.downtime) newErrors.downtime = true;
        if (!data.priority) newErrors.priority = true;
        if (!data.assigned_to) newErrors.assigned_to = true;
        if (!data.body || data.body.trim() === '' || data.body === '<p></p>') newErrors.body = true;
        if (!data.cc || data.cc.length === 0) newErrors.cc = true;

        setFormErrors(newErrors);
        
        if (Object.keys(newErrors).length > 0) {
            if (newErrors.recipient) toast.error("At least one Recipient Email is required");
            if (newErrors.ticket_source) toast.error("Ticket Source is required");
            if (newErrors.help_topic) toast.error("Help Topic is required");
            if (newErrors.department) toast.error("Department is required");
            if (newErrors.downtime) toast.error("Downtime date and time is required");
            if (newErrors.priority) toast.error("Priority is required");
            if (newErrors.assigned_to) toast.error("Assigned To is required");
            if (newErrors.body) toast.error("Body is required");
            if (newErrors.cc) toast.error("At least one CC email is required");
        }
        
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
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* User Information - Read Only */}
                        <div className="space-y-2">
                            <Label>Submitted By</Label>
                            <div className="flex items-center p-2 bg-muted rounded-md mt-3">
                                <UserIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>{user?.name || 'Loading user...'}</span>
                            </div>
                        </div>
                        
                        {/* Recipient Email - Multi Select */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="recipient" className={formErrors.recipient ? "text-red-500" : ""}>
                                    Recipient Emails (Multiple)*
                                </Label>
                                <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" type="button">
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add New
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Add New Email</DialogTitle>
                                            <DialogDescription>
                                                Add a new email address
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

                            <Popover open={recipientPopoverOpen} onOpenChange={setRecipientPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            formErrors.recipient && "border-red-500"
                                        )}
                                    >
                                        <span className="text-muted-foreground">
                                            {getSelectedRecipientEmails().length > 0
                                                ? `${getSelectedRecipientEmails().length} recipient(s) selected`
                                                : "Select recipient emails"}
                                        </span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                    <div className="max-h-64 overflow-y-auto">
                                        {emails.length > 0 ? (
                                            emails.map((email: any) => {
                                                const isSelected = (data.recipient || []).includes(email.id);
                                                return (
                                                    <div
                                                        key={email.id}
                                                        className={cn(
                                                            "flex items-center px-3 py-2 cursor-pointer hover:bg-muted",
                                                            isSelected && "bg-muted"
                                                        )}
                                                        onClick={() => handleRecipientEmailToggle(email.id)}
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

                            {getSelectedRecipientEmails().length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {getSelectedRecipientEmails().map((email: any) => (
                                        <Badge 
                                            key={email.id} 
                                            variant="secondary" 
                                            className="gap-1 pr-1"
                                        >
                                            <span>{email.email_address}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    removeRecipientEmail(email.id);
                                                }}
                                                className="ml-1 rounded-sm hover:bg-destructive/20 p-0.5"
                                            >
                                                <X className="h-3 w-3 hover:text-destructive" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            {formErrors.recipient && (
                                <p className="text-xs text-red-500">At least one Recipient Email is required</p>
                            )}
                            {errors.recipient && (
                                <p className="text-xs text-red-500">{errors.recipient}</p>
                            )}
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
                                    <DialogContent className="max-w-md">
                                        <DialogHeader>
                                            <DialogTitle className="text-lg">Add New Help Topic</DialogTitle>
                                            <DialogDescription className="text-sm">
                                                Create a new help topic category
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="new_help_topic_name" className="text-sm">Help Topic Name*</Label>
                                                <Input
                                                    id="new_help_topic_name"
                                                    type="text"
                                                    value={helpTopicForm.data.name}
                                                    onChange={(e) => helpTopicForm.setData('name', e.target.value)}
                                                    placeholder="Enter help topic name"
                                                    className="h-9"
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
                                                size="sm"
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
                            {formErrors.help_topic && (
                                <p className="text-xs text-red-500">Help Topic is required</p>
                            )}
                            {errors.help_topic && (
                                <p className="text-xs text-red-500">{errors.help_topic}</p>
                            )}
                        </div>


                        {/* CC Email - Multi Select */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="cc" className={formErrors.cc ? "text-red-500" : ""}>
                                    CC Emails (Multiple)*
                                </Label>
                                <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm" type="button">
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add New
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md">
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
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            formErrors.cc && "border-red-500"
                                        )}
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
                                        <Badge 
                                            key={email.id} 
                                            variant="secondary" 
                                            className="gap-1 pr-1"
                                        >
                                            <span>{email.email_address}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    removeCcEmail(email.id);
                                                }}
                                                className="ml-1 rounded-sm hover:bg-destructive/20 p-0.5"
                                            >
                                                <X className="h-3 w-3 hover:text-destructive" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {formErrors.cc && (
                                <p className="text-xs text-red-500">At least one CC email is required</p>
                            )}
                            {errors.cc && (
                                <p className="text-xs text-red-500">{errors.cc}</p>
                            )}
                        </div>

                        {/* Assigned To */}
                        <div className="space-y-2">
                            <Label 
                                htmlFor="assigned_to" 
                                className={formErrors.assigned_to ? "text-red-500" : ""}
                            >
                                Assigned To*
                            </Label>
                            <Select
                                value={data.assigned_to?.toString() || ""}
                                onValueChange={(value) => handleSelectChange("assigned_to", parseInt(value))}
                            >
                                <SelectTrigger className={formErrors.assigned_to ? "border-red-500" : ""}>
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
                            {formErrors.assigned_to && (
                                <p className="text-xs text-red-500">Assigned To is required</p>
                            )}
                            {errors.assigned_to && (
                                <p className="text-xs text-red-500">{errors.assigned_to}</p>
                            )}
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                            <Label 
                                htmlFor="priority" 
                                className={formErrors.priority ? "text-red-500" : ""}
                            >
                                Priority*
                            </Label>
                            <Select
                                value={data.priority || ""}
                                onValueChange={(value) => handleSelectChange("priority", value)}
                            >
                                <SelectTrigger className={formErrors.priority ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    {priorityOptions.map(priority => (
                                        <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {formErrors.priority && (
                                <p className="text-xs text-red-500">Priority is required</p>
                            )}
                            {errors.priority && (
                                <p className="text-xs text-red-500">{errors.priority}</p>
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


                        {/* Downtime - Date and Time */}
                        <div className="space-y-2">
                            <Label 
                                htmlFor="downtime" 
                                className={formErrors.downtime ? "text-red-500" : ""}
                            >
                                Downtime*
                            </Label>
                            <div className="flex gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant={"outline"}
                                            className={cn(
                                                "flex-1 justify-start text-left font-normal h-10",
                                                !date && "text-muted-foreground",
                                                formErrors.downtime && "border-red-500"
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
                                            disabled={(date) => date > new Date()}
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
                                        className={cn(
                                            "pl-10 h-10 w-full",
                                            formErrors.downtime && "border-red-500"
                                        )}
                                    />
                                </div>
                            </div>
                            {formErrors.downtime && (
                                <p className="text-xs text-red-500">Downtime date and time is required</p>
                            )}
                            {errors.downtime && (
                                <p className="text-xs text-red-500">{errors.downtime}</p>
                            )}
                        </div>

                    </div>

                    {/* File Attachments Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="attachments">
                                Attachments
                            </Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleEditorImageUpload}
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add File
                            </Button>
                        </div>

                        {data.images && data.images.length > 0 ? (
                            <div className="border rounded-lg bg-muted/30 p-4">
                                <div className="space-y-2">
                                    {data.images.map((file, index) => (
                                        <div
                                            key={`${file.name}-${index}`}
                                            className="flex items-center justify-between bg-background border rounded-md p-3 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <span className="text-lg">{getFileIcon(file.name)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => downloadFile(file)}
                                                    title="Download file"
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeAttachedFile(index)}
                                                    title="Remove file"
                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                                    Total: {data.images.length} file(s) • {formatFileSize(data.images.reduce((sum, f) => sum + f.size, 0))}
                                </p>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed rounded-lg p-6 text-center">
                                <Paperclip className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                <p className="text-sm text-muted-foreground">No files attached yet</p>
                                <p className="text-xs text-muted-foreground mt-1">Click "Add File" to attach images or documents</p>
                            </div>
                        )}
                    </div>

                    {/* Body - Tiptap Editor */}
                    <div className="space-y-2">
                        <Label 
                            htmlFor="body" 
                            className={formErrors.body ? "text-red-500" : ""}
                        >
                            Body*
                        </Label>
                        
                        {/* Toolbar */}
                        <div className={cn(
                            "border rounded-t-lg bg-muted/50 p-2 flex flex-wrap gap-1",
                            formErrors.body && "border-red-500"
                        )}>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => editor?.chain().focus().toggleBold().run()}
                                className={editor?.isActive('bold') ? 'bg-muted' : ''}
                            >
                                <Bold className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => editor?.chain().focus().toggleItalic().run()}
                                className={editor?.isActive('italic') ? 'bg-muted' : ''}
                            >
                                <Italic className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                                className={editor?.isActive('underline') ? 'bg-muted' : ''}
                            >
                                <UnderlineIcon className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                                className={editor?.isActive('heading', { level: 1 }) ? 'bg-muted' : ''}
                            >
                                <Heading1 className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                                className={editor?.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}
                            >
                                <Heading2 className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                                className={editor?.isActive('heading', { level: 3 }) ? 'bg-muted' : ''}
                            >
                                <Heading3 className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Editor */}
                        <div className={cn(
                            "border rounded-b-lg bg-background",
                            formErrors.body && "border-red-500"
                        )}>
                            <style>{`
                                .ProseMirror {
                                    outline: none;
                                }
                                .ProseMirror p {
                                    margin-bottom: 1em;
                                }
                                .ProseMirror p:last-child {
                                    margin-bottom: 0;
                                }
                                .ProseMirror h1 {
                                    font-size: 2em;
                                    font-weight: bold;
                                    margin-bottom: 0.5em;
                                }
                                .ProseMirror h2 {
                                    font-size: 1.5em;
                                    font-weight: bold;
                                    margin-bottom: 0.5em;
                                }
                                .ProseMirror h3 {
                                    font-size: 1.25em;
                                    font-weight: bold;
                                    margin-bottom: 0.5em;
                                }
                                .ProseMirror ul, .ProseMirror ol {
                                    padding-left: 2em;
                                    margin-bottom: 1em;
                                }
                                .ProseMirror li {
                                    margin-bottom: 0.25em;
                                }
                                .ProseMirror strong {
                                    font-weight: bold;
                                }
                                .ProseMirror em {
                                    font-style: italic;
                                }
                                .ProseMirror u {
                                    text-decoration: underline;
                                }
                                .ProseMirror code {
                                    background-color: rgba(0, 0, 0, 0.05);
                                    padding: 0.2em 0.4em;
                                    border-radius: 3px;
                                    font-family: monospace;
                                }
                                .ProseMirror pre {
                                    background-color: rgba(0, 0, 0, 0.05);
                                    padding: 1em;
                                    border-radius: 5px;
                                    overflow-x: auto;
                                    margin-bottom: 1em;
                                }
                                .ProseMirror pre code {
                                    background: none;
                                    padding: 0;
                                }
                                .ProseMirror blockquote {
                                    border-left: 3px solid #ccc;
                                    padding-left: 1em;
                                    margin-left: 0;
                                    margin-bottom: 1em;
                                    color: #666;
                                }
                                .ProseMirror a {
                                    color: #3b82f6;
                                    text-decoration: underline;
                                    cursor: pointer;
                                }
                                .ProseMirror a:hover {
                                    color: #2563eb;
                                }
                                .ProseMirror p.is-editor-empty:first-child::before {
                                    color: #adb5bd;
                                    content: attr(data-placeholder);
                                    float: left;
                                    height: 0;
                                    pointer-events: none;
                                }
                            `}</style>
                            <EditorContent editor={editor} />
                        </div>
                        {formErrors.body && (
                            <p className="text-xs text-red-500">Body is required</p>
                        )}
                        {errors.body && (
                            <p className="text-xs text-red-500">{errors.body}</p>
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
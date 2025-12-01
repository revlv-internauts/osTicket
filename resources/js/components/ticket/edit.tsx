import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Bold, Italic, Heading1, Heading2, Heading3, Underline as UnderlineIcon, Paperclip, Download, Trash2, Plus, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { router, usePage } from "@inertiajs/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TiptapImage from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type TicketFormData = {
    body?: string | null;
    status?: string | null;
    assigned_to?: number | null;
    priority?: string | null;
    images?: File[];
};

type TicketAttachment = {
    id: number;
    original_filename: string;
    filename: string;
    path: string;
    mime_type: string;
    size: number;
    created_at?: string;
};

type TicketData = {
    id: number;
    ticket_name: string;
    user_id: number;
    recipient?: string | null;
    recipient_emails?: Array<{ id: number; email_address: string; name?: string }>;
    cc?: number[] | null;
    ticket_source: string;
    help_topic: number;
    department: string;
    downtime?: string | null;
    opened_by?: number | null;
    uptime?: string | null;
    closed_by?: number | null;
    assigned_to?: number | null;
    body?: string | null;
    status?: string | null;
    priority?: string | null;
    created_at: string;
    updated_at: string;
    user?: { id: number; name: string };
    opened_by_user?: { id: number; name: string };
    closed_by_user?: { id: number; name: string };
    cc_emails?: Array<{ id: number; email_address: string; name?: string }>;
    help_topic_relation?: { id: number; name: string };
    assigned_to_user?: { id: number; name: string };
    attachments?: TicketAttachment[];
};

type Props = {
    ticket: TicketData;
    redirectUrl?: string | null;
    onSuccess?: () => void;
    mode?: 'update' | 'close' | 'reopen' | null;
    canEdit?: boolean;
};

const TicketEdit: React.FC<Props> = ({
    ticket,
    redirectUrl = "/ticket",
    onSuccess,
    mode = null,
    canEdit = true
}) => {
    const { users = [] } = usePage().props as any;
    
    const [data, setData] = useState<TicketFormData>({
        body: ticket.body,
        status: ticket.status,
        assigned_to: ticket.assigned_to,
        priority: ticket.priority,
        images: [] as File[],
    });

    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [attachmentsToDelete, setAttachmentsToDelete] = useState<number[]>([]);
    const [isBodyExpanded, setIsBodyExpanded] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [statusAction, setStatusAction] = useState<'close' | 'reopen' | null>(null);

    const isTicketClosed = ticket.status === 'Closed';

    // Check if body content is long (more than 500 characters)
    const isBodyLong = (ticket.body?.length || 0) > 500;
    const displayBody = isBodyExpanded || !isBodyLong 
        ? ticket.body 
        : ticket.body?.substring(0, 500) + '...';

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Add your detailed body or notes here...',
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
        editable: !isTicketClosed,
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4',
            },
        },
        onUpdate: ({ editor }) => {
            setData(prev => ({ ...prev, body: editor.getHTML() }));
        },
    });

    useEffect(() => {
        if (editor) {
            editor.setEditable(!isTicketClosed);
        }
    }, [isTicketClosed, editor]);

    const handleEditorFileUpload = () => {
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
                const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
                
                if (!allowedExtensions.includes(fileExtension)) {
                    toast.error(`File "${file.name}" is not a valid format. Only JPEG, JPG, PNG, GIF, PDF, DOC, and DOCX are allowed.`);
                    continue;
                }

                const maxFileSize = 8 * 1024 * 1024;
                if (file.size > maxFileSize) {
                    toast.error(`File "${file.name}" exceeds 8MB limit.`);
                    continue;
                }
                
                newFiles.push(file);
            }

            if (newFiles.length === 0) {
                return;
            }
            
            const totalSize = [...currentImages, ...newFiles].reduce((sum, f) => sum + f.size, 0);
            const maxTotalSize = 8 * 1024 * 1024;
            
            if (totalSize > maxTotalSize) {
                toast.error('Total file size exceeds 8MB limit. Please remove some files or select smaller files.');
                return;
            }

            setData(prev => ({ ...prev, images: [...currentImages, ...newFiles] }));
            toast.success(`${newFiles.length} file(s) added successfully`);
        };

        input.click();
    };

    const removeNewFile = (index: number) => {
        setData(prev => ({
            ...prev,
            images: (prev.images || []).filter((_, i) => i !== index)
        }));
        toast.success("File removed successfully");
    };

    const removeAttachment = (attachmentId: number) => {
        setAttachmentsToDelete(prev => [...prev, attachmentId]);
        toast.success("Attachment marked for deletion");
    };

    const downloadFile = (file: File | TicketAttachment) => {
        if (file instanceof File) {
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            const downloadUrl = `/tickets/${ticket.id}/attachments/${file.id}/download`;
            window.location.href = downloadUrl;
        }
    };

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

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const handleSuccess = () => {
        setProcessing(false);
        setData(prev => ({ ...prev, images: [] }));
        setAttachmentsToDelete([]);
        
        if (onSuccess) {
            onSuccess();
        } else if (redirectUrl) {
            router.visit(redirectUrl, {
                preserveScroll: true,
            });
        } else {
            router.visit('/ticket', {
                preserveScroll: true,
            });
        }
    };

    const handleError = (errs: any) => {
        setProcessing(false);
        setErrors(errs as any);
        console.error(errs);
        if (errs && typeof errs === 'object') {
            Object.values(errs).forEach((m: any) => {
                if (m) toast.error(String(m));
            });
        }
    };

    const openStatusDialog = (action: 'close' | 'reopen') => {
        setStatusAction(action);
        setStatusDialogOpen(true);
    };

    const closeStatusDialog = () => {
        setStatusDialogOpen(false);
        setStatusAction(null);
    };

    const confirmStatusChange = () => {
        if (!statusAction) return;

        setProcessing(true);
        setStatusDialogOpen(false);
        
        const route = statusAction === 'close' ? 'close' : 'reopen';
        
        router.patch(`/tickets/${ticket.id}/${route}`, {}, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Ticket ${statusAction === 'close' ? 'closed' : 'reopened'} successfully!`);
                setStatusAction(null);
                handleSuccess();
            },
            onError: (errs) => {
                setStatusAction(null);
                handleError(errs);
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        const formData = new FormData();
        formData.append('_method', 'PUT');
        
        if (data.body) formData.append('body', data.body);
        if (data.assigned_to) formData.append('assigned_to', data.assigned_to.toString());
        if (data.priority) formData.append('priority', data.priority);
        
        if (data.images && data.images.length > 0) {
            data.images.forEach((image, index) => {
                formData.append(`images[${index}]`, image);
            });
        }

        if (attachmentsToDelete.length > 0) {
            formData.append('delete_attachments', JSON.stringify(attachmentsToDelete));
        }

        router.post(`/tickets/${ticket.id}`, formData, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Ticket updated successfully!");
                handleSuccess();
            },
            onError: handleError
        });
    };

    return (
        <>
            <Card className="w-full">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Ticket Details</CardTitle>
                            <CardDescription>
                                Viewing ticket: {ticket.ticket_name}
                            </CardDescription>
                        </div>
                        <Badge variant={isTicketClosed ? 'secondary' : 'default'} className="text-sm">
                            {ticket.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Ticket Number</Label>
                                <div className="p-2 bg-muted rounded-md">
                                    <span className="font-semibold">{ticket.ticket_name}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Submitted By:</Label>
                                <div className="p-2 bg-muted rounded-md">
                                    <span>{ticket.user?.name || 'Unknown'}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Ticket Source</Label>
                                <div className="p-2 bg-muted rounded-md">
                                    <span>{ticket.ticket_source}</span>
                                </div>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>To:</Label>
                                {ticket.recipient_emails && ticket.recipient_emails.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {ticket.recipient_emails.map((email: any) => (
                                            <Badge key={email.id} variant="secondary">
                                                {email.email_address}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-2 bg-muted rounded-md">
                                        <span className="text-muted-foreground text-sm">No recipients</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label>CC Emails</Label>
                                {ticket.cc_emails && ticket.cc_emails.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {ticket.cc_emails.map((email: any) => (
                                            <Badge key={email.id} variant="secondary">
                                                {email.email_address}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-2 bg-muted rounded-md">
                                        <span className="text-muted-foreground text-sm">No CC emails</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Help Topic</Label>
                                <div className="p-2 bg-muted rounded-md">
                                    <span>{ticket.help_topic_relation?.name || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Department</Label>
                                <div className="p-2 bg-muted rounded-md">
                                    <span>{ticket.department}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Downtime</Label>
                                <div className="p-2 bg-muted rounded-md">
                                    <span>
                                        {ticket.downtime 
                                            ? format(parseISO(ticket.downtime), "PPP p")
                                            : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Opened By</Label>
                                <div className="p-2 bg-muted rounded-md">
                                    <span>{ticket.opened_by_user?.name || 'N/A'}</span>
                                </div>
                            </div>

                            {ticket.uptime && (
                                <div className="space-y-2">
                                    <Label>Uptime</Label>
                                    <div className="p-2 bg-muted rounded-md">
                                        <span>
                                            {format(parseISO(ticket.uptime), "PPP p")}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {ticket.closed_by_user && (
                                <div className="space-y-2">
                                    <Label>Closed By</Label>
                                    <div className="p-2 bg-muted rounded-md">
                                        <span>{ticket.closed_by_user.name}</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={data.priority || ""}
                                    onValueChange={(value) => setData(prev => ({ ...prev, priority: value }))}
                                    disabled={isTicketClosed}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Low">Low</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.priority && (
                                    <p className="text-xs text-red-500">{errors.priority}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="assigned_to">Assigned To</Label>
                                <Select
                                    value={data.assigned_to?.toString() || ""}
                                    onValueChange={(value) => setData(prev => ({ ...prev, assigned_to: parseInt(value) }))}
                                    disabled={isTicketClosed}
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

                        {/* Original Ticket Body with See More/Less */}
                        {ticket.body && (
                            <div className="space-y-2">
                                <Label>Original Ticket Description</Label>
                                <div className="border rounded-lg bg-muted/30 p-4">
                                    <div 
                                        className="prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: displayBody || '' }}
                                    />
                                    {isBodyLong && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsBodyExpanded(!isBodyExpanded)}
                                            className="mt-3 w-full text-primary hover:text-primary hover:bg-primary/10"
                                        >
                                            {isBodyExpanded ? (
                                                <>
                                                    <ChevronUp className="h-4 w-4 mr-1" />
                                                    See Less
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="h-4 w-4 mr-1" />
                                                    See More
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="body">Add/Edit Body</Label>
                            
                            {!isTicketClosed && (
                                <div className="border rounded-t-lg bg-muted/50 p-2 flex flex-wrap gap-1">
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
                            )}

                            <div className={`border ${!isTicketClosed ? 'rounded-b-lg' : 'rounded-lg'} bg-background`}>
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
                            {errors.body && (
                                <p className="text-xs text-red-500">{errors.body}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="attachments">
                                    Attachments
                                </Label>
                                {!isTicketClosed && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleEditorFileUpload}
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add File
                                    </Button>
                                )}
                            </div>

                            {(ticket.attachments && ticket.attachments.length > 0 || (data.images && data.images.length > 0)) ? (
                                <div className="border rounded-lg bg-muted/30 p-4">
                                    {ticket.attachments && ticket.attachments.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-muted-foreground mb-3">Existing Attachments</p>
                                            {ticket.attachments
                                                .filter(att => !attachmentsToDelete.includes(att.id))
                                                .map((attachment) => (
                                                    <div
                                                        key={attachment.id}
                                                        className="flex items-center justify-between bg-background border rounded-md p-3 hover:bg-muted/50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <span className="text-lg">{getFileIcon(attachment.original_filename)}</span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{attachment.original_filename}</p>
                                                                <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => downloadFile(attachment)}
                                                                title="Download file"
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                            {!isTicketClosed && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeAttachment(attachment.id)}
                                                                    title="Remove file"
                                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            {ticket.attachments.length > 0 && attachmentsToDelete.length > 0 && (
                                                <p className="text-xs text-muted-foreground pt-2 border-t mt-2">
                                                    {attachmentsToDelete.length} attachment(s) marked for deletion
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {data.images && data.images.length > 0 && (
                                        <div className="space-y-2 mt-3 pt-3 border-t">
                                            <p className="text-xs font-semibold text-muted-foreground">New Files</p>
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
                                                            onClick={() => removeNewFile(index)}
                                                            title="Remove file"
                                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                                        Total: {(ticket.attachments?.filter(att => !attachmentsToDelete.includes(att.id)) || []).length + (data.images?.length || 0)} file(s) • {formatFileSize(
                                            (ticket.attachments?.filter(att => !attachmentsToDelete.includes(att.id)) || []).reduce((sum, f) => sum + f.size, 0) +
                                            (data.images?.reduce((sum, f) => sum + f.size, 0) || 0)
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                                    <Paperclip className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                    <p className="text-sm text-muted-foreground">No files attached yet</p>
                                    {!isTicketClosed && (
                                        <p className="text-xs text-muted-foreground mt-1">Click "Add File" to attach images or documents</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-end">
                    {canEdit ? (
                        <div className="flex gap-2">
                            {mode === 'update' && (
                                <Button
                                    onClick={handleSubmit}
                                    type="button"
                                    disabled={processing}
                                >
                                    {processing ? "Updating..." : "Update Ticket"}
                                </Button>
                            )}
                            {mode === 'close' && (
                                <Button
                                    variant="destructive"
                                    onClick={() => openStatusDialog('close')}
                                    type="button"
                                    disabled={processing}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Close Ticket
                                </Button>
                            )}
                            {mode === 'reopen' && (
                                <Button
                                    variant="default"
                                    onClick={() => openStatusDialog('reopen')}
                                    type="button"
                                    disabled={processing}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Reopen Ticket
                                </Button>
                            )}
                            {!mode && (
                                <>
                                    {isTicketClosed ? (
                                        <Button
                                            variant="default"
                                            onClick={() => openStatusDialog('reopen')}
                                            type="button"
                                            disabled={processing}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            {processing ? "Reopening..." : "Reopen Ticket"}
                                        </Button>
                                    ) : (
                                        <>                            
                                            <Button
                                                onClick={handleSubmit}
                                                type="button"
                                                disabled={processing}
                                            >
                                                {processing ? "Updating..." : "Update Ticket"}
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={() => openStatusDialog('close')}
                                                type="button"
                                                disabled={processing}
                                            >
                                                <XCircle className="h-4 w-4 mr-2" />
                                                {processing ? "Closing..." : "Close Ticket"}
                                            </Button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">You do not have permission to edit this ticket.</p>
                    )}
                </CardFooter>
            </Card>

            {/* Status Change Confirmation Dialog */}
            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            Confirm Status Change
                        </DialogTitle>
                        <DialogDescription>
                            {statusAction === 'close' ? (
                                <>
                                    Are you sure you want to <strong>close</strong> this ticket?
                                    <br />
                                    <span className="text-sm mt-2 block">
                                        Ticket: <strong>{ticket.ticket_name}</strong>
                                    </span>
                                    <span className="text-xs text-muted-foreground mt-1 block">
                                        This action will mark the ticket as resolved and notify all relevant parties.
                                    </span>
                                </>
                            ) : (
                                <>
                                    Are you sure you want to <strong>reopen</strong> this ticket?
                                    <br />
                                    <span className="text-sm mt-2 block">
                                        Ticket: <strong>{ticket.ticket_name}</strong>
                                    </span>
                                    <span className="text-xs text-muted-foreground mt-1 block">
                                        This action will change the ticket status back to open and notify all relevant parties.
                                    </span>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={closeStatusDialog}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={statusAction === 'close' ? 'destructive' : 'default'}
                            onClick={confirmStatusChange}
                            disabled={processing}
                        >
                            {processing ? (
                                statusAction === 'close' ? 'Closing...' : 'Reopening...'
                            ) : (
                                <>
                                    {statusAction === 'close' ? (
                                        <><XCircle className="h-4 w-4 mr-2" />Close Ticket</>
                                    ) : (
                                        <><CheckCircle className="h-4 w-4 mr-2" />Reopen Ticket</>
                                    )}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default TicketEdit;


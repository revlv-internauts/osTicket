import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Code, Quote, Underline as UnderlineIcon, Image as ImageIcon, Paperclip, Download, Trash2, File as FileIcon, Plus } from "lucide-react";
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
    redirectUrl = "/tickets",
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

    const isTicketClosed = ticket.status === 'Closed';

    // Tiptap editor for body editing
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

    // Update editor editability when ticket status changes
    useEffect(() => {
        if (editor) {
            editor.setEditable(!isTicketClosed);
        }
    }, [isTicketClosed, editor]);

    // Handle file attachment upload
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

            // Add to images array for upload
            setData(prev => ({ ...prev, images: [...currentImages, ...newFiles] }));
            toast.success(`${newFiles.length} file(s) added successfully`);
        };

        input.click();
    };

    // Handle new file removal (before upload)
    const removeNewFile = (index: number) => {
        setData(prev => ({
            ...prev,
            images: (prev.images || []).filter((_, i) => i !== index)
        }));
        toast.success("File removed successfully");
    };

    // Handle existing attachment deletion
    const removeAttachment = (attachmentId: number) => {
        setAttachmentsToDelete(prev => [...prev, attachmentId]);
        toast.success("Attachment marked for deletion");
    };

    // Handle file download
    const downloadFile = (file: File | TicketAttachment) => {
        if (file instanceof File) {
            // New file (not yet uploaded)
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            // Existing attachment
            const downloadUrl = `/tickets/${ticket.id}/attachments/${file.id}/download`;
            window.location.href = downloadUrl;
        }
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



    const handleCloseTicket = () => {
        setProcessing(true);
        const formData = new FormData();
        formData.append('_method', 'PUT');
        formData.append('body', data.body || '');
        formData.append('status', 'Closed');
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
            onSuccess: () => {
                setProcessing(false);
                setData(prev => ({ ...prev, images: [] }));
                setAttachmentsToDelete([]);
                toast.success("Ticket closed successfully!");

                if (onSuccess) {
                    onSuccess();
                } else if (redirectUrl) {
                    router.visit(redirectUrl);
                }
            },
            onError: (errs) => {
                setProcessing(false);
                setErrors(errs as any);
                console.error(errs);
                if (errs && typeof errs === 'object') {
                    Object.values(errs).forEach((m: any) => {
                        if (m) toast.error(String(m));
                    });
                }
            }
        });
    };

    const handleReopenTicket = () => {
        setProcessing(true);
        const formData = new FormData();
        formData.append('_method', 'PUT');
        formData.append('body', data.body || '');
        formData.append('status', 'Open');
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
            onSuccess: () => {
                setProcessing(false);
                setData(prev => ({ ...prev, images: [] }));
                setAttachmentsToDelete([]);
                toast.success("Ticket reopened successfully!");

                if (onSuccess) {
                    onSuccess();
                } else if (redirectUrl) {
                    router.visit(redirectUrl);
                }
            },
            onError: (errs) => {
                setProcessing(false);
                setErrors(errs as any);
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
        setProcessing(true);

        const formData = new FormData();
        formData.append('_method', 'PUT');
        formData.append('body', data.body || '');
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
            onSuccess: () => {
                setProcessing(false);
                setData(prev => ({ ...prev, images: [] }));
                setAttachmentsToDelete([]);
                toast.success("Ticket updated successfully!");

                if (onSuccess) {
                    onSuccess();
                } else if (redirectUrl) {
                    router.visit(redirectUrl);
                }
            },
            onError: (errs) => {
                setProcessing(false);
                setErrors(errs as any);
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
                        {/* Ticket Name - Read Only */}
                        <div className="space-y-2">
                            <Label>Ticket Number</Label>
                            <div className="p-2 bg-muted rounded-md">
                                <span className="font-semibold">{ticket.ticket_name}</span>
                            </div>
                        </div>

                        {/* Submitted By - Read Only */}
                        <div className="space-y-2">
                            <Label>Submitted By:</Label>
                            <div className="p-2 bg-muted rounded-md">
                                <span>{ticket.user?.name || 'Unknown'}</span>
                            </div>
                        </div>

                        {/* Ticket Source - Read Only */}
                        <div className="space-y-2">
                            <Label>Ticket Source</Label>
                            <div className="p-2 bg-muted rounded-md">
                                <span>{ticket.ticket_source}</span>
                            </div>
                        </div>

                        {/* Recipient - Read Only */}
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
                      
                       

                        {/* CC Emails - Read Only */}
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
                        {/* Help Topic - Read Only */}
                        <div className="space-y-2">
                            <Label>Help Topic</Label>
                            <div className="p-2 bg-muted rounded-md">
                                <span>{ticket.help_topic_relation?.name || 'N/A'}</span>
                            </div>
                        </div>
                        {/* Department - Read Only */}
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <div className="p-2 bg-muted rounded-md">
                                <span>{ticket.department}</span>
                            </div>
                        </div>

                        {/* Downtime - Read Only */}
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

                        {/* Opened By - Read Only */}
                        <div className="space-y-2">
                            <Label>Opened By</Label>
                            <div className="p-2 bg-muted rounded-md">
                                <span>{ticket.opened_by_user?.name || 'N/A'}</span>
                            </div>
                        </div>

                        {/* Uptime - Read Only */}
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

                        {/* Closed By - Read Only */}
                        {ticket.closed_by_user && (
                            <div className="space-y-2">
                                <Label>Closed By</Label>
                                <div className="p-2 bg-muted rounded-md">
                                    <span>{ticket.closed_by_user.name}</span>
                                </div>
                            </div>
                        )}

                        



                        {/* Priority - Editable */}
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

                        {/* Assigned To - Editable */}
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

                    {/* Body - Tiptap Editor */}
                    <div className="space-y-2">
                        <Label htmlFor="body">Add/Edit Body</Label>
                        
                        {/* Toolbar */}
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

                        {/* Editor */}
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

                    {/* File Attachments Section */}
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

                        {/* Existing Attachments */}
                        {(ticket.attachments && ticket.attachments.length > 0 || (data.images && data.images.length > 0)) ? (
                            <div className="border rounded-lg bg-muted/30 p-4">
                                {/* Display existing attachments */}
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

                                {/* Display new files to be uploaded */}
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
                                type="submit"
                                disabled={processing}
                            >
                                {processing ? "Updating..." : "Update Ticket"}
                            </Button>
                        )}
                        {mode === 'close' && (
                            <Button
                                variant="destructive"
                                onClick={handleCloseTicket}
                                type="button"
                                disabled={processing}
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                {processing ? "Closing..." : "Close Ticket"}
                            </Button>
                        )}
                        {mode === 'reopen' && (
                            <Button
                                variant="default"
                                onClick={handleReopenTicket}
                                type="button"
                                disabled={processing}
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {processing ? "Reopening..." : "Reopen Ticket"}
                            </Button>
                        )}
                        {!mode && (
                            <>
                                {isTicketClosed ? (
                                    <Button
                                        variant="default"
                                        onClick={handleReopenTicket}
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
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing ? "Updating..." : "Update Body"}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={handleCloseTicket}
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
    );
};

export default TicketEdit;
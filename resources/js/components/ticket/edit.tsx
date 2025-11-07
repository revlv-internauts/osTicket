import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Code, Quote, Underline as UnderlineIcon, Image as ImageIcon, Paperclip } from "lucide-react";
import { format, parseISO } from "date-fns";
import { router } from "@inertiajs/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TiptapImage from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';

type TicketFormData = {
    response?: string | null;
    status?: string | null;
    images?: File[];
};

type TicketData = {
    id: number;
    ticket_name: string;
    user_id: number;
    cc?: number[] | null;
    ticket_source: string;
    help_topic: number;
    department: string;
    sla_plan?: string | null;
    opened_at?: string | null;
    opened_by?: number | null;
    closed_at?: string | null;
    closed_by?: number | null;
    assigned_to?: number | null;
    response?: string | null;
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
};

type Props = {
    ticket: TicketData;
    redirectUrl?: string | null;
    onSuccess?: () => void;
};

const TicketEdit: React.FC<Props> = ({
    ticket,
    redirectUrl = "/tickets",
    onSuccess
}) => {
    const [data, setData] = useState<TicketFormData>({
        response: ticket.response,
        status: ticket.status,
        images: [] as File[],
    });

    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const isTicketClosed = ticket.status === 'Closed';

    // Tiptap editor for response editing
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Add your detailed response or notes here...',
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
        content: data.response || '',
        editable: !isTicketClosed,
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4',
            },
        },
        onUpdate: ({ editor }) => {
            setData(prev => ({ ...prev, response: editor.getHTML() }));
        },
    });

    // Update editor editability when ticket status changes
    useEffect(() => {
        if (editor) {
            editor.setEditable(!isTicketClosed);
        }
    }, [isTicketClosed, editor]);

    // Handle image upload to editor
    const handleEditorImageUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        
        input.onchange = async (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (!files) return;

            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64 = e.target?.result as string;
                    editor?.chain().focus().setImage({ src: base64 }).run();
                };
                reader.readAsDataURL(file);

                // Also add to images array for upload
                const currentImages = data.images || [];
                setData(prev => ({ ...prev, images: [...currentImages, file] }));
            });
        };

        input.click();
    };

    // Handle file attachment to editor
    const handleEditorFileUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '*/*';
        input.multiple = true;
        
        input.onchange = async (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (!files) return;

            Array.from(files).forEach(file => {
                // Add file as a link in the editor
                const fileName = file.name;
                const fileSize = (file.size / 1024).toFixed(2) + ' KB';
                editor?.chain().focus().insertContent(`<p>📎 <a href="#">${fileName}</a> (${fileSize})</p>`).run();

                // Add to images array for upload
                const currentImages = data.images || [];
                setData(prev => ({ ...prev, images: [...currentImages, file] }));
            });
        };

        input.click();
    };

    const handleCloseTicket = () => {
        setProcessing(true);
        const formData = new FormData();
        formData.append('_method', 'PUT');
        formData.append('response', data.response || '');
        formData.append('status', 'Closed');
        
        if (data.images && data.images.length > 0) {
            data.images.forEach((image, index) => {
                formData.append(`images[${index}]`, image);
            });
        }

        router.post(`/tickets/${ticket.id}`, formData, {
            onSuccess: () => {
                setProcessing(false);
                setData(prev => ({ ...prev, images: [] }));
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
        formData.append('response', data.response || '');
        formData.append('status', 'Open');
        
        if (data.images && data.images.length > 0) {
            data.images.forEach((image, index) => {
                formData.append(`images[${index}]`, image);
            });
        }

        router.post(`/tickets/${ticket.id}`, formData, {
            onSuccess: () => {
                setProcessing(false);
                setData(prev => ({ ...prev, images: [] }));
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
        formData.append('response', data.response || '');
        
        if (data.images && data.images.length > 0) {
            data.images.forEach((image, index) => {
                formData.append(`images[${index}]`, image);
            });
        }

        router.post(`/tickets/${ticket.id}`, formData, {
            onSuccess: () => {
                setProcessing(false);
                setData(prev => ({ ...prev, images: [] }));
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
                            <Label>Submitted By</Label>
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

                        {/* Help Topic - Read Only */}
                        <div className="space-y-2">
                            <Label>Help Topic</Label>
                            <div className="p-2 bg-muted rounded-md">
                                <span>{ticket.help_topic_relation?.name || 'N/A'}</span>
                            </div>
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

                        {/* Department - Read Only */}
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <div className="p-2 bg-muted rounded-md">
                                <span>{ticket.department}</span>
                            </div>
                        </div>

                        {/* SLA Plan - Read Only */}
                        <div className="space-y-2">
                            <Label>SLA Plan</Label>
                            <div className="p-2 bg-muted rounded-md">
                                <span>{ticket.sla_plan || 'N/A'}</span>
                            </div>
                        </div>

                        {/* Opened At - Read Only */}
                        <div className="space-y-2">
                            <Label>Opened At</Label>
                            <div className="p-2 bg-muted rounded-md">
                                <span>
                                    {ticket.opened_at 
                                        ? format(parseISO(ticket.opened_at), "PPP p")
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

                        {/* Closed At - Read Only */}
                        {ticket.closed_at && (
                            <div className="space-y-2">
                                <Label>Closed At</Label>
                                <div className="p-2 bg-muted rounded-md">
                                    <span>
                                        {format(parseISO(ticket.closed_at), "PPP p")}
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

                        {/* Priority - Read Only */}
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <div className="p-2 bg-muted rounded-md">
                                <span>{ticket.priority || 'N/A'}</span>
                            </div>
                        </div>

                        {/* Assigned To - Read Only */}
                        <div className="space-y-2">
                            <Label>Assigned To</Label>
                            <div className="p-2 bg-muted rounded-md">
                                <span>{ticket.assigned_to_user?.name || 'Unassigned'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Response - Tiptap Editor */}
                    <div className="space-y-2">
                        <Label htmlFor="response">Add/Edit Response</Label>
                        
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
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                                    className={editor?.isActive('bulletList') ? 'bg-muted' : ''}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                                    className={editor?.isActive('orderedList') ? 'bg-muted' : ''}
                                >
                                    <ListOrdered className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                                    className={editor?.isActive('codeBlock') ? 'bg-muted' : ''}
                                >
                                    <Code className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                                    className={editor?.isActive('blockquote') ? 'bg-muted' : ''}
                                >
                                    <Quote className="h-4 w-4" />
                                </Button>
                                <div className="border-l mx-1" />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleEditorImageUpload}
                                >
                                    <ImageIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleEditorFileUpload}
                                >
                                    <Paperclip className="h-4 w-4" />
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
                                .ProseMirror img {
                                    max-width: 100%;
                                    height: auto;
                                    border-radius: 5px;
                                    margin: 1em 0;
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
                        {errors.response && (
                            <p className="text-xs text-red-500">{errors.response}</p>
                        )}
                        {data.images && data.images.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                                {data.images.length} file(s) attached
                            </p>
                        )}
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={() => router.visit(redirectUrl || "/tickets")}
                    type="button"
                >
                    Back
                </Button>
                <div className="flex gap-2">
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
                                variant="destructive"
                                onClick={handleCloseTicket}
                                type="button"
                                disabled={processing}
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                {processing ? "Closing..." : "Close Ticket"}
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                type="submit"
                                disabled={processing}
                            >
                                {processing ? "Updating..." : "Update Response"}
                            </Button>
                        </>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
};

export default TicketEdit;
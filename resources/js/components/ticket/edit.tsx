import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Image as ImageIcon, CheckCircle, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { router } from "@inertiajs/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
    closed_at?: string | null;
    assigned_to?: number | null;
    response?: string | null;
    status?: string | null;
    priority?: string | null;
    created_at: string;
    updated_at: string;
    user?: { id: number; name: string };
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

    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        return () => {
            imagePreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [imagePreviews]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { value } = e.target;
        setData(prev => ({ ...prev, response: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newFiles = Array.from(files);
        const currentImages = data.images || [];
        const updatedImages = [...currentImages, ...newFiles];

        setData(prev => ({ ...prev, images: updatedImages }));

        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
    };

    const removeImage = (index: number) => {
        const currentImages = data.images || [];
        const updatedImages = currentImages.filter((_, i) => i !== index);
        setData(prev => ({ ...prev, images: updatedImages }));

        URL.revokeObjectURL(imagePreviews[index]);
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
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
                setImagePreviews([]);
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
                setImagePreviews([]);
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
                setImagePreviews([]);
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

    const isTicketClosed = ticket.status === 'Closed';

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

                    {/* Response - Editable */}
                    <div className="space-y-2">
                        <Label htmlFor="response">Add Response</Label>
                        <Textarea
                            id="response"
                            name="response"
                            value={data.response || ""}
                            onChange={handleChange}
                            className="min-h-[120px]"
                            placeholder="Add your response or notes here..."
                            disabled={isTicketClosed}
                        />
                        {errors.response && (
                            <p className="text-xs text-red-500">{errors.response}</p>
                        )}
                    </div>

                    {/* Image Upload Section - Editable */}
                    {!isTicketClosed && (
                        <div className="space-y-2">
                            <Label htmlFor="images">Attach New Images</Label>
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
                                            : 'No new images selected'}
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
                                            No new images attached yet
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
                    )}
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
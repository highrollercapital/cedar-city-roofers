import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Lead, LeadStatus, UrgencyLevel, Appointment, generateProjectId, roundTo30Minutes, isTimeSlotAvailable } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Phone, Mail, Calendar, Filter, Download, Edit, Trash2, ChevronDown, ChevronUp, DollarSign, TrendingUp, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { exportLeadsToCSV } from '@/lib/export-utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';

const Leads = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Fetch leads
  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads', statusFilter, urgencyFilter],
    queryFn: async () => {
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (urgencyFilter !== 'all') {
        query = query.eq('urgency', urgencyFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
  });

  // Real-time subscription for new leads
  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          console.log('New lead received via real-time:', payload.new);
          // Invalidate queries to refetch leads
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          // Also update dashboard stats
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          // Show toast notification
          toast({
            title: 'New Lead Received!',
            description: `New lead from ${(payload.new as Lead).name} has been added.`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          console.log('Lead updated via real-time:', payload.new);
          // Invalidate queries when leads are updated
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          // Also update dashboard stats
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          // If appointment_date changed, update appointments calendar
          if ((payload.new as any)?.appointment_date || (payload.old as any)?.appointment_date) {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.refetchQueries({ queryKey: ['appointments'] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'leads',
        },
        () => {
          // Invalidate queries when leads are deleted
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          // Also update dashboard stats
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          // Update appointments in case deleted lead had appointments
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Update lead status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      const updateData: any = { 
        status, 
        updated_at: new Date().toISOString() 
      };

      // Auto-set timestamps based on status
      const lead = filteredLeads?.find(l => l.id === id);
      if (lead) {
        if (status === 'contacted' && !lead.contacted_at) {
          updateData.contacted_at = new Date().toISOString();
        }
        if (status === 'booked' && !lead.booked_at) {
          updateData.booked_at = new Date().toISOString();
        }
        if (status === 'estimate_sent' && !lead.estimate_sent_at) {
          updateData.estimate_sent_at = new Date().toISOString();
        }
      }

      const { data, error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating lead in Supabase:', error);
        throw error;
      }
      
      console.log('Lead updated in Supabase:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      // Also update dashboard stats when status changes
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        title: 'Lead updated',
        description: 'Lead status has been updated successfully.',
      });
    },
  });

  // Delete lead permanently
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting lead from Supabase:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('Lead permanently deleted from Supabase');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      // Also update dashboard stats
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      // Update appointments in case deleted lead had appointments
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: 'Lead deleted permanently',
        description: 'The lead has been permanently deleted and cannot be recovered.',
        variant: 'destructive',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error?.message || 'Failed to delete lead. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = (lead: Lead) => {
    setLeadToDelete(lead);
  };

  const confirmDelete = () => {
    if (leadToDelete) {
      deleteMutation.mutate(leadToDelete.id);
      setLeadToDelete(null);
    }
  };

  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedLead(null);
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const filteredLeads =
    leads?.filter(
      (lead) =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm)
    ) || [];

  const getStatusColor = (status: LeadStatus) => {
    const colors: Record<LeadStatus, string> = {
      new: 'bg-blue-500',
      contacted: 'bg-yellow-500',
      needs_follow_up: 'bg-orange-500',
      booked: 'bg-green-500',
      estimate_sent: 'bg-purple-500',
      post_estimate_follow_up: 'bg-pink-500',
      in_progress: 'bg-indigo-500',
      completed: 'bg-gray-500',
      closed: 'bg-emerald-500',
      rejected: 'bg-red-500',
      lost: 'bg-red-600',
      appointment_cancelled: 'bg-amber-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getUrgencyColor = (urgency: UrgencyLevel) => {
    const colors: Record<UrgencyLevel, string> = {
      low: 'bg-gray-500',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      urgent: 'bg-red-500',
    };
    return colors[urgency] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6 bg-background min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Management</h1>
          <p className="text-muted-foreground">Manage and track all your leads</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (filteredLeads.length > 0) {
                exportLeadsToCSV(filteredLeads);
                toast({
                  title: 'Export successful',
                  description: 'Leads have been exported to CSV.',
                });
              } else {
                toast({
                  title: 'No data to export',
                  description: 'Please filter leads to export.',
                  variant: 'destructive',
                });
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setSelectedLead(null);
              setIsEditMode(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateNew}>
                <Plus className="mr-2 h-4 w-4" />
                Create Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{isEditMode ? 'Edit Lead' : 'Create New Lead'}</DialogTitle>
              </DialogHeader>
              <LeadForm 
                lead={selectedLead || undefined}
                onSuccess={() => {
                  setIsDialogOpen(false);
                  setSelectedLead(null);
                  setIsEditMode(false);
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="needs_follow_up">Needs Follow Up</SelectItem>
                <SelectItem value="booked">Booked Appointment</SelectItem>
                <SelectItem value="estimate_sent">Estimate Sent</SelectItem>
                <SelectItem value="post_estimate_follow_up">Post Estimate Follow Up</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="appointment_cancelled">Appointment Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgencies</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {
              setStatusFilter('all');
              setUrgencyFilter('all');
              setSearchTerm('');
            }}>
              <Filter className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Leads ({filteredLeads.length})</CardTitle>
          <CardDescription>View and manage your leads</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">Loading leads...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No leads found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Appointment</TableHead>
                    <TableHead>Project ID</TableHead>
                    <TableHead>Project Total</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const isExpanded = expandedLeads.has(lead.id);
                    return (
                      <Collapsible key={lead.id} asChild open={isExpanded} onOpenChange={(open) => {
                        const newExpanded = new Set(expandedLeads);
                        if (open) {
                          newExpanded.add(lead.id);
                        } else {
                          newExpanded.delete(lead.id);
                        }
                        setExpandedLeads(newExpanded);
                      }}>
                        <>
                          <TableRow>
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell className="font-medium">{lead.name}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-3 w-3" />
                                  {lead.email}
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-3 w-3" />
                                  {lead.phone}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={lead.status}
                                onValueChange={(value) =>
                                  updateStatusMutation.mutate({ id: lead.id, status: value as LeadStatus })
                                }
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">New</SelectItem>
                                  <SelectItem value="contacted">Contacted</SelectItem>
                                  <SelectItem value="needs_follow_up">Needs Follow Up</SelectItem>
                                  <SelectItem value="booked">Booked Appointment</SelectItem>
                                  <SelectItem value="estimate_sent">Estimate Sent</SelectItem>
                                  <SelectItem value="post_estimate_follow_up">Post Estimate Follow Up</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                  <SelectItem value="lost">Lost</SelectItem>
                                  <SelectItem value="appointment_cancelled">Appointment Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {lead.appointment_date ? (
                                <div className="text-sm">
                                  {format(new Date(lead.appointment_date), 'MMM d, yyyy h:mm a')}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">No appointment</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {lead.project_id ? (
                                <div className="font-mono text-sm font-medium text-blue-600">
                                  {lead.project_id}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {lead.project_total ? (
                                <div className="font-medium text-green-600">
                                  ${lead.project_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {lead.profit_total ? (
                                <div className="space-y-0.5">
                                  <div className="font-medium text-blue-600">
                                    ${lead.profit_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                  {lead.profit_percentage && (
                                    <div className="text-xs text-muted-foreground">
                                      {lead.profit_percentage.toFixed(1)}%
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(lead.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(lead)}
                                  title="Edit lead"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" asChild title="Call lead">
                                  <a href={`tel:${lead.phone}`}>
                                    <Phone className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(lead)}
                                  title="Delete lead"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <TableRow>
                              <TableCell colSpan={10} className="bg-muted/50">
                                <LeadTrackingDetails lead={lead} onUpdate={updateStatusMutation.mutate} />
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!leadToDelete} onOpenChange={(open) => !open && setLeadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the lead for <strong>{leadToDelete?.name}</strong>? 
              <br /><br />
              <strong className="text-destructive">Warning:</strong> This action cannot be undone. 
              The lead and all associated data will be permanently removed from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Lead Form Component
const LeadForm = ({ lead, onSuccess }: { lead?: Lead; onSuccess: () => void }) => {
  const isEditMode = !!lead;
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    address: lead?.address || '',
    city: lead?.city || '',
    state: lead?.state || 'UT',
    zip_code: lead?.zip_code || '',
    roof_type: lead?.roof_type || '',
    urgency: (lead?.urgency || 'medium') as UrgencyLevel,
    status: (lead?.status || 'new') as LeadStatus,
    appointment_date: lead?.appointment_date ? format(new Date(lead.appointment_date), "yyyy-MM-dd'T'HH:mm") : '',
    project_total: lead?.project_total?.toString() || '',
    profit_percentage: lead?.profit_percentage?.toString() || '',
    needs_follow_up: lead?.needs_follow_up || false,
    post_estimate_follow_up_needed: lead?.post_estimate_follow_up_needed || false,
    notes: lead?.notes || '',
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('leads').insert({
        ...formData,
        status: 'new',
        source: 'manual',
        project_id: generateProjectId(), // Generate unique project ID
      }).select();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      // Also update dashboard stats
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      toast({
        title: 'Lead created',
        description: 'New lead has been created successfully.',
      });
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!lead) throw new Error('No lead to update');
      
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || 'UT',
        zip_code: formData.zip_code || null,
        roof_type: formData.roof_type || null,
        urgency: formData.urgency,
        status: formData.status,
        notes: formData.notes || null,
        needs_follow_up: formData.needs_follow_up,
        post_estimate_follow_up_needed: formData.post_estimate_follow_up_needed,
        updated_at: new Date().toISOString(),
      };

      // Handle appointment date
      if (formData.appointment_date) {
        // Round to 30-minute interval
        const inputDate = new Date(formData.appointment_date);
        const roundedDate = roundTo30Minutes(inputDate);
        updateData.appointment_date = roundedDate.toISOString();
        // Automatically update status to 'booked' when appointment is scheduled
        const statusesBeforeBooked = ['new', 'contacted', 'needs_follow_up', 'appointment_cancelled'];
        if (statusesBeforeBooked.includes(formData.status)) {
          updateData.status = 'booked';
        }
        if (!lead?.booked_at && (updateData.status === 'booked' || formData.status === 'booked')) {
          updateData.booked_at = new Date().toISOString();
        }
      } else {
        updateData.appointment_date = null;
      }

      // Handle project total and profit
      if (formData.project_total) {
        updateData.project_total = parseFloat(formData.project_total);
      } else {
        updateData.project_total = null;
      }

      if (formData.profit_percentage) {
        updateData.profit_percentage = parseFloat(formData.profit_percentage);
      } else {
        updateData.profit_percentage = null;
      }

      // Auto-set timestamps based on status
      if (formData.status === 'contacted' && !lead?.contacted_at) {
        updateData.contacted_at = new Date().toISOString();
      }
      if (formData.status === 'estimate_sent' && !lead?.estimate_sent_at) {
        updateData.estimate_sent_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id);

      if (error) {
        console.error('Error updating lead in Supabase:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      // Also update dashboard stats
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      // If appointment_date was updated, also refresh appointments
      if (formData.appointment_date) {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
      }
      toast({
        title: 'Lead updated',
        description: 'Lead has been updated successfully.',
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error?.message || 'Failed to update lead. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roof_type">Roof Type</Label>
          <Input
            id="roof_type"
            value={formData.roof_type}
            onChange={(e) => setFormData({ ...formData, roof_type: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip_code">ZIP</Label>
            <Input
              id="zip_code"
              value={formData.zip_code}
              onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="urgency">Urgency</Label>
          <Select
            value={formData.urgency}
            onValueChange={(value) => setFormData({ ...formData, urgency: value as UrgencyLevel })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isEditMode && (
          <>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as LeadStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="needs_follow_up">Needs Follow Up</SelectItem>
                  <SelectItem value="booked">Booked Appointment</SelectItem>
                  <SelectItem value="estimate_sent">Estimate Sent</SelectItem>
                  <SelectItem value="post_estimate_follow_up">Post Estimate Follow Up</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appointment_date">Appointment Date</Label>
              <Input
                id="appointment_date"
                type="datetime-local"
                step="1800"
                value={formData.appointment_date}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) {
                    setFormData({ ...formData, appointment_date: '' });
                    return;
                  }
                  // Round to 30-minute interval when user selects a time
                  const selectedDate = new Date(value);
                  if (!isNaN(selectedDate.getTime())) {
                    const rounded = roundTo30Minutes(selectedDate);
                    const roundedValue = format(rounded, "yyyy-MM-dd'T'HH:mm");
                    setFormData({ ...formData, appointment_date: roundedValue });
                  } else {
                    setFormData({ ...formData, appointment_date: value });
                  }
                }}
                onBlur={(e) => {
                  // Force rounding on blur in case user typed a value
                  const value = e.target.value;
                  if (value) {
                    const selectedDate = new Date(value);
                    if (!isNaN(selectedDate.getTime())) {
                      const rounded = roundTo30Minutes(selectedDate);
                      const roundedValue = format(rounded, "yyyy-MM-dd'T'HH:mm");
                      setFormData({ ...formData, appointment_date: roundedValue });
                    }
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Appointments are scheduled in 30-minute intervals (e.g., 1:00 PM, 1:30 PM, 2:00 PM)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_total">Project Total ($)</Label>
              <Input
                id="project_total"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.project_total}
                onChange={(e) => setFormData({ ...formData, project_total: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Profit percentage will auto-adjust based on project total
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profit_percentage">Profit Percentage (%)</Label>
              <Input
                id="profit_percentage"
                type="number"
                step="0.01"
                placeholder="25.00"
                value={formData.profit_percentage}
                onChange={(e) => setFormData({ ...formData, profit_percentage: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Profit total will be calculated automatically
              </p>
            </div>
            <div className="space-y-2">
              <Label>Follow-up Tracking</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="needs_follow_up"
                    checked={formData.needs_follow_up}
                    onCheckedChange={(checked) => setFormData({ ...formData, needs_follow_up: !!checked })}
                  />
                  <Label htmlFor="needs_follow_up" className="text-sm font-normal cursor-pointer">
                    Needs Follow Up
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="post_estimate_follow_up_needed"
                    checked={formData.post_estimate_follow_up_needed}
                    onCheckedChange={(checked) => setFormData({ ...formData, post_estimate_follow_up_needed: !!checked })}
                  />
                  <Label htmlFor="post_estimate_follow_up_needed" className="text-sm font-normal cursor-pointer">
                    Post Estimate Follow Up Needed
                  </Label>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading 
          ? (isEditMode ? 'Updating...' : 'Creating...') 
          : (isEditMode ? 'Update Lead' : 'Create Lead')}
      </Button>
    </form>
  );
};

// Lead Tracking Details Component
const LeadTrackingDetails = ({ lead, onUpdate }: { lead: Lead; onUpdate: (data: { id: string; status: LeadStatus }) => void }) => {
  const { user } = useAuth();
  const [localData, setLocalData] = useState({
    appointment_date: lead.appointment_date ? format(new Date(lead.appointment_date), "yyyy-MM-dd'T'HH:mm") : '',
    project_total: lead.project_total?.toString() || '',
    profit_percentage: lead.profit_percentage?.toString() || '',
    needs_follow_up: lead.needs_follow_up || false,
    post_estimate_follow_up_needed: lead.post_estimate_follow_up_needed || false,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch appointments linked to this lead
  const { data: linkedAppointments } = useQuery({
    queryKey: ['appointments', 'lead', lead.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('lead_id', lead.id)
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data as Appointment[];
    },
  });

  const createAppointmentFromLead = async (appointmentDate: string) => {
    console.log('=== Creating Appointment from Lead ===');
    console.log('Lead ID:', lead.id);
    console.log('Lead name:', lead.name);
    console.log('Lead email:', lead.email);
    console.log('Lead phone:', lead.phone);
    console.log('Lead address:', lead.address);
    console.log('Appointment date input:', appointmentDate);
    
    // Ensure we have a valid date
    const inputDate = new Date(appointmentDate);
    if (isNaN(inputDate.getTime())) {
      const error = new Error('Invalid appointment date');
      console.error('❌', error);
      throw error;
    }
    
    // Round to nearest 30-minute interval (rounds down to :00 or :30)
    const startTime = roundTo30Minutes(inputDate);
    console.log('Original time:', inputDate);
    console.log('Rounded start time:', startTime);
    console.log('Start time ISO:', startTime.toISOString());
    
    // Appointments last exactly 1 hour
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    console.log('End time ISO:', endTime.toISOString());
    
    // Check if time slot is available
    const isAvailable = await isTimeSlotAvailable(startTime, endTime);
    if (!isAvailable) {
      const error = new Error(`Time slot ${format(startTime, 'MMM d, yyyy h:mm a')} - ${format(endTime, 'h:mm a')} is already booked. Please choose another time.`);
      console.error('❌ Time slot not available:', error);
      throw error;
    }

    // Build location string with full address
    const locationParts = [];
    if (lead.address) locationParts.push(lead.address);
    if (lead.city) locationParts.push(lead.city);
    if (lead.state) locationParts.push(lead.state);
    if (lead.zip_code) locationParts.push(lead.zip_code);
    const location = locationParts.length > 0 ? locationParts.join(', ') : null;

    // Build description with contact info
    const descriptionParts = [];
    descriptionParts.push(`Roofing consultation for ${lead.roof_type || 'roofing project'}`);
    if (lead.email) descriptionParts.push(`Email: ${lead.email}`);
    if (lead.phone) descriptionParts.push(`Phone: ${lead.phone}`);
    const description = descriptionParts.join('\n');

    const appointmentData = {
      lead_id: lead.id,
      title: `Appointment with ${lead.name}`,
      description: description,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      location: location,
      assigned_to: user?.id || null,
      status: 'scheduled',
      reminder_sent: false,
    };
    
    console.log('Appointment data to insert:', appointmentData);

    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error creating appointment:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      // Show user-friendly error
      toast({
        title: 'Failed to create appointment',
        description: error.message || 'Please check your permissions and try again.',
        variant: 'destructive',
      });
      
      throw error;
    }

    if (!data) {
      const error = new Error('No data returned from appointment creation');
      console.error('❌', error);
      throw error;
    }

    console.log('✅ Appointment created successfully:', data);
    console.log('Appointment ID:', data.id);
    console.log('Appointment start_time:', data.start_time);
    console.log('Appointment title:', data.title);
    console.log('Appointment location:', data.location);
    console.log('=== End Appointment Creation ===');
    
    // Invalidate both appointments and leads queries to ensure sync
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['appointments', 'lead', lead.id] });
    
    // Force refetch immediately
    setTimeout(async () => {
      await queryClient.refetchQueries({ queryKey: ['appointments'] });
    }, 500);
    
    return data;
  };

  const updateLeadField = async (field: string, value: any) => {
    console.log('📝 updateLeadField called:', { field, value, leadId: lead.id });
    setIsUpdating(true);
    try {
      const updateData: any = { [field]: value, updated_at: new Date().toISOString() };
      
      // Handle date conversion - CREATE APPOINTMENT FIRST
      if (field === 'appointment_date' && value) {
        console.log('📅 Processing appointment_date update...');
        const inputDate = new Date(value);
        if (isNaN(inputDate.getTime())) {
          throw new Error('Invalid appointment date');
        }
        
        // Round to nearest 30-minute interval
        const appointmentDate = roundTo30Minutes(inputDate);
        
        // Calculate rounded times (define outside try block so it's available after)
        const startTime = appointmentDate;
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration
        
        // Create/update appointment BEFORE updating lead
        // This ensures appointment exists even if lead update fails
        try {
          // Check if appointment already exists for this lead
          const existingAppt = linkedAppointments && linkedAppointments.length > 0 
            ? linkedAppointments[0] 
            : null;
          
          // Check if time slot is available (excluding the appointment we're updating if it exists)
          const isAvailable = await isTimeSlotAvailable(startTime, endTime, existingAppt?.id);
          if (!isAvailable) {
            toast({
              title: 'Time slot unavailable',
              description: `The time slot ${format(startTime, 'MMM d, yyyy h:mm a')} - ${format(endTime, 'h:mm a')} is already booked. Please choose another time.`,
              variant: 'destructive',
            });
            throw new Error('Time slot is already booked');
          }
          
          if (existingAppt) {
            // Update existing appointment with latest lead info
            
            // Build location and description with current lead info
            const locationParts = [];
            if (lead.address) locationParts.push(lead.address);
            if (lead.city) locationParts.push(lead.city);
            if (lead.state) locationParts.push(lead.state);
            if (lead.zip_code) locationParts.push(lead.zip_code);
            const location = locationParts.length > 0 ? locationParts.join(', ') : null;

            const descriptionParts = [];
            descriptionParts.push(`Roofing consultation for ${lead.roof_type || 'roofing project'}`);
            if (lead.email) descriptionParts.push(`Email: ${lead.email}`);
            if (lead.phone) descriptionParts.push(`Phone: ${lead.phone}`);
            const description = descriptionParts.join('\n');
            
            const { error: updateError } = await supabase
              .from('appointments')
              .update({
                title: `Appointment with ${lead.name}`,
                description: description,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                location: location,
                status: 'scheduled', // Ensure status is scheduled when updating
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingAppt.id);
            
            if (updateError) {
              console.error('❌ Error updating appointment:', updateError);
              throw updateError;
            }
            
            console.log('✅ Appointment updated successfully');
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['appointments', 'lead', lead.id] });
            
            toast({
              title: 'Appointment updated',
              description: 'Calendar appointment has been updated with latest lead information.',
            });
          } else {
            // Create new appointment - this MUST succeed
            console.log('➕ Creating NEW appointment for lead...');
            console.log('Lead data:', {
              id: lead.id,
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              address: lead.address,
              city: lead.city,
              state: lead.state,
            });
            // Use the rounded appointment date for creation
            const roundedValue = format(appointmentDate, "yyyy-MM-dd'T'HH:mm");
            const createdAppt = await createAppointmentFromLead(roundedValue);
            
            if (!createdAppt || !createdAppt.id) {
              throw new Error('Appointment creation returned no data');
            }
            
            // Verify appointment was created
            const { data: verifyData, error: verifyError } = await supabase
              .from('appointments')
              .select('*')
              .eq('id', createdAppt.id)
              .single();
            
            if (verifyError) {
              console.error('❌ Failed to verify appointment creation:', verifyError);
              throw new Error(`Appointment created but verification failed: ${verifyError.message}`);
            }
            
            if (!verifyData) {
              throw new Error('Appointment verification returned no data');
            }
            
            console.log('✅ Appointment verified in database:', verifyData);
            
            toast({
              title: 'Appointment created',
              description: `Calendar appointment created for ${lead.name} on ${format(startTime, 'MMM d, yyyy h:mm a')}.`,
            });
          }
        } catch (apptError: any) {
          console.error('❌ CRITICAL: Error creating/updating appointment:', apptError);
          // Don't continue with lead update if appointment creation fails
          // This ensures data consistency
          setIsUpdating(false);
          toast({
            title: 'Failed to create appointment',
            description: apptError?.message || 'Please check console for details and try again.',
            variant: 'destructive',
          });
          throw apptError; // Re-throw to stop lead update
        }
        
        // Only update lead if appointment was successfully created/updated
        // Use the rounded start time (which is what the appointment uses)
        updateData.appointment_date = startTime.toISOString();
        // Automatically update status to 'booked' when appointment is scheduled
        // Only update if status is less advanced than 'booked' (new, contacted, needs_follow_up, appointment_cancelled)
        const statusesBeforeBooked = ['new', 'contacted', 'needs_follow_up', 'appointment_cancelled'];
        if (statusesBeforeBooked.includes(lead.status)) {
          updateData.status = 'booked';
          if (!lead.booked_at) {
            updateData.booked_at = new Date().toISOString();
          }
        }
      } else if (field === 'appointment_date' && !value) {
        updateData.appointment_date = null;
      }
      
      // Handle number conversion
      if (field === 'project_total') {
        updateData.project_total = value ? parseFloat(value) : null;
      }
      if (field === 'profit_percentage') {
        updateData.profit_percentage = value ? parseFloat(value) : null;
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['leads'] });
      // Also update dashboard stats
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      // If appointment_date was updated, also refresh appointments to show in calendar
      if (field === 'appointment_date') {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        // Force a refetch of all appointment queries
        queryClient.refetchQueries({ queryKey: ['appointments'] });
      }
      
      toast({
        title: 'Lead updated',
        description: field === 'appointment_date' && value
          ? 'Lead appointment date updated and calendar synced.'
          : 'Lead information has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Error updating lead:', error);
      toast({
        title: 'Update failed',
        description: error?.message || 'Failed to update lead. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    console.log('🔄 handleFieldChange called:', { field, value });
    setLocalData(prev => ({ ...prev, [field]: value }));
    updateLeadField(field, value).catch((error) => {
      console.error('❌ Error in updateLeadField:', error);
      // Reset local data on error
      setLocalData(prev => {
        const reset = { ...prev };
        if (field === 'appointment_date') {
          reset.appointment_date = lead.appointment_date ? format(new Date(lead.appointment_date), "yyyy-MM-dd'T'HH:mm") : '';
        }
        return reset;
      });
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Appointment Date */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Appointment Date
          </Label>
          <div className="flex gap-2">
            <Input
              type="datetime-local"
              step="1800"
              value={localData.appointment_date}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) {
                  setLocalData(prev => ({ ...prev, appointment_date: '' }));
                  handleFieldChange('appointment_date', '');
                  return;
                }
                
                // Always round to 30-minute interval immediately
                const selectedDate = new Date(value);
                if (!isNaN(selectedDate.getTime())) {
                  const rounded = roundTo30Minutes(selectedDate);
                  const roundedValue = format(rounded, "yyyy-MM-dd'T'HH:mm");
                  
                  // Update local state immediately to show rounded value in the input
                  setLocalData(prev => ({ ...prev, appointment_date: roundedValue }));
                  
                  // Use setTimeout to update after the input value is set, preventing cursor jump
                  setTimeout(() => {
                    handleFieldChange('appointment_date', roundedValue);
                  }, 0);
                } else {
                  setLocalData(prev => ({ ...prev, appointment_date: value }));
                }
              }}
              onBlur={(e) => {
                // Force rounding on blur in case user typed a value that wasn't caught
                const value = e.target.value;
                if (value) {
                  const selectedDate = new Date(value);
                  if (!isNaN(selectedDate.getTime())) {
                    const rounded = roundTo30Minutes(selectedDate);
                    const roundedValue = format(rounded, "yyyy-MM-dd'T'HH:mm");
                    setLocalData(prev => ({ ...prev, appointment_date: roundedValue }));
                    handleFieldChange('appointment_date', roundedValue);
                  }
                }
              }}
              disabled={isUpdating}
              className="flex-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Times are rounded to 30-minute intervals (e.g., 1:00 PM, 1:30 PM, 2:00 PM)
            </p>
            {localData.appointment_date && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const startTime = new Date(localData.appointment_date);
                  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
                  window.location.href = `/dashboard/appointments?create=true&lead_id=${lead.id}&start_time=${startTime.toISOString()}&end_time=${endTime.toISOString()}`;
                }}
                disabled={isUpdating}
                title="Open in Calendar"
              >
                <Calendar className="h-4 w-4" />
              </Button>
            )}
          </div>
          {lead.appointment_date && (
            <p className="text-xs text-muted-foreground">
              {format(new Date(lead.appointment_date), 'EEEE, MMMM d, yyyy at h:mm a')}
            </p>
          )}
          {linkedAppointments && linkedAppointments.length > 0 && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                ✓ Calendar appointment created
              </p>
              {linkedAppointments.map((apt) => (
                <div key={apt.id} className="text-xs text-blue-600 dark:text-blue-400">
                  <a href="/dashboard/appointments" className="underline hover:no-underline">
                    View appointment: {format(new Date(apt.start_time), 'MMM d, h:mm a')}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Total */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Project Total
          </Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={localData.project_total}
            onChange={(e) => handleFieldChange('project_total', e.target.value)}
            disabled={isUpdating}
          />
          {lead.project_total && (
            <p className="text-xs text-muted-foreground">
              Auto-adjusted profit: {lead.profit_percentage?.toFixed(1)}%
            </p>
          )}
        </div>

        {/* Profit Percentage */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Profit Percentage
          </Label>
          <Input
            type="number"
            step="0.01"
            placeholder="25.00"
            value={localData.profit_percentage}
            onChange={(e) => handleFieldChange('profit_percentage', e.target.value)}
            disabled={isUpdating}
          />
          {lead.profit_total && (
            <p className="text-xs font-medium text-blue-600">
              Profit: ${lead.profit_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
        </div>

        {/* Follow-up Flags */}
        <div className="space-y-3">
          <Label>Follow-up Tracking</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`follow-up-${lead.id}`}
                checked={localData.needs_follow_up}
                onCheckedChange={(checked) => handleFieldChange('needs_follow_up', checked)}
                disabled={isUpdating}
              />
              <Label htmlFor={`follow-up-${lead.id}`} className="text-sm font-normal cursor-pointer">
                Needs Follow Up
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`post-estimate-${lead.id}`}
                checked={localData.post_estimate_follow_up_needed}
                onCheckedChange={(checked) => handleFieldChange('post_estimate_follow_up_needed', checked)}
                disabled={isUpdating}
              />
              <Label htmlFor={`post-estimate-${lead.id}`} className="text-sm font-normal cursor-pointer">
                Post Estimate Follow Up Needed
              </Label>
            </div>
          </div>
        </div>

        {/* Timeline Information */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline
          </Label>
          <div className="space-y-1 text-sm">
            {lead.contacted_at && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span>Contacted: {format(new Date(lead.contacted_at), 'MMM d, yyyy')}</span>
              </div>
            )}
            {lead.booked_at && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-blue-500" />
                <span>Booked: {format(new Date(lead.booked_at), 'MMM d, yyyy')}</span>
              </div>
            )}
            {lead.estimate_sent_at && (
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-purple-500" />
                <span>Estimate Sent: {format(new Date(lead.estimate_sent_at), 'MMM d, yyyy')}</span>
              </div>
            )}
            {lead.created_at && (
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>Created: {format(new Date(lead.created_at), 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        {lead.project_total && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial Summary
            </Label>
            <div className="p-3 bg-muted rounded-md space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Project Total:</span>
                <span className="font-medium">${lead.project_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {lead.profit_percentage && (
                <div className="flex justify-between">
                  <span>Profit Margin:</span>
                  <span className="font-medium">{lead.profit_percentage.toFixed(1)}%</span>
                </div>
              )}
              {lead.profit_total && (
                <div className="flex justify-between border-t pt-1">
                  <span className="font-semibold">Estimated Profit:</span>
                  <span className="font-semibold text-blue-600">${lead.profit_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notes Section */}
      {lead.notes && (
        <div className="space-y-2">
          <Label>Notes</Label>
          <div className="p-3 bg-muted rounded-md text-sm">
            {lead.notes}
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;


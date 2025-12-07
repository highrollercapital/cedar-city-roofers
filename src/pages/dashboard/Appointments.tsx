import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase, Appointment, Lead, roundTo30Minutes, isTimeSlotAvailable } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar as CalendarIcon, Clock, MapPin, User, X, Edit2, RefreshCw, Sparkles, Activity } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const Appointments = () => {
  const { user, isAdmin, isRoofer } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);

  const queryClient = useQueryClient();

  // Check URL parameters for creating appointment from lead
  useEffect(() => {
    const createParam = searchParams.get('create');
    const leadIdParam = searchParams.get('lead_id');
    const startTimeParam = searchParams.get('start_time');
    
    if (createParam === 'true' && leadIdParam) {
      setIsDialogOpen(true);
      // Clear URL params after opening dialog
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Real-time subscription for appointments and leads
  useEffect(() => {
    const appointmentsChannel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        (payload) => {
          console.log('New appointment received via real-time:', payload.new);
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          toast({
            title: 'New Appointment Added!',
            description: `Appointment "${(payload.new as Appointment).title}" has been added to the calendar.`,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments' },
        (payload) => {
          console.log('Appointment updated via real-time:', payload.new);
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'appointments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .subscribe();

    // Also listen to leads changes (especially appointment_date changes)
    const leadsChannel = supabase
      .channel('appointments-leads-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads' },
        (payload) => {
          // If appointment_date changed, update appointments calendar
          if ((payload.new as any)?.appointment_date || (payload.old as any)?.appointment_date) {
            console.log('Lead appointment_date changed via real-time, updating calendar');
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.refetchQueries({ queryKey: ['appointments'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [queryClient]);

  // Fetch appointments - only show scheduled appointments linked to leads (exclude cancelled)
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select('*')
        .not('lead_id', 'is', null) // Only appointments with a lead_id
        .eq('status', 'scheduled') // Only show scheduled appointments (excludes cancelled and other statuses)
        .order('start_time', { ascending: true });

      if (isAdmin || isRoofer) {
        // Admins and roofers see all lead-linked appointments
      } else {
        // Clients see only their lead-linked appointments
        query = query.eq('client_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!user,
  });


  // Debug: Log appointments to help troubleshoot
  useEffect(() => {
    if (appointments && appointments.length > 0) {
      console.log('Appointments loaded:', appointments.length);
      console.log('Sample appointment:', appointments[0]);
      if (selectedDate) {
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        const matchingAppts = appointments.filter((apt) => {
          if (!apt.start_time) return false;
          const aptDate = new Date(apt.start_time);
          const aptDateStr = format(aptDate, 'yyyy-MM-dd');
          return aptDateStr === selectedDateStr;
        });
        console.log(`Appointments for ${selectedDateStr}:`, matchingAppts.length);
        if (matchingAppts.length === 0 && appointments.length > 0) {
          console.log('All appointment dates:', appointments.map(a => ({
            title: a.title,
            start_time: a.start_time,
            formatted: format(new Date(a.start_time), 'yyyy-MM-dd')
          })));
        }
      }
    } else if (appointments && appointments.length === 0) {
      console.log('No appointments found in database');
    }
  }, [appointments, selectedDate]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Appointments</h1>
            <p className="text-muted-foreground">Manage your scheduled appointments</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading appointments...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get appointment counts for each date
  const getAppointmentCountForDate = (date: Date): number => {
    if (!appointments || appointments.length === 0) return 0;
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter((apt) => {
      if (!apt.start_time || apt.status !== 'scheduled') return false;
      const aptDateStr = format(new Date(apt.start_time), 'yyyy-MM-dd');
      return aptDateStr === dateStr;
    }).length;
  };

  // Check if date has appointments
  const dateHasAppointments = (date: Date): boolean => {
    return getAppointmentCountForDate(date) > 0;
  };

  return (
    <div className="space-y-8 p-6 bg-background min-h-full">
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground mt-2">
            Calendar view of appointments from Lead Management
          </p>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <Activity className="h-3 w-3 animate-pulse" />
            This calendar mirrors appointments set in the Lead Management section
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          <Sparkles className="h-3 w-3 mr-2" />
          {appointments?.length || 0} Scheduled
        </Badge>
      </div>

      {/* Enhanced Calendar View */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Calendar
              </CardTitle>
              <CardDescription className="mt-1">
                View appointments from Lead Management. Only leads with appointments are shown.
              </CardDescription>
            </div>
            {appointments && appointments.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  queryClient.refetchQueries({ queryKey: ['appointments'] });
                  toast({
                    title: 'Refreshed',
                    description: 'Appointments list has been refreshed.',
                  });
                }}
                className="hover:bg-accent transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Enhanced Calendar */}
            <div className="space-y-4">
              <div className="relative">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-lg border-2 shadow-sm bg-card"
                  modifiers={{
                    hasAppointments: (date) => dateHasAppointments(date),
                  }}
                  modifiersClassNames={{
                    hasAppointments: 'has-appointments',
                  }}
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center mb-4",
                    caption_label: "text-base font-semibold",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-8 w-8 bg-transparent hover:bg-accent rounded-md transition-colors",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex mb-2",
                    head_cell: "text-muted-foreground rounded-md w-10 font-semibold text-xs uppercase",
                    row: "flex w-full mt-1",
                    cell: "h-10 w-10 text-center text-sm p-0 relative rounded-md",
                    day: "h-10 w-10 p-0 font-normal hover:bg-accent rounded-md transition-colors relative",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-semibold",
                    day_today: "bg-accent text-accent-foreground font-semibold border-2 border-primary",
                  }}
                />
                {/* Appointment count indicator */}
                {selectedDate && dateHasAppointments(selectedDate) && (
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg z-10">
                    {getAppointmentCountForDate(selectedDate)}
                  </div>
                )}
                {/* Custom styles for appointment indicators */}
                <style>{`
                  .has-appointments::after {
                    content: '';
                    position: absolute;
                    bottom: 2px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background-color: hsl(var(--primary));
                  }
                `}</style>
              </div>
              
              {/* Quick Stats */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Appointments</span>
                      <span className="font-semibold">{appointments?.length || 0}</span>
                    </div>
                    {selectedDate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">On Selected Date</span>
                        <span className="font-semibold text-primary">
                          {getAppointmentCountForDate(selectedDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Appointments List */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold">
                    {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
                  </h3>
                  {selectedDate && dateHasAppointments(selectedDate) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {getAppointmentCountForDate(selectedDate)} appointment{getAppointmentCountForDate(selectedDate) !== 1 ? 's' : ''} scheduled
                    </p>
                  )}
                </div>
              </div>
              {selectedDate && (
                <div className="space-y-2">
                  {(() => {
                    // Normalize dates to YYYY-MM-DD for comparison (handle timezone issues)
                    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
                    
                    // Filter appointments for the selected date
                    // Only show scheduled appointments linked to leads (exclude cancelled and other statuses)
                    const filteredAppointments = (appointments || []).filter((apt) => {
                      if (!apt || !apt.start_time || !apt.lead_id) {
                        return false;
                      }
                      // Only show scheduled appointments, exclude cancelled and other statuses
                      if (apt.status !== 'scheduled') {
                        return false;
                      }
                      try {
                        const aptDate = new Date(apt.start_time);
                        const aptDateStr = format(aptDate, 'yyyy-MM-dd');
                        return aptDateStr === selectedDateStr;
                      } catch (error) {
                        return false;
                      }
                    });
                    
                    if (filteredAppointments.length > 0) {
                      return (
                        <div className="space-y-4">
                          {filteredAppointments.map((apt) => (
                            <Card 
                              key={apt.id} 
                              className="hover:shadow-lg transition-all duration-300 hover:scale-[1.01] border-l-4 border-l-primary group"
                            >
                              <CardContent className="pt-5">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 space-y-3">
                                    <div className="flex items-start gap-3">
                                      <div className="h-12 w-12 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
                                        <Clock className="h-6 w-6 text-primary" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-semibold text-lg mb-1">{apt.title}</p>
                                        {apt.description && (
                                          <div className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
                                            {apt.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-4 text-sm pl-15">
                                      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-md">
                                        <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <span className="font-medium text-blue-700 dark:text-blue-300">
                                          {format(new Date(apt.start_time), 'h:mm a')} - {format(new Date(apt.end_time), 'h:mm a')}
                                        </span>
                                      </div>
                                      {apt.location && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950/30 rounded-md">
                                          <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
                                          <span className="text-green-700 dark:text-green-300">{apt.location}</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {apt.lead_id && (
                                      <div className="pt-2">
                                        <Badge variant="secondary" className="text-xs">
                                          <User className="h-3 w-3 mr-1" />
                                          Linked to Lead
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-col items-end gap-3">
                                    <Badge className="shrink-0 bg-green-500 hover:bg-green-600">
                                      {apt.status}
                                    </Badge>
                                    {(isAdmin || isRoofer) && apt.status === 'scheduled' && (
                                      <div className="flex gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setAppointmentToReschedule(apt)}
                                          className="hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                                        >
                                          <Edit2 className="h-3 w-3 mr-1" />
                                          Reschedule
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setAppointmentToCancel(apt)}
                                          className="text-destructive hover:bg-destructive/10 hover:border-destructive transition-colors"
                                        >
                                          <X className="h-3 w-3 mr-1" />
                                          Cancel
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      );
                    } else {
                      return (
                        <Card className="border-dashed">
                          <CardContent className="py-12 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                                <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-semibold text-lg mb-1">No appointments scheduled for this date</p>
                                {appointments && appointments.length === 0 ? (
                                  <div className="mt-4 space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                      No appointments found. Appointments are created automatically when you set an appointment date for a lead in the Lead Management section.
                                    </p>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        window.location.href = '/dashboard/leads';
                                      }}
                                      className="hover:bg-accent transition-colors"
                                    >
                                      Go to Lead Management →
                                    </Button>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    Select another date to view appointments
                                  </p>
                                )}
                              </div>
                              {(!appointments || appointments.length === 0) && (
                                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    Tip: Set an appointment date for a lead in Lead Management to see it appear here.
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Appointment Dialog */}
      <AlertDialog open={!!appointmentToCancel} onOpenChange={(open) => !open && setAppointmentToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the appointment with <strong>{appointmentToCancel?.title}</strong>?
              <br /><br />
              This will mark the appointment as cancelled. The linked lead's appointment date will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!appointmentToCancel) return;
                
                try {
                  // Update appointment status to cancelled
                  const { error: aptError } = await supabase
                    .from('appointments')
                    .update({ 
                      status: 'cancelled',
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', appointmentToCancel.id);

                  if (aptError) throw aptError;

                  // Update linked lead: clear appointment_date and set status to appointment_cancelled
                  if (appointmentToCancel.lead_id) {
                    const { error: leadError } = await supabase
                      .from('leads')
                      .update({ 
                        appointment_date: null,
                        status: 'appointment_cancelled',
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', appointmentToCancel.lead_id);
                    
                    if (leadError) {
                      console.error('Error updating lead status:', leadError);
                      // Don't throw - appointment was cancelled successfully
                    }
                  }

                  queryClient.invalidateQueries({ queryKey: ['appointments'] });
                  queryClient.invalidateQueries({ queryKey: ['leads'] });
                  queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
                  
                  toast({
                    title: 'Appointment cancelled',
                    description: 'The appointment has been cancelled, removed from calendar, and lead status updated to "Appointment Cancelled".',
                  });
                  
                  setAppointmentToCancel(null);
                } catch (error: any) {
                  console.error('Error cancelling appointment:', error);
                  toast({
                    title: 'Error',
                    description: error?.message || 'Failed to cancel appointment. Please try again.',
                    variant: 'destructive',
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Appointment Dialog */}
      <Dialog open={!!appointmentToReschedule} onOpenChange={(open) => !open && setAppointmentToReschedule(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
          </DialogHeader>
          {appointmentToReschedule && (
            <RescheduleForm
              appointment={appointmentToReschedule}
              onSuccess={() => {
                setAppointmentToReschedule(null);
                queryClient.invalidateQueries({ queryKey: ['appointments'] });
                queryClient.invalidateQueries({ queryKey: ['leads'] });
              }}
              onCancel={() => setAppointmentToReschedule(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Appointment Form Component
const AppointmentForm = ({ onSuccess, leadId, initialStartTime, initialEndTime }: { 
  onSuccess: () => void;
  leadId?: string;
  initialStartTime?: string;
  initialEndTime?: string;
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: initialStartTime ? format(new Date(initialStartTime), "yyyy-MM-dd'T'HH:mm") : '',
    end_time: initialEndTime ? format(new Date(initialEndTime), "yyyy-MM-dd'T'HH:mm") : '',
    location: '',
    client_id: '',
    lead_id: leadId || '',
  });
  const queryClient = useQueryClient();

  // Fetch leads for selection
  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, address, city, state')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !leadId, // Only fetch if no lead_id provided
  });

  // If lead_id is provided, fetch lead details
  const { data: selectedLead } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });

  // Auto-fill form when lead is selected or initial times are provided
  useEffect(() => {
    if (selectedLead && !formData.title) {
      const location = selectedLead.address 
        ? `${selectedLead.address}${selectedLead.city ? `, ${selectedLead.city}` : ''}${selectedLead.state ? `, ${selectedLead.state}` : ''}`
        : '';
      
      setFormData(prev => ({
        ...prev,
        title: `Appointment with ${selectedLead.name}`,
        description: `Roofing consultation for ${selectedLead.roof_type || 'roofing project'}`,
        location: location,
      }));
    }
    
    // Set initial times if provided
    if (initialStartTime && !formData.start_time) {
      const startDate = new Date(initialStartTime);
      const endDate = initialEndTime ? new Date(initialEndTime) : new Date(startDate.getTime() + 60 * 60 * 1000);
      
      setFormData(prev => ({
        ...prev,
        start_time: format(startDate, "yyyy-MM-dd'T'HH:mm"),
        end_time: format(endDate, "yyyy-MM-dd'T'HH:mm"),
      }));
    }
  }, [selectedLead, initialStartTime, initialEndTime]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const appointmentData: any = {
        title: formData.title,
        description: formData.description,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        location: formData.location || null,
        assigned_to: user?.id || null,
        status: 'scheduled',
        reminder_sent: false,
      };

      // Link to lead if provided
      if (formData.lead_id) {
        appointmentData.lead_id = formData.lead_id;
        
        // Update lead's appointment_date
        await supabase
          .from('leads')
          .update({ 
            appointment_date: new Date(formData.start_time).toISOString(),
            booked_at: new Date().toISOString(),
            status: 'booked',
            updated_at: new Date().toISOString(),
          })
          .eq('id', formData.lead_id);
      }

      // Link to client if provided
      if (formData.client_id) {
        appointmentData.client_id = formData.client_id;
      }

      const { data, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select();

      if (error) {
        console.error('Error creating appointment in Supabase:', error);
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          throw new Error('Database tables not set up. Please run supabase/schema.sql in Supabase SQL Editor.');
        }
        throw error;
      }

      console.log('Appointment saved to Supabase:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Appointment scheduled',
        description: formData.lead_id 
          ? 'Appointment created and linked to lead. Lead status updated to "Booked".'
          : 'New appointment has been created successfully.',
      });
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!leadId && (
        <div className="space-y-2">
          <Label htmlFor="lead_id">Link to Lead (Optional)</Label>
          <Select
            value={formData.lead_id}
            onValueChange={(value) => {
              setFormData({ ...formData, lead_id: value });
              // Find selected lead and auto-fill
              const lead = leads?.find((l: Lead) => l.id === value);
              if (lead) {
                const typedLead = lead as Lead;
                setFormData(prev => ({
                  ...prev,
                  lead_id: value,
                  title: `Appointment with ${typedLead.name}`,
                  description: `Roofing consultation for ${typedLead.roof_type || 'roofing project'}`,
                  location: typedLead.address 
                    ? `${typedLead.address}${typedLead.city ? `, ${typedLead.city}` : ''}${typedLead.state ? `, ${typedLead.state}` : ''}`
                    : '',
                }));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a lead (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No lead selected</SelectItem>
              {leads?.map((lead: Lead) => (
                <SelectItem key={lead.id} value={lead.id}>
                  {lead.name} - {lead.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {selectedLead && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
          <p className="text-sm font-medium">Linked to Lead:</p>
          <p className="text-sm">{selectedLead.name} - {selectedLead.email}</p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start_time">Start Time *</Label>
          <Input
            id="start_time"
            type="datetime-local"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_time">End Time *</Label>
          <Input
            id="end_time"
            type="datetime-local"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
        />
      </div>
      <Button type="submit" className="w-full" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Scheduling...' : 'Schedule Appointment'}
      </Button>
    </form>
  );
};

// Reschedule Appointment Form Component
const RescheduleForm = ({ 
  appointment, 
  onSuccess, 
  onCancel 
}: { 
  appointment: Appointment; 
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  // Initialize with rounded times
  const initialStartTime = appointment.start_time 
    ? roundTo30Minutes(new Date(appointment.start_time))
    : new Date();
  const initialEndTime = new Date(initialStartTime.getTime() + 60 * 60 * 1000);
  
  const [formData, setFormData] = useState({
    start_time: format(initialStartTime, "yyyy-MM-dd'T'HH:mm"),
    end_time: format(initialEndTime, "yyyy-MM-dd'T'HH:mm"),
  });
  const queryClient = useQueryClient();

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      const inputStartTime = new Date(formData.start_time);
      
      if (isNaN(inputStartTime.getTime())) {
        throw new Error('Invalid date/time provided');
      }

      // Round to nearest 30-minute interval
      const startTime = roundTo30Minutes(inputStartTime);
      // Appointments last exactly 1 hour
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      // Check if time slot is available (excluding the appointment we're rescheduling)
      const isAvailable = await isTimeSlotAvailable(startTime, endTime, appointment.id);
      if (!isAvailable) {
        throw new Error(`Time slot ${format(startTime, 'MMM d, yyyy h:mm a')} - ${format(endTime, 'h:mm a')} is already booked. Please choose another time.`);
      }

      // Update appointment
      const { error: aptError } = await supabase
        .from('appointments')
        .update({
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointment.id);

      if (aptError) throw aptError;

      // Update linked lead's appointment_date and status if exists
      if (appointment.lead_id) {
        // First, get the current lead to check its status
        const { data: currentLead, error: fetchError } = await supabase
          .from('leads')
          .select('status, booked_at')
          .eq('id', appointment.lead_id)
          .single();

        if (fetchError) {
          console.error('Error fetching lead:', fetchError);
        }

        // Prepare update data
        const leadUpdateData: any = {
          appointment_date: startTime.toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Automatically update status to 'booked' when appointment is rescheduled
        // Always set to 'booked' when rescheduling, regardless of current status
        leadUpdateData.status = 'booked';
        // Set booked_at if not already set
        if (!currentLead?.booked_at) {
          leadUpdateData.booked_at = new Date().toISOString();
        }

        const { error: leadError } = await supabase
          .from('leads')
          .update(leadUpdateData)
          .eq('id', appointment.lead_id);

        if (leadError) {
          console.error('Error updating lead appointment_date and status:', leadError);
          // Don't throw - appointment was updated successfully
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Appointment rescheduled',
        description: 'The appointment has been rescheduled and the lead\'s appointment date has been updated.',
      });
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Error rescheduling appointment:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to reschedule appointment. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reschedule-start">New Start Date & Time</Label>
        <Input
          id="reschedule-start"
          type="datetime-local"
          step="1800"
          value={formData.start_time}
          onChange={(e) => {
            const value = e.target.value;
            if (!value) {
              setFormData({ start_time: '', end_time: '' });
              return;
            }
            // Round to 30-minute interval when user selects a time
            const selectedDate = new Date(value);
            if (!isNaN(selectedDate.getTime())) {
              const rounded = roundTo30Minutes(selectedDate);
              const roundedValue = format(rounded, "yyyy-MM-dd'T'HH:mm");
              // End time is automatically 1 hour after start time
              const endTime = new Date(rounded.getTime() + 60 * 60 * 1000);
              const endTimeValue = format(endTime, "yyyy-MM-dd'T'HH:mm");
              setFormData({ start_time: roundedValue, end_time: endTimeValue });
            } else {
              setFormData(prev => ({ ...prev, start_time: value }));
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
                const endTime = new Date(rounded.getTime() + 60 * 60 * 1000);
                const endTimeValue = format(endTime, "yyyy-MM-dd'T'HH:mm");
                setFormData({ start_time: roundedValue, end_time: endTimeValue });
              }
            }
          }}
        />
        <p className="text-xs text-muted-foreground">
          Appointments are scheduled in 30-minute intervals (e.g., 1:00 PM, 1:30 PM, 2:00 PM) and last 1 hour
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reschedule-end">End Date & Time (Auto-calculated)</Label>
        <Input
          id="reschedule-end"
          type="datetime-local"
          step="1800"
          value={formData.end_time}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          End time is automatically set to 1 hour after start time
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={() => rescheduleMutation.mutate()}
          disabled={rescheduleMutation.isPending || !formData.start_time || !formData.end_time}
        >
          {rescheduleMutation.isPending ? 'Rescheduling...' : 'Reschedule Appointment'}
        </Button>
      </div>
    </div>
  );
};

export default Appointments;


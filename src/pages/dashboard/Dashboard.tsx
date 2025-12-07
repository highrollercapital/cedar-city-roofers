import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calendar,
  FolderKanban,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Target,
  ArrowRight,
  Activity,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = () => {
  const { user, isAdmin, isRoofer } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      if (isAdmin || isRoofer) {
        // Admin/Roofer stats
        const [leadsRes, activeDealsRes, projectsRes, upcomingApptsRes, cancelledApptsRes, profitsRes] = await Promise.all([
          supabase.from('leads').select('id, status', { count: 'exact' }),
          supabase
            .from('leads')
            .select('project_total, profit_total, status')
            .in('status', ['in_progress', 'completed', 'closed']),
          supabase.from('projects').select('id, stage', { count: 'exact' }),
          supabase
            .from('appointments')
            .select('id, start_time, status')
            .eq('status', 'scheduled')
            .not('lead_id', 'is', null)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true }),
          supabase
            .from('leads')
            .select('id, status')
            .eq('status', 'appointment_cancelled'),
          supabase
            .from('leads')
            .select('profit_total, profit_percentage, project_total, status')
            .in('status', ['in_progress', 'completed', 'closed']),
        ]);

        const totalLeads = leadsRes.count || 0;
        // Count projects with stage 'in_progress'
        const activeProjectsFromProjects = projectsRes.data?.filter((p) => p.stage === 'in_progress').length || 0;
        // Count leads with status 'in_progress'
        const activeProjectsFromLeads = leadsRes.data?.filter((l) => l.status === 'in_progress').length || 0;
        // Total active projects = projects + leads with in_progress status
        const activeProjects = activeProjectsFromProjects + activeProjectsFromLeads;
        const upcomingAppointments = upcomingApptsRes.data || [];
        const cancelledAppointments = cancelledApptsRes.data || []; // This now contains leads with appointment_cancelled status

        // Calculate revenue from in_progress, completed, and closed leads
        const totalRevenue = activeDealsRes.data?.reduce(
          (sum, lead) => sum + (Number(lead.project_total) || 0),
          0
        ) || 0;

        // Calculate total profits from in_progress, completed, and closed leads
        const totalProfits = profitsRes.data?.reduce(
          (sum, lead) => sum + (Number(lead.profit_total) || 0),
          0
        ) || 0;

        // Calculate average profit percentage
        const leadsWithProfitPct = profitsRes.data?.filter((l) => l.profit_percentage != null) || [];
        const avgProfitPercentage = leadsWithProfitPct.length > 0
          ? leadsWithProfitPct.reduce((sum, lead) => sum + (Number(lead.profit_percentage) || 0), 0) / leadsWithProfitPct.length
          : 0;

        // Calculate conversion rate: (closed/completed/in_progress leads) / total leads
        const convertedLeads = leadsRes.data?.filter((l) => 
          ['in_progress', 'completed', 'closed'].includes(l.status)
        ).length || 0;
        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

        return {
          totalLeads,
          activeProjects,
          totalRevenue,
          totalProfits,
          avgProfitPercentage,
          upcomingAppointments: upcomingAppointments.length,
          cancelledAppointments: cancelledAppointments.length,
          conversionRate,
        };
      } else {
        // Client stats
        const [projectsRes, appointmentsRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, stage, name')
            .eq('client_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('appointments')
            .select('id, title, start_time')
            .eq('client_id', user.id)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(5),
        ]);

        const myProjects = projectsRes.data || [];
        const upcomingAppointments = appointmentsRes.data || [];

        return {
          myProjects,
          upcomingAppointments,
        };
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Real-time subscriptions for appointments
  useEffect(() => {
    if (!user || (!isAdmin && !isRoofer)) return;

    const appointmentsChannel = supabase
      .channel('dashboard-appointments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .subscribe();

    const leadsChannel = supabase
      .channel('dashboard-leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          // If appointment_date changed, also update appointments calendar
          if ((payload.new as any)?.appointment_date || (payload.old as any)?.appointment_date) {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [user, isAdmin, isRoofer, queryClient]);

  if (isLoading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  if (isAdmin || isRoofer) {
    return (
      <div className="space-y-8 p-6 bg-background min-h-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, <span className="font-semibold text-foreground">{user?.full_name || 'User'}</span>! Here's what's happening today.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            <Activity className="h-3 w-3 mr-2 animate-pulse" />
            Live Updates
          </Badge>
        </div>

        {/* Main Stats Grid - 4 columns for better balance */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card 
            className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50"
            onClick={() => navigate('/dashboard/leads')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{stats?.totalLeads || 0}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                All leads in the system
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>

          <Card 
            className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50"
            onClick={() => navigate('/dashboard/projects')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                <FolderKanban className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{stats?.activeProjects || 0}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                Projects and leads in progress
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>

          <Card 
            className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50"
            onClick={() => navigate('/dashboard/leads')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                ${(stats?.totalRevenue || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                From active deals
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>

          <Card 
            className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50"
            onClick={() => navigate('/dashboard/appointments')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center group-hover:bg-cyan-200 dark:group-hover:bg-cyan-900/50 transition-colors">
                <Calendar className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1 text-cyan-600 dark:text-cyan-400">
                {Array.isArray(stats?.upcomingAppointments) ? stats.upcomingAppointments.length : (stats?.upcomingAppointments || 0)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                Scheduled appointments
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Profits & Performance Section - 2 columns for better balance */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profits</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-green-200 dark:bg-green-900/50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-700 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-700 dark:text-green-400 mb-2">
                ${(stats?.totalProfits || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Real-time
                </Badge>
                <p className="text-xs text-muted-foreground">
                  From in progress, completed & closed deals
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Profit %</CardTitle>
              <div className="h-10 w-10 rounded-lg bg-purple-200 dark:bg-purple-900/50 flex items-center justify-center">
                <Target className="h-5 w-5 text-purple-700 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-700 dark:text-purple-400 mb-2">
                {(stats?.avgProfitPercentage || 0).toFixed(1)}%
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Real-time
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Average across all active deals
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Metrics Grid - 3 columns evenly spaced */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card 
            className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer"
            onClick={() => navigate('/dashboard/appointments')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
              <div className="h-9 w-9 rounded-lg bg-blue-200 dark:bg-blue-900/50 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {Array.isArray(stats?.upcomingAppointments) ? stats.upcomingAppointments.length : (stats?.upcomingAppointments || 0)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                Scheduled appointments
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled Appointments</CardTitle>
              <div className="h-9 w-9 rounded-lg bg-red-200 dark:bg-red-900/50 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                {stats?.cancelledAppointments || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Leads with cancelled appointments
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <div className="h-9 w-9 rounded-lg bg-green-200 dark:bg-green-900/50 flex items-center justify-center">
                <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                {(stats?.conversionRate || 0).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Leads converted to projects
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Client view
  return (
    <div className="space-y-8 p-6 bg-background min-h-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">My Projects</h1>
          <p className="text-muted-foreground mt-2">
            Track your roofing projects and appointments
          </p>
        </div>
      </div>

      {stats?.myProjects && stats.myProjects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.myProjects.map((project: any) => (
            <Card 
              key={project.id}
              className="group hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`/dashboard/projects/${project.id}`)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  {project.stage === 'completed' ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : project.stage === 'in_progress' ? (
                    <Clock className="h-6 w-6 text-blue-500" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-yellow-500" />
                  )}
                </div>
                <CardDescription>Project Status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={project.stage === 'completed' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {project.stage.replace('_', ' ')}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderKanban className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No projects yet. Contact us to get started!</p>
          </CardContent>
        </Card>
      )}

      {Array.isArray(stats?.upcomingAppointments) && stats.upcomingAppointments.length > 0 && (
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle>Upcoming Appointments</CardTitle>
            </div>
            <CardDescription>Your scheduled appointments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats.upcomingAppointments as Array<{id: string; title: string; start_time: string}>).map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{apt.title}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(apt.start_time), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;


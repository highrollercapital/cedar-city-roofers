import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar, Target } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const Revenue = () => {
  const queryClient = useQueryClient();

  // Fetch revenue data - ONLY completed leads
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['revenue'],
    queryFn: async () => {
      // Fetch only completed leads
      const { data: leads, error } = await supabase
        .from('leads')
        .select('project_total, profit_total, profit_percentage, status, updated_at, created_at')
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Calculate monthly revenue
      const monthlyData: Record<string, { month: string; revenue: number; projects: number; profit: number }> = {};
      const last12Months = Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(new Date(), i);
        return format(date, 'MMM yyyy');
      }).reverse();

      last12Months.forEach((month) => {
        monthlyData[month] = { month, revenue: 0, projects: 0, profit: 0 };
      });

      // Process each completed lead
      leads?.forEach((lead: any) => {
        // Use updated_at as the completion date (when status was changed to completed)
        // Fallback to created_at if updated_at is not available
        const completionDate = lead.updated_at ? new Date(lead.updated_at) : new Date(lead.created_at);
        const month = format(completionDate, 'MMM yyyy');
        
        if (monthlyData[month]) {
          const revenue = Number(lead.project_total) || 0;
          const profit = Number(lead.profit_total) || 0;
          
          monthlyData[month].revenue += revenue;
          monthlyData[month].profit += profit;
          monthlyData[month].projects += 1;
        }
      });

      const chartData = Object.values(monthlyData);

      // Calculate totals from completed leads only
      const completedProjects = leads?.length || 0;
      const totalRevenue = leads?.reduce(
        (sum, lead: any) => sum + (Number(lead.project_total) || 0),
        0
      ) || 0;
      
      // Calculate total profits
      const totalProfit = leads?.reduce(
        (sum, lead: any) => sum + (Number(lead.profit_total) || 0),
        0
      ) || 0;

      // This month's revenue
      const thisMonthStart = startOfMonth(new Date());
      const thisMonthEnd = endOfMonth(new Date());
      const thisMonthRevenue =
        leads?.filter((lead: any) => {
          const completionDate = lead.updated_at ? new Date(lead.updated_at) : new Date(lead.created_at);
          return completionDate >= thisMonthStart && completionDate <= thisMonthEnd;
        }).reduce((sum, lead: any) => sum + (Number(lead.project_total) || 0), 0) || 0;

      return {
        chartData,
        totalRevenue,
        totalProfit,
        completedProjects,
        thisMonthRevenue,
      };
    },
  });

  // Set up real-time subscription for leads table (completed status only)
  useEffect(() => {
    const channel = supabase
      .channel('revenue-leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: 'status=eq.completed',
        },
        () => {
          // Invalidate when completed leads change
          queryClient.invalidateQueries({ queryKey: ['revenue'] });
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
          // Also listen for status changes (when a lead becomes completed)
          if (payload.new && (payload.new as any).status === 'completed') {
            queryClient.invalidateQueries({ queryKey: ['revenue'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (isLoading) {
    return <div className="text-center py-12">Loading revenue data...</div>;
  }

  return (
    <div className="space-y-6 bg-background min-h-full">
      <div>
        <h1 className="text-3xl font-bold">Revenue & Performance</h1>
        <p className="text-muted-foreground">Track your revenue and business metrics from completed leads</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(revenueData?.totalRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(revenueData?.thisMonthRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Current month revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Projects</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueData?.completedProjects || 0}</div>
            <p className="text-xs text-muted-foreground">
              Completed leads only
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(revenueData?.totalProfit || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">From completed leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue</CardTitle>
          <CardDescription>Revenue trends over the last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData?.chartData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue ($)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Projects Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Leads Completed</CardTitle>
          <CardDescription>Number of leads completed per month</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData?.chartData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="projects" fill="#82ca9d" name="Projects" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Revenue;


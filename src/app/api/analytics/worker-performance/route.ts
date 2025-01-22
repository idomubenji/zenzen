import { NextRequest } from 'next/server';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';

interface WorkerPerformanceMetrics {
  workerId: string;
  name: string;
  email: string;
  role: string;
  metrics: {
    totalTickets: number;
    resolvedTickets: number;
    avgResolutionTime: number;
    avgFirstResponseTime: number;
    avgSatisfactionScore: number;
    reopenRate: number;
    totalMessages: number;
    avgMessagesPerTicket: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get user role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: { message: 'User not found' } },
        { status: 404 }
      );
    }

    // Only administrators can access worker performance metrics
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can access worker performance metrics' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';
    const teamId = searchParams.get('teamId');

    // Calculate the start date based on time range
    let startDate = new Date();
    switch (timeRange) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get all workers
    let workersQuery = supabase
      .from('users')
      .select('id, name, role')
      .eq('role', 'Worker');

    // Apply team filter if provided
    if (teamId) {
      // First get the user IDs for the team
      const { data: teamMembers } = await supabase
        .from('user_teams')
        .select('user_id')
        .eq('team_id', teamId);

      if (teamMembers) {
        const validUserIds = teamMembers.map((m: { user_id: string | null }) => m.user_id).filter((id: string | null): id is string => id !== null);
        workersQuery = workersQuery.in('id', validUserIds);
      }
    }

    const { data: workers, error: workersError } = await workersQuery;

    if (workersError || !workers) {
      return NextResponse.json(
        { error: { message: 'Error fetching workers' } },
        { status: 400 }
      );
    }

    const performanceMetrics: WorkerPerformanceMetrics[] = [];

    // Calculate metrics for each worker
    for (const worker of workers) {
      // Get tickets assigned to worker
      const { data: tickets, count: totalTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact' })
        .eq('assigned_to', worker.id)
        .gte('created_at', startDate.toISOString());

      if (!tickets) continue;

      // Calculate ticket metrics
      let totalResolutionTime = 0;
      let totalFirstResponseTime = 0;
      let ticketsWithResolution = 0;
      let ticketsWithResponse = 0;
      let totalReopens = 0;

      tickets.forEach((ticket: Database['public']['Tables']['tickets']['Row']) => {
        if (ticket.resolved_at) {
          const resolutionTime = new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime();
          totalResolutionTime += resolutionTime;
          ticketsWithResolution++;
        }

        if (ticket.first_response_at) {
          const responseTime = new Date(ticket.first_response_at).getTime() - new Date(ticket.created_at).getTime();
          totalFirstResponseTime += responseTime;
          ticketsWithResponse++;
        }

        totalReopens += ticket.reopen_count || 0;
      });

      // Get feedback for worker's tickets
      const { data: feedback } = await supabase
        .from('feedback')
        .select('score')
        .in('ticket_id', tickets.map((t: Database['public']['Tables']['tickets']['Row']) => t.id));

      // Get messages by worker
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', worker.id)
        .gte('created_at', startDate.toISOString());

      performanceMetrics.push({
        workerId: worker.id,
        name: worker.name || '',
        email: '',
        role: worker.role,
        metrics: {
          totalTickets: totalTickets || 0,
          resolvedTickets: tickets.filter((t: Database['public']['Tables']['tickets']['Row']) => t.status === 'RESOLVED').length,
          avgResolutionTime: ticketsWithResolution ? totalResolutionTime / ticketsWithResolution : 0,
          avgFirstResponseTime: ticketsWithResponse ? totalFirstResponseTime / ticketsWithResponse : 0,
          avgSatisfactionScore: feedback?.length ? 
            feedback.reduce((sum: number, f: { score: number | null }) => sum + (f.score ?? 0), 0) / feedback.length : 0,
          reopenRate: totalTickets ? (totalReopens / totalTickets) * 100 : 0,
          totalMessages: messages?.length || 0,
          avgMessagesPerTicket: messages?.length && totalTickets ? 
            messages.length / totalTickets : 0
        }
      });
    }

    // Sort workers by resolved tickets (can be changed based on requirements)
    performanceMetrics.sort((a, b) => b.metrics.resolvedTickets - a.metrics.resolvedTickets);

    return NextResponse.json({
      timeRange,
      performanceMetrics
    });
  } catch (error) {
    console.error('Error fetching worker performance:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 
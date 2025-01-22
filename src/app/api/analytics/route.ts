import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

interface TicketMetrics {
  total: number;
  resolved: number;
  unresolved: number;
  inProgress: number;
  unopened: number;
  avgFirstResponseTime: number;
  avgResolutionTime: number;
  reopenRate: number;
  avgSatisfactionScore?: number;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { session } } = await supabaseAuth.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get user role
    const { data: userData, error: userError } = await supabaseServer
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

    // Only administrators and workers can access analytics
    if (!['Administrator', 'Worker'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Only administrators and workers can access analytics' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const teamId = searchParams.get('teamId');
    const workerId = searchParams.get('workerId');

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
        startDate.setHours(startDate.getHours() - 24);
    }

    // Base query for tickets
    let ticketQuery = supabaseServer
      .from('tickets')
      .select('*', { count: 'exact' })
      .gte('created_at', startDate.toISOString());

    // Apply team filter if provided
    if (teamId) {
      ticketQuery = ticketQuery.eq('assigned_team', teamId);
    }

    // Apply worker filter if provided
    if (workerId) {
      ticketQuery = ticketQuery.eq('assigned_to', workerId);
    }

    // Get tickets data
    const { data: tickets, error: ticketError, count: totalTickets } = await ticketQuery;

    if (ticketError) {
      return NextResponse.json(
        { error: { message: ticketError.message } },
        { status: 400 }
      );
    }

    // Calculate ticket metrics
    const ticketMetrics: TicketMetrics = {
      total: totalTickets || 0,
      resolved: tickets?.filter(t => t.status === 'RESOLVED').length || 0,
      unresolved: tickets?.filter(t => t.status === 'UNRESOLVED').length || 0,
      inProgress: tickets?.filter(t => t.status === 'IN PROGRESS').length || 0,
      unopened: tickets?.filter(t => t.status === 'UNOPENED').length || 0,
      avgFirstResponseTime: 0,
      avgResolutionTime: 0,
      reopenRate: 0
    };

    // Calculate average response and resolution times
    let totalFirstResponseTime = 0;
    let totalResolutionTime = 0;
    let ticketsWithResponse = 0;
    let ticketsWithResolution = 0;
    let totalReopens = 0;

    tickets?.forEach(ticket => {
      if (ticket.first_response_at) {
        const responseTime = new Date(ticket.first_response_at).getTime() - new Date(ticket.created_at).getTime();
        totalFirstResponseTime += responseTime;
        ticketsWithResponse++;
      }

      if (ticket.resolved_at) {
        const resolutionTime = new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime();
        totalResolutionTime += resolutionTime;
        ticketsWithResolution++;
      }

      totalReopens += ticket.reopen_count || 0;
    });

    ticketMetrics.avgFirstResponseTime = ticketsWithResponse ? totalFirstResponseTime / ticketsWithResponse : 0;
    ticketMetrics.avgResolutionTime = ticketsWithResolution ? totalResolutionTime / ticketsWithResolution : 0;
    ticketMetrics.reopenRate = totalTickets ? (totalReopens / totalTickets) * 100 : 0;

    // Get feedback metrics
    const { data: feedback, error: feedbackError } = await supabaseServer
      .from('feedback')
      .select('score')
      .gte('created_at', startDate.toISOString());

    if (!feedbackError && feedback) {
      const totalScore = feedback.reduce((sum, f) => sum + (f.score ?? 0), 0);
      ticketMetrics.avgSatisfactionScore = feedback.length ? totalScore / feedback.length : 0;
    }

    // Get performance metrics from monitoring tables
    const { data: queryPerf } = await supabaseServer
      .from('query_performance_logs')
      .select('*')
      .gte('timestamp', startDate.toISOString());

    const { data: syncPerf } = await supabaseServer
      .from('realtime_sync_logs')
      .select('*')
      .gte('timestamp', startDate.toISOString());

    const { data: uploadPerf } = await supabaseServer
      .from('file_upload_logs')
      .select('*')
      .gte('timestamp', startDate.toISOString());

    // Calculate performance metrics
    const performanceMetrics = {
      avgQueryTime: queryPerf?.length ? 
        queryPerf.reduce((sum, q) => sum + (q.execution_time_ms ?? 0), 0) / queryPerf.length : 0,
      avgSyncDelay: syncPerf?.length ?
        syncPerf.reduce((sum, s) => sum + (s.sync_delay_ms ?? 0), 0) / syncPerf.length : 0,
      avgUploadTime: uploadPerf?.length ?
        uploadPerf.reduce((sum, u) => sum + (u.upload_duration_ms ?? 0), 0) / uploadPerf.length : 0,
      avgFileSize: uploadPerf?.length ?
        uploadPerf.reduce((sum, u) => sum + (u.file_size_bytes ?? 0), 0) / uploadPerf.length : 0
    };

    // Get worker performance metrics if worker ID is provided
    let workerMetrics = null;
    if (workerId) {
      const { data: workerMessages } = await supabaseServer
        .from('messages')
        .select('*')
        .eq('user_id', workerId)
        .gte('created_at', startDate.toISOString());

      workerMetrics = {
        totalMessages: workerMessages?.length || 0,
        avgMessagesPerTicket: workerMessages?.length && totalTickets ? 
          workerMessages.length / totalTickets : 0
      };
    }

    return NextResponse.json({
      timeRange,
      ticketMetrics,
      performanceMetrics,
      ...(workerMetrics && { workerMetrics })
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 
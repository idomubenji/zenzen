import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type Ticket = Database['public']['Tables']['tickets']['Row'];

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
        { error: { message: 'Failed to get user role' } },
        { status: 500 }
      );
    }

    // Only allow admin and manager roles
    if (!['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
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
    let ticketQuery = supabase
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
        { error: { message: 'Failed to get tickets' } },
        { status: 500 }
      );
    }

    // Calculate ticket metrics
    const ticketMetrics: TicketMetrics = {
      total: totalTickets || 0,
      resolved: tickets?.filter((ticket: Ticket) => ticket.status === 'resolved').length || 0,
      unresolved: tickets?.filter((ticket: Ticket) => ticket.status === 'unresolved').length || 0,
      inProgress: tickets?.filter((ticket: Ticket) => ticket.status === 'in_progress').length || 0,
      unopened: tickets?.filter((ticket: Ticket) => ticket.status === 'unopened').length || 0,
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

    tickets?.forEach((ticket: Ticket) => {
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
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .select('score')
      .gte('created_at', startDate.toISOString());

    if (!feedbackError && feedback) {
      const totalScore = feedback.reduce((sum: number, f: { score: number | null }) => sum + (f.score ?? 0), 0);
      ticketMetrics.avgSatisfactionScore = feedback.length ? totalScore / feedback.length : 0;
    }

    // Get performance metrics from monitoring tables
    const { data: queryPerf } = await supabase
      .from('query_performance_logs')
      .select('*')
      .gte('timestamp', startDate.toISOString());

    const { data: syncPerf } = await supabase
      .from('realtime_sync_logs')
      .select('*')
      .gte('timestamp', startDate.toISOString());

    const { data: uploadPerf } = await supabase
      .from('file_upload_logs')
      .select('*')
      .gte('timestamp', startDate.toISOString());

    // Calculate performance metrics
    const performanceMetrics = {
      avgQueryTime: queryPerf?.length ? 
        queryPerf.reduce((sum: number, q: Database['public']['Tables']['query_performance_logs']['Row']) => sum + (q.execution_time_ms ?? 0), 0) / queryPerf.length : 0,
      avgSyncDelay: syncPerf?.length ?
        syncPerf.reduce((sum: number, s: Database['public']['Tables']['realtime_sync_logs']['Row']) => sum + (s.sync_delay_ms ?? 0), 0) / syncPerf.length : 0,
      avgUploadTime: uploadPerf?.length ?
        uploadPerf.reduce((sum: number, u: Database['public']['Tables']['file_upload_logs']['Row']) => sum + (u.upload_duration_ms ?? 0), 0) / uploadPerf.length : 0,
      avgFileSize: uploadPerf?.length ?
        uploadPerf.reduce((sum: number, u: Database['public']['Tables']['file_upload_logs']['Row']) => sum + (u.file_size_bytes ?? 0), 0) / uploadPerf.length : 0
    };

    // Get worker performance metrics if worker ID is provided
    let workerMetrics = null;
    if (workerId) {
      const { data: workerMessages } = await supabase
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
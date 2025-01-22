import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV || '';
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

interface TeamPerformanceMetrics {
  teamId: string;
  name: string;
  focusArea: string | null;
  memberCount: number;
  metrics: {
    totalTickets: number;
    resolvedTickets: number;
    avgResolutionTime: number;
    avgFirstResponseTime: number;
    avgSatisfactionScore: number;
    reopenRate: number;
    ticketsPerMember: number;
  };
}

export async function GET(request: Request) {
  try {
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

    // Only administrators can access team performance metrics
    if (userData.role !== 'Administrator') {
      return NextResponse.json(
        { error: { message: 'Only administrators can access team performance metrics' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';

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

    // Get all teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*');

    if (teamsError || !teams) {
      return NextResponse.json(
        { error: { message: 'Error fetching teams' } },
        { status: 400 }
      );
    }

    const performanceMetrics: TeamPerformanceMetrics[] = [];

    // Calculate metrics for each team
    for (const team of teams) {
      // Get team members
      const { data: teamMembers } = await supabase
        .from('user_teams')
        .select('user_id')
        .eq('team_id', team.id);

      const memberIds = teamMembers?.map(m => m.user_id) || [];

      // Get tickets assigned to team
      const { data: tickets, count: totalTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact' })
        .eq('assigned_team', team.id)
        .gte('created_at', startDate.toISOString());

      if (!tickets) continue;

      // Calculate ticket metrics
      let totalResolutionTime = 0;
      let totalFirstResponseTime = 0;
      let ticketsWithResolution = 0;
      let ticketsWithResponse = 0;
      let totalReopens = 0;

      tickets.forEach(ticket => {
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

      // Get feedback for team's tickets
      const { data: feedback } = await supabase
        .from('feedback')
        .select('score')
        .in('ticket_id', tickets.map(t => t.id));

      performanceMetrics.push({
        teamId: team.id,
        name: team.name,
        focusArea: team.focus_area,
        memberCount: memberIds.length,
        metrics: {
          totalTickets: totalTickets || 0,
          resolvedTickets: tickets.filter(t => t.status === 'RESOLVED').length,
          avgResolutionTime: ticketsWithResolution ? totalResolutionTime / ticketsWithResolution : 0,
          avgFirstResponseTime: ticketsWithResponse ? totalFirstResponseTime / ticketsWithResponse : 0,
          avgSatisfactionScore: feedback?.length ? 
            feedback.reduce((sum, f) => sum + (f.score ?? 0), 0) / feedback.length : 0,
          reopenRate: totalTickets ? (totalReopens / totalTickets) * 100 : 0,
          ticketsPerMember: memberIds.length ? (totalTickets || 0) / memberIds.length : 0
        }
      });
    }

    // Sort teams by resolved tickets (can be changed based on requirements)
    performanceMetrics.sort((a, b) => b.metrics.resolvedTickets - a.metrics.resolvedTickets);

    return NextResponse.json({
      timeRange,
      performanceMetrics
    });
  } catch (error) {
    console.error('Error fetching team performance:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
} 
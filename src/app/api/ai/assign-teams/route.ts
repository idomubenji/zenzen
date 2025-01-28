import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

export async function POST(request: Request) {
  try {
    const { ticketId } = await request.json();

    if (!ticketId) {
      return Response.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // Fetch the ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return Response.json({ error: 'Failed to fetch ticket' }, { status: 404 });
    }

    // Fetch all teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*');

    if (teamsError || !teams) {
      return Response.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    // Prepare the prompt for GPT
    const prompt = `Given this ticket:
Title: ${ticket.title}
Description: ${ticket.ai_description || 'No description provided'}
Tags: ${ticket.tags ? ticket.tags.join(', ') : 'No tags'}

And these teams:
${teams.map(team => `- ${team.name}${team.focus_area ? ` (Focus: ${team.focus_area})` : ''}`).join('\n')}

Please analyze the ticket and select the most appropriate team to handle it. Consider the team's focus area and the ticket's content. Respond with just the team name, nothing else.`;

    // Get GPT's recommendation
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
    });

    const recommendedTeamName = completion.choices[0].message.content?.trim();
    const recommendedTeam = teams.find(team => team.name === recommendedTeamName);

    if (!recommendedTeam) {
      return Response.json({ error: 'Could not match GPT recommendation to a team' }, { status: 500 });
    }

    // Update the ticket with the recommended team
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ assigned_team: recommendedTeam.id })
      .eq('id', ticketId);

    if (updateError) {
      return Response.json({ error: 'Failed to update ticket' }, { status: 500 });
    }

    return Response.json({ team: recommendedTeam });
  } catch (error) {
    console.error('Error in assign-teams:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

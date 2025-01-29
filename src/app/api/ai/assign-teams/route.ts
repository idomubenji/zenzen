import { createClient } from '@supabase/supabase-js';
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Set the project name for LangSmith tracing
process.env.LANGCHAIN_PROJECT = process.env.LANGSMITH_PROJECT || "zenzen";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create a prompt template for team assignment
const teamPrompt = PromptTemplate.fromTemplate(
  `Given this ticket:
Title: {title}
Description: {description}
Tags: {tags}

And these teams:
{teams}

Please analyze the ticket and select the most appropriate team to handle it. Consider the team's focus area and the ticket's content. Respond with just the team name, nothing else.`
);

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

    // Initialize the AI model with tracing
    const model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0,
    });

    // Get parent run name if it exists
    const parentRunName = request.headers.get('X-Parent-Run');

    // Create the chain
    const chain = teamPrompt
      .pipe(model)
      .pipe(new StringOutputParser())
      .withConfig({ 
        runName: "assign_team",
        metadata: { 
          ticketId,
          parentRun: parentRunName || undefined
        }
      });

    // Generate team assignment with tracing
    const teamName = await chain.invoke({
      title: ticket.title,
      description: ticket.ai_description || 'No description provided',
      tags: ticket.tags ? ticket.tags.join(', ') : 'No tags',
      teams: teams.map(team => `- ${team.name}${team.focus_area ? ` (Focus: ${team.focus_area})` : ''}`).join('\n')
    });

    // Find the team ID from the name
    const assignedTeam = teams.find(t => t.name.toLowerCase() === teamName.toLowerCase());

    if (!assignedTeam) {
      return Response.json({ error: 'Invalid team name returned by AI' }, { status: 500 });
    }

    // Log the AI operation
    const { data: operation, error: operationError } = await supabase
      .from('ai_operations')
      .insert({
        ticket_id: ticketId,
        operation_type: 'assign_team',
        status: 'completed',
        metadata: {
          assigned_team: assignedTeam.name,
          team_id: assignedTeam.id
        }
      })
      .select()
      .single();

    if (operationError) {
      console.error('Failed to log AI operation:', operationError);
    }

    // Update the ticket with the assigned team
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ assigned_team: assignedTeam.id })
      .eq('id', ticketId);

    if (updateError) {
      return Response.json({ error: 'Failed to update ticket' }, { status: 500 });
    }

    return Response.json({ 
      team: assignedTeam,
      operation: operation || undefined
    });
  } catch (error) {
    console.error('Error in assign-team:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

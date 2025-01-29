import { createClient } from '@supabase/supabase-js';
import { RunnableSequence, RunnableLambda } from "@langchain/core/runnables";

// Enable LangSmith tracing
process.env.LANGCHAIN_TRACING_V2 = "true";
process.env.LANGCHAIN_PROJECT = process.env.LANGSMITH_PROJECT || "zenzen";
process.env.LANGCHAIN_ENDPOINT = process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com";
process.env.LANGCHAIN_API_KEY = process.env.LANGSMITH_API_KEY;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create individual operation runnables
const summarizeTicket = new RunnableLambda({
  func: async (input: { ticketId: string }) => {
    const response = await fetch('/api/ai/summarize-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: input.ticketId })
    });
    return response.json();
  }
}).withConfig({ runName: "summarize_ticket" });

const generateTags = new RunnableLambda({
  func: async (input: { ticketId: string }) => {
    const response = await fetch('/api/ai/generate-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: input.ticketId })
    });
    return response.json();
  }
}).withConfig({ runName: "generate_tags" });

const assignPriority = new RunnableLambda({
  func: async (input: { ticketId: string }) => {
    const response = await fetch('/api/ai/assign-priority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: input.ticketId })
    });
    return response.json();
  }
}).withConfig({ runName: "assign_priority" });

const assignTeam = new RunnableLambda({
  func: async (input: { ticketId: string }) => {
    const response = await fetch('/api/ai/assign-teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: input.ticketId })
    });
    return response.json();
  }
}).withConfig({ runName: "assign_team" });

const generateNote = new RunnableLambda({
  func: async (input: { ticketId: string }) => {
    const response = await fetch('/api/ai/generate-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: input.ticketId })
    });
    return response.json();
  }
}).withConfig({ runName: "generate_note" });

// Create the parallel operations chain
const parallelOperations = new RunnableLambda({
  func: async (input: { ticketId: string }) => {
    const [summary, tags, priority, team, notes] = await Promise.all([
      summarizeTicket.invoke(input),
      generateTags.invoke(input),
      assignPriority.invoke(input),
      assignTeam.invoke(input),
      generateNote.invoke(input)
    ]);
    return { summary, tags, priority, team, notes };
  }
}).withConfig({ runName: "parallel_operations" });

// Create the main Zainify chain
const zainifyChain = new RunnableLambda({
  func: async (input: { ticketId: string }) => {
    return parallelOperations.invoke(input);
  }
}).withConfig({ runName: "zainify" });

export async function POST(request: Request) {
  try {
    const { ticketId } = await request.json();

    if (!ticketId) {
      return Response.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // Run the Zainify chain with tracing
    const results = await zainifyChain.invoke(
      { ticketId },
      {
        metadata: { ticketId }
      }
    );

    // Log the Zainify operation
    const { error: operationError } = await supabase
      .from('ai_operations')
      .insert({
        ticket_id: ticketId,
        operation_type: 'zainify',
        status: 'completed',
        metadata: {
          summary_operation: results.summary?.operation?.id,
          tags_operation: results.tags?.operation?.id,
          priority_operation: results.priority?.operation?.id,
          team_operation: results.team?.operation?.id,
          notes_operation: results.notes?.operation?.id
        }
      });

    if (operationError) {
      console.error('Failed to log Zainify operation:', operationError);
      return Response.json(
        { error: 'Failed to log operation' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error in Zainify:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

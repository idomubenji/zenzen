import { ChatOpenAI } from "@langchain/openai";
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Set the project name for LangSmith tracing
process.env.LANGCHAIN_PROJECT = process.env.LANGSMITH_PROJECT || "zenzen";

const supabase = createServerClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    cookies: {
      get: () => undefined,
      set: () => {},
      remove: () => {},
    },
  }
);

// Create a prompt template for ticket summarization
const summaryPrompt = PromptTemplate.fromTemplate(
  `Summarize the following customer support ticket conversation in under 256 characters. 
   Focus on the main issue and outcome if resolved.
   
   Conversation:
   {conversation}
   
   Summary:`
);

export async function POST(request: Request) {
  let operation: any = null;
  const encoder = new TextEncoder();
  
  try {
    const { ticketId } = await request.json();

    if (!ticketId) {
      return Response.json(
        { success: false, error: "Ticket ID is required" },
        { status: 400 }
      );
    }

    // Log the operation start
    const { data: operationData, error: operationError } = await supabase
      .from('ai_operations')
      .insert({
        ticket_id: ticketId,
        operation_type: 'summarize_ticket',
        status: 'in_progress'
      })
      .select()
      .single();

    if (operationError) throw operationError;
    operation = operationData;

    // Fetch all messages for the ticket in chronological order
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('content, user_id, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    if (!messages || messages.length === 0) {
      throw new Error('No messages found for this ticket');
    }

    // Format the conversation
    const conversation = messages
      .map(msg => `${msg.user_id}: ${msg.content}`)
      .join('\n');

    // Initialize the AI model with streaming
    const model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0,
      maxTokens: 100,
      streaming: true,
    });

    // Create the chain
    const chain = summaryPrompt
      .pipe(model)
      .pipe(new StringOutputParser())
      .withConfig({ 
        runName: "summarize_ticket",
        metadata: { ticketId }
      });

    // Create a TransformStream for handling the streamed response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    let summary = '';

    // Generate the summary with streaming
    (async () => {
      try {
        const iterator = await chain.stream({
          conversation: conversation,
        });

        for await (const chunk of iterator) {
          summary += chunk;
          await writer.write(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
        }

        // Update the ticket with the complete summary
        const { error: updateError } = await supabase
          .from('tickets')
          .update({ ai_description: summary })
          .eq('id', ticketId);

        if (updateError) throw updateError;

        // Update operation status
        const { error: operationUpdateError } = await supabase
          .from('ai_operations')
          .update({ 
            status: 'completed',
            metadata: {
              message_count: messages.length,
              summary_length: summary.length,
              completion_time: new Date().toISOString()
            }
          })
          .eq('id', operation.id);

        if (operationUpdateError) throw operationUpdateError;

        await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (error: unknown) {
        console.error('Streaming error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Ticket summarization failed:', error);
    
    // Update operation status if it failed
    if (operation?.id) {
      await supabase
        .from('ai_operations')
        .update({ 
          status: 'failed',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            failure_time: new Date().toISOString()
          }
        })
        .eq('id', operation.id);
    }

    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 

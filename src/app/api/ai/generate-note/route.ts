import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;
const ZAIN_USER_ID = 'a1b2c3d4-e5f6-4567-8901-abcdef123456'; // Zain's fixed UUID

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

export async function POST(request: Request) {
  try {
    const { ticketId } = await request.json();

    if (!ticketId) {
      return Response.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    // Create a new TransformStream for streaming
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Start the response stream immediately
    const response = new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    // Process in background
    (async () => {
      try {
        // Fetch the ticket with customer details
        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .select('*, customer:customer_id(*)')
          .eq('id', ticketId)
          .single();

        if (ticketError || !ticket) {
          throw new Error('Failed to fetch ticket');
        }

        // Get all messages from this customer
        const { data: customerMessages, error: messagesError } = await supabase
          .from('messages')
          .select('id, content, created_at')
          .eq('user_id', ticket.customer_id)
          .order('created_at', { ascending: false });

        if (messagesError) {
          throw new Error('Failed to fetch customer messages');
        }

        // Get embeddings for these messages
        const messageIds = customerMessages?.map(m => m.id) || [];
        const { data: embeddings, error: embeddingsError } = await supabase
          .from('embeddings')
          .select('*')
          .eq('content_type', 'message')
          .in('content_id', messageIds);

        if (embeddingsError) {
          console.error('Failed to fetch embeddings:', embeddingsError);
          // Continue without embeddings rather than failing
        }

        // Prepare context for AI
        const context = {
          currentTicket: {
            title: ticket.title,
            description: ticket.ai_description,
            status: ticket.status,
            priority: ticket.priority,
            tags: ticket.tags,
          },
          customer: {
            name: ticket.customer?.name,
            messageHistory: customerMessages?.map(m => ({
              content: m.content,
              created_at: m.created_at,
            })) || [],
          },
        };

        const prompt = `Analyze this customer's communication style and ticket history to create a brief, insightful note (max 512 characters) about communication patterns and preferences. Focus on information that would be helpful for handling the current ticket.

Context:
${JSON.stringify(context, null, 2)}

Guidelines for writing:
1. Use the customer's name when possible
2. If gender is clear from the name/context, use appropriate pronouns (he/she)
3. Otherwise, rephrase sentences to avoid pronouns entirely
4. Focus on specific behaviors and preferences
5. Be direct and professional

Key points to analyze:
1. Communication style and preferences
2. Common issues or concerns
3. Notable interaction history
4. Behavioral patterns

Write a concise note (max 512 chars) that captures the key insights.`;

        const completion = await openai.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "gpt-3.5-turbo",
          stream: true,
          temperature: 0.7,
          max_tokens: 200,
        });

        let noteContent = '';
        let isFirstChunk = true;
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            // Remove "NOTE: " from the first chunk if it exists
            const cleanedContent = isFirstChunk ? 
              content.replace(/^NOTE:\s*/i, '') : 
              content;
            
            if (cleanedContent) {
              noteContent += cleanedContent;
              await writer.write(
                encoder.encode(`data: ${JSON.stringify({ chunk: cleanedContent })}\n\n`)
              );
            }
            isFirstChunk = false;
          }
        }

        // Clean up the note content (just trim to max length since we already removed NOTE: prefix)
        const cleanedNote = noteContent.slice(0, 512);

        // Check for existing AI note
        const { data: existingNote } = await supabase
          .from('notes')
          .select('id')
          .eq('ticket_id', ticketId)
          .eq('created_by', ZAIN_USER_ID)
          .single();

        // If there's an existing note, update it; otherwise create new
        const operation = existingNote ? 
          supabase
            .from('notes')
            .update({ content: cleanedNote })
            .eq('id', existingNote.id)
            .eq('created_by', ZAIN_USER_ID)
            .select() :
          supabase
            .from('notes')
            .insert({
              ticket_id: ticketId,
              created_by: ZAIN_USER_ID,
              content: cleanedNote,
            })
            .select();

        const { data: noteData, error: noteError } = await operation;

        if (noteError) {
          throw new Error('Failed to save note');
        }

        // Send the final data
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              id: noteData[0].id,
              created_by: ZAIN_USER_ID,
              note: cleanedNote
            })}\n\n`
          )
        );
      } catch (error) {
        console.error('Error in generate-note processing:', error);
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              error: error instanceof Error ? error.message : 'Internal server error'
            })}\n\n`
          )
        );
      } finally {
        await writer.close();
      }
    })();

    return response;
  } catch (error) {
    console.error('Error in generate-note initial setup:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
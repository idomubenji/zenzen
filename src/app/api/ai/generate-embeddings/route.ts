import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

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

export async function POST() {
  try {
    // First get the IDs of messages that already have embeddings
    const { data: existingEmbeddings, error: embedError } = await supabase
      .from('embeddings')
      .select('content_id')
      .eq('content_type', 'message');
    
    if (embedError) throw embedError;

    // Get all messages that don't have embeddings yet
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, content');

    if (messagesError) throw messagesError;

    // Filter out messages that already have embeddings
    const existingIds = new Set(existingEmbeddings?.map(e => e.content_id) || []);
    const messagesToProcess = messages.filter(m => !existingIds.has(m.id));

    // Create an AI operation for each batch of messages
    const batchSize = 50; // Process 50 messages at a time
    const batches = [];
    
    for (let i = 0; i < messagesToProcess.length; i += batchSize) {
      const batch = messagesToProcess.slice(i, i + batchSize);
      
      const { data: operation, error: operationError } = await supabase
        .from('ai_operations')
        .insert({
          operation_type: 'generate_embeddings',
          status: 'pending',
          metadata: {
            message_ids: batch.map(m => m.id),
            batch_number: Math.floor(i / batchSize) + 1,
            total_batches: Math.ceil(messagesToProcess.length / batchSize)
          }
        })
        .select()
        .single();

      if (operationError) throw operationError;
      batches.push(operation);
    }

    return Response.json({ 
      success: true,
      message: `Created ${batches.length} embedding generation operations`,
      total_messages: messagesToProcess.length
    });
  } catch (error) {
    console.error('Error scheduling embedding generation:', error);
    return Response.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
} 
import { serve } from 'https://deno.land/std@0.204.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.3.0'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: Deno.env.get('OPENAI_API_KEY')!,
});
const openai = new OpenAIApi(configuration);

serve(async (req) => {
  try {
    const { operation_id } = await req.json()
    
    // Get operation details
    const { data: operation, error: opError } = await supabase
      .from('ai_operations')
      .select('*')
      .eq('id', operation_id)
      .single()
    
    if (opError || !operation) {
      throw new Error('Operation not found')
    }

    // Update status to processing
    await supabase
      .from('ai_operations')
      .update({ status: 'processing' })
      .eq('id', operation_id)

    // Process based on operation type
    switch (operation.operation_type) {
      case 'generate_embeddings':
        const { message_ids } = operation.metadata;
        
        // Get messages content
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('id, content')
          .in('id', message_ids);
        
        if (msgError) throw msgError;
        
        // Generate embeddings for each message
        for (const message of messages) {
          const response = await openai.createEmbedding({
            model: "text-embedding-ada-002",
            input: message.content
          });
          
          const embedding = response.data.data[0].embedding;
          
          // Store embedding
          const { error: embedError } = await supabase
            .from('embeddings')
            .insert({
              content_id: message.id,
              content_type: 'message',
              embedding
            });
            
          if (embedError) throw embedError;
        }
        break;

      case 'summarize':
        // TODO: Implement summarization
        break;
      case 'tag':
        // TODO: Implement tagging
        break;
      case 'prioritize':
        // TODO: Implement prioritization
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.operation_type}`)
    }

    // Mark as completed
    await supabase
      .from('ai_operations')
      .update({ status: 'completed' })
      .eq('id', operation_id)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    // Log and update operation status on error
    console.error('Error processing AI operation:', error)
    
    if (req.body) {
      const { operation_id } = await req.json()
      await supabase
        .from('ai_operations')
        .update({ 
          status: 'failed',
          error: error.message
        })
        .eq('id', operation_id)
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}) 
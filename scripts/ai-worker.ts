import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import pkg from 'pg';
import dotenv from 'dotenv';
const { Client } = pkg;

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_DEV!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_DEV!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Initialize Postgres client for listening
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL_DEV,
});

async function processOperation(operationData: any) {
  try {
    const { operation_id, operation_type, metadata } = operationData;
    
    // Update status to processing
    await supabase
      .from('ai_operations')
      .update({ status: 'processing' })
      .eq('id', operation_id);

    switch (operation_type) {
      case 'generate_embeddings':
        const { message_ids } = metadata;
        
        // Get messages content
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('id, content')
          .in('id', message_ids);
        
        if (msgError) throw msgError;
        
        // Generate embeddings for each message
        for (const message of messages!) {
          const [embedding] = await embeddings.embedDocuments([message.content]);
          
          // Store embedding
          const { error: embedError } = await supabase
            .from('embeddings')
            .insert({
              content_id: message.id,
              content_type: 'message',
              embedding
            });
            
          if (embedError) throw embedError;
          console.log(`Generated embedding for message ${message.id}`);
        }
        break;

      // Add other operation types here
      default:
        throw new Error(`Unknown operation type: ${operation_type}`);
    }

    // Mark as completed
    await supabase
      .from('ai_operations')
      .update({ status: 'completed' })
      .eq('id', operation_id);

    console.log(`Operation ${operation_id} completed successfully`);
  } catch (error) {
    console.error('Error processing operation:', error);
    
    // Update operation status
    await supabase
      .from('ai_operations')
      .update({ 
        status: 'failed',
        error: (error as Error).message
      })
      .eq('id', operationData.operation_id);
  }
}

async function startWorker() {
  try {
    await pgClient.connect();
    
    // Listen for notifications
    await pgClient.query('LISTEN ai_operations');
    console.log('🎧 Listening for AI operations...');

    // Handle notifications
    pgClient.on('notification', async (msg) => {
      if (msg.payload) {
        const operationData = JSON.parse(msg.payload);
        console.log('📦 Received operation:', operationData);
        await processOperation(operationData);
      }
    });

  } catch (error) {
    console.error('Worker error:', error);
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', async () => {
  console.log('\nShutting down worker...');
  await pgClient.end();
  process.exit(0);
});

// Start the worker
startWorker(); 
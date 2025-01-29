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

// List of common Japanese locations for reference
const commonLocations = [
  // Prefectures
  "hokkaido", "aomori", "iwate", "miyagi", "akita", "yamagata", "fukushima",
  "ibaraki", "tochigi", "gunma", "saitama", "chiba", "tokyo", "kanagawa",
  "niigata", "toyama", "ishikawa", "fukui", "yamanashi", "nagano", "gifu",
  "shizuoka", "aichi", "mie", "shiga", "kyoto", "osaka", "hyogo", "nara",
  "wakayama", "tottori", "shimane", "okayama", "hiroshima", "yamaguchi",
  "tokushima", "kagawa", "ehime", "kochi", "fukuoka", "saga", "nagasaki",
  "kumamoto", "oita", "miyazaki", "kagoshima", "okinawa",
  // Major Cities
  "sapporo", "sendai", "yokohama", "kawasaki", "nagoya", "kobe", "fukuoka",
  "hakodate", "asahikawa", "morioka", "akita", "yamagata", "fukushima",
  "utsunomiya", "maebashi", "saitama", "chiba", "shinjuku", "shibuya",
  "toyama", "kanazawa", "fukui", "kofu", "matsumoto", "gifu", "shizuoka",
  "hamamatsu", "nagoya", "tsu", "otsu", "kyoto", "osaka", "kobe", "nara",
  "wakayama", "tottori", "matsue", "okayama", "hiroshima", "yamaguchi",
  "tokushima", "takamatsu", "matsuyama", "kochi", "fukuoka", "saga",
  "nagasaki", "kumamoto", "oita", "miyazaki", "kagoshima", "naha"
].join(", ");

// Create a prompt template for tag generation
const tagPrompt = PromptTemplate.fromTemplate(
  `Generate exactly 5 tags for the following customer support ticket conversation.
   Where appropriate, prefer using these existing tags: {existingTags}

   Important: If the conversation mentions any Japanese prefecture or major city, ALWAYS include it as one of the tags.
   Here is a list of common Japanese locations to check for: ${commonLocations}
   
   Examples: If someone mentions Tokyo, Osaka, or Hokkaido, include them as tags: tokyo, osaka, hokkaido

   Tags should be relevant to the content and context of the conversation.
   Return only the 5 tags, lowercase, separated by commas, no spaces after commas.
   Do not include any other text in your response.
   
   Conversation:
   {conversation}
   
   Tags:`
);

export async function POST(request: Request) {
  let operation: any = null;
  
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
        operation_type: 'generate_tags',
        status: 'in_progress'
      })
      .select()
      .single();

    if (operationError) throw operationError;
    operation = operationData;

    // Get all existing tags from all tickets
    const { data: allTickets, error: tagsError } = await supabase
      .from('tickets')
      .select('tags')
      .not('tags', 'is', null);

    if (tagsError) throw tagsError;

    // Create a unique set of existing tags
    const existingTags = new Set<string>();
    allTickets?.forEach(ticket => {
      ticket.tags?.forEach(tag => existingTags.add(tag));
    });

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

    // Initialize the AI model
    const model = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0.2, // Slightly higher temperature for more tag variety
    });

    // Create the chain
    const chain = tagPrompt
      .pipe(model)
      .pipe(new StringOutputParser())
      .withConfig({ 
        runName: "generate_tags",
        metadata: { ticketId }
      });

    // Generate the tags
    const tagString = await chain.invoke({
      conversation: conversation,
      existingTags: Array.from(existingTags).join(', '),
    });

    // Convert the comma-separated string to an array
    const newTags = tagString.split(',').map(tag => tag.trim());

    // Update the ticket with the tags
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ tags: newTags })
      .eq('id', ticketId);

    if (updateError) throw updateError;

    // Update operation status
    const { error: operationUpdateError } = await supabase
      .from('ai_operations')
      .update({ 
        status: 'completed',
        metadata: {
          message_count: messages.length,
          existing_tag_count: existingTags.size,
          generated_tags: newTags,
          completion_time: new Date().toISOString()
        }
      })
      .eq('id', operation.id);

    if (operationUpdateError) throw operationUpdateError;

    return Response.json({ 
      success: true, 
      tags: newTags,
      operation_id: operation.id
    });

  } catch (error) {
    console.error('Tag generation failed:', error);
    
    // Update operation status if it failed
    if (operation?.id) {
      await supabase
        .from('ai_operations')
        .update({ 
          status: 'failed',
          metadata: {
            error: (error as Error).message,
            failure_time: new Date().toISOString()
          }
        })
        .eq('id', operation.id);
    }

    return Response.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
} 
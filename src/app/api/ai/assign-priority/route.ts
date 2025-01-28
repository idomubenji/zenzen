import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_SUPABASE_URL_PROD!
  : process.env.NEXT_PUBLIC_SUPABASE_URL_DEV!;

const supabaseServiceKey = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_SERVICE_ROLE_KEY_PROD!
  : process.env.SUPABASE_SERVICE_ROLE_KEY_DEV!;

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
      .select('*, customer:customer_id(*)')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return Response.json({ error: 'Failed to fetch ticket' }, { status: 404 });
    }

    // Fetch messages for this ticket
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*, user:user_id(*)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      return Response.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Format messages for analysis
    const formattedMessages = messages?.map(msg => ({
      from: msg.user?.role === 'Customer' ? 'Customer' : 'Support',
      content: msg.content,
      time: msg.created_at
    })) || [];

    // Fetch active priority rules
    const { data: priorityRules, error: rulesError } = await supabase
      .from('priority_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesError || !priorityRules) {
      return Response.json({ error: 'Failed to fetch priority rules' }, { status: 500 });
    }

    // Prepare the prompt for GPT
    const prompt = `Given this ticket and its conversation history:

TICKET INFORMATION:
Title: ${ticket.title}
Description: ${ticket.ai_description || 'No description provided'}
Tags: ${ticket.tags ? ticket.tags.join(', ') : 'No tags'}
Customer: ${ticket.customer?.name || 'Unknown'}

CONVERSATION HISTORY:
${formattedMessages.map(msg => 
  `[${msg.from}] ${new Date(msg.time).toLocaleString()}:
${msg.content}`
).join('\n\n')}

And these priority rules:
${priorityRules.map(rule => `${rule.name}:
${rule.description}
Rules:
${JSON.stringify(rule.rules.rules, null, 2)}`).join('\n\n')}

Please analyze the ticket and its conversation history to determine its priority based on these rules, with special attention to the following:

1. Customer's Emotional State and Communication:
   - Analyze the customer's messages for tone, urgency, and emotional state
   - Look for patterns of frustration or escalating emotions across multiple messages
   - Consider frequency and timing of messages (rapid succession might indicate urgency)
   - Pay attention to specific phrases indicating urgency or dissatisfaction

2. Content and Impact Analysis:
   - Apply the priority rules to both the ticket content and message content
   - Consider the technical/business impact mentioned in any message
   - Look for mentions of deadlines, business impact, or system failures
   - Consider the scope of the issue (affecting one user vs many)

3. Historical Context:
   - Look for references to previous issues or ongoing problems
   - Consider the total duration of the conversation
   - Note any mentions of previous attempts to resolve the issue
   - Look for indications that this is a recurring problem

4. Response Pattern:
   - Consider gaps in response time
   - Look for any escalation in tone over time
   - Note if the customer has had to repeat their concern multiple times

Provide your response in this exact format:
REASONING: Your detailed explanation here, including specific observations about customer communication patterns, tone progression, and impact assessment
PRIORITY: ONE_OF[LOW, MEDIUM, HIGH, CRITICAL]`;

    // Get GPT's recommendation
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
    });

    const response = completion.choices[0].message.content?.trim() || '';
    
    // Parse the response using regex to handle multi-line reasoning
    const reasoningMatch = response.match(/REASONING:\s*([\s\S]*?)(?=PRIORITY:|$)/i);
    const priorityMatch = response.match(/PRIORITY:\s*(\w+)/i);

    if (!reasoningMatch || !priorityMatch) {
      console.error('Invalid AI response format:', response);
      return Response.json({ error: 'Invalid response format from AI' }, { status: 500 });
    }

    const reasoning = reasoningMatch[1].trim();
    const normalizedPriority = priorityMatch[1].trim().toUpperCase();

    // Validate the priority
    if (!['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(normalizedPriority)) {
      console.error('Invalid priority value:', normalizedPriority);
      return Response.json({ error: 'Invalid priority value received from AI' }, { status: 500 });
    }

    // Log the AI operation
    const { data: operation, error: operationError } = await supabase
      .from('ai_operations')
      .insert({
        ticket_id: ticketId,
        operation_type: 'prioritize',
        status: 'completed',
        metadata: {
          reasoning,
          priority: normalizedPriority,
          rules_used: priorityRules.map(r => r.id)
        }
      })
      .select()
      .single();

    if (operationError) {
      console.error('Failed to log AI operation:', operationError);
    }

    // Update the ticket with the recommended priority
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ priority: normalizedPriority })
      .eq('id', ticketId);

    if (updateError) {
      return Response.json({ error: 'Failed to update ticket' }, { status: 500 });
    }

    return Response.json({ 
      priority: normalizedPriority,
      reasoning,
      operation: operation || undefined
    });
  } catch (error) {
    console.error('Error in assign-priority:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

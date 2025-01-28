import { ChatOpenAI } from "@langchain/openai";

// Set the project name for LangSmith tracing
process.env.LANGCHAIN_PROJECT = process.env.LANGSMITH_PROJECT || "zenzen";

export async function POST() {
  try {
    // Initialize ChatOpenAI with tracing enabled
    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0,
    });

    // Simple test prompt
    const response = await model.invoke("Say 'Hello from Zain!'");

    return Response.json({ 
      success: true, 
      message: response.content 
    }, { status: 200 });
  } catch (error) {
    console.error('LangChain test failed:', error);
    return Response.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
} 

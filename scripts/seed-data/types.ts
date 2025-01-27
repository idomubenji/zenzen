export interface ConversationSeed {
  title: string;
  theme: string;
  customer: string; // customer email
  worker: string;  // worker email
  tags: string[];
  messages: Message[];
}

export interface Message {
  content: string;
  sender: string; // email of sender
  created_at?: string; // ISO string, optional as we might want to generate these in sequence
}

// Themes from seed-plan.md for reference
export const SEED_THEMES = [
  'Angry/frustrated with something',
  'Asking about Mie prefecture',
  'Asking about Aomori prefecture',
  'Asking what to do in Sendai',
  'Asking about the weather in May in Tokyo',
  'Asking about the best manufacturing cities in Tokyo',
  'Asking about the history of Miyagi prefecture',
  'Asking about snowboarding in Hokkaido',
  'Asking about how to get to Ishikawa',
  'Asking how to get from Tokyo to Miyazaki prefecture'
] as const;

export type SeedTheme = typeof SEED_THEMES[number]; 
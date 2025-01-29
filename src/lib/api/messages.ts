import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { User } from './users';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export interface Message {
  id: string;
  ticket_id: string | null;
  user_id: string | null;
  content: string;
  created_at: string;
  timestamp: string;
}

export interface Note {
  id: string;
  ticket_id: string | null;
  created_by: string | null;
  content: string;
  created_at: string;
}

export interface CreateMessageParams {
  ticket_id: string;
  content: string;
}

export interface CreateNoteParams {
  ticket_id: string;
  content: string;
}

export interface ListMessagesParams {
  ticket_id: string;
  page?: number;
  limit?: number;
}

export interface ListNotesParams {
  ticket_id: string;
  page?: number;
  limit?: number;
}

export interface ListResponse<T> {
  data: T[];
  pagination: {
    total: number;
    pages: number;
    current_page: number;
    per_page: number;
  };
}

interface MessageWithUser extends Message {
  user: User | null;
}

interface NoteWithUser extends Note {
  creator: User | null;
}

/**
 * Messages and Notes API
 */
export const MessagesAPI = {
  /**
   * Create a new message
   */
  async createMessage(params: CreateMessageParams): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert([params])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }

    return data;
  },

  /**
   * Create a new note (internal)
   */
  async createNote(params: CreateNoteParams): Promise<Note> {
    const { data, error } = await supabase
      .from('notes')
      .insert([params])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create note: ${error.message}`);
    }

    return data;
  },

  /**
   * List messages for a ticket with pagination
   */
  async listMessages({ ticket_id, page = 1, limit = 20 }: ListMessagesParams): Promise<ListResponse<MessageWithUser>> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('messages')
      .select(`
        *,
        user:user_id (*)
      `, { count: 'exact' })
      .eq('ticket_id', ticket_id)
      .order('created_at', { ascending: true })
      .range(from, to) as { data: MessageWithUser[] | null, error: any, count: number | null };

    if (error) {
      throw new Error(`Failed to list messages: ${error.message}`);
    }

    return {
      data: data || [],
      pagination: {
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
        current_page: page,
        per_page: limit,
      },
    };
  },

  /**
   * List notes for a ticket with pagination
   */
  async listNotes({ ticket_id, page = 1, limit = 20 }: ListNotesParams): Promise<ListResponse<NoteWithUser>> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('notes')
      .select(`
        *,
        creator:created_by (*)
      `, { count: 'exact' })
      .eq('ticket_id', ticket_id)
      .order('created_at', { ascending: true })
      .range(from, to) as { data: NoteWithUser[] | null, error: any, count: number | null };

    if (error) {
      throw new Error(`Failed to list notes: ${error.message}`);
    }

    return {
      data: data || [],
      pagination: {
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
        current_page: page,
        per_page: limit,
      },
    };
  },

  /**
   * Delete a message
   * Only the message creator or an admin can delete
   */
  async deleteMessage(id: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  },

  /**
   * Delete a note
   * Only the note creator or an admin can delete
   */
  async deleteNote(id: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete note: ${error.message}`);
    }
  },

  /**
   * Search messages by content
   */
  async searchMessages(query: string, limit: number = 20): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select()
      .textSearch('content', query)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search messages: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Search notes by content
   */
  async searchNotes(query: string, limit: number = 20): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select()
      .textSearch('content', query)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search notes: ${error.message}`);
    }

    return data || [];
  },
}; 
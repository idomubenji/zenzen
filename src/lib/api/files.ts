import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export interface File {
  id: string;
  ticket_id: string;
  file_url: string;
  uploaded_at: string;
}

export interface UploadFileParams {
  ticket_id: string;
  file: Blob | string;
  filename: string;
}

export interface ListFilesParams {
  ticket_id: string;
  page?: number;
  limit?: number;
}

export interface ListFilesResponse {
  data: File[];
  pagination: {
    total: number;
    pages: number;
    current_page: number;
    per_page: number;
  };
}

/**
 * File Upload and Management API
 */
export const FileAPI = {
  /**
   * Upload a file to S3 and create a record
   */
  async upload({ ticket_id, file, filename }: UploadFileParams): Promise<File> {
    // First, upload the file to S3 bucket
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('ticket-attachments')
      .upload(`${ticket_id}/${filename}`, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase
      .storage
      .from('ticket-attachments')
      .getPublicUrl(uploadData.path);

    // Create a record in the files table
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert([{
        ticket_id,
        file_url: publicUrl,
      }])
      .select()
      .single();

    if (dbError) {
      // If database insert fails, try to delete the uploaded file
      await supabase
        .storage
        .from('ticket-attachments')
        .remove([uploadData.path]);
      
      throw new Error(`Failed to create file record: ${dbError.message}`);
    }

    return fileRecord;
  },

  /**
   * List files for a ticket with pagination
   */
  async list({ ticket_id, page = 1, limit = 20 }: ListFilesParams): Promise<ListFilesResponse> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('files')
      .select('*', { count: 'exact' })
      .eq('ticket_id', ticket_id)
      .order('uploaded_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
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
   * Delete a file and its record
   */
  async delete(id: string): Promise<void> {
    // First get the file record to get the path
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('file_url')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch file record: ${fetchError.message}`);
    }

    if (!file) {
      throw new Error('File not found');
    }

    // Extract the path from the URL
    const url = new URL(file.file_url);
    const path = url.pathname.split('/').slice(2).join('/');

    // Delete from S3
    const { error: storageError } = await supabase
      .storage
      .from('ticket-attachments')
      .remove([path]);

    if (storageError) {
      throw new Error(`Failed to delete file from storage: ${storageError.message}`);
    }

    // Delete the database record
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('id', id);

    if (dbError) {
      throw new Error(`Failed to delete file record: ${dbError.message}`);
    }
  },

  /**
   * Get a temporary URL for a file
   * Useful for private files that require authentication
   */
  async getSignedUrl(id: string, expiresIn: number = 3600): Promise<string> {
    // First get the file record to get the path
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('file_url')
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch file record: ${fetchError.message}`);
    }

    if (!file) {
      throw new Error('File not found');
    }

    // Extract the path from the URL
    const url = new URL(file.file_url);
    const path = url.pathname.split('/').slice(2).join('/');

    // Get a signed URL
    const { data, error: signError } = await supabase
      .storage
      .from('ticket-attachments')
      .createSignedUrl(path, expiresIn);

    if (signError) {
      throw new Error(`Failed to create signed URL: ${signError.message}`);
    }

    if (!data?.signedUrl) {
      throw new Error('Failed to generate signed URL');
    }

    return data.signedUrl;
  },
}; 
import { getSupabase } from '../e2e';
import { Database } from '@/types/supabase';

/**
 * File upload test utilities
 */
export const FileUploadTestUtils = {
  /**
   * Upload a test file
   */
  async uploadTestFile(
    ticketId: string,
    fileContent: string | Buffer,
    fileName: string,
    contentType: string = 'text/plain'
  ) {
    const supabase = getSupabase();
    const startTime = Date.now();

    // Upload to storage bucket
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('files')
      .upload(`test/${ticketId}/${fileName}`, fileContent, {
        contentType,
        upsert: true
      });

    if (storageError) throw storageError;

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('files')
      .getPublicUrl(storageData.path);

    // Create file record
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .insert({
        ticket_id: ticketId,
        file_url: publicUrl
      })
      .select()
      .single();

    if (fileError) throw fileError;

    // Log upload performance
    const uploadDuration = Date.now() - startTime;
    await supabase
      .from('file_upload_logs')
      .insert({
        file_id: fileRecord.id,
        file_size_bytes: Buffer.from(fileContent).length,
        upload_duration_ms: uploadDuration
      });

    return fileRecord;
  },

  /**
   * Delete a test file
   */
  async deleteTestFile(fileId: string) {
    const supabase = getSupabase();

    // Get file record
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select()
      .eq('id', fileId)
      .single();

    if (fileError) throw fileError;

    // Delete from storage
    const path = new URL(file.file_url).pathname.split('/').slice(-3).join('/');
    const { error: storageError } = await supabase
      .storage
      .from('files')
      .remove([path]);

    if (storageError) throw storageError;

    // Delete file record
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (deleteError) throw deleteError;
  },

  /**
   * Test file upload performance
   */
  async testUploadPerformance(
    ticketId: string,
    fileSizeBytes: number = 1024 * 1024 // 1MB
  ) {
    // Create random file content
    const fileContent = Buffer.alloc(fileSizeBytes, 'x');
    const fileName = `test-${Date.now()}.txt`;

    const startTime = Date.now();
    const file = await this.uploadTestFile(ticketId, fileContent, fileName);
    const uploadDuration = Date.now() - startTime;

    // Cleanup
    await this.deleteTestFile(file.id);

    return {
      fileSizeBytes,
      uploadDurationMs: uploadDuration,
      uploadSpeedMbps: (fileSizeBytes * 8) / (uploadDuration * 1000)
    };
  },

  /**
   * Verify file exists
   */
  async verifyFileExists(fileId: string): Promise<boolean> {
    const supabase = getSupabase();

    // Get file record
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select()
      .eq('id', fileId)
      .single();

    if (fileError) return false;

    // Check storage
    const path = new URL(file.file_url).pathname.split('/').slice(-3).join('/');
    const { data: storageData } = await supabase
      .storage
      .from('files')
      .list(path.split('/').slice(0, -1).join('/'));

    return storageData?.some(item => item.name === path.split('/').pop()) || false;
  }
}; 
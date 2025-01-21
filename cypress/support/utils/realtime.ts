import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../e2e';
import { Database } from '@/types/supabase';

/**
 * Realtime test utilities
 */
export const RealtimeTestUtils = {
  /**
   * Test realtime CRUD operations for a table
   */
  testRealtimeCrud<T extends { id: string }>(
    tableName: keyof Database['public']['Tables'],
    insertData: Omit<T, 'id'>
  ): Promise<any[]> {
    const supabase = getSupabase();
    const changes: any[] = [];

    return new Promise((resolve, reject) => {
      // Subscribe to changes
      const channel: RealtimeChannel = supabase
        .channel('test-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName
          },
          (payload) => {
            changes.push(payload);
            
            // If we have all three events (INSERT, UPDATE, DELETE), resolve
            if (changes.length === 3) {
              // Verify change types
              const hasInsert = changes.some(c => c.eventType === 'INSERT');
              const hasUpdate = changes.some(c => c.eventType === 'UPDATE');
              const hasDelete = changes.some(c => c.eventType === 'DELETE');

              if (hasInsert && hasUpdate && hasDelete) {
                channel.unsubscribe();
                resolve(changes);
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Perform CRUD operations
            this.performCrudOperations(tableName, insertData)
              .catch(reject);
          }
        });

      // Set timeout
      setTimeout(() => {
        channel.unsubscribe();
        reject(new Error('Realtime test timeout'));
      }, 10000);
    });
  },

  /**
   * Perform CRUD operations for realtime testing
   */
  async performCrudOperations<T extends { id: string }>(
    tableName: keyof Database['public']['Tables'],
    insertData: Omit<T, 'id'>
  ) {
    const supabase = getSupabase();

    // Insert
    const { data: inserted, error: insertError } = await supabase
      .from(tableName)
      .insert(insertData)
      .select()
      .single();
    
    if (insertError) throw insertError;

    // Update
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ updated_at: new Date().toISOString() })
      .eq('id', inserted.id);
    
    if (updateError) throw updateError;

    // Delete
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('id', inserted.id);
    
    if (deleteError) throw deleteError;
  },

  /**
   * Test realtime sync delay
   */
  async testRealtimeDelay(tableName: keyof Database['public']['Tables']): Promise<number> {
    const supabase = getSupabase();
    let syncDelay = 0;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      // Subscribe to changes
      const channel: RealtimeChannel = supabase
        .channel('test-delay-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: tableName
          },
          () => {
            syncDelay = Date.now() - startTime;
            channel.unsubscribe();
            resolve(syncDelay);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Insert test record
            supabase
              .from(tableName)
              .insert({ test: true })
              .then(({ error }) => {
                if (error) reject(error);
              });
          }
        });

      // Set timeout
      setTimeout(() => {
        channel.unsubscribe();
        reject(new Error('Realtime sync delay test timeout'));
      }, 5000);
    });
  }
}; 
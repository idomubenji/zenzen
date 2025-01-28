"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card } from "@/components/ui/card";
import { Pyramid, Loader2, RotateCcw, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  title: string;
  status: string;
  ai_description: string | null;
  tags: string[] | null;
  created_at: string;
}

export default function ZainZenPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summarizingTickets, setSummarizingTickets] = useState<string[]>([]);
  const [undoingTickets, setUndoingTickets] = useState<string[]>([]);
  const [taggingTickets, setTaggingTickets] = useState<string[]>([]);
  const [undoingTags, setUndoingTags] = useState<string[]>([]);
  const supabase = createClientComponentClient();

  // Fetch tickets
  useEffect(() => {
    const fetchTickets = async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error("Failed to fetch tickets");
        return;
      }

      setTickets(data || []);
    };

    fetchTickets();
  }, [supabase]);

  const summarizeTicket = async (ticketId: string) => {
    try {
      setSummarizingTickets(prev => [...prev, ticketId]);
      
      const response = await fetch('/api/ai/summarize-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start summary generation');
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let summary = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(5));
              
              if (data.error) {
                throw new Error(data.error);
              }

              if (data.chunk) {
                summary += data.chunk;
                // Update the ticket in real-time as chunks arrive
                setTickets(prev => prev.map(ticket => 
                  ticket.id === ticketId 
                    ? { ...ticket, ai_description: summary }
                    : ticket
                ));
              }

              if (data.done) {
                toast.success("Summary generated successfully!");
                return;
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
        }
      }
    } catch (error) {
      toast.error("Failed to generate summary: " + (error as Error).message);
      // Reset the summary if there was an error
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, ai_description: null }
          : ticket
      ));
    } finally {
      setSummarizingTickets(prev => prev.filter(id => id !== ticketId));
    }
  };

  const generateTags = async (ticketId: string) => {
    try {
      setTaggingTickets(prev => [...prev, ticketId]);
      
      const response = await fetch('/api/ai/generate-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate tags');
      }

      // Update the ticket in the local state with the new tags
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, tags: data.tags }
          : ticket
      ));

      toast.success("Tags generated successfully!");
    } catch (error) {
      toast.error("Failed to generate tags: " + (error as Error).message);
    } finally {
      setTaggingTickets(prev => prev.filter(id => id !== ticketId));
    }
  };

  const undoSummary = async (ticketId: string) => {
    try {
      setUndoingTickets(prev => [...prev, ticketId]);
      
      const { error } = await supabase
        .from('tickets')
        .update({ ai_description: null })
        .eq('id', ticketId);

      if (error) throw error;

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, ai_description: null }
          : ticket
      ));

      toast.success("Summary removed");
    } catch (error) {
      toast.error("Failed to remove summary: " + (error as Error).message);
    } finally {
      setUndoingTickets(prev => prev.filter(id => id !== ticketId));
    }
  };

  const undoTags = async (ticketId: string) => {
    try {
      setUndoingTags(prev => [...prev, ticketId]);
      
      const { error } = await supabase
        .from('tickets')
        .update({ tags: null })
        .eq('id', ticketId);

      if (error) throw error;

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, tags: null }
          : ticket
      ));

      toast.success("Tags removed");
    } catch (error) {
      toast.error("Failed to remove tags: " + (error as Error).message);
    } finally {
      setUndoingTags(prev => prev.filter(id => id !== ticketId));
    }
  };

  const aiButtonClass = cn(
    "relative overflow-hidden transition-all duration-300 group rounded-lg",
    // Light mode gradients
    "bg-gradient-to-r from-blue-100/60 via-amber-50/60 to-blue-100/60",
    "hover:from-blue-200/80 hover:via-amber-100/80 hover:to-blue-200/80",
    // Dark mode gradients
    "dark:bg-gradient-to-r dark:from-blue-800/40 dark:via-amber-800/30 dark:to-blue-800/40",
    "dark:hover:from-blue-700/50 dark:hover:via-amber-700/40 dark:hover:to-blue-700/50",
    // Common effects
    "hover:scale-105",
    "hover:shadow-[0_0_15px_rgba(96,165,250,0.3)]",
    "dark:hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]",
    // Shine effect
    "after:absolute after:inset-0 after:z-10 after:bg-gradient-to-r after:from-transparent after:via-white/40 dark:after:via-white/10 after:to-transparent after:opacity-0 after:hover:animate-shine after:transition-opacity"
  );
  
  const aiIconClass = "h-4 w-4 transition-all duration-300 group-hover:scale-110 stroke-blue-500/70 group-hover:stroke-blue-600 dark:stroke-blue-400/70 dark:group-hover:stroke-amber-300";
  
  return (
    <div className="h-full p-4 space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">ZainZen</h2>
        <p className="text-muted-foreground">
          Let Zain help you organize your tickets!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{ticket.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Status: {ticket.status}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1">
                  {ticket.ai_description && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => undoSummary(ticket.id)}
                      disabled={undoingTickets.includes(ticket.id)}
                      className="h-8 w-8 hover:bg-red-500/10 dark:hover:bg-red-400/20 transition-colors duration-300"
                    >
                      {undoingTickets.includes(ticket.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => summarizeTicket(ticket.id)}
                    disabled={summarizingTickets.includes(ticket.id)}
                    className={cn(
                      "h-8 w-8 group",
                      !summarizingTickets.includes(ticket.id) && aiButtonClass
                    )}
                  >
                    {summarizingTickets.includes(ticket.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pyramid className={aiIconClass} />
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  {ticket.tags && ticket.tags.length > 0 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => undoTags(ticket.id)}
                      disabled={undoingTags.includes(ticket.id)}
                      className="h-8 w-8 hover:bg-red-500/10 dark:hover:bg-red-400/20 transition-colors duration-300"
                    >
                      {undoingTags.includes(ticket.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => generateTags(ticket.id)}
                    disabled={taggingTickets.includes(ticket.id)}
                    className={cn(
                      "h-8 w-8 group",
                      !taggingTickets.includes(ticket.id) && aiButtonClass
                    )}
                  >
                    {taggingTickets.includes(ticket.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Tag className={aiIconClass} />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            {ticket.ai_description && (
              <div className="bg-muted p-3 rounded-md">
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <Pyramid className="h-4 w-4" />
                  <span>✨ AI Summary</span>
                </div>
                <p className="text-sm">{ticket.ai_description}</p>
              </div>
            )}

            {ticket.tags && ticket.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ticket.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {tickets.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No tickets found
        </div>
      )}
    </div>
  );
} 
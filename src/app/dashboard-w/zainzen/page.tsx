"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card } from "@/components/ui/card";
import { FileText, Loader2, RotateCcw, Tag, HeartHandshake, Flame, StickyNote, Info, Sparkles, X, Pyramid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ZAIN_USER_ID = 'a1b2c3d4-e5f6-4567-8901-abcdef123456';

interface Team {
  id: string;
  name: string;
  focus_area: string | null;
}

interface Note {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
  ticket_id: string;
}

interface Ticket {
  id: string;
  title: string;
  status: string;
  ai_description: string | null;
  tags: string[] | null;
  assigned_team: string | null;
  created_at: string;
  priority: string;
  ai_note: Note | null;
}

interface AIOperation {
  id: string;
  ticket_id: string;
  created_at: string;
  metadata: {
    reasoning: string;
    priority: string;
  };
}

export default function ZainZenPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [priorityOperations, setPriorityOperations] = useState<{ [key: string]: AIOperation }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [summarizingTickets, setSummarizingTickets] = useState<string[]>([]);
  const [undoingTickets, setUndoingTickets] = useState<string[]>([]);
  const [taggingTickets, setTaggingTickets] = useState<string[]>([]);
  const [undoingTags, setUndoingTags] = useState<string[]>([]);
  const [assigningTeams, setAssigningTeams] = useState<string[]>([]);
  const [undoingTeams, setUndoingTeams] = useState<string[]>([]);
  const [assigningPriorities, setAssigningPriorities] = useState<string[]>([]);
  const [undoingPriorities, setUndoingPriorities] = useState<string[]>([]);
  const [generatingNotes, setGeneratingNotes] = useState<string[]>([]);
  const [undoingNotes, setUndoingNotes] = useState<string[]>([]);
  const [zainifyingTickets, setZainifyingTickets] = useState<string[]>([]);
  const supabase = createClientComponentClient();

  // Fetch tickets, teams, and priority operations
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tickets
        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false });

        if (ticketError) {
          toast.error("Failed to fetch tickets");
          return;
        }

        if (!ticketData) {
          setTickets([]);
          return;
        }

        // Fetch AI notes for tickets
        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('*')
          .eq('created_by', ZAIN_USER_ID)
          .in('ticket_id', ticketData.map(t => t.id));

        if (notesError) {
          console.error("Failed to fetch notes:", notesError);
          // Don't return here, continue with tickets without notes
        }

        // Create a map of ticket IDs to their AI notes for easier lookup
        const aiNotesMap = (notesData || []).reduce<{ [key: string]: Note }>((acc, note) => {
          acc[note.ticket_id!] = note;
          return acc;
        }, {});

        // Combine tickets with their AI notes (if they exist)
        const ticketsWithNotes = ticketData.map(ticket => ({
          ...ticket,
          ai_note: aiNotesMap[ticket.id] || null
        }));

        setTickets(ticketsWithNotes);

        // Fetch teams
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*');

        if (teamError) {
          toast.error("Failed to fetch teams");
          return;
        }

        setTeams(teamData || []);

        // Fetch priority operations for tickets with priorities
        const ticketsWithPriority = (ticketData || []).filter(t => t.priority && t.priority !== 'NONE');
        if (ticketsWithPriority.length > 0) {
          const { data: operationsData, error: operationsError } = await supabase
            .from('ai_operations')
            .select('*')
            .eq('operation_type', 'prioritize')
            .in('ticket_id', ticketsWithPriority.map(t => t.id))
            .order('created_at', { ascending: false });

          if (operationsError) {
            console.error("Failed to fetch priority operations:", operationsError);
            return;
          }

          // Create a map of ticket_id to latest operation
          const operationsMap = (operationsData || []).reduce<{ [key: string]: AIOperation }>((acc, op) => {
            if (!acc[op.ticket_id] || new Date(op.created_at) > new Date(acc[op.ticket_id].created_at)) {
              acc[op.ticket_id] = op;
            }
            return acc;
          }, {});

          setPriorityOperations(operationsMap);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data");
      }
    };

    fetchData();
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

  const assignTeams = async (ticketId: string) => {
    try {
      setAssigningTeams(prev => [...prev, ticketId]);
      
      const response = await fetch('/api/ai/assign-teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign team');
      }

      // Update the ticket in the local state with the new team
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, assigned_team: data.team.id }
          : ticket
      ));

      toast.success("Team assigned successfully!");
    } catch (error) {
      toast.error("Failed to assign team: " + (error as Error).message);
    } finally {
      setAssigningTeams(prev => prev.filter(id => id !== ticketId));
    }
  };

  const undoTeamAssignment = async (ticketId: string) => {
    try {
      setUndoingTeams(prev => [...prev, ticketId]);
      
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_team: null })
        .eq('id', ticketId);

      if (error) throw error;

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, assigned_team: null }
          : ticket
      ));

      toast.success("Team assignment removed");
    } catch (error) {
      toast.error("Failed to remove team assignment: " + (error as Error).message);
    } finally {
      setUndoingTeams(prev => prev.filter(id => id !== ticketId));
    }
  };

  const assignPriority = async (ticketId: string) => {
    try {
      setAssigningPriorities(prev => [...prev, ticketId]);
      
      const response = await fetch('/api/ai/assign-priority', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign priority');
      }

      // Update the ticket in the local state with the new priority
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, priority: data.priority }
          : ticket
      ));

      // Fetch the latest operation for this ticket
      const { data: latestOperation, error: operationError } = await supabase
        .from('ai_operations')
        .select('*')
        .eq('operation_type', 'prioritize')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (operationError) {
        console.error("Failed to fetch latest operation:", operationError);
      } else if (latestOperation) {
        // Update priorityOperations state with the latest operation
        setPriorityOperations(prev => ({
          ...prev,
          [ticketId]: latestOperation
        }));
      }

      toast.success(`Priority set to ${data.priority}${data.reasoning ? `: ${data.reasoning.slice(0, 256)}${data.reasoning.length > 256 ? '...' : ''}` : ''}`);
    } catch (error) {
      toast.error("Failed to assign priority: " + (error as Error).message);
    } finally {
      setAssigningPriorities(prev => prev.filter(id => id !== ticketId));
    }
  };

  const undoPriority = async (ticketId: string) => {
    try {
      setUndoingPriorities(prev => [...prev, ticketId]);
      
      const { error } = await supabase
        .from('tickets')
        .update({ priority: 'NONE' })
        .eq('id', ticketId);

      if (error) throw error;

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, priority: 'NONE' }
          : ticket
      ));

      // Remove the operation from priorityOperations state
      setPriorityOperations(prev => {
        const newState = { ...prev };
        delete newState[ticketId];
        return newState;
      });

      toast.success("Priority reset to none");
    } catch (error) {
      toast.error("Failed to reset priority: " + (error as Error).message);
    } finally {
      setUndoingPriorities(prev => prev.filter(id => id !== ticketId));
    }
  };

  const generateNote = async (ticketId: string) => {
    try {
      setGeneratingNotes(prev => [...prev, ticketId]);
      
      const response = await fetch('/api/ai/generate-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let note = '';
      let noteId: string | null = null;
      let createdBy: string | null = null;

      try {
        while (true) {
          const { value, done } = await reader.read();
          
          if (done) {
            console.log('Stream complete');
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(5));
                console.log('Received data:', data);

                if (data.error) {
                  throw new Error(data.error);
                }

                if (data.chunk) {
                  note += data.chunk;
                  // Update the ticket in real-time as chunks arrive
                  setTickets(prev => prev.map(ticket => 
                    ticket.id === ticketId 
                      ? { 
                          ...ticket, 
                          ai_note: {
                            id: noteId || 'pending',
                            content: note,
                            created_by: createdBy || ZAIN_USER_ID,
                            created_at: new Date().toISOString(),
                            ticket_id: ticketId
                          }
                        }
                      : ticket
                  ));
                }

                if (data.done) {
                  noteId = data.id;
                  createdBy = data.created_by;
                  const finalNote = data.note || note;
                  
                  // Final update with the correct ID
                  setTickets(prev => prev.map(ticket => 
                    ticket.id === ticketId 
                      ? { 
                          ...ticket, 
                          ai_note: {
                            id: noteId!,
                            content: finalNote,
                            created_by: createdBy!,
                            created_at: new Date().toISOString(),
                            ticket_id: ticketId
                          }
                        }
                      : ticket
                  ));
                  
                  toast.success("Note generated successfully!");
                  return;
                }
              } catch (e) {
                console.error('Error parsing streaming data:', e);
                throw e;
              }
            }
          }
        }
      } catch (e) {
        throw e;
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Note generation error:', error);
      toast.error("Failed to generate note: " + (error as Error).message);
      // Reset the note if there was an error
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, ai_note: null }
          : ticket
      ));
    } finally {
      setGeneratingNotes(prev => prev.filter(id => id !== ticketId));
    }
  };

  const undoNote = async (ticketId: string) => {
    try {
      setUndoingNotes(prev => [...prev, ticketId]);
      
      const note = tickets.find(t => t.id === ticketId)?.ai_note;
      if (!note?.id) {
        toast.error("No note found to remove");
        return;
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', note.id)
        .eq('created_by', ZAIN_USER_ID);

      if (error) throw error;

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, ai_note: null }
          : ticket
      ));

      toast.success("Note removed");
    } catch (error) {
      toast.error("Failed to remove note: " + (error as Error).message);
    } finally {
      setUndoingNotes(prev => prev.filter(id => id !== ticketId));
    }
  };

  const zainifyTicket = async (ticketId: string) => {
    try {
      setZainifyingTickets(prev => [...prev, ticketId]);
      
      // Run all AI functions in parallel for better performance
      await Promise.all([
        // Only run if not already present
        !tickets.find(t => t.id === ticketId)?.ai_description && summarizeTicket(ticketId),
        !tickets.find(t => t.id === ticketId)?.tags?.length && generateTags(ticketId),
        !tickets.find(t => t.id === ticketId)?.assigned_team && assignTeams(ticketId),
        (!tickets.find(t => t.id === ticketId)?.priority || tickets.find(t => t.id === ticketId)?.priority === 'NONE') && assignPriority(ticketId),
        !tickets.find(t => t.id === ticketId)?.ai_note && generateNote(ticketId)
      ]);

      toast.success("All AI functions applied successfully!");
    } catch (error) {
      toast.error("Failed to apply all AI functions: " + (error as Error).message);
    } finally {
      setZainifyingTickets(prev => prev.filter(id => id !== ticketId));
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
    // Border
    "border border-blue-200 dark:border-blue-800",
    // Shine effect
    "after:absolute after:inset-0 after:z-10 after:bg-gradient-to-r after:from-transparent after:via-white/40 dark:after:via-white/10 after:to-transparent after:opacity-0 after:hover:animate-shine after:transition-opacity"
  );
  
  const aiIconClass = "h-4 w-4 transition-all duration-300 group-hover:scale-110 stroke-blue-500/70 group-hover:stroke-blue-600 dark:stroke-blue-400/70 dark:group-hover:stroke-amber-300";

  const aiButtonUndoClass = cn(
    "relative overflow-hidden transition-all duration-300 group rounded-lg",
    // Light mode
    "bg-red-100/60 hover:bg-red-200/80",
    // Dark mode
    "dark:bg-red-950/30 dark:hover:bg-red-900/40",
    // Common effects
    "hover:scale-105",
    "hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]",
    "dark:hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]",
    // Border
    "border border-red-200 dark:border-red-800"
  );

  const aiIconUndoClass = "h-4 w-4 transition-all duration-300 group-hover:scale-110 stroke-red-500/70 group-hover:stroke-red-600 dark:stroke-red-400/70 dark:group-hover:stroke-red-300";

  const IconWithX = ({ Icon, className }: { Icon: any, className: string }) => (
    <div className="relative">
      <Icon className={className} />
      <X className="absolute -top-1 -right-1 h-3 w-3 stroke-red-500/70 stroke-[3]" />
    </div>
  );

  return (
    <div className="h-full p-4 space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-mono tracking-[.25em]">
          <span className="flex items-center gap-2">
            <Pyramid className="h-7 w-7 stroke-amber-600/70 dark:stroke-amber-400/70" />
            <span>ｚ<span className="text-blue-600 dark:text-blue-400">ａｉ</span>ｎ</span>
          </span>
        </h2>
        <p className="text-muted-foreground">
          Let Zain help you organize your tickets!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="p-4 flex flex-col">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => zainifyTicket(ticket.id)}
                    disabled={zainifyingTickets.includes(ticket.id)}
                    className={cn(
                      "w-full mb-4 h-12 group",
                      "bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-100",
                      "dark:from-amber-900/30 dark:via-yellow-900/30 dark:to-amber-900/30",
                      "hover:from-amber-200 hover:via-yellow-200 hover:to-amber-200",
                      "dark:hover:from-amber-800/40 dark:hover:via-yellow-800/40 dark:hover:to-amber-800/40",
                      "border border-amber-200 dark:border-amber-800",
                      "hover:scale-[1.02] transition-all duration-300",
                      "hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]",
                      "dark:hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]",
                      "font-mono tracking-[.25em] text-lg"
                    )}
                  >
                    {zainifyingTickets.includes(ticket.id) ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Pyramid className="h-6 w-6 stroke-amber-600/70 dark:stroke-amber-400/70" />
                        <span>ｚ<span className="text-blue-600 dark:text-blue-400">ａｉ</span>ｎｉｆｙ</span>
                      </div>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Apply all Zain Functions
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex justify-between mb-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => ticket.ai_description ? undoSummary(ticket.id) : summarizeTicket(ticket.id)}
                      disabled={summarizingTickets.includes(ticket.id) || undoingTickets.includes(ticket.id)}
                      className={cn(
                        "h-8 w-16 group",
                        !summarizingTickets.includes(ticket.id) && !undoingTickets.includes(ticket.id) && 
                        (ticket.ai_description ? aiButtonUndoClass : aiButtonClass)
                      )}
                    >
                      {summarizingTickets.includes(ticket.id) || undoingTickets.includes(ticket.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : ticket.ai_description ? (
                        <IconWithX Icon={Sparkles} className={aiIconUndoClass} />
                      ) : (
                        <Sparkles className={aiIconClass} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {ticket.ai_description ? "Remove Summary" : "Add Summary"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => ticket.tags?.length ? undoTags(ticket.id) : generateTags(ticket.id)}
                      disabled={taggingTickets.includes(ticket.id) || undoingTags.includes(ticket.id)}
                      className={cn(
                        "h-8 w-16 group",
                        !taggingTickets.includes(ticket.id) && !undoingTags.includes(ticket.id) && 
                        (ticket.tags?.length ? aiButtonUndoClass : aiButtonClass)
                      )}
                    >
                      {taggingTickets.includes(ticket.id) || undoingTags.includes(ticket.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : ticket.tags?.length ? (
                        <IconWithX Icon={Tag} className={aiIconUndoClass} />
                      ) : (
                        <Tag className={aiIconClass} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {ticket.tags?.length ? "Remove Tags" : "Add Tags"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => ticket.assigned_team ? undoTeamAssignment(ticket.id) : assignTeams(ticket.id)}
                      disabled={assigningTeams.includes(ticket.id) || undoingTeams.includes(ticket.id)}
                      className={cn(
                        "h-8 w-16 group",
                        !assigningTeams.includes(ticket.id) && !undoingTeams.includes(ticket.id) && 
                        (ticket.assigned_team ? aiButtonUndoClass : aiButtonClass)
                      )}
                    >
                      {assigningTeams.includes(ticket.id) || undoingTeams.includes(ticket.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : ticket.assigned_team ? (
                        <IconWithX Icon={HeartHandshake} className={aiIconUndoClass} />
                      ) : (
                        <HeartHandshake className={aiIconClass} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {ticket.assigned_team ? "Remove Team" : "Add Team"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => ticket.priority && ticket.priority !== 'NONE' ? undoPriority(ticket.id) : assignPriority(ticket.id)}
                      disabled={assigningPriorities.includes(ticket.id) || undoingPriorities.includes(ticket.id)}
                      className={cn(
                        "h-8 w-16 group",
                        !assigningPriorities.includes(ticket.id) && !undoingPriorities.includes(ticket.id) && 
                        (ticket.priority && ticket.priority !== 'NONE' ? aiButtonUndoClass : aiButtonClass)
                      )}
                    >
                      {assigningPriorities.includes(ticket.id) || undoingPriorities.includes(ticket.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : ticket.priority && ticket.priority !== 'NONE' ? (
                        <IconWithX Icon={Flame} className={aiIconUndoClass} />
                      ) : (
                        <Flame className={aiIconClass} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {ticket.priority && ticket.priority !== 'NONE' ? "Remove Priority" : "Add Priority"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => ticket.ai_note ? undoNote(ticket.id) : generateNote(ticket.id)}
                      disabled={generatingNotes.includes(ticket.id) || undoingNotes.includes(ticket.id)}
                      className={cn(
                        "h-8 w-16 group",
                        !generatingNotes.includes(ticket.id) && !undoingNotes.includes(ticket.id) && 
                        (ticket.ai_note ? aiButtonUndoClass : aiButtonClass)
                      )}
                    >
                      {generatingNotes.includes(ticket.id) || undoingNotes.includes(ticket.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : ticket.ai_note ? (
                        <IconWithX Icon={StickyNote} className={aiIconUndoClass} />
                      ) : (
                        <StickyNote className={aiIconClass} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {ticket.ai_note ? "Remove Note" : "Add Note"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div>
              <h3 className="font-semibold">{ticket.title}</h3>
              <p className="text-sm text-muted-foreground">
                Status: {ticket.status}
              </p>
            </div>

            <div className="flex-1 space-y-3 mt-4">
              {ticket.ai_description && (
                <div className="bg-muted p-3 rounded-md">
                  <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
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

              {ticket.assigned_team && (
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const team = teams.find(t => t.id === ticket.assigned_team);
                    return team ? (
                      <Badge key={team.id} variant="secondary" className="bg-blue-100 dark:bg-blue-900">
                        {team.name}
                        {team.focus_area && ` • ${team.focus_area}`}
                      </Badge>
                    ) : null;
                  })()}
                </div>
              )}

              {ticket.priority && ticket.priority !== 'NONE' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full cursor-pointer">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "w-full justify-between",
                          "hover:opacity-80 transition-opacity",
                          ticket.priority === 'LOW' && "bg-blue-100 dark:bg-blue-900",
                          ticket.priority === 'MEDIUM' && "bg-yellow-100 dark:bg-yellow-900",
                          ticket.priority === 'HIGH' && "bg-orange-100 dark:bg-orange-900",
                          ticket.priority === 'CRITICAL' && "bg-red-100 dark:bg-red-900"
                        )}
                      >
                        <div className="flex items-center gap-1">
                          Priority: {ticket.priority}
                        </div>
                        <Info className="h-3 w-3 opacity-50" />
                      </Badge>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium">AI Priority Analysis</h4>
                      <div className="max-h-[300px] overflow-y-auto">
                        <p className="text-sm text-muted-foreground">
                          {priorityOperations[ticket.id]?.metadata.reasoning || 
                           "Reasoning not available for this priority assignment."}
                        </p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {ticket.ai_note && (
                <div className="bg-amber-50 dark:bg-amber-950/30 p-3 border border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                    <StickyNote className="h-4 w-4" />
                    <span>✨ Customer Note</span>
                  </div>
                  <p className="text-sm">{ticket.ai_note.content}</p>
                </div>
              )}
            </div>
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
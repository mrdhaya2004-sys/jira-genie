import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  tag: string | null;
  is_pinned: boolean;
  is_important: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export const NOTE_COLORS = [
  { id: 'yellow', label: 'Yellow', bg: 'bg-yellow-100 dark:bg-yellow-950/40', border: 'border-yellow-300 dark:border-yellow-800', dot: 'bg-yellow-400' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-100 dark:bg-blue-950/40', border: 'border-blue-300 dark:border-blue-800', dot: 'bg-blue-400' },
  { id: 'green', label: 'Green', bg: 'bg-green-100 dark:bg-green-950/40', border: 'border-green-300 dark:border-green-800', dot: 'bg-green-400' },
  { id: 'pink', label: 'Pink', bg: 'bg-pink-100 dark:bg-pink-950/40', border: 'border-pink-300 dark:border-pink-800', dot: 'bg-pink-400' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-100 dark:bg-purple-950/40', border: 'border-purple-300 dark:border-purple-800', dot: 'bg-purple-400' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-100 dark:bg-orange-950/40', border: 'border-orange-300 dark:border-orange-800', dot: 'bg-orange-400' },
] as const;

export const getColorClasses = (colorId: string) =>
  NOTE_COLORS.find((c) => c.id === colorId) ?? NOTE_COLORS[0];

export const useNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load notes', description: error.message, variant: 'destructive' });
    } else {
      setNotes((data ?? []) as Note[]);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = useCallback(async (): Promise<Note | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, title: '', content: '', color: 'yellow' })
      .select()
      .single();
    if (error) {
      toast({ title: 'Could not create note', description: error.message, variant: 'destructive' });
      return null;
    }
    setNotes((prev) => [data as Note, ...prev]);
    return data as Note;
  }, [user]);

  const updateNoteLocal = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const persistNote = useCallback(async (id: string, patch: Partial<Note>) => {
    const { error } = await supabase.from('notes').update(patch).eq('id', id);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    }
  }, []);

  // Debounced auto-save for content/title
  const updateNote = useCallback(
    (id: string, patch: Partial<Note>, debounceMs = 600) => {
      updateNoteLocal(id, patch);
      if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
      saveTimers.current[id] = setTimeout(() => {
        persistNote(id, patch);
      }, debounceMs);
    },
    [updateNoteLocal, persistNote]
  );

  const updateNoteImmediate = useCallback(
    async (id: string, patch: Partial<Note>) => {
      updateNoteLocal(id, patch);
      await persistNote(id, patch);
    },
    [updateNoteLocal, persistNote]
  );

  const deleteNote = useCallback(async (id: string) => {
    const prev = notes;
    setNotes((p) => p.filter((n) => n.id !== id));
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
      setNotes(prev);
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    }
  }, [notes]);

  return {
    notes,
    isLoading,
    refetch: fetchNotes,
    createNote,
    updateNote,
    updateNoteImmediate,
    deleteNote,
  };
};

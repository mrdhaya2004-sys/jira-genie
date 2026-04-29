import React, { useMemo, useState } from 'react';
import { Plus, Search, Pin, Star, Trash2, ArrowLeft, Tag as TagIcon, Palette, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useNotes, NOTE_COLORS, getColorClasses, type Note } from '@/hooks/useNotes';
import NoteEditor from './NoteEditor';
import { formatDistanceToNow } from 'date-fns';

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const NotesPanel: React.FC = () => {
  const { notes, isLoading, createNote, updateNote, updateNoteImmediate, deleteNote } = useNotes();
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const tags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tag && set.add(n.tag));
    return Array.from(set);
  }, [notes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes
      .filter((n) => (tagFilter ? n.tag === tagFilter : true))
      .filter((n) => {
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          stripHtml(n.content).toLowerCase().includes(q) ||
          (n.tag ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [notes, search, tagFilter]);

  const active = notes.find((n) => n.id === activeId) ?? null;

  const handleNew = async () => {
    const n = await createNote();
    if (n) setActiveId(n.id);
  };

  return (
    <div className="w-[380px] max-w-[92vw] h-[520px] flex flex-col bg-popover">
      {active ? (
        <NoteDetail
          note={active}
          onBack={() => setActiveId(null)}
          onChange={(patch) => updateNote(active.id, patch)}
          onChangeImmediate={(patch) => updateNoteImmediate(active.id, patch)}
          onDelete={async () => {
            await deleteNote(active.id);
            setActiveId(null);
          }}
        />
      ) : (
        <>
          <div className="p-3 border-b border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Smart Notes</h3>
              <Button size="sm" className="h-7 gap-1" onClick={handleNew}>
                <Plus className="h-3.5 w-3.5" /> New
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="h-8 pl-7 text-sm"
              />
            </div>
            {tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setTagFilter(null)}
                  className={cn(
                    'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                    !tagFilter ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent'
                  )}
                >
                  All
                </button>
                {tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTagFilter(t)}
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                      tagFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-accent'
                    )}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No notes yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create your first sticky note to get started.</p>
              </div>
            ) : (
              <div className="p-2 grid grid-cols-2 gap-2">
                {filtered.map((n) => (
                  <NoteCard key={n.id} note={n} onOpen={() => setActiveId(n.id)} />
                ))}
              </div>
            )}
          </ScrollArea>
        </>
      )}
    </div>
  );
};

const NoteCard: React.FC<{ note: Note; onOpen: () => void }> = ({ note, onOpen }) => {
  const c = getColorClasses(note.color);
  const preview = stripHtml(note.content).slice(0, 80);
  return (
    <button
      onClick={onOpen}
      className={cn(
        'text-left rounded-md border p-2 transition-all hover:shadow-md hover:-translate-y-0.5',
        c.bg,
        c.border,
        note.is_pinned && 'ring-1 ring-primary/40'
      )}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-xs font-semibold line-clamp-1 flex-1">{note.title || 'Untitled'}</p>
        <div className="flex items-center gap-0.5 shrink-0">
          {note.is_important && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
          {note.is_pinned && <Pin className="h-3 w-3 fill-primary text-primary" />}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground line-clamp-3 leading-snug min-h-[2.5rem]">
        {preview || 'Empty note'}
      </p>
      <div className="flex items-center justify-between mt-1.5">
        {note.tag ? (
          <span className="text-[10px] text-muted-foreground">#{note.tag}</span>
        ) : (
          <span />
        )}
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
        </span>
      </div>
    </button>
  );
};

const NoteDetail: React.FC<{
  note: Note;
  onBack: () => void;
  onChange: (patch: Partial<Note>) => void;
  onChangeImmediate: (patch: Partial<Note>) => Promise<void>;
  onDelete: () => Promise<void>;
}> = ({ note, onBack, onChange, onChangeImmediate, onDelete }) => {
  const c = getColorClasses(note.color);
  const [tagInput, setTagInput] = useState(note.tag ?? '');

  return (
    <div className={cn('flex flex-col h-full', c.bg)}>
      <div className="flex items-center justify-between p-2 border-b border-border/60 bg-background/40 backdrop-blur-sm">
        <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Pin"
            onClick={() => onChangeImmediate({ is_pinned: !note.is_pinned })}
          >
            <Pin className={cn('h-3.5 w-3.5', note.is_pinned && 'fill-primary text-primary')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Important"
            onClick={() => onChangeImmediate({ is_important: !note.is_important })}
          >
            <Star className={cn('h-3.5 w-3.5', note.is_important && 'fill-amber-500 text-amber-500')} />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Color">
                <Palette className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <div className="flex gap-1.5">
                {NOTE_COLORS.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => onChangeImmediate({ color: col.id })}
                    className={cn(
                      'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                      col.dot,
                      note.color === col.id ? 'border-foreground' : 'border-transparent'
                    )}
                    aria-label={col.label}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            aria-label="Delete"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="p-2 flex flex-col gap-2 flex-1 min-h-0">
        <Input
          value={note.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Title"
          className="h-8 text-sm font-medium border-border/40 bg-background/60 shrink-0"
        />
        <div className="relative shrink-0">
          <TagIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onBlur={() => onChangeImmediate({ tag: tagInput.trim() || null })}
            placeholder="Add a tag"
            className="h-7 pl-7 text-xs border-border/40 bg-background/60"
          />
        </div>
        <div className="flex-1 min-h-0">
          <NoteEditor content={note.content} onChange={(html) => onChange({ content: html })} />
        </div>
        <p className="text-[10px] text-muted-foreground text-right shrink-0">
          Edited {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })} · auto-saved
        </p>
      </div>
    </div>
  );
};

export default NotesPanel;

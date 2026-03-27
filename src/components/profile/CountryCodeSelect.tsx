import React, { useState, useMemo } from 'react';
import { countryCodes, type CountryCode } from '@/lib/countryCodes';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountryCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

const CountryCodeSelect: React.FC<CountryCodeSelectProps> = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = useMemo(() => countryCodes.find(c => c.code === value), [value]);

  const filtered = useMemo(() => {
    if (!search.trim()) return countryCodes;
    const q = search.toLowerCase();
    return countryCodes.filter(
      c => c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            'w-[120px] justify-between px-2 text-sm font-medium shrink-0',
            !selected && 'text-muted-foreground'
          )}
        >
          <span className="truncate">
            {selected ? `${selected.code} ${selected.dialCode}` : 'Select'}
          </span>
          <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search country..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 h-8 text-sm"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="h-[240px]">
          <div className="p-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No countries found</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.code}
                  onClick={() => { onChange(c.code); setOpen(false); setSearch(''); }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-left',
                    value === c.code && 'bg-accent font-medium'
                  )}
                >
                  <span className="text-muted-foreground w-[50px] shrink-0">{c.dialCode}</span>
                  <span className="truncate">{c.name}</span>
                  <span className="text-muted-foreground text-xs ml-auto shrink-0">{c.code}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default CountryCodeSelect;

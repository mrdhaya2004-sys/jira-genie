import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: string;
  onConfirm: (runAt: Date) => Promise<void>;
}

const ScheduleExecutionDialog: React.FC<Props> = ({ open, onOpenChange, branch, onConfirm }) => {
  const [date, setDate] = useState<Date | undefined>(new Date(Date.now() + 60 * 60 * 1000));
  const [time, setTime] = useState<string>(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (!date) return;
    const [h, m] = time.split(':').map(Number);
    const runAt = new Date(date);
    runAt.setHours(h, m, 0, 0);
    if (runAt.getTime() <= Date.now()) {
      runAt.setTime(Date.now() + 60 * 1000);
    }
    setBusy(true);
    try {
      await onConfirm(runAt);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Schedule Execution</DialogTitle>
          <DialogDescription>Trigger the <span className="font-medium">{branch}</span> pipeline at a future time.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className={cn('p-3 pointer-events-auto')} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="time">Time</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="pl-9" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={busy || !date}>
            {busy ? 'Scheduling…' : 'Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleExecutionDialog;

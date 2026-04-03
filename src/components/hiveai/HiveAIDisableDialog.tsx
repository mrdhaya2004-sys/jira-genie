import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface HiveAIDisableDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const HiveAIDisableDialog: React.FC<HiveAIDisableDialogProps> = ({ open, onConfirm, onCancel }) => (
  <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <span className="text-lg">🐝</span>
          Disable Hive AI Chat?
        </AlertDialogTitle>
        <AlertDialogDescription>
          You won't have access to the Hive AI floating assistant until you re-enable it from
          <strong> Profile → Preferences</strong> or <strong>AI Configuration</strong>.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>Keep Enabled</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          Disable
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default HiveAIDisableDialog;

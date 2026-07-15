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
import { ShieldAlert } from 'lucide-react';

interface Props {
  open: boolean;
  onLogin: () => void;
  onCancel: () => void;
  reason?: 'inactivity' | 'expired';
}

const SessionExpiredDialog: React.FC<Props> = ({ open, onLogin, onCancel, reason = 'expired' }) => (
  <AlertDialog open={open}>
    <AlertDialogContent className="max-w-md">
      <AlertDialogHeader>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-amber-500/10 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          </div>
          <AlertDialogTitle className="text-lg">Session Expired</AlertDialogTitle>
        </div>
        <AlertDialogDescription className="pt-2">
          {reason === 'inactivity'
            ? 'For your security, your session ended after a period of inactivity. Please sign in again to continue.'
            : 'For your security, your session has expired. Please sign in again to continue.'}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onLogin}>Login Again</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default SessionExpiredDialog;

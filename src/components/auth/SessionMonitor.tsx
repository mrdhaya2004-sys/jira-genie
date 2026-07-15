import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import SessionExpiredDialog from './SessionExpiredDialog';

const SessionMonitor: React.FC = () => {
  const navigate = useNavigate();
  const { sessionExpired, expiredReason, dismissSessionExpired } = useAuth();

  return (
    <SessionExpiredDialog
      open={sessionExpired}
      reason={expiredReason ?? 'expired'}
      onLogin={() => {
        dismissSessionExpired();
        navigate('/auth/login', { replace: true });
      }}
      onCancel={() => {
        dismissSessionExpired();
      }}
    />
  );
};

export default SessionMonitor;

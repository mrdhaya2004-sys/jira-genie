import React, { useState } from 'react';
import GitLabConnectionGate from './GitLabConnectionGate';
import GitLabChatPanel from './GitLabChatPanel';
import { useGitLabConnection } from '@/hooks/useGitLabConnection';

const GitLabExecutionModule: React.FC = () => {
  const { connection, loading } = useGitLabConnection();
  const [showGate, setShowGate] = useState(false);

  React.useEffect(() => {
    if (!loading && !connection) setShowGate(true);
  }, [loading, connection]);

  return (
    <div className="relative h-full w-full bg-background overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-rose-500/10 blur-3xl" />
      </div>
      <div className="relative h-full flex flex-col">
        <GitLabChatPanel onConnect={() => setShowGate(true)} onShowHistory={() => { /* drawer handled inside */ }} />
      </div>
      {showGate && <GitLabConnectionGate onCancel={() => setShowGate(false)} />}
    </div>
  );
};

export default GitLabExecutionModule;

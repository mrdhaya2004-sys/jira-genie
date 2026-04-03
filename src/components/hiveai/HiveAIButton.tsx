import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useHiveAISettings } from '@/hooks/useHiveAISettings';
import HiveAIChatModal from './HiveAIChatModal';

const STORAGE_KEY = 'hive-ai-position';
const DEFAULT_POS = { x: -24, y: -24 };

const HiveAIButton: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { hiveEnabled, isLoading: settingsLoading } = useHiveAISettings();
  const [chatOpen, setChatOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const posRef = useRef(DEFAULT_POS);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const hasDragged = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) posRef.current = JSON.parse(saved);
    } catch { /* ignore */ }
    applyPosition(posRef.current);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.removeItem(STORAGE_KEY);
      posRef.current = DEFAULT_POS;
      applyPosition(DEFAULT_POS);
    }
  }, [isAuthenticated]);

  const applyPosition = (pos: { x: number; y: number }) => {
    if (buttonRef.current) {
      buttonRef.current.style.right = `${-pos.x}px`;
      buttonRef.current.style.bottom = `${-pos.y}px`;
    }
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    hasDragged.current = false;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: posRef.current.x, origY: posRef.current.y };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged.current = true;
    const newPos = { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy };
    posRef.current = newPos;
    applyPosition(newPos);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current));
    }
    dragRef.current = null;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const handleClick = useCallback(() => {
    if (!hasDragged.current) setChatOpen(prev => !prev);
  }, []);

  if (!isAuthenticated || settingsLoading || !hiveEnabled) return null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'fixed',
          right: `${-DEFAULT_POS.x}px`,
          bottom: `${-DEFAULT_POS.y}px`,
          zIndex: 9999,
          touchAction: 'none',
          willChange: 'right, bottom',
        }}
        className={`
          group h-14 w-14 rounded-full
          bg-gradient-to-br from-[#0a1628] via-[#0d3320] to-[#122a4e]
          shadow-[0_0_18px_4px_rgba(34,197,94,0.35),0_0_40px_8px_rgba(14,50,100,0.3)]
          flex items-center justify-center
          text-white font-bold text-[11px] leading-none tracking-tight
          hover:shadow-[0_0_24px_8px_rgba(34,197,94,0.5),0_0_50px_12px_rgba(14,50,100,0.4)]
          active:scale-95
          select-none
          ${isDragging ? 'cursor-grabbing scale-95' : 'cursor-grab'}
        `}
      >
        <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-green-500/30 via-emerald-400/20 to-blue-900/30 blur-md animate-pulse pointer-events-none" />
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-green-500/25 to-blue-800/20 animate-pulse pointer-events-none" />
        <span className="absolute inset-0 rounded-full border border-green-400/40 pointer-events-none" />
        <span className="relative z-10 flex flex-col items-center gap-0.5">
          <span className="text-[13px]">🐝</span>
          <span className="text-[9px] font-semibold tracking-wider uppercase text-green-300/90">Hive AI</span>
        </span>
      </button>

      <HiveAIChatModal open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
};

export default HiveAIButton;

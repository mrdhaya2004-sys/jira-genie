import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import HiveAIChatModal from './HiveAIChatModal';

const STORAGE_KEY = 'hive-ai-position';
const DEFAULT_POS = { x: -24, y: -24 }; // offset from bottom-right

const HiveAIButton: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [position, setPosition] = useState(DEFAULT_POS);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const hasDragged = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load saved position
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setPosition(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Reset position on logout
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.removeItem(STORAGE_KEY);
      setPosition(DEFAULT_POS);
    }
  }, [isAuthenticated]);

  const savePosition = useCallback((pos: { x: number; y: number }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    hasDragged.current = false;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: position.x, origY: position.y };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged.current = true;
    const newX = dragRef.current.origX + dx;
    const newY = dragRef.current.origY + dy;
    setPosition({ x: newX, y: newY });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      savePosition(position);
    }
    dragRef.current = null;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [position, savePosition]);

  const handleClick = useCallback(() => {
    if (!hasDragged.current) setChatOpen(prev => !prev);
  }, []);

  if (!isAuthenticated) return null;

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
          right: `${-position.x}px`,
          bottom: `${-position.y}px`,
          zIndex: 9999,
          touchAction: 'none',
        }}
        className={`
          group h-14 w-14 rounded-full
          bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400
          shadow-lg shadow-teal-500/30
          flex items-center justify-center
          text-white font-bold text-[11px] leading-none tracking-tight
          transition-shadow duration-300
          hover:shadow-xl hover:shadow-teal-400/40
          active:scale-95
          select-none
          ${isDragging ? 'cursor-grabbing scale-95' : 'cursor-grab'}
        `}
      >
        {/* Glow ring */}
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/40 to-cyan-400/40 animate-pulse pointer-events-none" />
        <span className="relative z-10 flex flex-col items-center gap-0.5">
          <span className="text-[13px]">🐝</span>
          <span className="text-[9px] font-semibold tracking-wider uppercase">Hive AI</span>
        </span>
      </button>

      <HiveAIChatModal open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
};

export default HiveAIButton;

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
      <style>{`
        @keyframes hive-glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes hive-ring-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.15); }
        }
        .hive-btn-glow {
          animation: hive-glow-pulse 3s ease-in-out infinite;
        }
        .hive-btn-ring {
          animation: hive-ring-pulse 3s ease-in-out infinite 0.5s;
        }
        .hive-btn-container:hover .hive-btn-glow {
          opacity: 0.95 !important;
          transform: scale(1.12) !important;
        }
        .hive-btn-container:hover .hive-btn-ring {
          opacity: 0.7 !important;
          transform: scale(1.2) !important;
        }
        .hive-btn-container.chat-open .hive-btn-glow {
          animation: none;
          opacity: 0.3;
          transform: scale(1);
        }
        .hive-btn-container.chat-open .hive-btn-ring {
          animation: none;
          opacity: 0.15;
          transform: scale(1);
        }
      `}</style>
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
          hive-btn-container group
          h-14 w-14 rounded-full relative
          flex items-center justify-center
          select-none
          transition-transform duration-200
          active:scale-95
          ${chatOpen ? 'chat-open' : ''}
          ${isDragging ? 'cursor-grabbing scale-95' : 'cursor-grab'}
        `}
      >
        {/* Outer glow ring */}
        <span
          className="hive-btn-ring absolute -inset-2 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(56,189,248,0.25) 0%, rgba(52,211,153,0.15) 50%, transparent 70%)',
          }}
        />
        {/* Inner glow */}
        <span
          className="hive-btn-glow absolute -inset-1 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(56,189,248,0.35) 0%, rgba(52,211,153,0.2) 60%, transparent 75%)',
            filter: 'blur(6px)',
          }}
        />
        {/* Button surface */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 40%, #34d399 100%)',
            boxShadow: '0 2px 12px rgba(14,165,233,0.3), 0 1px 4px rgba(0,0,0,0.15)',
          }}
        />
        {/* Subtle inner highlight */}
        <span
          className="absolute inset-[1px] rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
          }}
        />
        {/* Border */}
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        />
        {/* Text */}
        <span className="relative z-10 flex flex-col items-center leading-none">
          <span className="text-[11px] font-bold tracking-wide text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
            HIVE AI
          </span>
        </span>
      </button>

      <HiveAIChatModal open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
};

export default HiveAIButton;

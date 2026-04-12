import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useHiveAISettings } from '@/hooks/useHiveAISettings';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import HiveAIChatModal from './HiveAIChatModal';

const STORAGE_KEY = 'hive-ai-position';
const DEFAULT_POS = { x: -24, y: -24 };

const HiveAIButton: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { hiveEnabled, isLoading: settingsLoading } = useHiveAISettings();
  const [chatOpen, setChatOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [ripple, setRipple] = useState(false);
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
    if (!hasDragged.current) {
      setRipple(true);
      setTimeout(() => setRipple(false), 600);
      setChatOpen(prev => !prev);
    }
  }, []);

  if (!isAuthenticated || settingsLoading || !hiveEnabled) return null;

  return (
    <>
      <style>{`
        @keyframes hive-glow-breathe {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.12); }
        }
        @keyframes hive-ring-breathe {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.22); }
        }
        @keyframes hive-outer-breathe {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(1.3); }
        }
        @keyframes hive-ripple {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0; transform: scale(2.2); }
        }
        .hive-glow-inner {
          animation: hive-glow-breathe 2.8s ease-in-out infinite;
        }
        .hive-glow-mid {
          animation: hive-ring-breathe 2.8s ease-in-out infinite 0.3s;
        }
        .hive-glow-outer {
          animation: hive-outer-breathe 2.8s ease-in-out infinite 0.6s;
        }
        .hive-container:hover .hive-glow-inner {
          opacity: 1 !important;
          transform: scale(1.15) !important;
          filter: blur(8px) brightness(1.2);
        }
        .hive-container:hover .hive-glow-mid {
          opacity: 0.8 !important;
          transform: scale(1.28) !important;
        }
        .hive-container:hover .hive-glow-outer {
          opacity: 0.55 !important;
          transform: scale(1.38) !important;
        }
        .hive-container.is-open .hive-glow-inner {
          animation-play-state: running;
          opacity: 0.35;
        }
        .hive-container.is-open .hive-glow-mid {
          animation-play-state: running;
          opacity: 0.2;
        }
        .hive-container.is-open .hive-glow-outer {
          animation-play-state: running;
          opacity: 0.1;
        }
        .hive-ripple-ring {
          animation: hive-ripple 0.6s ease-out forwards;
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
          hive-container group
          h-14 w-14 rounded-full relative
          flex items-center justify-center
          select-none
          transition-transform duration-200
          active:scale-95
          ${chatOpen ? 'is-open' : ''}
          ${isDragging ? 'cursor-grabbing scale-95' : 'cursor-grab'}
        `}
      >
        {/* Layer 1: Outer wide glow */}
        <span
          className="hive-glow-outer absolute rounded-full pointer-events-none"
          style={{
            inset: '-12px',
            background: 'radial-gradient(circle, rgba(0,198,255,0.2) 0%, rgba(0,255,179,0.12) 45%, transparent 70%)',
            filter: 'blur(10px)',
          }}
        />
        {/* Layer 2: Mid glow ring */}
        <span
          className="hive-glow-mid absolute rounded-full pointer-events-none"
          style={{
            inset: '-8px',
            background: 'radial-gradient(circle, rgba(0,198,255,0.3) 0%, rgba(0,255,179,0.2) 50%, transparent 72%)',
            filter: 'blur(6px)',
          }}
        />
        {/* Layer 3: Inner intense glow */}
        <span
          className="hive-glow-inner absolute rounded-full pointer-events-none"
          style={{
            inset: '-4px',
            background: 'radial-gradient(circle, rgba(0,198,255,0.45) 0%, rgba(0,255,179,0.3) 55%, transparent 75%)',
            filter: 'blur(5px)',
          }}
        />
        {/* Ripple effect on click */}
        {ripple && (
          <span
            className="hive-ripple-ring absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: '2px solid rgba(0,198,255,0.5)',
            }}
          />
        )}
        {/* Button surface */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #00C6FF 0%, #00e0c0 50%, #00FFB3 100%)',
            boxShadow: '0 4px 20px rgba(0,198,255,0.4), 0 2px 8px rgba(0,255,179,0.3), inset 0 1px 1px rgba(255,255,255,0.25)',
          }}
        />
        {/* Inner highlight */}
        <span
          className="absolute inset-[1px] rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,0.25) 0%, transparent 45%)',
          }}
        />
        {/* Border */}
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(255,255,255,0.3)' }}
        />
        {/* Text */}
        <span className="relative z-10 flex flex-col items-center leading-none">
          <span
            className="text-[11px] font-bold tracking-wider text-white"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}
          >
            HIVE AI
          </span>
        </span>
      </button>

      <HiveAIChatModal open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
};

export default HiveAIButton;

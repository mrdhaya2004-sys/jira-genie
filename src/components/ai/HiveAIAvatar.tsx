import React from 'react';
import { cn } from '@/lib/utils';
import hiveAvatar from '@/assets/hive-ai-avatar.png.asset.json';

interface HiveAIAvatarProps {
  size?: number;
  className?: string;
  glow?: boolean;
  hover?: boolean;
}

/**
 * Official Hive AI avatar — modern robot mascot used across all AI surfaces.
 * Circular glassmorphism container with blue→cyan→green gradient ring + glow.
 */
const HiveAIAvatar: React.FC<HiveAIAvatarProps> = ({
  size = 40,
  className,
  glow = true,
  hover = true,
}) => {
  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center shrink-0 rounded-full',
        'bg-gradient-to-br from-primary/20 via-[hsl(var(--chart-2))]/20 to-success/20',
        'backdrop-blur-md ring-1 ring-white/20',
        hover && 'transition-all duration-300 ease-out hover:scale-105',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {glow && (
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 rounded-full blur-md opacity-60',
            'bg-gradient-to-br from-primary via-[hsl(var(--chart-2))] to-success',
            hover && 'transition-opacity duration-300 hover:opacity-90',
          )}
        />
      )}
      <img
        src={hiveAvatar.url}
        alt="Hive AI"
        loading="lazy"
        decoding="async"
        className="relative h-full w-full object-cover rounded-full"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  );
};

export default HiveAIAvatar;

import React, { useEffect, useRef } from 'react';
import { drawClubCrest, drawHDPlayerSprite, drawMiniJerseyIcon } from '../game/sprites';
import { PlayerSpec, TeamSpec } from '../types';

export const ClubCrest: React.FC<{ team: TeamSpec; className?: string }> = ({ team, className = 'w-6 h-6' }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (ref.current) drawClubCrest(ref.current, team);
  }, [team]);
  return <canvas ref={ref} width={48} height={48} className={`pixelated shrink-0 ${className}`} />;
};

export const KitSwatch: React.FC<{ team: TeamSpec; useAway?: boolean; className?: string }> = ({
  team,
  useAway = false,
  className = 'w-6 h-6'
}) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (ref.current) drawMiniJerseyIcon(ref.current, team, useAway);
  }, [team, useAway]);
  return <canvas ref={ref} width={36} height={36} className={`pixelated shrink-0 ${className}`} />;
};

export const PlayerSpritePreview: React.FC<{
  player: PlayerSpec;
  team: TeamSpec;
  useAway?: boolean;
  className?: string;
  spriteScale?: number;
  action?: 'idle' | 'celebrate';
}> = ({ player, team, useAway = false, className = 'w-12 h-14', spriteScale = 1.75, action = 'idle' }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false;
    drawHDPlayerSprite(ctx, c.width / 2, c.height - 7, spriteScale, player, team, useAway, {
      dirX: 1,
      frame: 0,
      action,
      shadow: true
    });
  }, [player, team, useAway, spriteScale, action]);
  return <canvas ref={ref} width={76} height={80} className={`pixelated shrink-0 ${className}`} />;
};

export const ChampionshipTrophy: React.FC<{ gold?: boolean; label: string }> = ({ gold = true, label }) => (
  <div className="flex flex-col items-center gap-2.5 py-2">
    <svg width="72" height="72" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="trophyGrad" x1="16" y1="8" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={gold ? '#fef08a' : '#f8fafc'} />
          <stop offset="50%" stopColor={gold ? '#eab308' : '#cbd5e1'} />
          <stop offset="100%" stopColor={gold ? '#a16207' : '#64748b'} />
        </linearGradient>
      </defs>
      <path
        d="M16 14 H10 C8 14 7 16 7 19 C7 25 12 30 19 31 M48 14 H54 C56 14 57 16 57 19 C57 25 52 30 45 31"
        stroke="url(#trophyGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M17 10 H47 L44 30 C43 37 38 42 32 42 C26 42 21 37 20 30 Z"
        fill="url(#trophyGrad)"
        stroke={gold ? '#fef9c3' : '#f1f5f9'}
        strokeWidth="1.5"
      />
      <rect x="29" y="42" width="6" height="9" rx="1" fill="url(#trophyGrad)" />
      <rect x="20" y="51" width="24" height="5" rx="2" fill="#1e293b" stroke="url(#trophyGrad)" strokeWidth="1.5" />
      <rect x="16" y="56" width="32" height="4" rx="2" fill="#0f172a" />
    </svg>
    <span className="text-xs font-extrabold text-amber-300 tracking-wide uppercase font-display">{label}</span>
  </div>
);

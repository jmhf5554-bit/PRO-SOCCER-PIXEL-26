import React, { useEffect, useRef } from 'react';
import { drawClubCrest, drawPixelPlayerSprite } from '../game/sprites';
import { PlayerSpec, TeamSpec } from '../types';

export const ClubCrest: React.FC<{ team: TeamSpec; className?: string }> = ({ team, className = 'w-5 h-5' }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (ref.current) drawClubCrest(ref.current, team);
  }, [team]);
  return <canvas ref={ref} width={16} height={16} className={`shrink-0 ${className}`} style={{ imageRendering: 'pixelated' }} />;
};

export const KitSwatch: React.FC<{ team: TeamSpec; useAway?: boolean; className?: string }> = ({ team, className = 'w-5 h-5' }) => {
  return <ClubCrest team={team} className={className} />;
};

export const PlayerSpritePreview: React.FC<{ player: PlayerSpec; team: TeamSpec; useAway?: boolean; className?: string }> = ({
  player,
  team,
  useAway = false,
  className = 'w-9 h-11'
}) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false;
    drawPixelPlayerSprite(ctx, 9, 23, 1, player, team, useAway, { dirX: 1, frame: 0, action: 'idle', shadow: false });
  }, [player, team, useAway]);
  return <canvas ref={ref} width={18} height={24} className={`shrink-0 ${className}`} style={{ imageRendering: 'pixelated' }} />;
};

export const PixelTrophy: React.FC<{ gold?: boolean; label: string }> = ({ gold = true, label }) => (
  <div className="flex flex-col items-center gap-2 py-2">
    <svg width="64" height="64" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }} aria-hidden="true">
      <rect x="4" y="2" width="8" height="2" fill={gold ? '#fde047' : '#e2e8f0'} />
      <rect x="3" y="3" width="10" height="4" fill={gold ? '#facc15' : '#cbd5e1'} />
      <rect x="2" y="3" width="1" height="3" fill={gold ? '#eab308' : '#94a3b8'} />
      <rect x="13" y="3" width="1" height="3" fill={gold ? '#eab308' : '#94a3b8'} />
      <rect x="5" y="7" width="6" height="2" fill={gold ? '#eab308' : '#94a3b8'} />
      <rect x="7" y="9" width="2" height="3" fill={gold ? '#ca8a04' : '#64748b'} />
      <rect x="4" y="12" width="8" height="2" fill="#451a03" />
      <rect x="5" y="13" width="6" height="1" fill="#facc15" />
    </svg>
    <span className="text-xs font-extrabold text-yellow-300 tracking-wide uppercase">{label}</span>
  </div>
);

import React, { useEffect, useRef, useState } from 'react';

export interface TouchInputState {
  ix: number;
  iy: number;
  sprintHeld: boolean;
  shootHeld: boolean;
  shieldHeld: boolean;
  passJust: boolean;
  throughJust: boolean;
  crossJust: boolean;
  shootJust: boolean;
  shootReleased: boolean;
  switchJust: boolean;
  shieldJust: boolean;
  anyActionJust: boolean;
}

export function createEmptyTouchInput(): TouchInputState {
  return {
    ix: 0,
    iy: 0,
    sprintHeld: false,
    shootHeld: false,
    shieldHeld: false,
    passJust: false,
    throughJust: false,
    crossJust: false,
    shootJust: false,
    shootReleased: false,
    switchJust: false,
    shieldJust: false,
    anyActionJust: false
  };
}

interface Props {
  touchRef: React.MutableRefObject<TouchInputState>;
  hasBall: boolean;
  isSetPiece: boolean;
}

export const MobileControls: React.FC<Props> = ({ touchRef, hasBall, isSetPiece }) => {
  const joyRef = useRef<HTMLDivElement | null>(null);
  const joyPointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0, active: false, autoSprint: false });
  const [pressedBtn, setPressedBtn] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const ref = touchRef;
    return () => {
      Object.assign(ref.current, createEmptyTouchInput());
    };
  }, [touchRef]);

  const updateJoystickFromPoint = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.36;
    const rawDx = clientX - cx;
    const rawDy = clientY - cy;
    const dist = Math.hypot(rawDx, rawDy);
    const clampedDist = Math.min(maxR, dist);
    const angle = Math.atan2(rawDy, rawDx);
    const kx = dist > 0 ? Math.cos(angle) * clampedDist : 0;
    const ky = dist > 0 ? Math.sin(angle) * clampedDist : 0;

    const normDist = maxR > 0 ? clampedDist / maxR : 0;
    if (normDist < 0.14) {
      touchRef.current.ix = 0;
      touchRef.current.iy = 0;
      setKnobOffset({ x: kx, y: ky, active: true, autoSprint: false });
    } else {
      const scaled = (normDist - 0.14) / 0.86;
      touchRef.current.ix = Math.cos(angle) * Math.min(1, scaled * 1.15);
      touchRef.current.iy = Math.sin(angle) * Math.min(1, scaled * 1.15);
      const autoSprint = normDist > 0.9;
      setKnobOffset({ x: kx, y: ky, active: true, autoSprint });
    }
  };

  const resetJoystick = () => {
    joyPointerId.current = null;
    touchRef.current.ix = 0;
    touchRef.current.iy = 0;
    setKnobOffset({ x: 0, y: 0, active: false, autoSprint: false });
  };

  const handleJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (joyPointerId.current !== null) return;
    joyPointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateJoystickFromPoint(e.clientX, e.clientY);
  };

  const handleJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    e.preventDefault();
    updateJoystickFromPoint(e.clientX, e.clientY);
  };

  const handleJoyUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    e.preventDefault();
    resetJoystick();
  };

  const bindAction = (
    key: 'shoot' | 'pass' | 'through' | 'cross' | 'sprint' | 'shield'
  ) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      setPressedBtn((prev) => ({ ...prev, [key]: true }));
      const t = touchRef.current;
      t.anyActionJust = true;
      if (key === 'shoot') {
        t.shootHeld = true;
        t.shootJust = true;
      } else if (key === 'pass') {
        t.passJust = true;
      } else if (key === 'through') {
        t.throughJust = true;
      } else if (key === 'cross') {
        t.crossJust = true;
      } else if (key === 'sprint') {
        t.sprintHeld = true;
        t.switchJust = true;
      } else if (key === 'shield') {
        t.shieldHeld = true;
        t.shieldJust = true;
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setPressedBtn((prev) => ({ ...prev, [key]: false }));
      const t = touchRef.current;
      if (key === 'shoot') {
        if (t.shootHeld) t.shootReleased = true;
        t.shootHeld = false;
      } else if (key === 'sprint') {
        t.sprintHeld = false;
      } else if (key === 'shield') {
        t.shieldHeld = false;
      }
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setPressedBtn((prev) => ({ ...prev, [key]: false }));
      const t = touchRef.current;
      if (key === 'shoot') {
        if (t.shootHeld) t.shootReleased = true;
        t.shootHeld = false;
      } else if (key === 'sprint') {
        t.sprintHeld = false;
      } else if (key === 'shield') {
        t.shieldHeld = false;
      }
    }
  });

  // Auto-sprint when outer rim of stick is engaged unless sprint button is explicitly overriding
  const sprintActive = pressedBtn.sprint || knobOffset.autoSprint;
  useEffect(() => {
    touchRef.current.sprintHeld = sprintActive;
  }, [sprintActive, touchRef]);

  return (
    <div
      className="touch-game-area pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-3 pb-3 sm:px-6 sm:pb-5"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      {/* Left Thumb Analog Stick */}
      <div
        ref={joyRef}
        onPointerDown={handleJoyDown}
        onPointerMove={handleJoyMove}
        onPointerUp={handleJoyUp}
        onPointerCancel={handleJoyUp}
        aria-label="Direcional analógico"
        className="pointer-events-auto relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-slate-950/40 backdrop-blur-sm border-2 border-white/25 shadow-2xl flex items-center justify-center touch-game-area"
      >
        {/* Crosshair ticks */}
        <div className="absolute inset-3 rounded-full border border-white/10 pointer-events-none" />
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 shadow-xl pointer-events-none transition-colors duration-75 ${
            knobOffset.autoSprint
              ? 'bg-gradient-to-br from-amber-300 to-orange-500 border-white'
              : knobOffset.active
              ? 'bg-gradient-to-br from-cyan-300 to-emerald-400 border-white'
              : 'bg-slate-200/80 border-white/80'
          }`}
          style={{
            transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`
          }}
        />
        <span className="absolute -bottom-0.5 text-[9px] font-bold uppercase tracking-wider text-white/65 pointer-events-none">
          {knobOffset.autoSprint ? 'SPRINT' : 'MOVER'}
        </span>
      </div>

      {/* Right Thumb Ergonomic Action Cluster (All >= 44px hitboxes) */}
      <div className="pointer-events-auto relative w-52 h-36 sm:w-56 sm:h-40 touch-game-area select-none">
        {/* Top Row: Through Pass, Cross, Switch/Sprint */}
        <button
          type="button"
          {...bindAction('through')}
          className={`absolute right-36 bottom-16 w-11 h-11 rounded-full border-2 text-[10px] font-black uppercase shadow-lg flex items-center justify-center transition-transform touch-game-area ${
            pressedBtn.through
              ? 'scale-90 bg-sky-300 border-white text-slate-950'
              : 'bg-sky-500/85 border-white/50 text-white'
          }`}
        >
          Enfiar
        </button>

        <button
          type="button"
          {...bindAction('cross')}
          className={`absolute right-20 bottom-22 w-11 h-11 rounded-full border-2 text-[10px] font-black uppercase shadow-lg flex items-center justify-center transition-transform touch-game-area ${
            pressedBtn.cross
              ? 'scale-90 bg-fuchsia-300 border-white text-slate-950'
              : 'bg-fuchsia-500/85 border-white/50 text-white'
          }`}
        >
          Cruzar
        </button>

        <button
          type="button"
          {...bindAction('sprint')}
          className={`absolute right-2 bottom-20 w-12 h-12 rounded-full border-2 text-[10px] font-black uppercase shadow-lg flex flex-col items-center justify-center leading-tight transition-transform touch-game-area ${
            pressedBtn.sprint
              ? 'scale-90 bg-cyan-300 border-white text-slate-950'
              : 'bg-cyan-600/85 border-white/50 text-white'
          }`}
        >
          <span>{hasBall ? 'Correr' : 'Trocar'}</span>
        </button>

        {/* Bottom Row: Shield/Feint, Pass, Shoot/Tackle */}
        <button
          type="button"
          {...bindAction('shield')}
          className={`absolute right-36 bottom-1 w-11 h-11 rounded-full border-2 text-[10px] font-black uppercase shadow-lg flex items-center justify-center transition-transform touch-game-area ${
            pressedBtn.shield
              ? 'scale-90 bg-amber-200 border-white text-slate-950'
              : 'bg-slate-800/85 border-white/45 text-amber-300'
          }`}
        >
          Cortar
        </button>

        <button
          type="button"
          {...bindAction('pass')}
          className={`absolute right-20 bottom-3 w-14 h-14 rounded-full border-2 text-[11px] font-black uppercase shadow-xl flex items-center justify-center transition-transform touch-game-area ${
            pressedBtn.pass
              ? 'scale-90 bg-emerald-300 border-white text-slate-950'
              : 'bg-gradient-to-br from-emerald-400 to-teal-600 border-white/70 text-slate-950'
          }`}
        >
          {hasBall || isSetPiece ? 'Passe' : 'Trocar'}
        </button>

        <button
          type="button"
          {...bindAction('shoot')}
          className={`absolute right-1 bottom-1 w-16 h-16 rounded-full border-2 text-xs font-black uppercase shadow-2xl flex flex-col items-center justify-center leading-tight transition-transform touch-game-area ${
            pressedBtn.shoot
              ? 'scale-90 bg-amber-300 border-white text-slate-950'
              : 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 border-white/80 text-slate-950'
          }`}
        >
          <span>{hasBall || isSetPiece ? 'Chute' : 'Bote'}</span>
        </button>
      </div>
    </div>
  );
};

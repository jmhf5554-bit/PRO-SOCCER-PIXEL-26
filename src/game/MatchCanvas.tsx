import React, { useEffect, useRef, useState } from 'react';
import { Narrator } from '../audio/narrator';
import { AudioFX } from '../audio/sound';
import { DIFFICULTIES } from '../data/leagues';
import { MatchConfig, MatchResult, PlayerSpec, TeamSpec } from '../types';
import { drawKitSwatch, drawMiniJerseyIcon, drawPixelPlayerSprite } from './sprites';

interface Props {
  config: MatchConfig;
  onFinish: (result: MatchResult) => void;
  onExit: () => void;
}

interface PlayerEntity {
  id: string;
  side: 'home' | 'away';
  team: TeamSpec;
  useAway: boolean;
  data: PlayerSpec;
  slot: string;
  slotIdx: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  dirX: number;
  dirY: number;
  animTime: number;
  frame: number;
  action: 'idle' | 'run' | 'kick' | 'tackle' | 'dive' | 'celebrate' | 'volley';
  actionTimer: number;
  tackleCooldown: number;
  stunTimer: number;
  diveDir: number;
  speed: number;
  stamina: number;
  aiPassCooldown: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface ReplayFrame {
  camX: number;
  camY: number;
  ball: { x: number; y: number; z: number; spin: number; ownerId: string | null };
  players: { id: string; x: number; y: number; dirX: number; frame: number; action: PlayerEntity['action']; diveDir: number }[];
  refX: number;
  refY: number;
  refDir: number;
  refFrame: number;
}

const PITCH = {
  halfW: 480,
  halfH: 250,
  goalHalfW: 54,
  goalHeight: 36,
  goalDepth: 28,
  boxW: 118,
  boxHalfH: 108,
  sixW: 46,
  sixHalfH: 66
};

const FORMATIONS = [
  { key: 'GOL', x: -455, y: 0 },
  { key: 'ZAG', x: -270, y: 0 },
  { key: 'MEI1', x: -125, y: -95 },
  { key: 'MEI2', x: -115, y: 95 },
  { key: 'ATA', x: -45, y: 0 }
];

const REFEREE_SPEC: PlayerSpec = {
  num: 0,
  name: 'Árbitro',
  role: 'MEI',
  skin: 'olive',
  hair: 'short_parted',
  hairColor: '#1f1713',
  boots: '#f8fafc',
  ovr: 80
};

export const MatchCanvas: React.FC<Props> = ({ config, onFinish, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarRef = useRef<HTMLCanvasElement | null>(null);
  const homeJerseyRef = useRef<HTMLCanvasElement | null>(null);
  const awayJerseyRef = useRef<HTMLCanvasElement | null>(null);
  const homeCrestRef = useRef<HTMLCanvasElement | null>(null);
  const awayCrestRef = useRef<HTMLCanvasElement | null>(null);

  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(AudioFX.isMuted());
  const [voiceOn, setVoiceOn] = useState(Narrator.isVoiceEnabled());
  const [commentary, setCommentary] = useState('Bola rolando no estádio! Vai começar a partida!');
  const [isReplay, setIsReplay] = useState(false);

  const [hudState, setHudState] = useState({
    homeScore: 0,
    awayScore: 0,
    clockText: '00 : 00',
    p1Name: config.homeTeam.players[4].name,
    p1Num: config.homeTeam.players[4].num,
    p1Role: config.homeTeam.players[4].role,
    p1Power: 0,
    p1Stamina: 100,
    p2Name: config.awayTeam.players[4].name,
    p2Num: config.awayTeam.players[4].num,
    p2Role: config.awayTeam.players[4].role,
    p2Power: 0,
    p2Stamina: 100
  });

  const pausedRef = useRef(false);
  const finishedRef = useRef(false);
  const skipReplayRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (homeJerseyRef.current) drawMiniJerseyIcon(homeJerseyRef.current, config.homeTeam, config.homeUseAway);
    if (awayJerseyRef.current) drawMiniJerseyIcon(awayJerseyRef.current, config.awayTeam, config.awayUseAway);
    if (homeCrestRef.current) drawKitSwatch(homeCrestRef.current, config.homeTeam, config.homeUseAway);
    if (awayCrestRef.current) drawKitSwatch(awayCrestRef.current, config.awayTeam, config.awayUseAway);
  }, [config]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const diff = DIFFICULTIES[config.difficulty];
    const matchDuration = config.matchDurationSec || 90;
    const isTraining = config.mode === 'training';
    const isTwoPlayer = config.mode === 'two_player';
    const lockedIdx = config.lockedPlayerSlot;

    const announce = (txt: string, priority = false) => {
      setCommentary(txt);
      Narrator.speak(txt, priority);
    };

    const buildTeam = (team: TeamSpec, side: 'home' | 'away', useAway: boolean): PlayerEntity[] => {
      const dir = side === 'home' ? 1 : -1;
      const tacticOffset =
        side === 'home' ? (config.tactic === 'ofensivo' ? 45 : config.tactic === 'retranca' ? -45 : 0) : 0;

      const list = team.players.map((p, idx) => {
        const spec = side === 'home' && idx === lockedIdx && config.customPlayer ? config.customPlayer : p;
        const form = FORMATIONS[idx] || FORMATIONS[4];
        const ovrBoost = (spec.ovr - 78) * 1.1;
        const paceBoost = spec.pace ? (spec.pace - 75) * 0.9 : 0;
        const baseSpeed = (spec.role === 'ATA' ? 148 : spec.role === 'MEI' ? 142 : spec.role === 'ZAG' ? 136 : 124) + ovrBoost + paceBoost;
        const hx = Math.max(-460, Math.min(460, form.x * dir + (idx > 0 ? tacticOffset : 0)));
        const hy = form.y * dir;

        return {
          id: `${side}_${idx}`,
          side,
          team,
          useAway,
          data: spec,
          slot: form.key,
          slotIdx: idx,
          x: hx,
          y: hy,
          homeX: hx,
          homeY: hy,
          vx: 0,
          vy: 0,
          dirX: dir,
          dirY: 0,
          animTime: idx * 0.7,
          frame: 0,
          action: 'idle' as const,
          actionTimer: 0,
          tackleCooldown: 0,
          stunTimer: 0,
          diveDir: 1,
          speed: baseSpeed,
          stamina: 100,
          aiPassCooldown: 0
        };
      });

      return isTraining && side === 'away' ? list.filter((_, i) => i === 0 || i === 1) : list;
    };

    const g = {
      state: 'PLAYING' as 'PLAYING' | 'GOAL_CELEBRATION' | 'REPLAY' | 'RESTART_FREEZE' | 'ENDED',
      homeScore: 0,
      awayScore: 0,
      homeShots: 0,
      awayShots: 0,
      homePossTime: 0,
      awayPossTime: 0,
      userGoals: 0,
      userAssists: 0,
      userPasses: 0,
      userTackles: 0,
      elapsed: 0,
      stateTimer: 0,
      hitstop: 0,
      shakeTime: 0,
      shakeMag: 0,
      netRippleLeft: 0,
      netRippleRight: 0,
      lastGoalTeam: 'home' as 'home' | 'away',
      bannerText: isTraining ? 'ARENA DE TREINO' : 'BOLA ROLANDO!',
      bannerSub: isTraining ? 'Treine chutes, passes e bicicletas' : `${config.homeTeam.abbr} vs ${config.awayTeam.abbr} · ${diff.label}`,
      bannerTimer: 1.7,
      camX: 0,
      camY: 0,
      crowdExcite: 0,
      ref: { x: 0, y: -70, dirX: 1, animTime: 0, frame: 0 },
      ball: {
        x: 0,
        y: 0,
        z: 12,
        vx: 0,
        vy: 0,
        vz: 0,
        spin: 0,
        owner: null as PlayerEntity | null,
        lastTouchTeam: null as 'home' | 'away' | null,
        lastTouchPlayer: null as PlayerEntity | null,
        prevTouchPlayer: null as PlayerEntity | null,
        pickupCooldown: 0.2,
        trail: [] as { x: number; y: number; z: number }[]
      },
      players: [...buildTeam(config.homeTeam, 'home', config.homeUseAway), ...buildTeam(config.awayTeam, 'away', config.awayUseAway)],
      particles: [] as Particle[],
      activeHome: null as PlayerEntity | null,
      activeAway: null as PlayerEntity | null,
      p1Charging: false,
      p1Power: 0,
      p2Charging: false,
      p2Power: 0,
      replayBuffer: [] as ReplayFrame[],
      replayFrames: [] as ReplayFrame[],
      replayIdx: 0,
      replayAcc: 0
    };

    const resetPositions = (kickoffSide: 'home' | 'away') => {
      g.ball.x = 0;
      g.ball.y = 0;
      g.ball.z = 12;
      g.ball.vx = 0;
      g.ball.vy = 0;
      g.ball.vz = 0;
      g.ball.owner = null;
      g.ball.pickupCooldown = 0.2;
      g.ball.trail = [];
      g.p1Charging = false;
      g.p1Power = 0;
      g.p2Charging = false;
      g.p2Power = 0;
      g.ref.x = 0;
      g.ref.y = -75;

      g.players.forEach((pl) => {
        pl.x = pl.homeX;
        pl.y = pl.homeY;
        pl.vx = 0;
        pl.vy = 0;
        pl.dirX = pl.side === 'home' ? 1 : -1;
        pl.dirY = 0;
        pl.action = 'idle';
        pl.actionTimer = 0;
        pl.stunTimer = 0;
        pl.tackleCooldown = 0;
      });

      const homeFocus =
        lockedIdx !== undefined
          ? g.players.find((p) => p.side === 'home' && p.slotIdx === lockedIdx)
          : g.players.find((p) => p.side === 'home' && p.slot === 'ATA');
      if (homeFocus) {
        if (kickoffSide === 'home') {
          homeFocus.x = -18;
          homeFocus.y = 0;
        }
        g.activeHome = homeFocus;
      }
      const awayStriker = g.players.find((p) => p.side === 'away' && p.slot === 'ATA') || g.players.find((p) => p.side === 'away');
      if (awayStriker) {
        if (kickoffSide === 'away' && !isTraining) {
          awayStriker.x = 18;
          awayStriker.y = 0;
        }
        g.activeAway = awayStriker;
      }
    };

    resetPositions('home');
    AudioFX.playWhistle('kickoff');
    announce(`Apita o árbitro! Bola rolando para ${config.homeTeam.name} e ${config.awayTeam.name}!`, true);

    const keysHeld = new Set<string>();
    const keysJust = new Set<string>();
    let p1ShootReleased = false;
    let p2ShootReleased = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (g.state === 'REPLAY' && (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK' || e.code === 'Enter')) {
        skipReplayRef.current = true;
        return;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        setPaused((v) => !v);
        return;
      }
      if (e.code === 'KeyM') {
        setMuted(AudioFX.setMuted(!AudioFX.isMuted()));
        return;
      }
      if (!keysHeld.has(e.code)) keysJust.add(e.code);
      keysHeld.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyK' || e.code === 'KeyZ' || e.code === 'Space') p1ShootReleased = true;
      if (e.code === 'KeyM' || e.code === 'Numpad2' || e.code === 'Enter') p2ShootReleased = true;
      keysHeld.delete(e.code);
    };

    const onBlur = () => {
      keysHeld.clear();
      keysJust.clear();
      g.p1Charging = false;
      g.p1Power = 0;
      g.p2Charging = false;
      g.p2Power = 0;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // 2.5D Isometric Camera Projection matching Pixel Cup Soccer screenshot
    const worldToScreen = (wx: number, wy: number, wz = 0, camOverride?: { x: number; y: number }) => {
      const cx = camOverride ? camOverride.x : g.camX;
      const cy = camOverride ? camOverride.y : g.camY;
      const dx = wx - cx;
      const dy = wy - cy;
      const persp = 1 + dy * 0.00062;
      const skewX = dy * 0.14; // Subtle isometric slant matching screenshot lines!
      return {
        x: 240 + (dx * 0.64 + skewX) * persp,
        y: 146 + dy * 0.45 - wz * 0.88 * persp,
        scale: persp
      };
    };

    const spawnDust = (x: number, y: number, count: number, color: string) => {
      for (let i = 0; i < count; i++) {
        g.particles.push({
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 6,
          z: 1 + Math.random() * 4,
          vx: (Math.random() - 0.5) * 55,
          vy: (Math.random() - 0.5) * 35,
          vz: 18 + Math.random() * 35,
          life: 0.28 + Math.random() * 0.25,
          maxLife: 0.5,
          color,
          size: 2
        });
      }
    };

    const spawnConfetti = (gx: number, gy: number, team: TeamSpec) => {
      const colors = [team.kit.c1, team.kit.c2, '#facc15', '#ffffff'];
      for (let i = 0; i < 40; i++) {
        g.particles.push({
          x: gx + (Math.random() - 0.5) * 36,
          y: gy + (Math.random() - 0.5) * 84,
          z: 8 + Math.random() * 24,
          vx: (Math.random() - 0.5) * 140,
          vy: (Math.random() - 0.5) * 95,
          vz: 65 + Math.random() * 95,
          life: 1.1 + Math.random() * 0.9,
          maxLife: 2.0,
          color: colors[i % colors.length],
          size: 2
        });
      }
    };

    const triggerShake = (mag: number, time: number) => {
      g.shakeMag = Math.max(g.shakeMag, mag);
      g.shakeTime = Math.max(g.shakeTime, time);
    };

    const findPassTarget = (passer: PlayerEntity, aimX: number, aimY: number) => {
      const tms = g.players.filter((p) => p.side === passer.side && p !== passer);
      let best: PlayerEntity | null = null;
      let bestScore = -9999;
      const ax = aimX === 0 && aimY === 0 ? passer.dirX : aimX;
      const ay = aimX === 0 && aimY === 0 ? passer.dirY : aimY;
      const len = Math.hypot(ax, ay) || 1;
      const nx = ax / len;
      const ny = ay / len;

      for (const tm of tms) {
        const dx = tm.x - passer.x;
        const dy = tm.y - passer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 15) continue;
        const dot = (dx / dist) * nx + (dy / dist) * ny;
        const score = dot * 2.1 - Math.abs(dist - 150) * 0.002 - (tm.data.role === 'GOL' ? 0.35 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = tm;
        }
      }
      return best;
    };

    const performPass = (passer: PlayerEntity, aimX: number, aimY: number, lofted = false) => {
      const target = findPassTarget(passer, aimX, aimY);
      g.ball.prevTouchPlayer = passer;
      g.ball.owner = null;
      g.ball.pickupCooldown = 0.16;
      passer.action = 'kick';
      passer.actionTimer = 0.2;
      if (passer.side === 'home') g.userPasses++;

      let tx: number;
      let ty: number;
      if (target) {
        tx = target.x + target.vx * 0.22;
        ty = target.y + target.vy * 0.22;
        if (passer.side === 'home' && target.data.role !== 'GOL' && lockedIdx === undefined) g.activeHome = target;
        if (passer.side === 'away' && target.data.role !== 'GOL' && isTwoPlayer) g.activeAway = target;
        if (Math.random() < 0.32) {
          announce(`${passer.data.name} toca para ${target.data.name}!`);
        }
      } else {
        tx = passer.x + passer.dirX * 140;
        ty = passer.y + passer.dirY * 140;
      }

      const dx = tx - g.ball.x;
      const dy = ty - g.ball.y;
      const dist = Math.hypot(dx, dy) || 1;
      const spd = Math.min(380, Math.max(230, dist * 1.65));

      g.ball.vx = (dx / dist) * spd;
      g.ball.vy = (dy / dist) * spd;
      g.ball.vz = lofted || Math.abs(passer.y) > 130 ? 96 : 34;
      AudioFX.playKick(0.32);
      spawnDust(g.ball.x, g.ball.y, 4, '#bbf7d0');
    };

    const performShot = (shooter: PlayerEntity, power: number, aimY: number, isVolley = false) => {
      const attackDir = shooter.side === 'home' ? 1 : -1;
      const goalX = PITCH.halfW * attackDir;
      const spread = shooter.side === 'away' && !isTwoPlayer ? (1 - diff.shotAccuracy) * 70 : 12;
      const targetY = Math.max(
        -PITCH.goalHalfW + 6,
        Math.min(
          PITCH.goalHalfW - 6,
          (aimY !== 0 ? aimY * (PITCH.goalHalfW - 8) : shooter.y * 0.35) + (Math.random() - 0.5) * spread
        )
      );

      const dx = goalX - g.ball.x;
      const dy = targetY - g.ball.y;
      const dist = Math.hypot(dx, dy) || 1;
      const p = Math.max(0.18, Math.min(1, power));
      const shotBoost = shooter.data.shooting ? (shooter.data.shooting - 75) * 1.8 : 0;
      const spd = 335 + p * 275 + shotBoost + (isVolley ? 45 : 0);

      g.ball.prevTouchPlayer = g.ball.lastTouchPlayer;
      g.ball.lastTouchPlayer = shooter;
      g.ball.lastTouchTeam = shooter.side;
      g.ball.owner = null;
      g.ball.pickupCooldown = 0.18;
      g.ball.vx = (dx / dist) * spd;
      g.ball.vy = (dy / dist) * spd;
      g.ball.vz = isVolley ? 65 : 46 + p * 112;

      shooter.action = isVolley ? 'volley' : 'kick';
      shooter.actionTimer = isVolley ? 0.38 : 0.24;
      shooter.dirX = attackDir;

      if (shooter.side === 'home') g.homeShots++;
      else g.awayShots++;

      if (isVolley) {
        announce(`DE BICICLETA! ${shooter.data.name} arrisca um golaço!`, true);
      } else if (p > 0.72) {
        announce(`BOMBA DE ${shooter.data.name.toUpperCase()}! Olha o perigo!`);
      } else {
        announce(`Finalizou ${shooter.data.name}!`);
      }

      AudioFX.playKick(0.45 + p * 0.55);
      spawnDust(g.ball.x, g.ball.y, p > 0.65 || isVolley ? 10 : 5, '#fef08a');
      if (p > 0.6 || isVolley) {
        g.hitstop = 0.04;
        triggerShake(2.4 + p * 2.5, 0.22);
        g.crowdExcite = Math.max(g.crowdExcite, 0.75);
      }
    };

    const performTackle = (pl: PlayerEntity) => {
      if (pl.tackleCooldown > 0 || pl.action === 'tackle') return;
      const len = Math.hypot(pl.dirX, pl.dirY) || 1;
      pl.dirX /= len;
      pl.dirY /= len;
      pl.action = 'tackle';
      pl.actionTimer = 0.3;
      pl.tackleCooldown = 0.62;
      pl.vx = pl.dirX * 238;
      pl.vy = pl.dirY * 238;
      AudioFX.playTackle();
      spawnDust(pl.x, pl.y, 7, '#4d7c0f');
    };

    const switchClosest = (side: 'home' | 'away') => {
      if (side === 'home' && lockedIdx !== undefined) return;
      const current = side === 'home' ? g.activeHome : g.activeAway;
      const cands = g.players.filter((p) => p.side === side && p.slot !== 'GOL');
      let best = current;
      let bestD = Infinity;
      for (const p of cands) {
        const d = Math.hypot(p.x - g.ball.x, p.y - g.ball.y) + (p === current ? 35 : 0);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      if (side === 'home') g.activeHome = best;
      else g.activeAway = best;
    };

    const finishGameNow = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      g.state = 'ENDED';
      Narrator.stop();
      AudioFX.playWhistle('fulltime');
      const totalPoss = Math.max(1, g.homePossTime + g.awayPossTime);
      const homePossPct = Math.round((g.homePossTime / totalPoss) * 100);
      const rawRating =
        6.2 +
        g.userGoals * 1.1 +
        g.userAssists * 0.7 +
        Math.min(1.0, g.userPasses * 0.08) +
        Math.min(0.8, g.userTackles * 0.2) +
        (g.homeScore > g.awayScore ? 0.5 : 0);
      onFinish({
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        homeShots: g.homeShots,
        awayShots: g.awayShots,
        homePossPct,
        awayPossPct: 100 - homePossPct,
        userGoals: g.userGoals,
        userAssists: g.userAssists,
        userPasses: g.userPasses,
        userTackles: g.userTackles,
        playerRating: Number(Math.min(10, rawRating).toFixed(1))
      });
    };

    const scoreGoal = (scoringSide: 'home' | 'away') => {
      g.state = 'GOAL_CELEBRATION';
      g.stateTimer = 1.65;
      g.lastGoalTeam = scoringSide;
      const team = scoringSide === 'home' ? config.homeTeam : config.awayTeam;
      if (scoringSide === 'home') {
        g.homeScore++;
        g.netRippleRight = 1.0;
        if (g.ball.lastTouchPlayer && g.ball.lastTouchPlayer.side === 'home') {
          if (lockedIdx === undefined || g.ball.lastTouchPlayer.slotIdx === lockedIdx) g.userGoals++;
          if (g.ball.prevTouchPlayer && g.ball.prevTouchPlayer.side === 'home' && g.ball.prevTouchPlayer !== g.ball.lastTouchPlayer) {
            g.userAssists++;
          }
        }
      } else {
        g.awayScore++;
        g.netRippleLeft = 1.0;
      }
      const scorer =
        g.ball.lastTouchPlayer && g.ball.lastTouchPlayer.side === scoringSide
          ? g.ball.lastTouchPlayer
          : g.players.find((p) => p.side === scoringSide && p.slot === 'ATA');
      const scorerTxt = scorer ? `${scorer.data.name}` : team.name;
      g.bannerText = 'GOOOOL!';
      g.bannerSub = `${team.name.toUpperCase()} · ${scorerTxt}`;
      g.bannerTimer = 1.6;
      g.crowdExcite = 1.0;
      triggerShake(4.8, 0.38);
      spawnConfetti(g.ball.x, g.ball.y, team);
      AudioFX.playWhistle('goal');
      AudioFX.playGoalCelebration();
      announce(`GOOOOOOOL! É DO ${team.name.toUpperCase()}! ${scorerTxt} balança as redes!`, true);

      // Prepare instant goal replay frames
      g.replayFrames = g.replayBuffer.slice(-96);
      skipReplayRef.current = false;
    };

    const quickSetPiece = (side: 'home' | 'away', x: number, y: number, label: string) => {
      const taker =
        g.players.find((p) => p.side === side && (label === 'TIRO DE META' ? p.slot === 'GOL' : p.slot === 'MEI1')) ||
        g.players.find((p) => p.side === side);
      g.ball.owner = taker || null;
      g.ball.x = x;
      g.ball.y = y;
      g.ball.z = 0;
      g.ball.vx = 0;
      g.ball.vy = 0;
      g.ball.vz = 0;
      if (taker) {
        taker.x = x;
        taker.y = y;
        taker.dirX = side === 'home' ? 1 : -1;
        if (side === 'home' && taker.slot !== 'GOL' && lockedIdx === undefined) g.activeHome = taker;
        if (taker.slot === 'GOL') taker.aiPassCooldown = 0.35;
      }
      g.bannerText = label;
      g.bannerSub = side === 'home' ? config.homeTeam.abbr : config.awayTeam.abbr;
      g.bannerTimer = 0.85;
      g.state = 'RESTART_FREEZE';
      g.stateTimer = 0.42;
      announce(`${label} para ${side === 'home' ? config.homeTeam.name : config.awayTeam.name}.`);
    };

    const checkGoalsAndBounds = () => {
      const b = g.ball;
      [-1, 1].forEach((sideSign) => {
        const gx = PITCH.halfW * sideSign;
        if (Math.abs(b.x - gx) < 7 && b.z < PITCH.goalHeight + 5) {
          [-PITCH.goalHalfW, PITCH.goalHalfW].forEach((postY) => {
            if (Math.abs(b.y - postY) < 7) {
              b.vx = -b.vx * 0.72;
              b.vy = (b.y - postY) * 14;
              b.x = gx - sideSign * 8;
              AudioFX.playPostClang();
              triggerShake(3.2, 0.2);
              spawnDust(gx, postY, 8, '#facc15');
              announce('NA TRAVE! Quase o gol!', true);
            }
          });
        }
      });

      if (b.x > PITCH.halfW && Math.abs(b.y) < PITCH.goalHalfW - 2 && b.z < PITCH.goalHeight) {
        scoreGoal('home');
        return;
      }
      if (b.x < -PITCH.halfW && Math.abs(b.y) < PITCH.goalHalfW - 2 && b.z < PITCH.goalHeight) {
        scoreGoal('away');
        return;
      }

      if (Math.abs(b.y) > PITCH.halfH + 4) {
        const cy = (b.y > 0 ? 1 : -1) * (PITCH.halfH - 10);
        const cx = Math.max(-PITCH.halfW + 30, Math.min(PITCH.halfW - 30, b.x));
        if (isTraining) {
          b.y = cy;
          b.vy = -b.vy * 0.5;
        } else {
          quickSetPiece(b.lastTouchTeam === 'home' ? 'away' : 'home', cx, cy, 'LATERAL');
        }
        return;
      }

      if (Math.abs(b.x) > PITCH.halfW + 6) {
        if (isTraining) {
          b.x = (b.x > 0 ? 1 : -1) * (PITCH.halfW - 10);
          b.vx = -b.vx * 0.5;
          return;
        }
        const onRight = b.x > 0;
        const defending = onRight ? 'away' : 'home';
        if (b.lastTouchTeam === defending) {
          const attacking = defending === 'home' ? 'away' : 'home';
          quickSetPiece(attacking, (onRight ? 1 : -1) * (PITCH.halfW - 14), (b.y >= 0 ? 1 : -1) * (PITCH.halfH - 14), 'ESCANTEIO');
        } else {
          quickSetPiece(defending, (onRight ? 1 : -1) * (PITCH.halfW - 42), 0, 'TIRO DE META');
        }
      }
    };

    const getP1Move = () => {
      let ix = 0;
      let iy = 0;
      if (keysHeld.has('KeyA') || (!isTwoPlayer && keysHeld.has('ArrowLeft'))) ix -= 1;
      if (keysHeld.has('KeyD') || (!isTwoPlayer && keysHeld.has('ArrowRight'))) ix += 1;
      if (keysHeld.has('KeyW') || (!isTwoPlayer && keysHeld.has('ArrowUp'))) iy -= 1;
      if (keysHeld.has('KeyS') || (!isTwoPlayer && keysHeld.has('ArrowDown'))) iy += 1;
      return { ix, iy };
    };

    const getP2Move = () => {
      let ix = 0;
      let iy = 0;
      if (keysHeld.has('ArrowLeft')) ix -= 1;
      if (keysHeld.has('ArrowRight')) ix += 1;
      if (keysHeld.has('ArrowUp')) iy -= 1;
      if (keysHeld.has('ArrowDown')) iy += 1;
      return { ix, iy };
    };

    const computeAI = (pl: PlayerEntity) => {
      const dir = pl.side === 'home' ? 1 : -1;
      const b = g.ball;
      const teamHas = b.owner && b.owner.side === pl.side;
      const oppHas = b.owner && b.owner.side !== pl.side;

      if (b.owner === pl) {
        const goalX = PITCH.halfW * dir;
        const distToGoal = Math.abs(goalX - pl.x);
        if (distToGoal < 205 && Math.abs(pl.y) < 130 && Math.random() < diff.shotFreq) {
          performShot(pl, 0.55 + Math.random() * 0.42, (Math.random() - 0.5) * 1.4);
          return { mx: 0, my: 0 };
        }
        const nearOpp = g.players
          .filter((o) => o.side !== pl.side)
          .reduce((min, o) => Math.min(min, Math.hypot(o.x - pl.x, o.y - pl.y)), 999);
        if (nearOpp < 52 && pl.aiPassCooldown <= 0 && Math.random() < diff.passRate) {
          pl.aiPassCooldown = 0.6;
          performPass(pl, dir, (Math.random() - 0.5) * 0.9);
          return { mx: 0, my: 0 };
        }
        const tx = goalX - 75 * dir;
        const ty = Math.max(-85, Math.min(85, pl.y + Math.sin(g.elapsed * 2.4 + pl.homeY) * 38));
        return { mx: tx - pl.x, my: ty - pl.y, spd: pl.speed * (pl.side === 'away' ? diff.aiSpeedMult : 0.94) };
      }

      const tms = g.players.filter((p) => p.side === pl.side && p.slot !== 'GOL' && p !== g.activeHome && (!isTwoPlayer || p !== g.activeAway));
      let closest: PlayerEntity | null = null;
      let bestD = Infinity;
      for (const tm of tms) {
        const d = Math.hypot(tm.x - b.x, tm.y - b.y);
        if (d < bestD) {
          bestD = d;
          closest = tm;
        }
      }

      const shouldPress =
        (pl.side === 'away' && !isTwoPlayer && pl === closest && bestD < diff.pressDist) ||
        (pl.side === 'home' && !b.owner && pl === closest && bestD < 105);

      if (shouldPress) {
        if (pl.side === 'away' && oppHas && Math.hypot(pl.x - b.x, pl.y - b.y) < 34 && pl.tackleCooldown <= 0 && Math.random() < diff.tackleRate) {
          performTackle(pl);
          return { mx: 0, my: 0 };
        }
        return { mx: b.x - pl.x, my: b.y - pl.y, spd: pl.speed * (pl.side === 'away' ? diff.aiSpeedMult : 0.94) };
      }

      let tx = pl.homeX + b.x * 0.46;
      let ty = pl.homeY + b.y * 0.34;
      if (teamHas) tx += 110 * dir;
      else if (oppHas) tx -= 65 * dir;
      tx = Math.max(-PITCH.halfW + 45, Math.min(PITCH.halfW - 45, tx));
      ty = Math.max(-PITCH.halfH + 28, Math.min(PITCH.halfH - 28, ty));

      const dx = tx - pl.x;
      const dy = ty - pl.y;
      if (Math.hypot(dx, dy) < 12) return { mx: 0, my: 0 };
      return { mx: dx, my: dy, spd: pl.speed * (pl.side === 'away' ? diff.aiSpeedMult * 0.92 : 0.88) };
    };

    const recordSnapshot = () => {
      g.replayBuffer.push({
        camX: g.camX,
        camY: g.camY,
        ball: { x: g.ball.x, y: g.ball.y, z: g.ball.z, spin: g.ball.spin, ownerId: g.ball.owner?.id || null },
        players: g.players.map((p) => ({
          id: p.id,
          x: p.x,
          y: p.y,
          dirX: p.dirX,
          frame: p.frame,
          action: p.action,
          diveDir: p.diveDir
        })),
        refX: g.ref.x,
        refY: g.ref.y,
        refDir: g.ref.dirX,
        refFrame: g.ref.frame
      });
      if (g.replayBuffer.length > 130) g.replayBuffer.shift();
    };

    const updateSim = (rawDt: number) => {
      const dt = Math.min(rawDt, 0.05);
      if (pausedRef.current || g.state === 'ENDED') return;

      if (g.shakeTime > 0) g.shakeTime = Math.max(0, g.shakeTime - dt);
      if (g.bannerTimer > 0) g.bannerTimer = Math.max(0, g.bannerTimer - dt);
      if (g.netRippleLeft > 0) g.netRippleLeft = Math.max(0, g.netRippleLeft - dt * 2.2);
      if (g.netRippleRight > 0) g.netRippleRight = Math.max(0, g.netRippleRight - dt * 2.2);
      if (g.crowdExcite > 0) g.crowdExcite = Math.max(0, g.crowdExcite - dt * 0.55);

      for (let i = g.particles.length - 1; i >= 0; i--) {
        const pt = g.particles[i];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.z += pt.vz * dt;
        pt.vz -= 210 * dt;
        if (pt.z < 0) {
          pt.z = 0;
          pt.vz *= -0.35;
          pt.vx *= 0.65;
          pt.vy *= 0.65;
        }
        pt.life -= dt;
        if (pt.life <= 0) g.particles.splice(i, 1);
      }

      if (g.hitstop > 0) {
        g.hitstop -= dt;
        return;
      }

      // Goal Celebration -> then Automatic Slow-Mo Goal Replay!
      if (g.state === 'GOAL_CELEBRATION') {
        g.stateTimer -= dt;
        g.players.forEach((pl) => {
          if (pl.side === g.lastGoalTeam) {
            pl.action = 'celebrate';
            pl.x += pl.dirX * 32 * dt;
            pl.animTime += dt * 9;
            pl.frame = Math.floor(pl.animTime) % 4;
          } else {
            pl.action = 'idle';
          }
        });
        g.ball.x += g.ball.vx * dt;
        g.ball.y += g.ball.vy * dt;
        g.ball.vx *= 0.9;
        g.ball.vy *= 0.9;
        if (g.stateTimer <= 0) {
          if (g.replayFrames.length > 15 && !isTraining) {
            g.state = 'REPLAY';
            g.replayIdx = 0;
            g.replayAcc = 0;
            setIsReplay(true);
            announce('Veja o replay desse golaço!');
          } else {
            resetPositions(g.lastGoalTeam === 'home' ? 'away' : 'home');
            g.state = 'PLAYING';
            AudioFX.playWhistle('kickoff');
          }
        }
        return;
      }

      // Slow-Motion Replay Playback
      if (g.state === 'REPLAY') {
        g.replayAcc += dt * 32; // ~0.55x slow motion
        while (g.replayAcc >= 1) {
          g.replayAcc -= 1;
          g.replayIdx++;
        }
        if (skipReplayRef.current || g.replayIdx >= g.replayFrames.length) {
          setIsReplay(false);
          skipReplayRef.current = false;
          g.replayBuffer = [];
          resetPositions(g.lastGoalTeam === 'home' ? 'away' : 'home');
          g.state = 'PLAYING';
          AudioFX.playWhistle('kickoff');
        }
        return;
      }

      if (g.state === 'RESTART_FREEZE') {
        g.stateTimer -= dt;
        if (g.stateTimer <= 0) {
          g.state = 'PLAYING';
          AudioFX.playWhistle('foul');
        }
        return;
      }

      if (!isTraining) {
        g.elapsed += dt;
        if (g.elapsed >= matchDuration) {
          finishGameNow();
          return;
        }
      }

      if (g.ball.owner) {
        if (g.ball.owner.side === 'home') g.homePossTime += dt;
        else g.awayPossTime += dt;
      }
      if (g.ball.pickupCooldown > 0) g.ball.pickupCooldown -= dt;

      // P1 Controls: WASD (and Arrows in 1P), Shift switch, J/X pass, K/Z/Space shoot/tackle
      const p1Move = getP1Move();
      const p1Switch = keysJust.has('ShiftLeft') || keysJust.has('ShiftRight');
      const p1Pass = keysJust.has('KeyJ') || keysJust.has('KeyX');
      const p1ShootHeld = keysHeld.has('KeyK') || keysHeld.has('KeyZ') || (!isTwoPlayer && keysHeld.has('Space'));
      const p1ShootJust = keysJust.has('KeyK') || keysJust.has('KeyZ') || (!isTwoPlayer && keysJust.has('Space'));

      if (g.ball.owner && g.ball.owner.side === 'home' && lockedIdx === undefined) g.activeHome = g.ball.owner;
      const p1 = g.activeHome;

      if (p1Switch) switchClosest('home');

      if (p1 && g.ball.owner === p1) {
        if (p1Pass) {
          g.p1Charging = false;
          g.p1Power = 0;
          performPass(p1, p1Move.ix, p1Move.iy);
        } else {
          if (p1ShootJust || (p1ShootHeld && !g.p1Charging)) {
            g.p1Charging = true;
            g.p1Power = 0.16;
          }
          if (g.p1Charging && p1ShootHeld) g.p1Power = Math.min(1, g.p1Power + dt * 1.75);
          if (g.p1Charging && (!p1ShootHeld || p1ShootReleased)) {
            performShot(p1, g.p1Power, p1Move.iy);
            g.p1Charging = false;
            g.p1Power = 0;
          }
        }
      } else {
        g.p1Charging = false;
        g.p1Power = 0;
        if (p1Pass && !p1Switch) switchClosest('home');
        if (p1ShootJust && p1 && p1.slot !== 'GOL') {
          if (!g.ball.owner && g.ball.z > 9 && Math.hypot(p1.x - g.ball.x, p1.y - g.ball.y) < 28) {
            performShot(p1, 0.88, p1Move.iy, true);
          } else {
            performTackle(p1);
          }
        }
      }

      if (isTwoPlayer) {
        const p2Move = getP2Move();
        const p2Switch = keysJust.has('ControlRight') || keysJust.has('Comma');
        const p2Pass = keysJust.has('KeyN') || keysJust.has('Numpad1');
        const p2ShootHeld = keysHeld.has('KeyM') || keysHeld.has('Numpad2') || keysHeld.has('Enter');
        const p2ShootJust = keysJust.has('KeyM') || keysJust.has('Numpad2') || keysJust.has('Enter');
        if (g.ball.owner && g.ball.owner.side === 'away') g.activeAway = g.ball.owner;
        const p2 = g.activeAway;

        if (p2Switch) switchClosest('away');

        if (p2 && g.ball.owner === p2) {
          if (p2Pass) {
            g.p2Charging = false;
            g.p2Power = 0;
            performPass(p2, p2Move.ix, p2Move.iy);
          } else {
            if (p2ShootJust || (p2ShootHeld && !g.p2Charging)) {
              g.p2Charging = true;
              g.p2Power = 0.16;
            }
            if (g.p2Charging && p2ShootHeld) g.p2Power = Math.min(1, g.p2Power + dt * 1.75);
            if (g.p2Charging && (!p2ShootHeld || p2ShootReleased)) {
              performShot(p2, g.p2Power, p2Move.iy);
              g.p2Charging = false;
              g.p2Power = 0;
            }
          }
        } else {
          g.p2Charging = false;
          g.p2Power = 0;
          if (p2Pass && !p2Switch) switchClosest('away');
          if (p2ShootJust && p2 && p2.slot !== 'GOL') {
            if (!g.ball.owner && g.ball.z > 9 && Math.hypot(p2.x - g.ball.x, p2.y - g.ball.y) < 28) {
              performShot(p2, 0.88, p2Move.iy, true);
            } else {
              performTackle(p2);
            }
          }
        }
      }

      // Referee tracking ball calmly
      const rtx = Math.max(-360, Math.min(360, g.ball.x * 0.72));
      const rty = Math.max(-195, Math.min(195, g.ball.y - 68));
      const rdx = rtx - g.ref.x;
      const rdy = rty - g.ref.y;
      const rdist = Math.hypot(rdx, rdy);
      if (rdist > 14) {
        g.ref.x += (rdx / rdist) * 95 * dt;
        g.ref.y += (rdy / rdist) * 95 * dt;
        g.ref.dirX = rdx >= 0 ? 1 : -1;
        g.ref.animTime += dt * 8;
        g.ref.frame = Math.floor(g.ref.animTime) % 4;
      } else {
        g.ref.frame = 0;
      }

      // Update players
      g.players.forEach((pl) => {
        if (pl.tackleCooldown > 0) pl.tackleCooldown -= dt;
        if (pl.stunTimer > 0) pl.stunTimer -= dt;
        if (pl.aiPassCooldown > 0) pl.aiPassCooldown -= dt;

        if (pl.actionTimer > 0) {
          pl.actionTimer -= dt;
          if (pl.actionTimer <= 0) pl.action = 'idle';
        }

        if (pl.action === 'tackle') {
          pl.x += pl.vx * dt;
          pl.y += pl.vy * dt;
          pl.vx *= 0.92;
          pl.vy *= 0.92;
          if (g.ball.owner && g.ball.owner.side !== pl.side) {
            if (Math.hypot(pl.x - g.ball.owner.x, pl.y - g.ball.owner.y) < 20) {
              g.ball.owner.stunTimer = 0.45;
              g.ball.owner = pl;
              g.ball.pickupCooldown = 0.18;
              g.ball.lastTouchTeam = pl.side;
              g.ball.lastTouchPlayer = pl;
              if (pl.side === 'home') {
                g.userTackles++;
                if (lockedIdx === undefined) g.activeHome = pl;
                announce(`Desarme firme de ${pl.data.name}!`);
              } else if (isTwoPlayer) {
                g.activeAway = pl;
              }
              g.hitstop = 0.035;
              triggerShake(2.2, 0.15);
              spawnDust(pl.x, pl.y, 6, '#e2e8f0');
            }
          } else if (!g.ball.owner && g.ball.z < 18 && Math.hypot(pl.x - g.ball.x, pl.y - g.ball.y) < 20) {
            g.ball.owner = pl;
            g.ball.vx = pl.dirX * 80;
            g.ball.vy = pl.dirY * 80;
            if (pl.side === 'home' && lockedIdx === undefined) g.activeHome = pl;
          }
          pl.x = Math.max(-PITCH.halfW - 14, Math.min(PITCH.halfW + 14, pl.x));
          pl.y = Math.max(-PITCH.halfH - 10, Math.min(PITCH.halfH + 10, pl.y));
          return;
        }

        if (pl.action === 'dive') {
          pl.y += pl.diveDir * 155 * diff.gkSpeedMult * dt;
          pl.x = Math.max(-PITCH.halfW - 14, Math.min(PITCH.halfW + 14, pl.x));
          pl.y = Math.max(-PITCH.halfH - 10, Math.min(PITCH.halfH + 10, pl.y));
          return;
        }

        if (pl.stunTimer > 0) {
          pl.vx *= 0.82;
          pl.vy *= 0.82;
          pl.x += pl.vx * dt;
          pl.y += pl.vy * dt;
          pl.action = 'idle';
          return;
        }

        let mx = 0;
        let my = 0;
        let spd = pl.speed;

        if (pl === g.activeHome && pl.slot !== 'GOL') {
          const m = getP1Move();
          mx = m.ix;
          my = m.iy;
          if (g.ball.owner === pl) spd *= 0.96;
        } else if (isTwoPlayer && pl === g.activeAway && pl.slot !== 'GOL') {
          const m = getP2Move();
          mx = m.ix;
          my = m.iy;
          if (g.ball.owner === pl) spd *= 0.96;
        } else if (pl.slot === 'GOL') {
          const gkX = pl.side === 'home' ? -PITCH.halfW + 18 : PITCH.halfW - 18;
          const targetY = Math.max(-PITCH.goalHalfW + 8, Math.min(PITCH.goalHalfW - 8, g.ball.y * 0.72));
          const dx = gkX - pl.x;
          const dy = targetY - pl.y;
          const d = Math.hypot(dx, dy);
          if (d > 3) {
            mx = dx / d;
            my = dy / d;
          }
          spd *= pl.side === 'away' ? diff.gkSpeedMult : 1.0;
          pl.dirX = pl.side === 'home' ? 1 : -1;

          if (g.ball.owner === pl && pl.aiPassCooldown <= 0) {
            performPass(pl, pl.side === 'home' ? 1 : -1, (Math.random() - 0.5) * 0.8);
          } else if (!g.ball.owner) {
            const headingToGoal = pl.side === 'home' ? g.ball.vx < -175 : g.ball.vx > 175;
            if (headingToGoal && Math.abs(g.ball.x - pl.x) < 98 && Math.abs(g.ball.y - pl.y) > 11 && Math.abs(g.ball.y) < PITCH.goalHalfW + 16) {
              pl.action = 'dive';
              pl.actionTimer = 0.34;
              pl.diveDir = g.ball.y > pl.y ? 1 : -1;
            }
          }
        } else {
          const ai = computeAI(pl);
          mx = ai.mx;
          my = ai.my;
          spd = ai.spd || pl.speed * 0.9;
        }

        const mlen = Math.hypot(mx, my);
        if (mlen > 0.05) {
          const nx = mx / mlen;
          const ny = my / mlen;
          pl.stamina = Math.max(20, pl.stamina - dt * 5.5);
          const stamFactor = 0.85 + (pl.stamina / 100) * 0.18;
          pl.vx = nx * spd * stamFactor;
          pl.vy = ny * spd * stamFactor;
          pl.dirX = nx;
          pl.dirY = ny;
          pl.x += pl.vx * dt;
          pl.y += pl.vy * dt;
          if (pl.action !== 'kick' && pl.action !== 'volley') pl.action = 'run';
          pl.animTime += dt * 10;
          pl.frame = Math.floor(pl.animTime) % 4;
        } else {
          pl.stamina = Math.min(100, pl.stamina + dt * 14);
          pl.vx = 0;
          pl.vy = 0;
          if (pl.action === 'run') pl.action = 'idle';
          pl.frame = 0;
        }

        pl.x = Math.max(-PITCH.halfW - 14, Math.min(PITCH.halfW + 14, pl.x));
        pl.y = Math.max(-PITCH.halfH - 10, Math.min(PITCH.halfH + 10, pl.y));
      });

      // Soft separation
      for (let i = 0; i < g.players.length; i++) {
        for (let j = i + 1; j < g.players.length; j++) {
          const a = g.players[i];
          const b = g.players[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0.01 && dist < 16) {
            const push = (16 - dist) * 0.5;
            a.x -= (dx / dist) * push;
            a.y -= (dy / dist) * push;
            b.x += (dx / dist) * push;
            b.y += (dy / dist) * push;
          }
        }
      }

      // Ball physics
      const b = g.ball;
      if (b.owner) {
        const ow = b.owner;
        const len = Math.hypot(ow.dirX, ow.dirY) || 1;
        const bob = ow.action === 'run' ? Math.sin(ow.animTime * 1.4) * 2.5 : 0;
        b.x = ow.x + (ow.dirX / len) * (10 + bob);
        b.y = ow.y + (ow.dirY / len) * (7 + bob * 0.5);
        b.z = 0;
        b.vx = ow.vx;
        b.vy = ow.vy;
        b.vz = 0;
        b.spin += Math.hypot(ow.vx, ow.vy) * dt * 0.08;
        b.trail = [];

        g.players.forEach((other) => {
          if (other.side !== ow.side && other.stunTimer <= 0 && b.pickupCooldown <= 0) {
            const d = Math.hypot(other.x - b.x, other.y - b.y);
            const stealR = other.slot === 'GOL' ? 16 : other.side === 'away' ? 10 + diff.punishFactor * 3 : 11;
            if (d < stealR) {
              ow.stunTimer = 0.28;
              b.owner = other;
              b.pickupCooldown = 0.22;
              b.lastTouchTeam = other.side;
              b.lastTouchPlayer = other;
              if (other.slot === 'GOL') other.aiPassCooldown = 0.55;
              if (other.side === 'home' && other.slot !== 'GOL' && lockedIdx === undefined) g.activeHome = other;
              if (other.side === 'away' && other.slot !== 'GOL' && isTwoPlayer) g.activeAway = other;
              AudioFX.playKick(0.2);
            }
          }
        });
      } else {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
        b.vz -= 360 * dt;
        if (b.z <= 0) {
          b.z = 0;
          if (Math.abs(b.vz) > 22) {
            b.vz = -b.vz * 0.52;
            b.vx *= 0.88;
            b.vy *= 0.88;
          } else {
            b.vz = 0;
            b.vx *= Math.pow(0.26, dt);
            b.vy *= Math.pow(0.26, dt);
          }
        } else {
          b.vx *= Math.pow(0.75, dt);
          b.vy *= Math.pow(0.75, dt);
        }

        const speed = Math.hypot(b.vx, b.vy);
        b.spin += speed * dt * 0.07;
        if (speed > 260) {
          b.trail.push({ x: b.x, y: b.y, z: b.z });
          if (b.trail.length > 6) b.trail.shift();
        } else if (b.trail.length > 0) {
          b.trail.shift();
        }

        if (b.pickupCooldown <= 0 && b.z < 24) {
          for (let i = 0; i < g.players.length; i++) {
            const pl = g.players[i];
            if (pl.stunTimer > 0) continue;
            const r = pl.slot === 'GOL' ? (pl.action === 'dive' ? 21 : 15) : 13;
            if (Math.hypot(pl.x - b.x, pl.y - b.y) < r) {
              const saveChance = pl.side === 'away' ? 0.25 + diff.gkSaveBonus * 0.5 : 0.45;
              if (pl.slot === 'GOL' && speed > 350 && Math.random() < saveChance) {
                b.vx = (pl.side === 'home' ? 1 : -1) * 165;
                b.vy = (Math.random() - 0.5) * 140;
                b.vz = 45;
                b.pickupCooldown = 0.2;
                AudioFX.playKick(0.45);
                spawnDust(b.x, b.y, 5, '#ffffff');
                announce(`DEFENDEU ${pl.data.name.toUpperCase()}! Grande defesa!`, true);
              } else {
                b.prevTouchPlayer = b.lastTouchPlayer;
                b.owner = pl;
                b.lastTouchTeam = pl.side;
                b.lastTouchPlayer = pl;
                b.pickupCooldown = 0.14;
                if (pl.slot === 'GOL') pl.aiPassCooldown = 0.45;
                if (pl.side === 'home' && pl.slot !== 'GOL' && lockedIdx === undefined) g.activeHome = pl;
                if (pl.side === 'away' && pl.slot !== 'GOL' && isTwoPlayer) g.activeAway = pl;
              }
              break;
            }
          }
        }
        checkGoalsAndBounds();
      }

      const lookAhead = b.owner ? (b.owner.side === 'home' ? 42 : -42) : b.vx * 0.14;
      const targetCamX = Math.max(-225, Math.min(225, b.x + lookAhead));
      const targetCamY = Math.max(-95, Math.min(95, b.y * 0.58));
      g.camX += (targetCamX - g.camX) * Math.min(1, dt * 6.5);
      g.camY += (targetCamY - g.camY) * Math.min(1, dt * 6.5);

      recordSnapshot();
    };

    const renderScene = () => {
      const snap = g.state === 'REPLAY' && g.replayFrames[g.replayIdx] ? g.replayFrames[g.replayIdx] : null;
      const camOverride = snap ? { x: snap.camX, y: snap.camY } : undefined;

      const drawProjectedPoly = (pts: number[][], fill: string | null, stroke?: string, lw?: number) => {
        ctx.beginPath();
        pts.forEach((pt, i) => {
          const s = worldToScreen(pt[0], pt[1], pt[2] || 0, camOverride);
          if (i === 0) ctx.moveTo(Math.round(s.x), Math.round(s.y));
          else ctx.lineTo(Math.round(s.x), Math.round(s.y));
        });
        ctx.closePath();
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = lw || 1;
          ctx.stroke();
        }
      };

      const drawProjectedLine = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, color: string, w = 1) => {
        const p1 = worldToScreen(x1, y1, z1, camOverride);
        const p2 = worldToScreen(x2, y2, z2, camOverride);
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(Math.round(p1.x), Math.round(p1.y));
        ctx.lineTo(Math.round(p2.x), Math.round(p2.y));
        ctx.stroke();
      };

      ctx.save();
      if (g.shakeTime > 0 && !snap) {
        ctx.translate(Math.round((Math.random() - 0.5) * 2 * g.shakeMag), Math.round((Math.random() - 0.5) * 2 * g.shakeMag));
      }

      // Outer bright emerald-teal apron matching Pixel Cup Soccer screenshot
      ctx.fillStyle = '#33755c';
      ctx.fillRect(0, 0, 480, 270);

      // Slanted vertical mown grass stripes (#418d70 / #4c9e7e)
      const numStripes = 16;
      const fullW = PITCH.halfW * 2 + 120;
      const stripeW = fullW / numStripes;
      for (let i = 0; i < numStripes; i++) {
        const x0 = -PITCH.halfW - 60 + i * stripeW;
        const x1 = x0 + stripeW;
        drawProjectedPoly(
          [
            [x0, -PITCH.halfH - 50],
            [x1, -PITCH.halfH - 50],
            [x1, PITCH.halfH + 55],
            [x0, PITCH.halfH + 55]
          ],
          i % 2 === 0 ? '#418d70' : '#4c9e7e'
        );
      }

      // Crisp light mint-white pitch markings (#e3f9ee)
      const lineCol = '#e3f9ee';
      drawProjectedPoly(
        [
          [-PITCH.halfW, -PITCH.halfH],
          [PITCH.halfW, -PITCH.halfH],
          [PITCH.halfW, PITCH.halfH],
          [-PITCH.halfW, PITCH.halfH]
        ],
        null,
        lineCol,
        1.6
      );
      drawProjectedLine(0, -PITCH.halfH, 0, 0, PITCH.halfH, 0, lineCol, 1.5);

      ctx.strokeStyle = lineCol;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let a = 0; a <= 24; a++) {
        const ang = (a / 24) * Math.PI * 2;
        const s = worldToScreen(Math.cos(ang) * 72, Math.sin(ang) * 72, 0, camOverride);
        if (a === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      }
      ctx.stroke();

      const cs = worldToScreen(0, 0, 0, camOverride);
      ctx.fillStyle = lineCol;
      ctx.fillRect(Math.round(cs.x) - 1, Math.round(cs.y) - 1, 3, 2);

      // Penalty boxes, 6-yard boxes, pixel D-arcs, and 'x' penalty spot
      [-1, 1].forEach((side) => {
        const gx = PITCH.halfW * side;
        const bx = (PITCH.halfW - PITCH.boxW) * side;
        const sx = (PITCH.halfW - PITCH.sixW) * side;
        drawProjectedPoly([[gx, -PITCH.boxHalfH], [bx, -PITCH.boxHalfH], [bx, PITCH.boxHalfH], [gx, PITCH.boxHalfH]], null, lineCol, 1.5);
        drawProjectedPoly([[gx, -PITCH.sixHalfH], [sx, -PITCH.sixHalfH], [sx, PITCH.sixHalfH], [gx, PITCH.sixHalfH]], null, lineCol, 1.3);

        // Penalty arc (D)
        ctx.fillStyle = lineCol;
        for (let a = -12; a <= 12; a++) {
          const ang = (a / 12) * 0.72;
          const ax = (PITCH.halfW - 82) * side - Math.cos(ang) * 58 * side;
          const ay = Math.sin(ang) * 58;
          if ((side === -1 && ax > bx) || (side === 1 && ax < bx)) {
            const sp = worldToScreen(ax, ay, 0, camOverride);
            ctx.fillRect(Math.round(sp.x), Math.round(sp.y), 2, 2);
          }
        }

        // Crisp 'x' penalty mark
        const ps = worldToScreen((PITCH.halfW - 82) * side, 0, 0, camOverride);
        const px = Math.round(ps.x);
        const py = Math.round(ps.y);
        ctx.fillStyle = lineCol;
        ctx.fillRect(px - 2, py - 1, 1, 1);
        ctx.fillRect(px + 1, py - 1, 1, 1);
        ctx.fillRect(px - 1, py, 2, 1);
        ctx.fillRect(px - 2, py + 1, 1, 1);
        ctx.fillRect(px + 1, py + 1, 1, 1);
      });

      const drawGoal = (sideSign: number, ripple: number) => {
        const gx = PITCH.halfW * sideSign;
        const backX = (PITCH.halfW + PITCH.goalDepth) * sideSign + Math.sin(ripple * 18) * ripple * 4 * sideSign;
        const topY = -PITCH.goalHalfW;
        const botY = PITCH.goalHalfW;
        const gh = PITCH.goalHeight;
        drawProjectedPoly([[gx, topY], [backX, topY], [backX, botY], [gx, botY]], 'rgba(10, 32, 24, 0.25)');
        const netC = 'rgba(225, 248, 238, 0.55)';
        for (let i = 1; i <= 7; i++) {
          const ny = topY + ((botY - topY) * i) / 8;
          drawProjectedLine(backX, ny, 0, backX, ny, gh, netC, 1);
          drawProjectedLine(gx, ny, gh, backX, ny, gh, netC, 1);
        }
        for (let j = 1; j <= 4; j++) {
          const nz = (gh * j) / 5;
          drawProjectedLine(backX, topY, nz, backX, botY, nz, netC, 1);
          drawProjectedLine(gx, topY, nz, backX, topY, nz, netC, 1);
          drawProjectedLine(gx, botY, nz, backX, botY, nz, netC, 1);
        }
        // White frame + cyan stanchions matching reference screenshot
        drawProjectedLine(gx, topY, 0, gx, topY, gh, '#f8fafc', 2.2);
        drawProjectedLine(gx, botY, 0, gx, botY, gh, '#f8fafc', 2.2);
        drawProjectedLine(gx, topY, gh, gx, botY, gh, '#f8fafc', 2.2);
        drawProjectedLine(gx, topY, gh, backX, topY, gh, '#cbd5e1', 1.2);
        drawProjectedLine(gx, botY, gh, backX, botY, gh, '#cbd5e1', 1.2);
        drawProjectedLine(backX, topY, 0, backX, topY, gh, '#38bdf8', 1.4);
        drawProjectedLine(backX, botY, 0, backX, botY, gh, '#38bdf8', 1.4);
        drawProjectedLine(backX, topY, 0, backX, botY, 0, '#0284c7', 1.4);
      };

      const activeBall = snap ? snap.ball : g.ball;
      const drawBall = () => {
        // Horizontal dark dash shadow below ball showing exact turf landing point
        const sh = worldToScreen(activeBall.x, activeBall.y, 0, camOverride);
        const shadowW = Math.max(4, Math.round(7 - activeBall.z * 0.04));
        ctx.fillStyle = '#0b1912';
        ctx.fillRect(Math.round(sh.x - shadowW / 2), Math.round(sh.y), shadowW, 2);

        if (!snap) {
          g.ball.trail.forEach((tr, idx) => {
            const ts = worldToScreen(tr.x, tr.y, tr.z, camOverride);
            ctx.fillStyle = `rgba(250, 204, 21, ${((idx + 1) / (g.ball.trail.length + 2)) * 0.6})`;
            ctx.beginPath();
            ctx.arc(Math.round(ts.x), Math.round(ts.y) - 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        const pos = worldToScreen(activeBall.x, activeBall.y, activeBall.z, camOverride);
        const bx = Math.round(pos.x);
        const by = Math.round(pos.y) - 3;
        const r = Math.max(3, Math.round(3.6 * pos.scale));
        ctx.fillStyle = '#0b0f17';
        ctx.fillRect(bx - r, by - r, r * 2, r * 2);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(bx - r + 1, by - r + 1, r * 2 - 2, r * 2 - 2);
        ctx.fillStyle = '#0b0f17';
        ctx.fillRect(bx + Math.round(Math.cos(activeBall.spin) * 1.4) - 1, by + Math.round(Math.sin(activeBall.spin) * 1.1) - 1, 2, 2);
      };

      const drawables: { y: number; fn: () => void }[] = [
        { y: -PITCH.goalHalfW - 2, fn: () => drawGoal(-1, g.netRippleLeft) },
        { y: -PITCH.goalHalfW - 1, fn: () => drawGoal(1, g.netRippleRight) }
      ];

      // Draw Referee
      const refX = snap ? snap.refX : g.ref.x;
      const refY = snap ? snap.refY : g.ref.y;
      drawables.push({
        y: refY,
        fn: () => {
          const rp = worldToScreen(refX, refY, 0, camOverride);
          drawPixelPlayerSprite(ctx, Math.round(rp.x), Math.round(rp.y), 1.05 * rp.scale, REFEREE_SPEC, config.homeTeam, false, {
            dirX: snap ? snap.refDir : g.ref.dirX,
            frame: snap ? snap.refFrame : g.ref.frame,
            action: 'run',
            shadow: true,
            isReferee: true
          });
        }
      });

      // Draw 10 Players
      g.players.forEach((pl) => {
        const snapP = snap ? snap.players.find((sp) => sp.id === pl.id) : null;
        const wx = snapP ? snapP.x : pl.x;
        const wy = snapP ? snapP.y : pl.y;
        const dirX = snapP ? snapP.dirX : pl.dirX;
        const frame = snapP ? snapP.frame : pl.frame;
        const action = snapP ? snapP.action : pl.action;
        const diveDir = snapP ? snapP.diveDir : pl.diveDir;

        drawables.push({
          y: wy,
          fn: () => {
            const pos = worldToScreen(wx, wy, 0, camOverride);
            const px = Math.round(pos.x);
            const py = Math.round(pos.y);

            const isP1 = pl === g.activeHome;
            const isP2 = isTwoPlayer && pl === g.activeAway;
            const isCarrier = snap ? snap.ball.ownerId === pl.id : g.ball.owner === pl;

            // Segmented Cyan Ring around active player / carrier (matches screenshot!)
            if (isP1 || isP2 || isCarrier) {
              const col = isP2 && !isP1 ? '#fb7185' : '#22d3ee';
              ctx.strokeStyle = col;
              ctx.lineWidth = isCarrier ? 2 : 1.4;
              const segs = [
                [0.2, 1.3],
                [1.8, 2.9],
                [3.4, 4.5],
                [5.0, 6.1]
              ];
              segs.forEach(([a0, a1]) => {
                ctx.beginPath();
                ctx.ellipse(px, py + 1, 10, 4.2, 0, a0, a1);
                ctx.stroke();
              });
            }

            if (!snap && ((isP1 && g.p1Charging) || (isP2 && g.p2Charging))) {
              const pwr = isP1 ? g.p1Power : g.p2Power;
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(px - 11, py + 5, 22, 4);
              ctx.fillStyle = pwr > 0.7 ? '#ef4444' : pwr > 0.4 ? '#facc15' : '#22c55e';
              ctx.fillRect(px - 10, py + 6, Math.round(20 * pwr), 2);
            }

            drawPixelPlayerSprite(ctx, px, py, 1.05 * pos.scale, pl.data, pl.team, pl.useAway, {
              dirX,
              frame,
              action,
              diveDir,
              shadow: true
            });

            // Cyan downward triangle with crisp black outline above active player
            if (isP1 || isP2) {
              const bob = Math.round(Math.sin(performance.now() * 0.01) * 1.4);
              const ay = py - 30 + bob;
              const col = isP1 ? '#22d3ee' : '#fb7185';
              ctx.fillStyle = '#0b0f17';
              ctx.fillRect(px - 3, ay - 1, 7, 2);
              ctx.fillRect(px - 2, ay + 1, 5, 1);
              ctx.fillRect(px - 1, ay + 2, 3, 1);
              ctx.fillRect(px, ay + 3, 1, 1);
              ctx.fillStyle = col;
              ctx.fillRect(px - 2, ay, 5, 1);
              ctx.fillRect(px - 1, ay + 1, 3, 1);
              ctx.fillRect(px, ay + 2, 1, 1);
            }

            // Crisp outlined player name above active / carrier (like "20. RODRYGO")
            if (isCarrier || isP1) {
              const lbl = `${pl.data.num}. ${pl.data.name.toUpperCase()}`;
              ctx.font = 'bold 6px monospace';
              ctx.textAlign = 'center';
              ctx.fillStyle = '#0b0f17';
              ctx.fillText(lbl, px + 1, py - 34);
              ctx.fillText(lbl, px - 1, py - 34);
              ctx.fillText(lbl, px, py - 35);
              ctx.fillStyle = '#ffffff';
              ctx.fillText(lbl, px, py - 34);
              ctx.textAlign = 'left';
            }
          }
        });
      });

      drawables.push({ y: activeBall.y + 0.5, fn: drawBall });
      drawables.sort((a, b) => a.y - b.y);
      drawables.forEach((d) => d.fn());

      g.particles.forEach((pt) => {
        const s = worldToScreen(pt.x, pt.y, pt.z, camOverride);
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, pt.life / pt.maxLife));
        ctx.fillRect(Math.round(s.x), Math.round(s.y), pt.size, pt.size);
      });
      ctx.globalAlpha = 1;

      if (g.bannerTimer > 0 && g.state !== 'REPLAY') {
        const bw = 240;
        const bh = 38;
        const bx = 240 - bw / 2;
        const by = 48;
        ctx.fillStyle = 'rgba(9, 15, 24, 0.9)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(g.bannerText, 240, by + 18);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 7px monospace';
        ctx.fillText(g.bannerSub, 240, by + 30);
        ctx.textAlign = 'left';
      }

      ctx.restore();

      // Tactical Broadcast Radar / Minimap (matches reference screenshot!)
      const rc = radarRef.current;
      if (rc) {
        const rctx = rc.getContext('2d');
        if (rctx) {
          rctx.fillStyle = '#256c47';
          rctx.fillRect(0, 0, rc.width, rc.height);
          rctx.strokeStyle = 'rgba(230, 250, 240, 0.75)';
          rctx.lineWidth = 1;
          rctx.strokeRect(2, 2, rc.width - 4, rc.height - 4);
          rctx.beginPath();
          rctx.moveTo(rc.width / 2, 2);
          rctx.lineTo(rc.width / 2, rc.height - 2);
          rctx.stroke();
          rctx.strokeRect(2, 13, 14, rc.height - 26);
          rctx.strokeRect(rc.width - 16, 13, 14, rc.height - 26);

          g.players.forEach((pl) => {
            const sp = snap ? snap.players.find((x) => x.id === pl.id) : null;
            const px = sp ? sp.x : pl.x;
            const py = sp ? sp.y : pl.y;
            const rx = ((px + PITCH.halfW) / (PITCH.halfW * 2)) * (rc.width - 8) + 4;
            const ry = ((py + PITCH.halfH) / (PITCH.halfH * 2)) * (rc.height - 8) + 4;
            rctx.fillStyle = pl.side === 'home' ? '#ef4444' : '#3b82f6';
            rctx.fillRect(Math.round(rx) - 1, Math.round(ry) - 1, 3, 3);
          });

          const brx = ((activeBall.x + PITCH.halfW) / (PITCH.halfW * 2)) * (rc.width - 8) + 4;
          const bry = ((activeBall.y + PITCH.halfH) / (PITCH.halfH * 2)) * (rc.height - 8) + 4;
          rctx.fillStyle = '#ffffff';
          rctx.fillRect(Math.round(brx) - 2, Math.round(bry) - 2, 3, 3);
        }
      }
    };

    let lastTime = performance.now();
    let hudSyncAcc = 0;
    let rafId = 0;

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      updateSim(rawDt);
      renderScene();

      hudSyncAcc += rawDt;
      if (hudSyncAcc > 0.08) {
        hudSyncAcc = 0;
        const p1 = g.activeHome;
        const p2 = isTwoPlayer ? g.activeAway : g.ball.owner?.side === 'away' ? g.ball.owner : g.activeAway;
        const matchSec = Math.min(5400, Math.floor((g.elapsed / matchDuration) * 5400));
        const mm = String(Math.floor(matchSec / 60)).padStart(2, '0');
        const ss = String(matchSec % 60).padStart(2, '0');
        setHudState({
          homeScore: g.homeScore,
          awayScore: g.awayScore,
          clockText: isTraining ? 'TREINO' : `${mm} : ${ss}`,
          p1Name: p1 ? p1.data.name : '',
          p1Num: p1 ? p1.data.num : 10,
          p1Role: p1 ? p1.data.role : 'ATA',
          p1Power: Math.round(g.p1Power * 100),
          p1Stamina: Math.round(p1 ? p1.stamina : 100),
          p2Name: p2 ? p2.data.name : config.awayTeam.abbr,
          p2Num: p2 ? p2.data.num : 9,
          p2Role: p2 ? p2.data.role : 'ATA',
          p2Power: Math.round(g.p2Power * 100),
          p2Stamina: Math.round(p2 ? p2.stamina : 100)
        });
      }

      keysJust.clear();
      p1ShootReleased = false;
      p2ShootReleased = false;
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      Narrator.stop();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [config, onFinish]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#183b2c] overflow-hidden">
      <canvas
        ref={canvasRef}
        width={480}
        height={270}
        className="block w-full h-full max-w-[177.78vh] max-h-[56.25vw] shadow-2xl"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Broadcast HUD matching Pixel Cup Soccer screenshot */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-3 z-10">
        {/* Top Scoreboard + Clock Tab + Commentary */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {isReplay ? (
              <div className="flex items-center gap-2 bg-red-700/95 border border-white/40 rounded px-2.5 py-1 text-xs font-extrabold text-white shadow">
                <span>● REPLAY</span>
              </div>
            ) : (
              <div className="text-[11px] font-extrabold text-white bg-slate-950/75 border border-white/20 rounded px-2.5 py-1">
                {config.mode === 'training' ? 'Treino' : DIFFICULTIES[config.difficulty].label}
              </div>
            )}
          </div>

          {/* Centered Pixel Cup Broadcast Scoreboard */}
          <div className="flex flex-col items-center">
            <div className="bg-slate-400/80 border border-slate-950 rounded-t px-3 py-0.5 font-mono text-xs font-extrabold text-white shadow tabular-nums" style={{ textShadow: '1px 1px 0 #000' }}>
              {hudState.clockText}
            </div>
            <div className="flex items-center gap-2.5 bg-[#6b4d44]/90 border-2 border-slate-950 rounded-full px-3.5 py-1 shadow-xl tabular-nums">
              <canvas ref={homeJerseyRef} width={18} height={16} className="w-5 h-4.5" style={{ imageRendering: 'pixelated' }} />
              <canvas ref={homeCrestRef} width={16} height={16} className="w-5 h-5 rounded-full border border-white/60" style={{ imageRendering: 'pixelated' }} />
              <span className="font-mono text-sm font-extrabold text-white" style={{ textShadow: '1px 1px 0 #000' }}>{config.homeTeam.abbr}</span>

              <div className="flex items-center gap-2 bg-[#933036] border border-slate-950 rounded-md px-3 py-0.5 font-mono text-lg font-extrabold text-white" style={{ textShadow: '1px 1px 0 #000' }}>
                <span>{hudState.homeScore}</span>
                <span>-</span>
                <span>{hudState.awayScore}</span>
              </div>

              <span className="font-mono text-sm font-extrabold text-white" style={{ textShadow: '1px 1px 0 #000' }}>{config.awayTeam.abbr}</span>
              <canvas ref={awayCrestRef} width={16} height={16} className="w-5 h-5 rounded-full border border-white/60" style={{ imageRendering: 'pixelated' }} />
              <canvas ref={awayJerseyRef} width={18} height={16} className="w-5 h-4.5" style={{ imageRendering: 'pixelated' }} />
            </div>

            {/* Live Portuguese Commentary Ticker */}
            <div className="mt-1 bg-slate-950/80 border border-white/15 rounded px-3 py-0.5 text-[11px] font-bold text-yellow-300 shadow max-w-md truncate">
              {commentary}
            </div>
          </div>

          {/* Audio / Voice / Pause buttons */}
          <div className="flex gap-1.5 pointer-events-auto">
            {isReplay && (
              <button
                type="button"
                onClick={() => {
                  skipReplayRef.current = true;
                }}
                className="min-h-[34px] px-2.5 rounded border border-yellow-300 bg-yellow-400 text-xs font-extrabold text-slate-950 cursor-pointer"
              >
                Pular Replay
              </button>
            )}
            <button
              type="button"
              onClick={() => setVoiceOn(Narrator.setVoiceEnabled(!Narrator.isVoiceEnabled()))}
              className="min-h-[34px] px-2.5 rounded border border-white/20 bg-slate-950/80 text-[11px] font-bold text-slate-100 hover:bg-slate-800 cursor-pointer"
            >
              {voiceOn ? 'Voz: ON' : 'Voz: OFF'}
            </button>
            <button
              type="button"
              onClick={() => setMuted(AudioFX.setMuted(!AudioFX.isMuted()))}
              className="min-h-[34px] px-2.5 rounded border border-white/20 bg-slate-950/80 text-[11px] font-bold text-slate-100 hover:bg-slate-800 cursor-pointer"
            >
              {muted ? 'Som: OFF' : 'Som: ON'}
            </button>
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="min-h-[34px] px-2.5 rounded border border-white/20 bg-slate-950/80 text-[11px] font-bold text-slate-100 hover:bg-slate-800 cursor-pointer"
            >
              Pausa
            </button>
          </div>
        </div>

        {/* Bottom Broadcast Strip: P1 Bars & Name | Radar | P2 Bars & Name */}
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="w-24 h-3 bg-[#473f3d] border-2 border-slate-950 rounded-xs overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500" style={{ width: `${hudState.p1Power}%` }} />
              </div>
              <span className="text-xs" aria-hidden="true">⚽</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-24 h-3 bg-[#1e293b] border-2 border-slate-950 rounded-xs overflow-hidden">
                <div className="h-full bg-cyan-400" style={{ width: `${hudState.p1Stamina}%` }} />
              </div>
              <span className="text-xs text-yellow-300" aria-hidden="true">⚡</span>
            </div>
            <div className="font-mono text-sm sm:text-base font-extrabold text-white tracking-wide tabular-nums" style={{ textShadow: '2px 2px 0 #000' }}>
              {hudState.p1Num}. {hudState.p1Name.toUpperCase()} .{hudState.p1Role}
            </div>
          </div>

          <canvas
            ref={radarRef}
            width={122}
            height={58}
            className="border-2 border-white/60 rounded-xs shadow-lg"
            style={{ imageRendering: 'pixelated' }}
          />

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs" aria-hidden="true">⚽</span>
              <div className="w-24 h-3 bg-[#473f3d] border-2 border-slate-950 rounded-xs overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500" style={{ width: `${hudState.p2Power}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-yellow-300" aria-hidden="true">⚡</span>
              <div className="w-24 h-3 bg-[#1e293b] border-2 border-slate-950 rounded-xs overflow-hidden">
                <div className="h-full bg-cyan-400" style={{ width: `${hudState.p2Stamina}%` }} />
              </div>
            </div>
            <div className="font-mono text-sm sm:text-base font-extrabold text-white tracking-wide tabular-nums" style={{ textShadow: '2px 2px 0 #000' }}>
              {hudState.p2Num}. {hudState.p2Name.toUpperCase()} .{hudState.p2Role}
            </div>
          </div>
        </div>
      </div>

      {/* Pause Modal */}
      {paused && (
        <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border border-white/15 rounded-lg p-6 text-center space-y-4">
            <h2 className="text-xl font-extrabold text-yellow-400">Jogo Pausado</h2>
            <p className="text-xs text-slate-300">
              WASD correr · Shift Trocar jogador · J passar · K chutar (segure) / carrinho
            </p>
            <div className="flex flex-wrap justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="min-h-[42px] px-5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white cursor-pointer"
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={onExit}
                className="min-h-[42px] px-5 rounded bg-slate-800 hover:bg-slate-700 border border-white/15 text-sm font-bold text-white cursor-pointer"
              >
                Voltar ao Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

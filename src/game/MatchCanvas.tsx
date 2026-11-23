import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Narrator } from '../audio/narrator';
import { AudioFX } from '../audio/sound';
import { ClubCrest } from '../components/PixelPreview';
import { DIFFICULTIES, getTeamBench } from '../data/leagues';
import {
  FormationId,
  MatchConfig,
  MatchResult,
  MentalityId,
  PlayerSpec,
  TeamSpec,
  WeatherId
} from '../types';
import {
  drawClubCrest,
  drawMiniJerseyIcon,
  drawPixelPlayerSprite,
  drawSoccerBallPixel
} from './sprites';

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
  yellowCards: number;
  ejected: boolean;
  shieldTimer: number;
  feintCooldown: number;
  offsideFlagged: boolean;
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

interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
}

interface ReplayFrame {
  camX: number;
  camY: number;
  ball: { x: number; y: number; z: number; spin: number; ownerId: string | null };
  players: {
    id: string;
    x: number;
    y: number;
    dirX: number;
    frame: number;
    action: PlayerEntity['action'];
    diveDir: number;
    ejected: boolean;
  }[];
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

const FORMATION_COORDS: Record<FormationId, { key: string; x: number; y: number }[]> = {
  '4-3-3': [
    { key: 'GOL', x: -455, y: 0 },
    { key: 'ZAG', x: -290, y: 0 },
    { key: 'MEI1', x: -135, y: -90 },
    { key: 'MEI2', x: -135, y: 90 },
    { key: 'ATA', x: -35, y: 0 }
  ],
  '4-4-2': [
    { key: 'GOL', x: -455, y: 0 },
    { key: 'ZAG', x: -305, y: 0 },
    { key: 'MEI1', x: -165, y: -110 },
    { key: 'MEI2', x: -120, y: 85 },
    { key: 'ATA', x: -45, y: -32 }
  ],
  '4-2-3-1': [
    { key: 'GOL', x: -455, y: 0 },
    { key: 'ZAG', x: -295, y: 0 },
    { key: 'MEI1', x: -185, y: -70 },
    { key: 'MEI2', x: -95, y: 78 },
    { key: 'ATA', x: -32, y: 0 }
  ],
  '3-5-2': [
    { key: 'GOL', x: -455, y: 0 },
    { key: 'ZAG', x: -275, y: 0 },
    { key: 'MEI1', x: -115, y: -125 },
    { key: 'MEI2', x: -115, y: 125 },
    { key: 'ATA', x: -48, y: 0 }
  ]
};

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

const LED_ADS = [
  'BRASILEIRÃO 16-BIT  ●  SÉRIE A  ●  TRANSMISSÃO OFICIAL',
  'EA / PIXEL SIMULAÇÃO  ●  ESTÁDIO NACIONAL  ●  AO VIVO',
  'COPA DO BRASIL  ●  FAIR PLAY FIFA  ●  TORCIDA PRESENTE'
];

const WEATHER_LABELS: Record<WeatherId, string> = {
  sunny: 'Dia Ensolarado',
  night: 'Noite c/ Refletores',
  rain: 'Chuva Leve'
};

export const MatchCanvas: React.FC<Props> = ({ config, onFinish, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarRef = useRef<HTMLCanvasElement | null>(null);
  const homeJerseyRef = useRef<HTMLCanvasElement | null>(null);
  const awayJerseyRef = useRef<HTMLCanvasElement | null>(null);
  const homeCrestRef = useRef<HTMLCanvasElement | null>(null);
  const awayCrestRef = useRef<HTMLCanvasElement | null>(null);

  const [paused, setPaused] = useState(false);
  const [pauseTab, setPauseTab] = useState<'menu' | 'squad'>('menu');
  const [muted, setMuted] = useState(() => AudioFX.isMuted());
  const [voiceOn, setVoiceOn] = useState(() => Narrator.isVoiceEnabled());
  const [commentary, setCommentary] = useState('Escalações confirmadas! Vai começar o espetáculo!');
  const [isReplay, setIsReplay] = useState(false);
  const [isPreMatch, setIsPreMatch] = useState(config.mode !== 'training');

  const initialMentality: MentalityId =
    config.mentality ||
    (config.tactic === 'ofensivo' ? 'pressao_alta' : config.tactic === 'retranca' ? 'retranca' : 'equilibrado');

  const [formation, setFormation] = useState<FormationId>(config.formation || '4-3-3');
  const [mentality, setMentality] = useState<MentalityId>(initialMentality);
  const weather: WeatherId = config.weather || 'sunny';

  const initialBench = useMemo(() => getTeamBench(config.homeTeam), [config.homeTeam]);
  const [benchList, setBenchList] = useState<PlayerSpec[]>(initialBench);
  const [subsUsed, setSubsUsed] = useState(0);
  const [selectedSubStarterIdx, setSelectedSubStarterIdx] = useState<number | null>(null);
  const [squadSnapshot, setSquadSnapshot] = useState<
    { slotIdx: number; name: string; num: number; role: string; ovr: number; stamina: number; yellowCards: number; ejected: boolean }[]
  >([]);

  const [hudState, setHudState] = useState({
    homeScore: 0,
    awayScore: 0,
    clockText: '00:00',
    p1Name: config.homeTeam.players[4].name,
    p1Num: config.homeTeam.players[4].num,
    p1Role: config.homeTeam.players[4].role,
    p1Power: 0,
    p1Stamina: 100,
    p2Name: config.awayTeam.players[4].name,
    p2Num: config.awayTeam.players[4].num,
    p2Role: config.awayTeam.players[4].role,
    p2Power: 0,
    p2Stamina: 100,
    setPieceHint: ''
  });

  const pausedRef = useRef(false);
  const finishedRef = useRef(false);
  const skipReplayRef = useRef(false);
  const skipPreMatchRef = useRef(false);
  const formationRef = useRef<FormationId>(formation);
  const mentalityRef = useRef<MentalityId>(mentality);
  const benchListRef = useRef<PlayerSpec[]>(initialBench);
  const pendingSubRef = useRef<{ starterIdx: number; benchIdx: number } | null>(null);

  useEffect(() => {
    benchListRef.current = benchList;
  }, [benchList]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    formationRef.current = formation;
  }, [formation]);

  useEffect(() => {
    mentalityRef.current = mentality;
  }, [mentality]);

  // Keep global audio synchronized with menu state
  useEffect(() => {
    setMuted(AudioFX.isMuted());
  }, []);

  useEffect(() => {
    if (homeJerseyRef.current) drawMiniJerseyIcon(homeJerseyRef.current, config.homeTeam, config.homeUseAway);
    if (awayJerseyRef.current) drawMiniJerseyIcon(awayJerseyRef.current, config.awayTeam, config.awayUseAway);
    if (homeCrestRef.current) drawClubCrest(homeCrestRef.current, config.homeTeam);
    if (awayCrestRef.current) drawClubCrest(awayCrestRef.current, config.awayTeam);
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

    const getMentalityOffset = (m: MentalityId) => (m === 'pressao_alta' ? 48 : m === 'retranca' ? -45 : 0);

    const buildTeam = (team: TeamSpec, side: 'home' | 'away', useAway: boolean): PlayerEntity[] => {
      const dir = side === 'home' ? 1 : -1;
      const coords = side === 'home' ? FORMATION_COORDS[formationRef.current] : FORMATION_COORDS['4-3-3'];
      const tacOff = side === 'home' ? getMentalityOffset(mentalityRef.current) : 0;

      const list = team.players.map((p, idx) => {
        const spec = side === 'home' && idx === lockedIdx && config.customPlayer ? config.customPlayer : p;
        const form = coords[idx] || coords[4];
        const ovrBoost = (spec.ovr - 78) * 1.1;
        const paceBoost = spec.pace ? (spec.pace - 75) * 0.9 : 0;
        const baseSpeed =
          (spec.role === 'ATA' ? 148 : spec.role === 'MEI' ? 142 : spec.role === 'ZAG' ? 136 : 124) +
          ovrBoost +
          paceBoost;
        const hx = Math.max(-460, Math.min(460, form.x * dir + (idx > 0 ? tacOff : 0)));
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
          aiPassCooldown: 0,
          yellowCards: 0,
          ejected: false,
          shieldTimer: 0,
          feintCooldown: 0,
          offsideFlagged: false
        };
      });

      return isTraining && side === 'away' ? list.filter((_, i) => i === 0 || i === 1) : list;
    };

    const g = {
      state: (isTraining ? 'PLAYING' : 'PRE_MATCH') as
        | 'PRE_MATCH'
        | 'PLAYING'
        | 'SET_PIECE'
        | 'GOAL_CELEBRATION'
        | 'REPLAY'
        | 'RESTART_FREEZE'
        | 'ENDED',
      preMatchTimer: isTraining ? 0 : 2.9,
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
      lastScorer: null as PlayerEntity | null,
      bannerText: isTraining ? 'ARENA DE TREINO' : 'TRANSMISSÃO AO VIVO',
      bannerSub: isTraining
        ? 'Treine chutes, passes, cruzamentos e drible'
        : `${config.homeTeam.name} vs ${config.awayTeam.name} · ${diff.label}`,
      bannerTimer: isTraining ? 1.8 : 0,
      cardBanner: null as { color: 'yellow' | 'red'; playerName: string; abbr: string; timer: number } | null,
      camX: 0,
      camY: 0,
      crowdExcite: 0,
      photoFlash: 0,
      ref: { x: 0, y: -70, dirX: 1, animTime: 0, frame: 0 },
      ball: {
        x: 0,
        y: 0,
        z: 12,
        vx: 0,
        vy: 0,
        vz: 0,
        spin: 0,
        curve: 0,
        owner: null as PlayerEntity | null,
        lastTouchTeam: null as 'home' | 'away' | null,
        lastTouchPlayer: null as PlayerEntity | null,
        prevTouchPlayer: null as PlayerEntity | null,
        pickupCooldown: 0.2
      },
      setPiece: {
        kind: 'free_kick' as 'free_kick' | 'penalty',
        side: 'home' as 'home' | 'away',
        taker: null as PlayerEntity | null,
        gk: null as PlayerEntity | null,
        aimY: 0,
        curve: 0,
        gkChoice: 0, // -1 up, 0 center, 1 down
        aiTimer: 1.0
      },
      players: [
        ...buildTeam(config.homeTeam, 'home', config.homeUseAway),
        ...buildTeam(config.awayTeam, 'away', config.awayUseAway)
      ],
      particles: [] as Particle[],
      skidMarks: [] as SkidMark[],
      rainDrops: Array.from({ length: 75 }, () => ({
        x: Math.random() * 480,
        y: Math.random() * 270,
        speed: 220 + Math.random() * 90
      })),
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

    const applyFormationAndMentality = () => {
      const coords = FORMATION_COORDS[formationRef.current];
      const tacOff = getMentalityOffset(mentalityRef.current);
      g.players.forEach((pl) => {
        if (pl.side !== 'home' || pl.ejected) return;
        const form = coords[pl.slotIdx] || coords[4];
        pl.homeX = Math.max(-460, Math.min(460, form.x + (pl.slotIdx > 0 ? tacOff : 0)));
        pl.homeY = form.y;
      });
    };

    const resetPositions = (kickoffSide: 'home' | 'away') => {
      g.ball.x = 0;
      g.ball.y = 0;
      g.ball.z = 12;
      g.ball.vx = 0;
      g.ball.vy = 0;
      g.ball.vz = 0;
      g.ball.curve = 0;
      g.ball.owner = null;
      g.ball.pickupCooldown = 0.2;
      g.p1Charging = false;
      g.p1Power = 0;
      g.p2Charging = false;
      g.p2Power = 0;
      g.ref.x = 0;
      g.ref.y = -75;

      g.players.forEach((pl) => {
        if (pl.ejected) return;
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
        pl.offsideFlagged = false;
      });

      const homeFocus =
        lockedIdx !== undefined
          ? g.players.find((p) => !p.ejected && p.side === 'home' && p.slotIdx === lockedIdx)
          : g.players.find((p) => !p.ejected && p.side === 'home' && p.slot === 'ATA') ||
            g.players.find((p) => !p.ejected && p.side === 'home' && p.slot !== 'GOL');
      if (homeFocus) {
        if (kickoffSide === 'home') {
          homeFocus.x = -18;
          homeFocus.y = 0;
        }
        g.activeHome = homeFocus;
      }
      const awayStriker =
        g.players.find((p) => !p.ejected && p.side === 'away' && p.slot === 'ATA') ||
        g.players.find((p) => !p.ejected && p.side === 'away' && p.slot !== 'GOL');
      if (awayStriker) {
        if (kickoffSide === 'away' && !isTraining) {
          awayStriker.x = 18;
          awayStriker.y = 0;
        }
        g.activeAway = awayStriker;
      }
    };

    resetPositions('home');
    if (isTraining) {
      AudioFX.playWhistle('kickoff');
      announce('Arena de Treino pronta! Aperte J, H, L, K ou Espaço.', true);
    } else {
      announce(`Transmissão ao vivo! ${config.homeTeam.name} enfrenta ${config.awayTeam.name}.`, true);
    }

    const keysHeld = new Set<string>();
    const keysJust = new Set<string>();
    let p1ShootReleased = false;
    let p2ShootReleased = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (g.state === 'PRE_MATCH' && (e.code === 'Space' || e.code === 'KeyK' || e.code === 'Enter')) {
        skipPreMatchRef.current = true;
        return;
      }
      if (g.state === 'REPLAY' && (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK' || e.code === 'Enter')) {
        skipReplayRef.current = true;
        return;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        setPaused((v) => !v);
        return;
      }
      if (e.code === 'KeyM' && !isTwoPlayer) {
        setMuted(AudioFX.setMuted(!AudioFX.isMuted()));
        return;
      }
      if (!keysHeld.has(e.code)) keysJust.add(e.code);
      keysHeld.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyK' || e.code === 'KeyZ') p1ShootReleased = true;
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

    // 2.5D Isometric Camera Projection
    const worldToScreen = (wx: number, wy: number, wz = 0, camOverride?: { x: number; y: number }) => {
      const cx = camOverride ? camOverride.x : g.camX;
      const cy = camOverride ? camOverride.y : g.camY;
      const dx = wx - cx;
      const dy = wy - cy;
      const persp = 1 + dy * 0.00062;
      const skewX = dy * 0.14;
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
          vx: (Math.random() - 0.5) * 50,
          vy: (Math.random() - 0.5) * 32,
          vz: 16 + Math.random() * 32,
          life: 0.25 + Math.random() * 0.22,
          maxLife: 0.48,
          color,
          size: 2
        });
      }
    };

    const spawnConfetti = (gx: number, gy: number, team: TeamSpec) => {
      const colors = [team.kit.c1, team.kit.c2, '#facc15', '#ffffff'];
      for (let i = 0; i < 36; i++) {
        g.particles.push({
          x: gx + (Math.random() - 0.5) * 36,
          y: gy + (Math.random() - 0.5) * 80,
          z: 8 + Math.random() * 24,
          vx: (Math.random() - 0.5) * 135,
          vy: (Math.random() - 0.5) * 90,
          vz: 65 + Math.random() * 90,
          life: 1.0 + Math.random() * 0.85,
          maxLife: 1.9,
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
      const tms = g.players.filter((p) => !p.ejected && p.side === passer.side && p !== passer);
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

    const checkPlayerOffsideAtPass = (passer: PlayerEntity, receiver: PlayerEntity | null) => {
      if (isTraining || !receiver || receiver.slot === 'GOL') return;
      const dir = passer.side === 'home' ? 1 : -1;
      // Must be in opponent half & ahead of the ball
      if (receiver.x * dir <= 12 || (receiver.x - passer.x) * dir <= 8) return;
      const oppFieldPlayers = g.players.filter((o) => !o.ejected && o.side !== passer.side && o.slot !== 'GOL');
      if (oppFieldPlayers.length === 0) return;
      // Last defender X in attack direction
      let deepestOppX = -dir * 999;
      for (const opp of oppFieldPlayers) {
        if (opp.x * dir > deepestOppX * dir) deepestOppX = opp.x;
      }
      if (receiver.x * dir > deepestOppX * dir + 10) {
        receiver.offsideFlagged = true;
      }
    };

    const performPass = (
      passer: PlayerEntity,
      aimX: number,
      aimY: number,
      kind: 'short' | 'through' | 'cross' = 'short'
    ) => {
      g.players.forEach((pl) => {
        if (pl.side === passer.side) pl.offsideFlagged = false;
      });
      const target = findPassTarget(passer, aimX, aimY);
      checkPlayerOffsideAtPass(passer, target);

      g.ball.prevTouchPlayer = passer;
      g.ball.lastTouchPlayer = passer;
      g.ball.lastTouchTeam = passer.side;
      g.ball.owner = null;
      g.ball.pickupCooldown = 0.16;
      g.ball.curve = 0;
      passer.action = 'kick';
      passer.actionTimer = 0.2;
      if (passer.side === 'home') g.userPasses++;

      const dir = passer.side === 'home' ? 1 : -1;
      let tx: number;
      let ty: number;

      if (kind === 'cross') {
        // Lofted cross into the opponent box / far post or deep target
        if (Math.abs(passer.x - PITCH.halfW * dir) < 220 && Math.abs(passer.y) > 70) {
          tx = (PITCH.halfW - 72) * dir;
          ty = passer.y > 0 ? -38 : 38;
        } else if (target) {
          tx = target.x + dir * 48;
          ty = target.y + target.vy * 0.25;
        } else {
          tx = passer.x + dir * 185;
          ty = passer.y * 0.4;
        }
      } else if (kind === 'through') {
        if (target) {
          const lead = 68;
          tx = Math.max(-PITCH.halfW + 30, Math.min(PITCH.halfW - 30, target.x + dir * lead + target.vx * 0.28));
          ty = Math.max(-PITCH.halfH + 22, Math.min(PITCH.halfH - 22, target.y + target.vy * 0.32));
        } else {
          tx = passer.x + (aimX || dir) * 190;
          ty = passer.y + aimY * 140;
        }
      } else if (target) {
        tx = target.x + target.vx * 0.22;
        ty = target.y + target.vy * 0.22;
      } else {
        tx = passer.x + (aimX || dir) * 140;
        ty = passer.y + aimY * 140;
      }

      if (target) {
        if (passer.side === 'home' && target.data.role !== 'GOL' && lockedIdx === undefined) g.activeHome = target;
        if (passer.side === 'away' && target.data.role !== 'GOL' && isTwoPlayer) g.activeAway = target;
        if (Math.random() < 0.34) {
          announce(
            kind === 'through'
              ? `Belo passe em profundidade de ${passer.data.name} buscando ${target.data.name}!`
              : kind === 'cross'
              ? `Cruzamento na área de ${passer.data.name}!`
              : `${passer.data.name} toca para ${target.data.name}.`
          );
        }
      }

      const dx = tx - g.ball.x;
      const dy = ty - g.ball.y;
      const dist = Math.hypot(dx, dy) || 1;
      const spd =
        kind === 'cross'
          ? Math.min(395, Math.max(255, dist * 1.48))
          : kind === 'through'
          ? Math.min(410, Math.max(270, dist * 1.72))
          : Math.min(365, Math.max(220, dist * 1.6));

      g.ball.vx = (dx / dist) * spd;
      g.ball.vy = (dy / dist) * spd;
      g.ball.vz = kind === 'cross' ? 162 : kind === 'through' ? 28 : 16;
      AudioFX.playKick(kind === 'cross' ? 0.55 : 0.34);
      spawnDust(g.ball.x, g.ball.y, 4, '#bbf7d0');
    };

    const performShot = (
      shooter: PlayerEntity,
      power: number,
      aimY: number,
      isVolley = false,
      curveAmount = 0
    ) => {
      const attackDir = shooter.side === 'home' ? 1 : -1;
      const goalX = PITCH.halfW * attackDir;

      let targetY: number;
      if (shooter.side === 'away' && !isTwoPlayer) {
        // Bots intentionally aim for top or bottom corners of the goal!
        const chosenCorner = shooter.y >= 0 ? -1 : 1; // aim far corner or random corner
        const cornerSign = Math.random() < 0.72 ? chosenCorner : -chosenCorner;
        const cornerY = cornerSign * (PITCH.goalHalfW - 9);
        const variance = (1 - diff.shotAccuracy) * 44 * (Math.random() - 0.5);
        targetY = Math.max(-PITCH.goalHalfW + 5, Math.min(PITCH.goalHalfW - 5, cornerY + variance));
      } else {
        const baseY = aimY !== 0 ? aimY * (PITCH.goalHalfW - 8) : shooter.y * 0.32;
        targetY = Math.max(-PITCH.goalHalfW + 5, Math.min(PITCH.goalHalfW - 5, baseY + (Math.random() - 0.5) * 10));
      }

      const dx = goalX - g.ball.x;
      const dy = targetY - g.ball.y;
      const dist = Math.hypot(dx, dy) || 1;
      const p = Math.max(0.18, Math.min(1, power));
      const shotBoost = shooter.data.shooting ? (shooter.data.shooting - 75) * 1.8 : 0;
      const spd = 345 + p * 275 + shotBoost + (isVolley ? 45 : 0);

      g.ball.prevTouchPlayer = g.ball.lastTouchPlayer;
      g.ball.lastTouchPlayer = shooter;
      g.ball.lastTouchTeam = shooter.side;
      g.ball.owner = null;
      g.ball.pickupCooldown = 0.18;
      g.ball.vx = (dx / dist) * spd;
      g.ball.vy = (dy / dist) * spd;
      g.ball.vz = isVolley ? 65 : 44 + p * 105;
      g.ball.curve = curveAmount;

      shooter.action = isVolley ? 'volley' : 'kick';
      shooter.actionTimer = isVolley ? 0.38 : 0.24;
      shooter.dirX = attackDir;

      if (shooter.side === 'home') g.homeShots++;
      else g.awayShots++;

      if (isVolley) {
        announce(`VOLEIO DE ${shooter.data.name.toUpperCase()}! Olha a finalização!`, true);
      } else if (p > 0.72) {
        announce(`CHUTAÇO NO CANTO DE ${shooter.data.name.toUpperCase()}!`);
      } else {
        announce(`Finalizou ${shooter.data.name}!`);
      }

      g.photoFlash = 0.16;
      AudioFX.playKick(0.45 + p * 0.55);
      spawnDust(g.ball.x, g.ball.y, p > 0.65 || isVolley ? 10 : 5, '#e2e8f0');
      if (p > 0.6 || isVolley) {
        g.hitstop = 0.035;
        triggerShake(2.2 + p * 2.2, 0.2);
        g.crowdExcite = Math.max(g.crowdExcite, 0.75);
      }
    };

    const performTackle = (pl: PlayerEntity) => {
      if (pl.tackleCooldown > 0 || pl.action === 'tackle' || pl.ejected) return;
      const len = Math.hypot(pl.dirX, pl.dirY) || 1;
      pl.dirX /= len;
      pl.dirY /= len;
      pl.action = 'tackle';
      pl.actionTimer = 0.3;
      pl.tackleCooldown = 0.62;
      pl.vx = pl.dirX * 238;
      pl.vy = pl.dirY * 238;
      g.skidMarks.push({
        x1: pl.x,
        y1: pl.y,
        x2: pl.x + pl.dirX * 30,
        y2: pl.y + pl.dirY * 30,
        life: 6.5,
        maxLife: 6.5
      });
      if (g.skidMarks.length > 24) g.skidMarks.shift();
      AudioFX.playTackle();
      spawnDust(pl.x, pl.y, 7, weather === 'rain' ? '#94a3b8' : '#3f6212');
    };

    const switchClosest = (side: 'home' | 'away') => {
      if (side === 'home' && lockedIdx !== undefined) return;
      const current = side === 'home' ? g.activeHome : g.activeAway;
      const cands = g.players.filter((p) => !p.ejected && p.side === side && p.slot !== 'GOL');
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

    const setupSetPiece = (kind: 'free_kick' | 'penalty', side: 'home' | 'away', x: number, y: number) => {
      const attackDir = side === 'home' ? 1 : -1;
      const defSide = side === 'home' ? 'away' : 'home';
      const taker =
        g.players.find((p) => !p.ejected && p.side === side && p.slot === 'MEI1') ||
        g.players.find((p) => !p.ejected && p.side === side && p.slot !== 'GOL') ||
        g.players.find((p) => !p.ejected && p.side === side)!;
      const defGK = g.players.find((p) => !p.ejected && p.side === defSide && p.slot === 'GOL') || null;

      g.ball.owner = null;
      g.ball.vx = 0;
      g.ball.vy = 0;
      g.ball.vz = 0;
      g.ball.z = 0;
      g.ball.curve = 0;

      if (kind === 'penalty') {
        const spotX = (PITCH.halfW - 82) * attackDir;
        g.ball.x = spotX;
        g.ball.y = 0;
        taker.x = spotX - attackDir * 24;
        taker.y = 0;
        taker.dirX = attackDir;
        taker.dirY = 0;
        if (defGK) {
          defGK.x = (PITCH.halfW - 10) * attackDir;
          defGK.y = 0;
          defGK.dirX = -attackDir;
        }
        // Move all other players outside penalty arc
        let idx = 0;
        g.players.forEach((pl) => {
          if (pl.ejected || pl === taker || pl === defGK) return;
          pl.x = spotX - attackDir * (95 + (idx % 3) * 24);
          pl.y = -110 + idx * 32;
          pl.dirX = attackDir;
          pl.action = 'idle';
          idx++;
        });
        g.bannerText = 'PÊNALTI!';
        g.bannerSub = `${side === 'home' ? config.homeTeam.name : config.awayTeam.name} na marca da cal`;
      } else {
        g.ball.x = x;
        g.ball.y = y;
        taker.x = x - attackDir * 14;
        taker.y = y;
        taker.dirX = attackDir;
        taker.dirY = 0;
        // Position 2-3 man defensive wall ~92px in front of the ball toward goal
        const goalX = PITCH.halfW * attackDir;
        const gx = goalX - x;
        const gy = 0 - y;
        const gDist = Math.hypot(gx, gy) || 1;
        const wx = x + (gx / gDist) * Math.min(92, gDist * 0.45);
        const wy = y + (gy / gDist) * Math.min(92, gDist * 0.45);
        const wallPlayers = g.players.filter((p) => !p.ejected && p.side === defSide && p.slot !== 'GOL').slice(0, 3);
        wallPlayers.forEach((wp, wi) => {
          wp.x = wx;
          wp.y = wy + (wi - 1) * 16;
          wp.dirX = -attackDir;
          wp.action = 'idle';
        });
        g.bannerText = 'COBRANÇA DE FALTA';
        g.bannerSub = `${side === 'home' ? config.homeTeam.abbr : config.awayTeam.abbr} · W/S Mira · A/D Curva · K Chuta`;
      }

      g.bannerTimer = 1.65;
      g.setPiece = {
        kind,
        side,
        taker,
        gk: defGK,
        aimY: 0,
        curve: 0,
        gkChoice: 0,
        aiTimer: 1.15
      };
      if (side === 'home') g.activeHome = taker;
      g.p1Charging = false;
      g.p1Power = 0;
      g.state = 'SET_PIECE';
      AudioFX.playWhistle('foul');
      announce(
        kind === 'penalty'
          ? `PÊNALTI MARCADO para o ${side === 'home' ? config.homeTeam.name : config.awayTeam.name}!`
          : `Falta marcada! Vai cobrar o ${side === 'home' ? config.homeTeam.name : config.awayTeam.name}.`,
        true
      );
    };

    const callFoul = (offender: PlayerEntity, victim: PlayerEntity, fromBehind: boolean) => {
      if (isTraining) return;
      const foulSide = offender.side === 'home' ? 'away' : 'home';
      const attackDir = foulSide === 'home' ? 1 : -1;
      const insideBox =
        victim.x * attackDir > PITCH.halfW - PITCH.boxW && Math.abs(victim.y) < PITCH.boxHalfH;

      // Card decision
      let cardType: 'yellow' | 'red' | null = null;
      if (fromBehind && insideBox) {
        cardType = 'red';
      } else if (fromBehind || Math.random() < 0.7) {
        offender.yellowCards++;
        if (offender.yellowCards >= 2) {
          cardType = 'red';
        } else {
          cardType = 'yellow';
        }
      }

      if (cardType === 'red') {
        offender.ejected = true;
        offender.stunTimer = 999;
        g.cardBanner = { color: 'red', playerName: offender.data.name, abbr: offender.team.abbr, timer: 2.2 };
        announce(`CARTÃO VERMELHO! ${offender.data.name} está expulso de campo!`, true);
      } else if (cardType === 'yellow') {
        g.cardBanner = { color: 'yellow', playerName: offender.data.name, abbr: offender.team.abbr, timer: 2.0 };
        announce(`Falta dura! Cartão amarelo para ${offender.data.name}.`, true);
      }

      // Move referee near foul spot
      g.ref.x = Math.max(-380, Math.min(380, victim.x - 16));
      g.ref.y = Math.max(-200, Math.min(200, victim.y - 26));

      if (insideBox) {
        setupSetPiece('penalty', foulSide, victim.x, victim.y);
      } else {
        const fx = Math.max(-PITCH.halfW + 30, Math.min(PITCH.halfW - 30, victim.x));
        const fy = Math.max(-PITCH.halfH + 20, Math.min(PITCH.halfH - 20, victim.y));
        setupSetPiece('free_kick', foulSide, fx, fy);
      }
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
      g.stateTimer = 1.6;
      g.lastGoalTeam = scoringSide;
      const team = scoringSide === 'home' ? config.homeTeam : config.awayTeam;
      if (scoringSide === 'home') {
        g.homeScore++;
        g.netRippleRight = 1.0;
        if (g.ball.lastTouchPlayer && g.ball.lastTouchPlayer.side === 'home') {
          if (lockedIdx === undefined || g.ball.lastTouchPlayer.slotIdx === lockedIdx) g.userGoals++;
          if (
            g.ball.prevTouchPlayer &&
            g.ball.prevTouchPlayer.side === 'home' &&
            g.ball.prevTouchPlayer !== g.ball.lastTouchPlayer
          ) {
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
          : g.players.find((p) => !p.ejected && p.side === scoringSide && p.slot === 'ATA') || null;
      g.lastScorer = scorer;
      const scorerTxt = scorer ? `${scorer.data.name}` : team.name;
      g.bannerText = 'GOOOOL!';
      g.bannerSub = `${team.name.toUpperCase()} · ${scorerTxt}`;
      g.bannerTimer = 1.6;
      g.crowdExcite = 1.0;
      g.photoFlash = 0.25;
      triggerShake(4.2, 0.35);
      spawnConfetti(g.ball.x, g.ball.y, team);
      AudioFX.playWhistle('goal');
      AudioFX.playGoalCelebration();
      announce(`GOOOOOOOL! É DO ${team.name.toUpperCase()}! ${scorerTxt} balança as redes!`, true);

      // Prepare ~3s slow-motion TV replay (96 frames @ 32fps = 3.0s)
      g.replayFrames = g.replayBuffer.slice(-96);
      skipReplayRef.current = false;
    };

    const quickSetPiece = (side: 'home' | 'away', x: number, y: number, label: string) => {
      const taker =
        g.players.find((p) => !p.ejected && p.side === side && (label === 'TIRO DE META' ? p.slot === 'GOL' : p.slot === 'MEI1')) ||
        g.players.find((p) => !p.ejected && p.side === side && p.slot !== 'GOL') ||
        g.players.find((p) => !p.ejected && p.side === side);
      g.ball.owner = taker || null;
      g.ball.x = x;
      g.ball.y = y;
      g.ball.z = 0;
      g.ball.vx = 0;
      g.ball.vy = 0;
      g.ball.vz = 0;
      g.ball.curve = 0;
      if (taker) {
        taker.x = x;
        taker.y = y;
        taker.dirX = side === 'home' ? 1 : -1;
        if (side === 'home' && taker.slot !== 'GOL' && lockedIdx === undefined) g.activeHome = taker;
        if (taker.slot === 'GOL') taker.aiPassCooldown = 0.35;
      }
      g.bannerText = label;
      g.bannerSub = side === 'home' ? config.homeTeam.abbr : config.awayTeam.abbr;
      g.bannerTimer = 0.9;
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
              triggerShake(3.0, 0.18);
              spawnDust(gx, postY, 6, '#e2e8f0');
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
          quickSetPiece(
            attacking,
            (onRight ? 1 : -1) * (PITCH.halfW - 14),
            (b.y >= 0 ? 1 : -1) * (PITCH.halfH - 14),
            'ESCANTEIO'
          );
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
        if (distToGoal < 210 && Math.abs(pl.y) < 132 && Math.random() < diff.shotFreq) {
          performShot(pl, 0.58 + Math.random() * 0.4, (Math.random() - 0.5) * 1.4);
          return { mx: 0, my: 0 };
        }
        const nearOpp = g.players
          .filter((o) => !o.ejected && o.side !== pl.side)
          .reduce((min, o) => Math.min(min, Math.hypot(o.x - pl.x, o.y - pl.y)), 999);
        if (nearOpp < 52 && pl.aiPassCooldown <= 0 && Math.random() < diff.passRate) {
          pl.aiPassCooldown = 0.6;
          performPass(pl, dir, (Math.random() - 0.5) * 0.9, Math.random() < 0.3 ? 'through' : 'short');
          return { mx: 0, my: 0 };
        }
        const tx = goalX - 75 * dir;
        const ty = Math.max(-85, Math.min(85, pl.y + Math.sin(g.elapsed * 2.4 + pl.homeY) * 38));
        return { mx: tx - pl.x, my: ty - pl.y, spd: pl.speed * (pl.side === 'away' ? diff.aiSpeedMult : 0.94) };
      }

      const tms = g.players.filter(
        (p) => !p.ejected && p.side === pl.side && p.slot !== 'GOL' && p !== g.activeHome && (!isTwoPlayer || p !== g.activeAway)
      );
      let closest: PlayerEntity | null = null;
      let bestD = Infinity;
      for (const tm of tms) {
        const d = Math.hypot(tm.x - b.x, tm.y - b.y);
        if (d < bestD) {
          bestD = d;
          closest = tm;
        }
      }

      const pressDistBoost = pl.side === 'home' && mentalityRef.current === 'pressao_alta' ? 145 : 105;
      const shouldPress =
        (pl.side === 'away' && !isTwoPlayer && pl === closest && bestD < diff.pressDist) ||
        (pl.side === 'home' && !b.owner && pl === closest && bestD < pressDistBoost);

      if (shouldPress) {
        if (
          pl.side === 'away' &&
          oppHas &&
          Math.hypot(pl.x - b.x, pl.y - b.y) < 34 &&
          pl.tackleCooldown <= 0 &&
          Math.random() < diff.tackleRate
        ) {
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
          diveDir: p.diveDir,
          ejected: p.ejected
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

      // Process pending substitution from Pause menu even before resuming
      if (pendingSubRef.current) {
        const { starterIdx, benchIdx } = pendingSubRef.current;
        pendingSubRef.current = null;
        const target = g.players.find((p) => p.side === 'home' && p.slotIdx === starterIdx);
        const currentBench = benchListRef.current;
        const incoming = currentBench[benchIdx];
        if (target && incoming && !target.ejected) {
          const oldSpec = target.data;
          target.data = incoming;
          target.stamina = 100;
          target.yellowCards = 0;
          target.speed =
            (incoming.role === 'ATA' ? 148 : incoming.role === 'MEI' ? 142 : incoming.role === 'ZAG' ? 136 : 124) +
            (incoming.ovr - 78) * 1.1;
          const nextBench = currentBench.map((b, i) => (i === benchIdx ? oldSpec : b));
          benchListRef.current = nextBench;
          setBenchList(nextBench);
          setSubsUsed((c) => c + 1);
          announce(`Substituição no ${config.homeTeam.name}: entra ${incoming.name}, sai ${oldSpec.name}.`, true);
        }
      }

      if (pausedRef.current || g.state === 'ENDED') return;

      // Sync formation & mentality live
      applyFormationAndMentality();

      if (g.shakeTime > 0) g.shakeTime = Math.max(0, g.shakeTime - dt);
      if (g.bannerTimer > 0) g.bannerTimer = Math.max(0, g.bannerTimer - dt);
      if (g.netRippleLeft > 0) g.netRippleLeft = Math.max(0, g.netRippleLeft - dt * 2.2);
      if (g.netRippleRight > 0) g.netRippleRight = Math.max(0, g.netRippleRight - dt * 2.2);
      if (g.crowdExcite > 0) g.crowdExcite = Math.max(0, g.crowdExcite - dt * 0.55);
      if (g.photoFlash > 0) g.photoFlash = Math.max(0, g.photoFlash - dt);
      if (g.cardBanner) {
        g.cardBanner.timer -= dt;
        if (g.cardBanner.timer <= 0) g.cardBanner = null;
      }

      for (let i = g.skidMarks.length - 1; i >= 0; i--) {
        g.skidMarks[i].life -= dt;
        if (g.skidMarks[i].life <= 0) g.skidMarks.splice(i, 1);
      }

      if (weather === 'rain') {
        g.rainDrops.forEach((rd) => {
          rd.x -= rd.speed * 0.25 * dt;
          rd.y += rd.speed * dt;
          if (rd.y > 270) {
            rd.y = -10;
            rd.x = Math.random() * 520;
          }
          if (rd.x < -10) rd.x += 500;
        });
      }

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

      // PRE_MATCH TV LINEUPS INTRO
      if (g.state === 'PRE_MATCH') {
        g.preMatchTimer -= dt;
        if (skipPreMatchRef.current || g.preMatchTimer <= 0) {
          skipPreMatchRef.current = false;
          setIsPreMatch(false);
          g.state = 'PLAYING';
          g.bannerText = 'BOLA ROLANDO!';
          g.bannerSub = `${config.homeTeam.abbr} vs ${config.awayTeam.abbr} · ${diff.label}`;
          g.bannerTimer = 1.5;
          AudioFX.playWhistle('kickoff');
          announce(`Apita o árbitro! Começa ${config.homeTeam.name} e ${config.awayTeam.name}!`, true);
        }
        return;
      }

      // SET PIECE (Free Kick & Penalty Kick)
      if (g.state === 'SET_PIECE') {
        const sp = g.setPiece;
        const taker = sp.taker;
        const atkDir = sp.side === 'home' ? 1 : -1;
        g.camX += (Math.max(-225, Math.min(225, g.ball.x + atkDir * 65)) - g.camX) * Math.min(1, dt * 5);
        g.camY += (Math.max(-95, Math.min(95, g.ball.y * 0.55)) - g.camY) * Math.min(1, dt * 5);

        if (sp.side === 'home' && taker) {
          const mv = getP1Move();
          sp.aimY = Math.max(-1, Math.min(1, sp.aimY + mv.iy * dt * 1.4));
          if (sp.kind === 'free_kick') {
            sp.curve = Math.max(-1, Math.min(1, sp.curve + mv.ix * dt * 1.5));
          }
          const shootHeld = keysHeld.has('KeyK') || keysHeld.has('KeyZ');
          const shootJust = keysJust.has('KeyK') || keysJust.has('KeyZ');
          const passJust = keysJust.has('KeyJ');

          if (passJust && sp.kind === 'free_kick') {
            g.state = 'PLAYING';
            performPass(taker, atkDir, sp.aimY, 'short');
            return;
          }
          if (shootJust || (shootHeld && !g.p1Charging)) {
            g.p1Charging = true;
            g.p1Power = 0.22;
          }
          if (g.p1Charging && shootHeld) g.p1Power = Math.min(1, g.p1Power + dt * 1.5);
          if (g.p1Charging && (!shootHeld || p1ShootReleased)) {
            const pwr = g.p1Power;
            g.p1Charging = false;
            g.p1Power = 0;
            g.state = 'PLAYING';
            // If penalty, CPU goalkeeper guesses a dive corner
            if (sp.kind === 'penalty' && sp.gk) {
              const diveSign = Math.random() < 0.42 ? -1 : Math.random() < 0.72 ? 1 : 0;
              if (diveSign !== 0) {
                sp.gk.action = 'dive';
                sp.gk.actionTimer = 0.42;
                sp.gk.diveDir = diveSign;
              }
            }
            performShot(taker, pwr, sp.aimY, false, sp.kind === 'free_kick' ? sp.curve * 165 : 0);
            return;
          }
        } else if (taker) {
          // User controls GK dive during CPU penalty!
          if (sp.kind === 'penalty') {
            const mv = getP1Move();
            if (mv.iy < 0) sp.gkChoice = -1;
            else if (mv.iy > 0) sp.gkChoice = 1;
          }
          sp.aiTimer -= dt;
          if (sp.aiTimer <= 0) {
            g.state = 'PLAYING';
            if (sp.kind === 'penalty' && sp.gk && sp.gkChoice !== 0) {
              sp.gk.action = 'dive';
              sp.gk.actionTimer = 0.44;
              sp.gk.diveDir = sp.gkChoice;
            }
            const corner = (Math.random() < 0.5 ? -1 : 1) * (0.72 + Math.random() * 0.22);
            performShot(taker, 0.72 + Math.random() * 0.22, corner, false, sp.kind === 'free_kick' ? (Math.random() - 0.5) * 140 : 0);
          }
        }
        return;
      }

      // GOAL CELEBRATION -> teammates run to scorer!
      if (g.state === 'GOAL_CELEBRATION') {
        g.stateTimer -= dt;
        const scorer = g.lastScorer;
        g.players.forEach((pl) => {
          if (pl.ejected) return;
          if (pl.side === g.lastGoalTeam) {
            pl.action = 'celebrate';
            if (scorer && pl !== scorer) {
              const dx = scorer.x - pl.x;
              const dy = scorer.y - pl.y;
              const d = Math.hypot(dx, dy) || 1;
              if (d > 20) {
                pl.x += (dx / d) * 75 * dt;
                pl.y += (dy / d) * 75 * dt;
                pl.dirX = dx >= 0 ? 1 : -1;
              }
            } else {
              pl.x += pl.dirX * 36 * dt;
            }
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
            announce('Veja o replay em câmera lenta!');
          } else {
            resetPositions(g.lastGoalTeam === 'home' ? 'away' : 'home');
            g.state = 'PLAYING';
            AudioFX.playWhistle('kickoff');
          }
        }
        return;
      }

      // 3-SECOND SLOW-MOTION TV REPLAY
      if (g.state === 'REPLAY') {
        g.replayAcc += dt * 32; // 96 frames / 32 = 3.0s
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

      // P1 Expanded FIFA Controls:
      // WASD/Arrows move | Shift switch (defending) / Sprint (held) | J short pass | H through pass | L high cross | K shot/tackle | Space shield/body feint
      const p1Move = getP1Move();
      const homeHasBall = g.ball.owner && g.ball.owner.side === 'home';
      const p1ShiftJust = keysJust.has('ShiftLeft') || keysJust.has('ShiftRight');
      const p1SprintHeld = keysHeld.has('ShiftLeft') || keysHeld.has('ShiftRight');
      const p1ShortPass = keysJust.has('KeyJ') || keysJust.has('KeyX');
      const p1ThroughPass = keysJust.has('KeyH');
      const p1CrossPass = keysJust.has('KeyL');
      const p1ShootHeld = keysHeld.has('KeyK') || keysHeld.has('KeyZ');
      const p1ShootJust = keysJust.has('KeyK') || keysJust.has('KeyZ');
      const p1SpaceJust = keysJust.has('Space');
      const p1SpaceHeld = keysHeld.has('Space');

      if (homeHasBall && lockedIdx === undefined) g.activeHome = g.ball.owner;
      const p1 = g.activeHome;

      if (p1ShiftJust && !homeHasBall) {
        switchClosest('home');
      }

      if (p1 && g.ball.owner === p1) {
        if (p1SpaceJust && p1.feintCooldown <= 0) {
          // Body feint cut / burst
          const fdirY = p1Move.iy !== 0 ? p1Move.iy : p1.y > 0 ? -1 : 1;
          p1.y = Math.max(-PITCH.halfH + 12, Math.min(PITCH.halfH - 12, p1.y + fdirY * 14));
          p1.x = Math.max(-PITCH.halfW + 12, Math.min(PITCH.halfW - 12, p1.x + p1.dirX * 10));
          p1.feintCooldown = 0.7;
          p1.stamina = Math.max(15, p1.stamina - 6);
          spawnDust(p1.x, p1.y, 4, '#f8fafc');
        }
        if (p1SpaceHeld) {
          p1.shieldTimer = 0.14;
        }

        if (p1ShortPass || p1ThroughPass || p1CrossPass) {
          g.p1Charging = false;
          g.p1Power = 0;
          const kind = p1CrossPass ? 'cross' : p1ThroughPass ? 'through' : 'short';
          performPass(p1, p1Move.ix, p1Move.iy, kind);
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
        if (p1ShortPass && !p1ShiftJust) switchClosest('home');
        if (p1ShootJust && p1 && p1.slot !== 'GOL' && !p1.ejected) {
          if (!g.ball.owner && g.ball.z > 9 && Math.hypot(p1.x - g.ball.x, p1.y - g.ball.y) < 30) {
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
            performPass(p2, p2Move.ix, p2Move.iy, 'short');
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
          if (p2ShootJust && p2 && p2.slot !== 'GOL' && !p2.ejected) {
            if (!g.ball.owner && g.ball.z > 9 && Math.hypot(p2.x - g.ball.x, p2.y - g.ball.y) < 30) {
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
      let foulTriggered = false;
      g.players.forEach((pl) => {
        if (pl.ejected || foulTriggered) return;
        if (pl.tackleCooldown > 0) pl.tackleCooldown -= dt;
        if (pl.stunTimer > 0) pl.stunTimer -= dt;
        if (pl.aiPassCooldown > 0) pl.aiPassCooldown -= dt;
        if (pl.shieldTimer > 0) pl.shieldTimer -= dt;
        if (pl.feintCooldown > 0) pl.feintCooldown -= dt;

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
            const victim = g.ball.owner;
            if (Math.hypot(pl.x - victim.x, pl.y - victim.y) < 20) {
              // Detect foul from behind or reckless hit
              const dotDir = pl.dirX * victim.dirX + pl.dirY * victim.dirY;
              const fromBehind = dotDir > 0.35 && (pl.x - victim.x) * victim.dirX < -4;
              const distToBall = Math.hypot(pl.x - g.ball.x, pl.y - g.ball.y);
              if (fromBehind || (distToBall > 14 && Math.random() < 0.42)) {
                callFoul(pl, victim, fromBehind);
                foulTriggered = true;
                return;
              }
              victim.stunTimer = 0.45;
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
              triggerShake(2.0, 0.14);
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
        let sprinting = false;

        if (pl === g.activeHome && pl.slot !== 'GOL') {
          const m = getP1Move();
          mx = m.ix;
          my = m.iy;
          if (g.ball.owner === pl) spd *= 0.96;
          if (p1SprintHeld && pl.stamina > 12 && (mx !== 0 || my !== 0)) {
            spd *= 1.28;
            sprinting = true;
          }
          if (pl.shieldTimer > 0) spd *= 0.7;
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
            performPass(pl, pl.side === 'home' ? 1 : -1, (Math.random() - 0.5) * 0.8, 'short');
          } else if (!g.ball.owner) {
            const headingToGoal = pl.side === 'home' ? g.ball.vx < -175 : g.ball.vx > 175;
            if (
              headingToGoal &&
              Math.abs(g.ball.x - pl.x) < 98 &&
              Math.abs(g.ball.y - pl.y) > 11 &&
              Math.abs(g.ball.y) < PITCH.goalHalfW + 16
            ) {
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
          const drain = sprinting ? 18 : 3.2;
          pl.stamina = Math.max(12, pl.stamina - dt * drain);
          const stamFactor = 0.82 + (pl.stamina / 100) * 0.2;
          pl.vx = nx * spd * stamFactor;
          pl.vy = ny * spd * stamFactor;
          pl.dirX = nx;
          pl.dirY = ny;
          pl.x += pl.vx * dt;
          pl.y += pl.vy * dt;
          if (pl.action !== 'kick' && pl.action !== 'volley') pl.action = 'run';
          pl.animTime += dt * (sprinting ? 14 : 10);
          pl.frame = Math.floor(pl.animTime) % 4;
        } else {
          pl.stamina = Math.min(100, pl.stamina + dt * 10);
          pl.vx = 0;
          pl.vy = 0;
          if (pl.action === 'run') pl.action = 'idle';
          pl.frame = 0;
        }

        pl.x = Math.max(-PITCH.halfW - 14, Math.min(PITCH.halfW + 14, pl.x));
        pl.y = Math.max(-PITCH.halfH - 10, Math.min(PITCH.halfH + 10, pl.y));
      });

      if (foulTriggered) return;

      // Soft separation
      for (let i = 0; i < g.players.length; i++) {
        const a = g.players[i];
        if (a.ejected) continue;
        for (let j = i + 1; j < g.players.length; j++) {
          const b = g.players[j];
          if (b.ejected) continue;
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
        b.curve = 0;
        b.spin += Math.hypot(ow.vx, ow.vy) * dt * 0.08;

        g.players.forEach((other) => {
          if (other.ejected) return;
          if (other.side !== ow.side && other.stunTimer <= 0 && b.pickupCooldown <= 0) {
            const d = Math.hypot(other.x - b.x, other.y - b.y);
            const shieldPenalty = ow.shieldTimer > 0 ? -4 : 0;
            const stealR =
              (other.slot === 'GOL' ? 16 : other.side === 'away' ? 10 + diff.punishFactor * 3 : 11) + shieldPenalty;
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
        // Apply Magnus curve force during flight
        if (Math.abs(b.curve) > 1) {
          b.vy += b.curve * dt;
          b.curve *= Math.pow(0.55, dt);
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.z += b.vz * dt;
        b.vz -= 360 * dt;
        if (b.z <= 0) {
          b.z = 0;
          if (Math.abs(b.vz) > 22) {
            b.vz = -b.vz * 0.52;
            b.vx *= weather === 'rain' ? 0.94 : 0.88;
            b.vy *= weather === 'rain' ? 0.94 : 0.88;
            if (weather === 'rain') spawnDust(b.x, b.y, 3, '#cbd5e1');
          } else {
            b.vz = 0;
            const turfFriction = weather === 'rain' ? 0.36 : 0.26;
            b.vx *= Math.pow(turfFriction, dt);
            b.vy *= Math.pow(turfFriction, dt);
          }
        } else {
          b.vx *= Math.pow(0.75, dt);
          b.vy *= Math.pow(0.75, dt);
        }

        const speed = Math.hypot(b.vx, b.vy);
        b.spin += speed * dt * 0.085;

        if (b.pickupCooldown <= 0 && b.z < 24) {
          for (let i = 0; i < g.players.length; i++) {
            const pl = g.players[i];
            if (pl.ejected || pl.stunTimer > 0) continue;
            const r = pl.slot === 'GOL' ? (pl.action === 'dive' ? 21 : 15) : 13;
            if (Math.hypot(pl.x - b.x, pl.y - b.y) < r) {
              // Offside whistle check when flagged attacker touches pass
              if (pl.offsideFlagged && b.lastTouchTeam === pl.side) {
                pl.offsideFlagged = false;
                g.players.forEach((x) => (x.offsideFlagged = false));
                const oppSide = pl.side === 'home' ? 'away' : 'home';
                g.bannerText = 'IMPEDIMENTO!';
                g.bannerSub = `${pl.data.name} estava adiantado`;
                g.bannerTimer = 1.3;
                announce(`Impedimento marcado! ${pl.data.name} estava em posição irregular.`, true);
                setupSetPiece('free_kick', oppSide, Math.max(-440, Math.min(440, pl.x)), pl.y);
                return;
              }
              g.players.forEach((x) => (x.offsideFlagged = false));

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
      const nowSec = performance.now() * 0.001;

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

      const drawProjectedLine = (
        x1: number,
        y1: number,
        z1: number,
        x2: number,
        y2: number,
        z2: number,
        color: string,
        w = 1
      ) => {
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
        ctx.translate(
          Math.round((Math.random() - 0.5) * 2 * g.shakeMag),
          Math.round((Math.random() - 0.5) * 2 * g.shakeMag)
        );
      }

      // Weather-adjusted outer stadium concrete & turf tones
      const bgTone = weather === 'night' ? '#0f291e' : weather === 'rain' ? '#1f4e3c' : '#2c6850';
      const turfA = weather === 'night' ? '#2e6f56' : weather === 'rain' ? '#36755d' : '#3f8a6d';
      const turfB = weather === 'night' ? '#367f63' : weather === 'rain' ? '#3e8469' : '#4a9b7b';

      ctx.fillStyle = bgTone;
      ctx.fillRect(0, 0, 480, 270);

      // Slanted vertical mown grass stripes
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
          i % 2 === 0 ? turfA : turfB
        );
      }

      // === STADIUM STANDS (TOP CROWD), LED BOARDS, TEAM BENCHES & PHOTOGRAPHERS ===
      // Top concrete walkway & stands
      drawProjectedPoly(
        [
          [-PITCH.halfW - 80, -PITCH.halfH - 125],
          [PITCH.halfW + 80, -PITCH.halfH - 125],
          [PITCH.halfW + 80, -PITCH.halfH - 42],
          [-PITCH.halfW - 80, -PITCH.halfH - 42]
        ],
        weather === 'night' ? '#111827' : '#1e293b'
      );

      // Animated pixel spectators in top stands wearing Home & Away colors
      for (let sx = -470; sx <= 470; sx += 18) {
        for (let row = 0; row < 2; row++) {
          const sy = -PITCH.halfH - 64 - row * 22;
          const jump =
            Math.sin(nowSec * (4 + g.crowdExcite * 9) + sx * 0.13 + row) * (1 + g.crowdExcite * 3.5);
          const sp = worldToScreen(sx, sy, Math.max(0, jump), camOverride);
          if (sp.x < -10 || sp.x > 490) continue;
          const isHomeFan = sx < 0 || (sx % 36 === 0);
          const shirtCol = isHomeFan ? config.homeTeam.kit.c1 : config.awayTeam.kit.c1;
          ctx.fillStyle = '#0b0f17';
          ctx.fillRect(Math.round(sp.x) - 3, Math.round(sp.y) - 6, 6, 7);
          ctx.fillStyle = shirtCol;
          ctx.fillRect(Math.round(sp.x) - 2, Math.round(sp.y) - 3, 4, 3);
          ctx.fillStyle = '#e2b289';
          ctx.fillRect(Math.round(sp.x) - 1, Math.round(sp.y) - 5, 2, 2);
        }
      }

      // Animated LED Advertising Boards along top touchline
      for (let bx = -460; bx < 460; bx += 115) {
        const idx = Math.floor((bx + 460) / 115);
        const adCol = idx % 2 === 0 ? '#0f172a' : '#1e1b4b';
        drawProjectedPoly(
          [
            [bx, -PITCH.halfH - 28],
            [bx + 110, -PITCH.halfH - 28],
            [bx + 110, -PITCH.halfH - 18],
            [bx, -PITCH.halfH - 18]
          ],
          adCol,
          '#334155',
          1
        );
        const pMid = worldToScreen(bx + 55, -PITCH.halfH - 22, 6, camOverride);
        if (pMid.x > -40 && pMid.x < 520) {
          ctx.font = 'bold 4px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = idx % 2 === 0 ? '#facc15' : '#38bdf8';
          const adStr = LED_ADS[idx % LED_ADS.length];
          const scrollShift = Math.floor(nowSec * 12) % adStr.length;
          ctx.fillText(adStr.slice(scrollShift, scrollShift + 18), Math.round(pMid.x), Math.round(pMid.y));
          ctx.textAlign = 'left';
        }
      }

      // Team Benches (Dugouts) with substitutes and coaching staff on top touchline
      [
        { x0: -250, x1: -115, team: config.homeTeam, useAway: config.homeUseAway },
        { x0: 115, x1: 250, team: config.awayTeam, useAway: config.awayUseAway }
      ].forEach((dug) => {
        drawProjectedPoly(
          [
            [dug.x0, -PITCH.halfH - 42],
            [dug.x1, -PITCH.halfH - 42],
            [dug.x1, -PITCH.halfH - 29],
            [dug.x0, -PITCH.halfH - 29]
          ],
          'rgba(15, 23, 42, 0.85)',
          '#94a3b8',
          1
        );
        // Substitutes & coach icons
        for (let si = 0; si < 4; si++) {
          const dp = worldToScreen(dug.x0 + 20 + si * 28, -PITCH.halfH - 35, 0, camOverride);
          if (dp.x > -10 && dp.x < 490) {
            ctx.fillStyle = '#0b0f17';
            ctx.fillRect(Math.round(dp.x) - 2, Math.round(dp.y) - 6, 4, 6);
            ctx.fillStyle = si === 0 ? '#334155' : dug.useAway ? dug.team.kit.awayC1 : dug.team.kit.c1;
            ctx.fillRect(Math.round(dp.x) - 1, Math.round(dp.y) - 4, 3, 3);
            ctx.fillStyle = '#e2b289';
            ctx.fillRect(Math.round(dp.x) - 1, Math.round(dp.y) - 6, 2, 2);
          }
        }
      });

      // Photographers behind left & right goal lines
      [-1, 1].forEach((sideSign) => {
        [-115, -80, 80, 115].forEach((py) => {
          const pp = worldToScreen((PITCH.halfW + 38) * sideSign, py, 0, camOverride);
          if (pp.x > -10 && pp.x < 490 && pp.y > 0 && pp.y < 270) {
            ctx.fillStyle = '#0b0f17';
            ctx.fillRect(Math.round(pp.x) - 2, Math.round(pp.y) - 5, 5, 5);
            ctx.fillStyle = '#ea580c'; // photographer bib
            ctx.fillRect(Math.round(pp.x) - 1, Math.round(pp.y) - 3, 3, 3);
            ctx.fillStyle = '#1e293b'; // camera lens
            ctx.fillRect(Math.round(pp.x) - (sideSign > 0 ? 3 : -1), Math.round(pp.y) - 4, 2, 2);
            if (g.photoFlash > 0 && Math.random() < 0.25) {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
              ctx.fillRect(Math.round(pp.x) - 2, Math.round(pp.y) - 6, 4, 4);
            }
          }
        });
      });

      // Turf wear / slide tackle skid marks
      g.skidMarks.forEach((sk) => {
        const alpha = Math.max(0.1, (sk.life / sk.maxLife) * 0.48);
        drawProjectedLine(sk.x1, sk.y1, 0, sk.x2, sk.y2, 0, `rgba(22, 48, 32, ${alpha})`, 2.2);
      });

      // Crisp pitch markings
      const lineCol = weather === 'night' ? '#ecfdf5' : '#e3f9ee';
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

      // Penalty boxes, 6-yard boxes, pixel D-arcs, and penalty spots
      [-1, 1].forEach((side) => {
        const gx = PITCH.halfW * side;
        const bx = (PITCH.halfW - PITCH.boxW) * side;
        const sx = (PITCH.halfW - PITCH.sixW) * side;
        drawProjectedPoly(
          [
            [gx, -PITCH.boxHalfH],
            [bx, -PITCH.boxHalfH],
            [bx, PITCH.boxHalfH],
            [gx, PITCH.boxHalfH]
          ],
          null,
          lineCol,
          1.5
        );
        drawProjectedPoly(
          [
            [gx, -PITCH.sixHalfH],
            [sx, -PITCH.sixHalfH],
            [sx, PITCH.sixHalfH],
            [gx, PITCH.sixHalfH]
          ],
          null,
          lineCol,
          1.3
        );

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

      // Set Piece Aiming & Curve Guide
      if (g.state === 'SET_PIECE' && g.setPiece.side === 'home') {
        const atkDir = 1;
        const aimWorldY = g.setPiece.aimY * (PITCH.goalHalfW - 6);
        const midX = (g.ball.x + PITCH.halfW * atkDir) * 0.5;
        const midY = (g.ball.y + aimWorldY) * 0.5 + g.setPiece.curve * 45;
        drawProjectedLine(g.ball.x, g.ball.y, 4, midX, midY, 10, '#facc15', 1.4);
        drawProjectedLine(midX, midY, 10, PITCH.halfW * atkDir, aimWorldY, 6, '#facc15', 1.4);
      }

      const drawGoal = (sideSign: number, ripple: number) => {
        const gx = PITCH.halfW * sideSign;
        const backX = (PITCH.halfW + PITCH.goalDepth) * sideSign + Math.sin(ripple * 18) * ripple * 4.5 * sideSign;
        const topY = -PITCH.goalHalfW;
        const botY = PITCH.goalHalfW;
        const gh = PITCH.goalHeight;
        drawProjectedPoly(
          [
            [gx, topY],
            [backX, topY],
            [backX, botY],
            [gx, botY]
          ],
          'rgba(10, 32, 24, 0.25)'
        );
        const netC = 'rgba(225, 248, 238, 0.58)';
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
        // Realistic elliptical shadow scaling with ball height (z)
        const sh = worldToScreen(activeBall.x, activeBall.y, 0, camOverride);
        const radX = Math.max(2.5, 4.4 - activeBall.z * 0.025);
        const radY = Math.max(1.2, 2.1 - activeBall.z * 0.01);
        const shadowAlpha = Math.max(0.18, 0.45 - activeBall.z * 0.0025);
        ctx.fillStyle = `rgba(6, 20, 12, ${shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(Math.round(sh.x), Math.round(sh.y) + 1, radX, radY, 0, 0, Math.PI * 2);
        ctx.fill();

        const pos = worldToScreen(activeBall.x, activeBall.y, activeBall.z, camOverride);
        const bx = Math.round(pos.x);
        const by = Math.round(pos.y) - 3;
        const r = Math.max(3, Math.round(3.6 * pos.scale));
        drawSoccerBallPixel(ctx, bx, by, r, activeBall.spin);
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
          drawPixelPlayerSprite(
            ctx,
            Math.round(rp.x),
            Math.round(rp.y),
            1.05 * rp.scale,
            REFEREE_SPEC,
            config.homeTeam,
            false,
            {
              dirX: snap ? snap.refDir : g.ref.dirX,
              frame: snap ? snap.refFrame : g.ref.frame,
              action: 'run',
              shadow: true,
              isReferee: true
            }
          );
        }
      });

      // Draw Players
      g.players.forEach((pl) => {
        const snapP = snap ? snap.players.find((sp) => sp.id === pl.id) : null;
        const isEjected = snapP ? snapP.ejected : pl.ejected;
        if (isEjected) return;

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

      // Weather Effects Overlay: Night floodlight vignette or Light Rain streaks
      if (weather === 'night') {
        const grad = ctx.createRadialGradient(240, 145, 75, 240, 145, 290);
        grad.addColorStop(0, 'rgba(255, 255, 230, 0.03)');
        grad.addColorStop(1, 'rgba(5, 12, 24, 0.42)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 480, 270);
      } else if (weather === 'rain') {
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.34)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        g.rainDrops.forEach((rd) => {
          ctx.moveTo(Math.round(rd.x), Math.round(rd.y));
          ctx.lineTo(Math.round(rd.x - 3), Math.round(rd.y + 9));
        });
        ctx.stroke();
      }

      // Yellow / Red Card Toast Banner
      if (g.cardBanner && g.state !== 'REPLAY') {
        ctx.fillStyle = 'rgba(9, 15, 24, 0.92)';
        ctx.fillRect(156, 46, 168, 26);
        ctx.strokeStyle = g.cardBanner.color === 'red' ? '#ef4444' : '#facc15';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(156, 46, 168, 26);
        ctx.fillStyle = g.cardBanner.color === 'red' ? '#ef4444' : '#facc15';
        ctx.fillRect(164, 52, 8, 13);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px monospace';
        ctx.fillText(
          `${g.cardBanner.color === 'red' ? 'EXPULSO' : 'AMARELO'}: ${g.cardBanner.playerName} (${g.cardBanner.abbr})`,
          178,
          61
        );
      }

      if (g.bannerTimer > 0 && g.state !== 'REPLAY' && g.state !== 'PRE_MATCH') {
        const bw = 246;
        const bh = 38;
        const bx = 240 - bw / 2;
        const by = 52;
        ctx.fillStyle = 'rgba(9, 15, 24, 0.9)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(g.bannerText, 240, by + 18);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 7px monospace';
        ctx.fillText(g.bannerSub, 240, by + 30);
        ctx.textAlign = 'left';
      }

      ctx.restore();

      // Tactical Radar Minimap
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
            if (sp ? sp.ejected : pl.ejected) return;
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

        let hint = '';
        if (g.state === 'SET_PIECE') {
          if (g.setPiece.side === 'home') {
            hint =
              g.setPiece.kind === 'penalty'
                ? 'PÊNALTI: W/S Escolher Canto · Segure K para Chutar!'
                : 'FALTA: W/S Mira · A/D Curva · Segure K Chuta · J Toca';
          } else if (g.setPiece.kind === 'penalty') {
            hint = 'DEFENDA O PÊNALTI: W (Cima) ou S (Baixo) para pular no canto!';
          }
        }

        setHudState({
          homeScore: g.homeScore,
          awayScore: g.awayScore,
          clockText: isTraining ? 'TREINO' : `${mm}:${ss}`,
          p1Name: p1 ? p1.data.name : '',
          p1Num: p1 ? p1.data.num : 10,
          p1Role: p1 ? p1.data.role : 'ATA',
          p1Power: Math.round(g.p1Power * 100),
          p1Stamina: Math.round(p1 ? p1.stamina : 100),
          p2Name: p2 ? p2.data.name : config.awayTeam.abbr,
          p2Num: p2 ? p2.data.num : 9,
          p2Role: p2 ? p2.data.role : 'ATA',
          p2Power: Math.round(g.p2Power * 100),
          p2Stamina: Math.round(p2 ? p2.stamina : 100),
          setPieceHint: hint
        });

        setSquadSnapshot(
          g.players
            .filter((p) => p.side === 'home')
            .map((p) => ({
              slotIdx: p.slotIdx,
              name: p.data.name,
              num: p.data.num,
              role: p.data.role,
              ovr: p.data.ovr,
              stamina: Math.round(p.stamina),
              yellowCards: p.yellowCards,
              ejected: p.ejected
            }))
        );
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
  }, [config, onFinish, weather]);

  const handleSubstitute = (benchIdx: number) => {
    if (selectedSubStarterIdx === null || subsUsed >= 5) return;
    pendingSubRef.current = { starterIdx: selectedSubStarterIdx, benchIdx };
    setSelectedSubStarterIdx(null);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#0f261c] overflow-hidden">
      <canvas
        ref={canvasRef}
        width={480}
        height={270}
        className="block w-full h-full max-w-[177.78vh] max-h-[56.25vw] shadow-2xl"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* FIFA / EA FC Broadcast HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-3 z-10">
        {/* Top Bar: Left TV Broadcast Scoreboard | Center Commentary | Right Controls & Replay */}
        <div className="flex items-start justify-between gap-2">
          {/* Top-Left FIFA-Style TV Scoreboard */}
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center bg-slate-950/92 border border-white/20 rounded-md overflow-hidden shadow-xl tabular-nums">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900">
                <canvas ref={homeCrestRef} width={16} height={16} className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                <canvas ref={homeJerseyRef} width={18} height={16} className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                <span className="font-mono text-xs sm:text-sm font-extrabold text-white">{config.homeTeam.abbr}</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-700 font-mono text-sm sm:text-base font-extrabold text-white">
                <span>{hudState.homeScore}</span>
                <span className="text-emerald-200">-</span>
                <span>{hudState.awayScore}</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900">
                <span className="font-mono text-xs sm:text-sm font-extrabold text-white">{config.awayTeam.abbr}</span>
                <canvas ref={awayJerseyRef} width={18} height={16} className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                <canvas ref={awayCrestRef} width={16} height={16} className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
              </div>

              <div className="px-2.5 py-1 bg-slate-950 border-l border-white/15 font-mono text-xs sm:text-sm font-extrabold text-yellow-400">
                {hudState.clockText}
              </div>
            </div>

            {/* Live Portuguese Commentary Ticker */}
            <div className="bg-slate-950/82 border border-white/15 rounded px-2.5 py-0.5 text-[11px] font-bold text-yellow-300 shadow max-w-sm truncate">
              {commentary}
            </div>

            {hudState.setPieceHint && (
              <div className="bg-yellow-400 text-slate-950 rounded px-2.5 py-0.5 text-[11px] font-extrabold shadow">
                {hudState.setPieceHint}
              </div>
            )}
          </div>

          {/* Top-Right TV Watermark & Controls */}
          <div className="flex flex-wrap items-center justify-end gap-1.5 pointer-events-auto">
            {isReplay ? (
              <div className="flex items-center gap-2 bg-red-700/95 border border-white/40 rounded px-2.5 py-1 text-xs font-extrabold text-white shadow">
                <span>BRASIL TV ● REPLAY</span>
              </div>
            ) : (
              <div className="hidden sm:block text-[10px] font-extrabold text-slate-200 bg-slate-950/80 border border-white/15 rounded px-2 py-1">
                {config.mode === 'training' ? 'Treino' : `${DIFFICULTIES[config.difficulty].label} · ${WEATHER_LABELS[weather]}`}
              </div>
            )}
            {isReplay && (
              <button
                type="button"
                onClick={() => {
                  skipReplayRef.current = true;
                }}
                className="min-h-[32px] px-2.5 rounded border border-yellow-300 bg-yellow-400 text-xs font-extrabold text-slate-950 cursor-pointer"
              >
                Pular Replay
              </button>
            )}
            <button
              type="button"
              onClick={() => setVoiceOn(Narrator.setVoiceEnabled(!Narrator.isVoiceEnabled()))}
              className="min-h-[32px] px-2.5 rounded border border-white/20 bg-slate-950/85 text-[11px] font-bold text-slate-100 hover:bg-slate-800 cursor-pointer"
            >
              {voiceOn ? 'Voz: ON' : 'Voz: OFF'}
            </button>
            <button
              type="button"
              onClick={() => setMuted(AudioFX.setMuted(!AudioFX.isMuted()))}
              className="min-h-[32px] px-2.5 rounded border border-white/20 bg-slate-950/85 text-[11px] font-bold text-slate-100 hover:bg-slate-800 cursor-pointer"
            >
              {muted ? 'Som: OFF' : 'Som: ON'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPauseTab('menu');
                setPaused((p) => !p);
              }}
              className="min-h-[32px] px-2.5 rounded border border-white/20 bg-slate-950/85 text-[11px] font-bold text-slate-100 hover:bg-slate-800 cursor-pointer"
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
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500"
                  style={{ width: `${hudState.p1Power}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-200 bg-slate-950/70 px-1 rounded">CHUTE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-24 h-3 bg-[#1e293b] border-2 border-slate-950 rounded-xs overflow-hidden">
                <div className="h-full bg-cyan-400" style={{ width: `${hudState.p1Stamina}%` }} />
              </div>
              <span className="text-[10px] font-bold text-cyan-300 bg-slate-950/70 px-1 rounded">FÔLEGO</span>
            </div>
            <div
              className="font-mono text-xs sm:text-sm font-extrabold text-white tracking-wide tabular-nums"
              style={{ textShadow: '2px 2px 0 #000' }}
            >
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
              <span className="text-[10px] font-bold text-slate-200 bg-slate-950/70 px-1 rounded">CHUTE</span>
              <div className="w-24 h-3 bg-[#473f3d] border-2 border-slate-950 rounded-xs overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500"
                  style={{ width: `${hudState.p2Power}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-cyan-300 bg-slate-950/70 px-1 rounded">FÔLEGO</span>
              <div className="w-24 h-3 bg-[#1e293b] border-2 border-slate-950 rounded-xs overflow-hidden">
                <div className="h-full bg-cyan-400" style={{ width: `${hudState.p2Stamina}%` }} />
              </div>
            </div>
            <div
              className="font-mono text-xs sm:text-sm font-extrabold text-white tracking-wide tabular-nums"
              style={{ textShadow: '2px 2px 0 #000' }}
            >
              {hudState.p2Num}. {hudState.p2Name.toUpperCase()} .{hudState.p2Role}
            </div>
          </div>
        </div>
      </div>

      {/* FIFA TV Pre-Match Lineup Presentation Overlay */}
      {isPreMatch && (
        <div className="absolute inset-0 bg-slate-950/72 z-20 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-950/95 border border-yellow-400/40 rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-yellow-400">
                Transmissão Oficial · Escalações Confirmadas
              </span>
              <span className="text-[11px] font-bold text-slate-300">{WEATHER_LABELS[weather]}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/90 border border-white/10 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
                  <ClubCrest team={config.homeTeam} className="w-6 h-6" />
                  <div>
                    <div className="text-sm font-extrabold text-white">{config.homeTeam.name}</div>
                    <div className="text-[10px] font-bold text-emerald-400">Esquema {formation}</div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  {config.homeTeam.players.map((pl) => (
                    <div key={pl.num + pl.name} className="flex justify-between text-slate-200">
                      <span>
                        <strong className="text-yellow-400 font-mono">#{pl.num}</strong> {pl.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{pl.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/90 border border-white/10 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
                  <ClubCrest team={config.awayTeam} className="w-6 h-6" />
                  <div>
                    <div className="text-sm font-extrabold text-white">{config.awayTeam.name}</div>
                    <div className="text-[10px] font-bold text-rose-400">Esquema 4-3-3</div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  {config.awayTeam.players.map((pl) => (
                    <div key={pl.num + pl.name} className="flex justify-between text-slate-200">
                      <span>
                        <strong className="text-yellow-400 font-mono">#{pl.num}</strong> {pl.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{pl.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Pressione Espaço ou K para iniciar agora</span>
              <button
                type="button"
                onClick={() => {
                  skipPreMatchRef.current = true;
                }}
                className="min-h-[36px] px-4 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-extrabold text-white cursor-pointer"
              >
                Iniciar Partida →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause & Gerenciamento de Elenco Modal */}
      {paused && (
        <div className="absolute inset-0 bg-black/75 z-30 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-950 border border-white/15 rounded-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <h2 className="text-xl font-extrabold text-yellow-400">
                {pauseTab === 'menu' ? 'Jogo Pausado' : `Gerenciamento de Elenco · ${config.homeTeam.abbr}`}
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPauseTab('menu')}
                  className={`min-h-[34px] px-3 rounded text-xs font-bold cursor-pointer ${
                    pauseTab === 'menu' ? 'bg-yellow-400 text-slate-950' : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  Resumo & Controles
                </button>
                <button
                  type="button"
                  onClick={() => setPauseTab('squad')}
                  className={`min-h-[34px] px-3 rounded text-xs font-bold cursor-pointer ${
                    pauseTab === 'squad' ? 'bg-yellow-400 text-slate-950' : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  Gerenciamento de Elenco
                </button>
              </div>
            </div>

            {pauseTab === 'menu' ? (
              <div className="space-y-4 text-left">
                <div className="bg-slate-900/80 border border-white/10 rounded-lg p-3.5 space-y-1.5 text-xs text-slate-300">
                  <div className="font-extrabold text-white uppercase mb-1">Comandos da Simulação</div>
                  <div>
                    <strong className="text-yellow-400">WASD / Setas:</strong> Movimentar jogador
                  </div>
                  <div>
                    <strong className="text-yellow-400">Shift:</strong> Trocar marcador (sem posse) / Sprint (segurar correndo)
                  </div>
                  <div>
                    <strong className="text-yellow-400">J:</strong> Passe rasteiro curto · <strong className="text-yellow-400">H:</strong> Passe em profundidade (enfiada)
                  </div>
                  <div>
                    <strong className="text-yellow-400">L:</strong> Cruzamento / Lançamento alto · <strong className="text-yellow-400">Espaço:</strong> Proteger bola / Corte de corpo
                  </div>
                  <div>
                    <strong className="text-yellow-400">K:</strong> Chute colocado/potente (segure) · Carrinho (sem posse) · Voleio (bola no ar)
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-900/70 border border-white/10 rounded-lg p-3 space-y-2">
                    <div className="text-[11px] font-extrabold uppercase text-slate-400">Esquema Tático</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['4-3-3', '4-4-2', '4-2-3-1', '3-5-2'] as FormationId[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFormation(f)}
                          className={`min-h-[34px] rounded border text-xs font-bold cursor-pointer ${
                            formation === f
                              ? 'bg-emerald-600 border-yellow-400 text-white'
                              : 'bg-slate-950 border-white/10 text-slate-300'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900/70 border border-white/10 rounded-lg p-3 space-y-2">
                    <div className="text-[11px] font-extrabold uppercase text-slate-400">Mentalidade</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          ['retranca', 'Retranca'],
                          ['equilibrado', 'Equilibrado'],
                          ['pressao_alta', 'Pressão Alta']
                        ] as const
                      ).map(([mId, lbl]) => (
                        <button
                          key={mId}
                          type="button"
                          onClick={() => setMentality(mId)}
                          className={`min-h-[34px] rounded border text-[11px] font-bold cursor-pointer ${
                            mentality === mId
                              ? 'bg-emerald-600 border-yellow-400 text-white'
                              : 'bg-slate-950 border-white/10 text-slate-300'
                          }`}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Substitutions */}
                <div className="bg-slate-900/70 border border-white/10 rounded-lg p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-slate-300">
                      Substituições ({subsUsed}/5 usadas)
                    </span>
                    <span className="text-[11px] text-yellow-400">
                      {selectedSubStarterIdx !== null
                        ? 'Agora clique em um reserva abaixo para entrar'
                        : 'Clique em um titular cansado para substituir'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase text-cyan-300">Em Campo</div>
                      {squadSnapshot.map((pl) => (
                        <button
                          key={pl.slotIdx}
                          type="button"
                          disabled={pl.ejected || subsUsed >= 5}
                          onClick={() => setSelectedSubStarterIdx(pl.slotIdx)}
                          className={`w-full px-2.5 py-1.5 rounded border flex items-center justify-between text-xs cursor-pointer disabled:opacity-45 ${
                            selectedSubStarterIdx === pl.slotIdx
                              ? 'bg-yellow-400/20 border-yellow-400 text-white'
                              : 'bg-slate-950 border-white/10 text-slate-200'
                          }`}
                        >
                          <span className="font-bold truncate">
                            #{pl.num} {pl.name} ({pl.role}) {pl.yellowCards > 0 ? '🟨' : ''} {pl.ejected ? '🟥' : ''}
                          </span>
                          <span
                            className={`font-mono text-[11px] font-bold ${
                              pl.stamina < 45 ? 'text-rose-400' : pl.stamina < 70 ? 'text-yellow-400' : 'text-emerald-400'
                            }`}
                          >
                            {pl.stamina}%
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold uppercase text-emerald-300">Banco de Reservas</div>
                      {benchList.map((b, bi) => (
                        <button
                          key={b.num + b.name + bi}
                          type="button"
                          disabled={selectedSubStarterIdx === null || subsUsed >= 5}
                          onClick={() => handleSubstitute(bi)}
                          className="w-full px-2.5 py-1.5 rounded border bg-slate-950 border-white/10 hover:border-emerald-400 disabled:opacity-40 flex items-center justify-between text-xs text-slate-200 cursor-pointer"
                        >
                          <span className="font-bold truncate">
                            #{b.num} {b.name} ({b.role})
                          </span>
                          <span className="font-mono text-[11px] text-yellow-400">OVR {b.ovr}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setPaused(false)}
                className="min-h-[40px] px-5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white cursor-pointer"
              >
                Continuar Partida
              </button>
              <button
                type="button"
                onClick={onExit}
                className="min-h-[40px] px-5 rounded bg-slate-800 hover:bg-slate-700 border border-white/15 text-sm font-bold text-white cursor-pointer"
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

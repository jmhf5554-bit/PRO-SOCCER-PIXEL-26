import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Narrator } from '../audio/narrator';
import { AudioFX } from '../audio/sound';
import { ClubCrest } from '../components/ClubPreview';
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
  drawHDPlayerSprite,
  drawMiniJerseyIcon,
  drawSoccerBallHD
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
    animTime: number;
    action: PlayerEntity['action'];
    diveDir: number;
    ejected: boolean;
  }[];
  refX: number;
  refY: number;
  refDir: number;
  refFrame: number;
  refAnimTime: number;
}

const CANVAS_W = 640;
const CANVAS_H = 360;

const PITCH = {
  halfW: 480,
  halfH: 250,
  goalHalfW: 54,
  goalHeight: 38,
  goalDepth: 30,
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
  'BRFC  ·  SÉRIE A  ·  TRANSMISSÃO OFICIAL',
  'TEMPORADA OFICIAL  ·  FAIR PLAY  ·  AO VIVO',
  'COPA DO BRASIL  ·  ESTÁDIO NACIONAL  ·  HD'
];

const WEATHER_LABELS: Record<WeatherId, string> = {
  sunny: 'Dia Ensolarado',
  night: 'Noite c/ Refletores',
  rain: 'Chuva Leve'
};

function createTurfPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const tile = document.createElement('canvas');
  tile.width = 64;
  tile.height = 64;
  const tctx = tile.getContext('2d');
  if (!tctx) return null;
  for (let i = 0; i < 320; i++) {
    const x = Math.floor(Math.random() * 64);
    const y = Math.floor(Math.random() * 64);
    tctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(5, 26, 15, 0.075)';
    tctx.fillRect(x, y, 1, 1);
  }
  return ctx.createPattern(tile, 'repeat');
}

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

  const [trainingMode, setTrainingMode] = useState<'free' | 'free_kicks' | 'penalties' | 'finishing_cross'>(
    config.trainingChallenge || 'free'
  );
  const [trainingHud, setTrainingHud] = useState({
    points: 0,
    streak: 0,
    attempts: 0,
    goals: 0,
    penHistory: [] as ('goal' | 'miss')[]
  });

  const pausedRef = useRef(false);
  const finishedRef = useRef(false);
  const skipReplayRef = useRef(false);
  const skipPreMatchRef = useRef(false);
  const trainingModeRef = useRef(trainingMode);
  const resetTrainingRef = useRef(false);
  const formationRef = useRef<FormationId>(formation);
  const mentalityRef = useRef<MentalityId>(mentality);
  const benchListRef = useRef<PlayerSpec[]>(initialBench);
  const pendingSubRef = useRef<{ starterIdx: number; benchIdx: number } | null>(null);

  useEffect(() => {
    trainingModeRef.current = trainingMode;
  }, [trainingMode]);

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

    const turfPattern = createTurfPattern(ctx);
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

      return isTraining && side === 'away' ? list.filter((_, i) => i === 0 || i === 1 || i === 2 || i === 3) : list;
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
        gkChoice: 0,
        aiTimer: 1.0
      },
      players: [
        ...buildTeam(config.homeTeam, 'home', config.homeUseAway),
        ...buildTeam(config.awayTeam, 'away', config.awayUseAway)
      ],
      particles: [] as Particle[],
      skidMarks: [] as SkidMark[],
      rainDrops: Array.from({ length: 120 }, () => ({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        speed: 480 + Math.random() * 220
      })),
      activeHome: null as PlayerEntity | null,
      activeAway: null as PlayerEntity | null,
      p1Charging: false,
      p1Power: 0,
      p2Charging: false,
      p2Power: 0,
      training: {
        points: 0,
        streak: 0,
        attempts: 0,
        goals: 0,
        penHistory: [] as ('goal' | 'miss')[],
        waitingReset: false,
        resetTimer: 0,
        crossTimer: 0,
        crossPending: false,
        flankSign: 1,
        shotLive: false,
        shotIdleTimer: 0,
        targetHits: [false, false] as [boolean, boolean],
        volleyScored: false
      },
      replayBuffer: [] as ReplayFrame[],
      replayFrames: [] as ReplayFrame[],
      replayIdx: 0,
      replayAcc: 0
    };

    const applyFormationAndMentality = () => {
      const coords = FORMATION_COORDS[formationRef.current];
      const tacOff = getMentalityOffset(mentalityRef.current);
      for (const pl of g.players) {
        if (pl.side !== 'home' || pl.ejected) continue;
        const form = coords[pl.slotIdx] || coords[4];
        pl.homeX = Math.max(-460, Math.min(460, form.x + (pl.slotIdx > 0 ? tacOff : 0)));
        pl.homeY = form.y;
      }
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

      for (const pl of g.players) {
        if (pl.ejected) continue;
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
      }

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

    const setupTrainingDrill = (mode: 'free' | 'free_kicks' | 'penalties' | 'finishing_cross') => {
      g.training.waitingReset = false;
      g.training.resetTimer = 0;
      g.training.shotLive = false;
      g.training.shotIdleTimer = 0;
      g.training.crossPending = false;
      g.training.targetHits = [false, false];
      g.training.volleyScored = false;

      if (mode === 'free') {
        resetPositions('home');
        g.bannerText = 'TREINO LIVRE';
        g.bannerSub = 'Drible, passe, finalize e teste jogadas sem pressão';
        g.bannerTimer = 1.4;
        return;
      }

      if (mode === 'penalties') {
        if (g.training.penHistory.length >= 5) {
          g.training.penHistory = [];
        }
        setupSetPiece('penalty', 'home', PITCH.halfW - 82, 0);
        g.bannerText = `PÊNALTI ${g.training.penHistory.length + 1}/5`;
        g.bannerSub = 'W/S escolhe o canto · Segure K para bater!';
        g.bannerTimer = 1.4;
        return;
      }

      if (mode === 'free_kicks') {
        const fx = 245 + Math.random() * 80;
        const fy = (Math.random() - 0.5) * 145;
        setupSetPiece('free_kick', 'home', fx, fy);
        g.bannerText = 'TREINO DE FALTAS';
        g.bannerSub = 'Acerte os alvos nos ângulos (+250 pts) · A/D Curva · W/S Mira';
        g.bannerTimer = 1.5;
        return;
      }

      // finishing_cross
      resetPositions('home');
      const striker = g.players.find((p) => p.side === 'home' && p.slot === 'ATA') || g.activeHome;
      const winger = g.players.find((p) => p.side === 'home' && p.slot === 'MEI1');
      const awayGK = g.players.find((p) => p.side === 'away' && p.slot === 'GOL');
      const awayCB = g.players.find((p) => p.side === 'away' && p.slot !== 'GOL');
      g.training.flankSign = g.training.flankSign * -1;

      for (const pl of g.players) {
        if (pl.side === 'home' && pl !== striker && pl !== winger && pl.slot !== 'GOL') {
          pl.x = -160;
          pl.y = pl.homeY;
        }
      }
      if (striker) {
        striker.x = 325;
        striker.y = -g.training.flankSign * 22;
        striker.dirX = 1;
        g.activeHome = striker;
      }
      if (winger) {
        winger.x = 405;
        winger.y = g.training.flankSign * 195;
        winger.dirX = -1;
        g.ball.owner = winger;
        g.ball.x = winger.x;
        g.ball.y = winger.y;
      }
      if (awayGK) {
        awayGK.x = PITCH.halfW - 14;
        awayGK.y = 0;
        awayGK.dirX = -1;
      }
      if (awayCB) {
        awayCB.x = 395;
        awayCB.y = g.training.flankSign * 45;
      }
      g.training.crossPending = true;
      g.training.crossTimer = 0.7;
      g.state = 'PLAYING';
      g.bannerText = 'CRUZAMENTO & VOLEIO';
      g.bannerSub = 'Posicione-se na área e aperte K com a bola no ar!';
      g.bannerTimer = 1.4;
    };

    if (isTraining) {
      setupTrainingDrill(trainingModeRef.current);
      AudioFX.playWhistle('kickoff');
      announce('Arena de Treino pronta! Escolha um desafio ou treine livre.', true);
    } else {
      resetPositions('home');
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

    // 2.5D Pixel Art Perspective Projection (640x360 crisp internal resolution)
    const worldToScreen = (wx: number, wy: number, wz = 0, camOverride?: { x: number; y: number }) => {
      const cx = camOverride ? camOverride.x : g.camX;
      const cy = camOverride ? camOverride.y : g.camY;
      const dx = wx - cx;
      const dy = wy - cy;
      const persp = Math.max(0.55, 1 + dy * 0.00072);
      const yFactor = 0.94 + dy * 0.00018;
      return {
        x: Math.round(CANVAS_W * 0.5 + dx * 0.72 * persp),
        y: Math.round(203 + dy * 0.49 * yFactor - wz * 1.05 * persp),
        scale: persp
      };
    };

    const spawnDust = (x: number, y: number, count: number, color: string) => {
      for (let i = 0; i < count; i++) {
        g.particles.push({
          x: x + (Math.random() - 0.5) * 12,
          y: y + (Math.random() - 0.5) * 8,
          z: 1 + Math.random() * 4,
          vx: (Math.random() - 0.5) * 52,
          vy: (Math.random() - 0.5) * 34,
          vz: 18 + Math.random() * 34,
          life: 0.25 + Math.random() * 0.22,
          maxLife: 0.48,
          color,
          size: 3.4
        });
      }
    };

    const spawnConfetti = (gx: number, gy: number, team: TeamSpec) => {
      const colors = [team.kit.c1, team.kit.c2, '#facc15', '#ffffff'];
      for (let i = 0; i < 48; i++) {
        g.particles.push({
          x: gx + (Math.random() - 0.5) * 44,
          y: gy + (Math.random() - 0.5) * 90,
          z: 8 + Math.random() * 26,
          vx: (Math.random() - 0.5) * 145,
          vy: (Math.random() - 0.5) * 95,
          vz: 70 + Math.random() * 95,
          life: 1.0 + Math.random() * 0.9,
          maxLife: 1.9,
          color: colors[i % colors.length],
          size: 4.5
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
      if (receiver.x * dir <= 12 || (receiver.x - passer.x) * dir <= 8) return;
      const oppFieldPlayers = g.players.filter((o) => !o.ejected && o.side !== passer.side && o.slot !== 'GOL');
      if (oppFieldPlayers.length === 0) return;
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
      for (const pl of g.players) {
        if (pl.side === passer.side) pl.offsideFlagged = false;
      }
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
        const chosenCorner = shooter.y >= 0 ? -1 : 1;
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

      g.photoFlash = 0.22;
      AudioFX.playKick(0.45 + p * 0.55);
      spawnDust(g.ball.x, g.ball.y, p > 0.65 || isVolley ? 10 : 5, '#e2e8f0');
      if (p > 0.6 || isVolley) {
        g.hitstop = 0.035;
        triggerShake(5.5 + p * 4.5, 0.2);
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
        let idx = 0;
        for (const pl of g.players) {
          if (pl.ejected || pl === taker || pl === defGK) continue;
          pl.x = spotX - attackDir * (95 + (idx % 3) * 24);
          pl.y = -110 + idx * 32;
          pl.dirX = attackDir;
          pl.action = 'idle';
          idx++;
        }
        g.bannerText = 'PÊNALTI!';
        g.bannerSub = `${side === 'home' ? config.homeTeam.name : config.awayTeam.name} na marca da cal`;
      } else {
        g.ball.x = x;
        g.ball.y = y;
        taker.x = x - attackDir * 14;
        taker.y = y;
        taker.dirX = attackDir;
        taker.dirY = 0;
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

      let cardType: 'yellow' | 'red' | null = null;
      if (fromBehind && insideBox) {
        cardType = 'red';
      } else if (fromBehind || Math.random() < 0.7) {
        offender.yellowCards++;
        cardType = offender.yellowCards >= 2 ? 'red' : 'yellow';
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
      if (isTraining && trainingModeRef.current !== 'free') {
        const mode = trainingModeRef.current;
        g.training.attempts++;
        if (scoringSide === 'home') {
          g.homeScore++;
          g.training.goals++;
          g.training.streak++;
          const hitTarget = g.training.targetHits[0] || g.training.targetHits[1];
          const bonus = mode === 'free_kicks' && hitTarget ? 250 : mode === 'finishing_cross' && g.training.volleyScored ? 200 : 100;
          g.training.points += bonus;
          if (mode === 'penalties') g.training.penHistory.push('goal');
          g.netRippleRight = 1.0;
          g.bannerText = hitTarget ? 'NA GAVETA! +250' : g.training.volleyScored ? 'GOLAÇO DE VOLEIO! +200' : 'GOOOOL! +100';
          g.bannerSub = `Sequência: ${g.training.streak}x · Pontos: ${g.training.points}`;
          g.bannerTimer = 1.25;
          spawnConfetti(g.ball.x, g.ball.y, config.homeTeam);
          AudioFX.playTargetHit();
          announce(`Golaço no treino! ${bonus} pontos conquistados!`, true);
        } else {
          g.training.streak = 0;
          if (mode === 'penalties') g.training.penHistory.push('miss');
        }
        g.training.waitingReset = true;
        g.training.resetTimer = 1.25;
        g.training.shotLive = false;
        g.ball.vx *= 0.25;
        g.ball.vy *= 0.25;
        return;
      }

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
      g.photoFlash = 0.35;
      triggerShake(9.0, 0.35);
      spawnConfetti(g.ball.x, g.ball.y, team);
      AudioFX.playWhistle('goal');
      AudioFX.playGoalCelebration();
      announce(`GOOOOOOOL! É DO ${team.name.toUpperCase()}! ${scorerTxt} balança as redes!`, true);

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
      for (const sideSign of [-1, 1]) {
        const gx = PITCH.halfW * sideSign;
        if (Math.abs(b.x - gx) < 7 && b.z < PITCH.goalHeight + 5) {
          for (const postY of [-PITCH.goalHalfW, PITCH.goalHalfW]) {
            if (Math.abs(b.y - postY) < 7) {
              b.vx = -b.vx * 0.72;
              b.vy = (b.y - postY) * 14;
              b.x = gx - sideSign * 8;
              AudioFX.playPostClang();
              triggerShake(6.5, 0.18);
              spawnDust(gx, postY, 6, '#e2e8f0');
              announce('NA TRAVE! Quase o gol!', true);
            }
          }
        }
      }

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
          if (trainingModeRef.current !== 'free' && !g.training.waitingReset) {
            g.training.attempts++;
            g.training.streak = 0;
            if (trainingModeRef.current === 'penalties') g.training.penHistory.push('miss');
            g.bannerText = 'PARA FORA!';
            g.bannerSub = 'Preparando próxima tentativa...';
            g.bannerTimer = 1.0;
            g.training.waitingReset = true;
            g.training.resetTimer = 1.1;
          }
          b.y = cy;
          b.vy = -b.vy * 0.45;
        } else {
          quickSetPiece(b.lastTouchTeam === 'home' ? 'away' : 'home', cx, cy, 'LATERAL');
        }
        return;
      }

      if (Math.abs(b.x) > PITCH.halfW + 6) {
        if (isTraining) {
          if (trainingModeRef.current !== 'free' && !g.training.waitingReset) {
            g.training.attempts++;
            g.training.streak = 0;
            if (trainingModeRef.current === 'penalties') g.training.penHistory.push('miss');
            g.bannerText = 'FOI PARA FORA!';
            g.bannerSub = 'Preparando próxima tentativa...';
            g.bannerTimer = 1.0;
            g.training.waitingReset = true;
            g.training.resetTimer = 1.1;
          }
          b.x = (b.x > 0 ? 1 : -1) * (PITCH.halfW - 10);
          b.vx = -b.vx * 0.45;
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
          animTime: p.animTime,
          action: p.action,
          diveDir: p.diveDir,
          ejected: p.ejected
        })),
        refX: g.ref.x,
        refY: g.ref.y,
        refDir: g.ref.dirX,
        refFrame: g.ref.frame,
        refAnimTime: g.ref.animTime
      });
      if (g.replayBuffer.length > 130) g.replayBuffer.shift();
    };

    const updateSim = (rawDt: number) => {
      const dt = Math.min(rawDt, 0.05);

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

      if (resetTrainingRef.current) {
        resetTrainingRef.current = false;
        if (isTraining) setupTrainingDrill(trainingModeRef.current);
      }

      if (pausedRef.current || g.state === 'ENDED') return;

      applyFormationAndMentality();

      if (isTraining && trainingModeRef.current !== 'free') {
        if (g.training.waitingReset) {
          g.training.resetTimer -= dt;
          if (g.training.resetTimer <= 0) {
            setupTrainingDrill(trainingModeRef.current);
            return;
          }
        }
        if (trainingModeRef.current === 'finishing_cross' && g.training.crossPending) {
          g.training.crossTimer -= dt;
          if (g.training.crossTimer <= 0) {
            g.training.crossPending = false;
            const winger = g.players.find((p) => p.side === 'home' && p.slot === 'MEI1');
            const striker = g.activeHome;
            if (winger && striker) {
              g.ball.owner = null;
              g.ball.pickupCooldown = 0.25;
              const tx = 395;
              const ty = striker.y * 0.4;
              const dx = tx - winger.x;
              const dy = ty - winger.y;
              const dist = Math.hypot(dx, dy) || 1;
              const spd = Math.min(340, Math.max(240, dist * 1.15));
              g.ball.vx = (dx / dist) * spd;
              g.ball.vy = (dy / dist) * spd;
              g.ball.vz = 175;
              winger.action = 'kick';
              winger.actionTimer = 0.25;
              AudioFX.playKick(0.5);
              announce('Cruzamento na área! Bata de primeira!');
            }
          }
        }
      }

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
        for (const rd of g.rainDrops) {
          rd.x -= rd.speed * 0.25 * dt;
          rd.y += rd.speed * dt;
          if (rd.y > CANVAS_H) {
            rd.y = -14;
            rd.x = Math.random() * (CANVAS_W + 120);
          }
          if (rd.x < -14) rd.x += CANVAS_W + 60;
        }
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
            if (sp.kind === 'penalty' && sp.gk) {
              const diveSign = Math.random() < 0.42 ? -1 : Math.random() < 0.72 ? 1 : 0;
              if (diveSign !== 0) {
                sp.gk.action = 'dive';
                sp.gk.actionTimer = 0.42;
                sp.gk.diveDir = diveSign;
              }
            }
            performShot(taker, pwr, sp.aimY, false, sp.kind === 'free_kick' ? sp.curve * 165 : 0);
            if (isTraining) {
              g.training.shotLive = true;
              g.training.shotIdleTimer = 0;
              g.training.volleyScored = false;
            }
            return;
          }
        } else if (taker) {
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

      if (g.state === 'GOAL_CELEBRATION') {
        g.stateTimer -= dt;
        const scorer = g.lastScorer;
        for (const pl of g.players) {
          if (pl.ejected) continue;
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
        }
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

      if (g.state === 'REPLAY') {
        g.replayAcc += dt * 32;
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
            if (isTraining) {
              g.training.shotLive = true;
              g.training.shotIdleTimer = 0;
              g.training.volleyScored = false;
            }
            g.p1Charging = false;
            g.p1Power = 0;
          }
        }
      } else {
        g.p1Charging = false;
        g.p1Power = 0;
        if (p1ShortPass && !p1ShiftJust) switchClosest('home');
        if (p1ShootJust && p1 && p1.slot !== 'GOL' && !p1.ejected) {
          if (!g.ball.owner && g.ball.z > 8 && Math.hypot(p1.x - g.ball.x, p1.y - g.ball.y) < 34) {
            performShot(p1, 0.9, p1Move.iy, true);
            if (isTraining) {
              g.training.shotLive = true;
              g.training.shotIdleTimer = 0;
              g.training.volleyScored = true;
            }
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
        const p2ShootJust = keysJust.has('KeyM') || keysHeld.has('Numpad2') || keysHeld.has('Enter');
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

      let foulTriggered = false;
      for (const pl of g.players) {
        if (pl.ejected || foulTriggered) continue;
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
              const dotDir = pl.dirX * victim.dirX + pl.dirY * victim.dirY;
              const fromBehind = dotDir > 0.35 && (pl.x - victim.x) * victim.dirX < -4;
              const distToBall = Math.hypot(pl.x - g.ball.x, pl.y - g.ball.y);
              if (fromBehind || (distToBall > 14 && Math.random() < 0.42)) {
                callFoul(pl, victim, fromBehind);
                foulTriggered = true;
                break;
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
              triggerShake(4.8, 0.14);
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
          continue;
        }

        if (pl.action === 'dive') {
          pl.y += pl.diveDir * 155 * diff.gkSpeedMult * dt;
          pl.x = Math.max(-PITCH.halfW - 14, Math.min(PITCH.halfW + 14, pl.x));
          pl.y = Math.max(-PITCH.halfH - 10, Math.min(PITCH.halfH + 10, pl.y));
          continue;
        }

        if (pl.stunTimer > 0) {
          pl.vx *= 0.82;
          pl.vy *= 0.82;
          pl.x += pl.vx * dt;
          pl.y += pl.vy * dt;
          pl.action = 'idle';
          continue;
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
      }

      if (foulTriggered) return;

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

        for (const other of g.players) {
          if (other.ejected) continue;
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
              break;
            }
          }
        }
      } else {
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

        // Free kick glowing corner targets check
        if (isTraining && trainingModeRef.current === 'free_kicks' && !g.training.waitingReset) {
          const targetYs = [-PITCH.goalHalfW + 14, PITCH.goalHalfW - 14];
          targetYs.forEach((ty, ti) => {
            if (!g.training.targetHits[ti] && Math.abs(b.x - PITCH.halfW) < 16 && Math.abs(b.y - ty) < 16 && b.z >= 10 && b.z <= PITCH.goalHeight) {
              g.training.targetHits[ti] = true;
              AudioFX.playTargetHit();
              spawnDust(PITCH.halfW, ty, 12, '#facc15');
            }
          });
        }

        // If drill shot stopped or saved in non-free training mode, trigger reset
        if (isTraining && trainingModeRef.current !== 'free' && g.training.shotLive && !g.training.waitingReset) {
          if (speed < 36 && b.z < 2) {
            g.training.shotIdleTimer += dt;
            if (g.training.shotIdleTimer > 0.55) {
              g.training.attempts++;
              g.training.streak = 0;
              if (trainingModeRef.current === 'penalties') g.training.penHistory.push('miss');
              g.bannerText = 'DEFENDEU / PAROU!';
              g.bannerSub = 'Preparando próxima tentativa...';
              g.bannerTimer = 1.0;
              g.training.waitingReset = true;
              g.training.resetTimer = 1.05;
            }
          }
        }

        if (b.pickupCooldown <= 0 && b.z < 24) {
          for (let i = 0; i < g.players.length; i++) {
            const pl = g.players[i];
            if (pl.ejected || pl.stunTimer > 0) continue;
            const r = pl.slot === 'GOL' ? (pl.action === 'dive' ? 21 : 15) : 13;
            if (Math.hypot(pl.x - b.x, pl.y - b.y) < r) {
              if (pl.offsideFlagged && b.lastTouchTeam === pl.side) {
                pl.offsideFlagged = false;
                for (const x of g.players) x.offsideFlagged = false;
                const oppSide = pl.side === 'home' ? 'away' : 'home';
                g.bannerText = 'IMPEDIMENTO!';
                g.bannerSub = `${pl.data.name} estava adiantado`;
                g.bannerTimer = 1.3;
                announce(`Impedimento marcado! ${pl.data.name} estava em posição irregular.`, true);
                setupSetPiece('free_kick', oppSide, Math.max(-440, Math.min(440, pl.x)), pl.y);
                return;
              }
              for (const x of g.players) x.offsideFlagged = false;

              if (isTraining && trainingModeRef.current !== 'free' && pl.side === 'away') {
                g.training.attempts++;
                g.training.streak = 0;
                if (trainingModeRef.current === 'penalties') g.training.penHistory.push('miss');
                g.bannerText = pl.slot === 'GOL' ? 'GRANDE DEFESA!' : 'NA BARREIRA!';
                g.bannerSub = 'Preparando próxima tentativa...';
                g.bannerTimer = 1.0;
                g.training.waitingReset = true;
                g.training.resetTimer = 1.1;
                b.vx = -120;
                b.vy = (Math.random() - 0.5) * 90;
                b.vz = 35;
                b.pickupCooldown = 0.4;
                AudioFX.playKick(0.4);
                break;
              }

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
      const lockedUser = lockedIdx !== undefined ? g.activeHome : null;
      const focusX = lockedUser ? lockedUser.x * 0.55 + b.x * 0.45 : b.x + lookAhead;
      const focusY = lockedUser ? lockedUser.y * 0.55 + b.y * 0.45 : b.y * 0.58;
      const targetCamX = Math.max(-225, Math.min(225, focusX));
      const targetCamY = Math.max(-95, Math.min(95, focusY));
      g.camX += (targetCamX - g.camX) * Math.min(1, dt * 6.5);
      g.camY += (targetCamY - g.camY) * Math.min(1, dt * 6.5);

      recordSnapshot();
    };

    const renderScene = () => {
      const snap = g.state === 'REPLAY' && g.replayFrames[g.replayIdx] ? g.replayFrames[g.replayIdx] : null;
      const camOverride = snap ? { x: snap.camX, y: snap.camY } : undefined;
      const nowSec = performance.now() * 0.001;

      ctx.imageSmoothingEnabled = false;

      // Crisp Pixel-Stepped Bresenham Line Helper (no anti-aliasing blur on pitch lines)
      const plotPixelLine = (
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        color: string,
        thickness = 1
      ) => {
        let ix0 = Math.round(x0);
        let iy0 = Math.round(y0);
        const ix1 = Math.round(x1);
        const iy1 = Math.round(y1);
        const dx = Math.abs(ix1 - ix0);
        const dy = Math.abs(iy1 - iy0);
        const sx = ix0 < ix1 ? 1 : -1;
        const sy = iy0 < iy1 ? 1 : -1;
        let err = dx - dy;
        const off = Math.floor(thickness * 0.5);
        ctx.fillStyle = color;

        let guard = 0;
        while (guard++ < 1200) {
          ctx.fillRect(ix0 - off, iy0 - off, thickness, thickness);
          if (ix0 === ix1 && iy0 === iy1) break;
          const e2 = 2 * err;
          if (e2 > -dy) {
            err -= dy;
            ix0 += sx;
          }
          if (e2 < dx) {
            err += dx;
            iy0 += sy;
          }
        }
      };

      const drawProjectedPoly = (
        pts: number[][],
        fill: string | CanvasGradient | CanvasPattern | null,
        stroke?: string,
        lw?: number
      ) => {
        const scr = pts.map((pt) => worldToScreen(pt[0], pt[1], pt[2] || 0, camOverride));
        if (fill) {
          ctx.beginPath();
          scr.forEach((s, i) => {
            if (i === 0) ctx.moveTo(s.x, s.y);
            else ctx.lineTo(s.x, s.y);
          });
          ctx.closePath();
          ctx.fillStyle = fill;
          ctx.fill();
        }
        if (stroke) {
          const t = Math.max(1, Math.round(lw || 1));
          for (let i = 0; i < scr.length; i++) {
            const a = scr[i];
            const b = scr[(i + 1) % scr.length];
            plotPixelLine(a.x, a.y, b.x, b.y, stroke, t);
          }
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
        plotPixelLine(p1.x, p1.y, p2.x, p2.y, color, Math.max(1, Math.round(w)));
      };

      const drawPixelSteward = (sx: number, sy: number, facing: number) => {
        const sp = worldToScreen(sx, sy, 0, camOverride);
        if (sp.x < -20 || sp.x > CANVAS_W + 20 || sp.y < -20 || sp.y > CANVAS_H + 20) return;
        const sc = 0.85 * sp.scale;
        const w = (v: number) => Math.max(1, Math.round(v * sc));
        const px = sp.x;
        const py = sp.y;
        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(px - w(4), py, w(8), w(2));
        // Dark trousers + outline
        ctx.fillStyle = '#111111';
        ctx.fillRect(px - w(4), py - w(7), w(8), w(7));
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px - w(3), py - w(6), w(6), w(6));
        // Yellow High-Vis Vest
        ctx.fillStyle = '#111111';
        ctx.fillRect(px - w(5), py - w(14), w(10), w(8));
        ctx.fillStyle = '#facc15';
        ctx.fillRect(px - w(4), py - w(13), w(8), w(6));
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(px - w(4), py - w(10), w(8), w(1));
        // Head & cap
        ctx.fillStyle = '#111111';
        ctx.fillRect(px - w(3), py - w(20), w(6), w(6));
        ctx.fillStyle = '#d49a6a';
        ctx.fillRect(px - w(2), py - w(19), w(4), w(4));
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(px - w(3), py - w(20), w(6), w(2));
        ctx.fillRect(px + (facing > 0 ? 0 : -w(4)), py - w(19), w(4), w(1));
      };

      ctx.save();
      if (g.shakeTime > 0 && !snap) {
        ctx.translate(
          Math.round((Math.random() - 0.5) * g.shakeMag),
          Math.round((Math.random() - 0.5) * g.shakeMag)
        );
      }

      // Outer Stadium Apron Base
      const outerBg = weather === 'night' ? '#081b14' : weather === 'rain' ? '#0f2d21' : '#164e36';
      ctx.fillStyle = outerBg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Vibrant Pixel Cup Soccer Mown Turf Stripes
      const turfA = weather === 'night' ? '#1f6a47' : weather === 'rain' ? '#257b52' : '#2d9a67';
      const turfB = weather === 'night' ? '#267e55' : weather === 'rain' ? '#2c8c5e' : '#36ac75';

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
            [x1, PITCH.halfH + 65],
            [x0, PITCH.halfH + 65]
          ],
          i % 2 === 0 ? turfA : turfB
        );
      }

      // Crisp Pixel Turf Texture Grain
      if (turfPattern) {
        ctx.save();
        drawProjectedPoly(
          [
            [-PITCH.halfW - 60, -PITCH.halfH - 50],
            [PITCH.halfW + 60, -PITCH.halfH - 50],
            [PITCH.halfW + 60, PITCH.halfH + 65],
            [-PITCH.halfW - 60, PITCH.halfH + 65]
          ],
          turfPattern
        );
        ctx.restore();
      }

      // === TWO-TIER PIXEL STADIUM STANDS (TOP BACKGROUND) ===
      drawProjectedPoly(
        [
          [-PITCH.halfW - 180, -PITCH.halfH - 220],
          [PITCH.halfW + 180, -PITCH.halfH - 220],
          [PITCH.halfW + 180, -PITCH.halfH - 44],
          [-PITCH.halfW - 180, -PITCH.halfH - 44]
        ],
        weather === 'night' ? '#090f1d' : '#162032'
      );

      // Pixel Concourse Dividers
      drawProjectedLine(-PITCH.halfW - 160, -PITCH.halfH - 118, 0, PITCH.halfW + 160, -PITCH.halfH - 118, 0, '#475569', 2);
      drawProjectedLine(-PITCH.halfW - 160, -PITCH.halfH - 45, 0, PITCH.halfW + 160, -PITCH.halfH - 45, 0, '#64748b', 2);

      // Animated Jumping Pixel Spectators in Club Colors
      for (let row = 0; row < 4; row++) {
        const sy = -PITCH.halfH - 64 - row * 24 - (row >= 2 ? 12 : 0);
        for (let sx = -540; sx <= 540; sx += 18) {
          const jump = Math.max(
            0,
            Math.round(Math.sin(nowSec * (4.5 + g.crowdExcite * 9.5) + sx * 0.14 + row * 1.1) * (1 + g.crowdExcite * 4))
          );
          const sp = worldToScreen(sx, sy, jump, camOverride);
          if (sp.x < -10 || sp.x > CANVAS_W + 10 || sp.y < -8 || sp.y > 130) continue;
          const isHomeFan = sx < 20 || sx % 36 === 0;
          const shirtCol = isHomeFan ? config.homeTeam.kit.c1 : config.awayTeam.kit.c1;
          const fw = Math.max(3, Math.round(5 * sp.scale));
          const fh = Math.max(3, Math.round(4 * sp.scale));
          ctx.fillStyle = '#111111';
          ctx.fillRect(sp.x - Math.floor(fw / 2) - 1, sp.y - fh - 1, fw + 2, fh + 2);
          ctx.fillStyle = shirtCol;
          ctx.fillRect(sp.x - Math.floor(fw / 2), sp.y - fh, fw, fh);
          ctx.fillStyle = (sx + row) % 3 === 0 ? '#8d552c' : '#e2b289';
          ctx.fillRect(sp.x - 1, sp.y - fh - 3, 3, 3);
          if (g.crowdExcite > 0.35 && (sx + row) % 2 === 0) {
            ctx.fillStyle = shirtCol;
            ctx.fillRect(sp.x - Math.floor(fw / 2) - 2, sp.y - fh - 3, 2, 3);
            ctx.fillRect(sp.x + Math.floor(fw / 2) + 1, sp.y - fh - 3, 2, 3);
          }
        }
      }

      // Pixel LED Advertising Boards
      for (let bx = -470; bx < 470; bx += 117) {
        const idx = Math.floor((bx + 470) / 117);
        const pL = worldToScreen(bx, -PITCH.halfH - 22, 0, camOverride);
        const pR = worldToScreen(bx + 114, -PITCH.halfH - 22, 0, camOverride);
        const boardH = Math.max(6, Math.round(9 * pL.scale));
        const bw = Math.max(10, pR.x - pL.x);
        ctx.fillStyle = idx % 3 === 0 ? '#064e3b' : idx % 3 === 1 ? '#1e3a8a' : '#7f1d1d';
        ctx.fillRect(pL.x, pL.y - boardH, bw, boardH);
        ctx.fillStyle = '#111827';
        ctx.fillRect(pL.x, pL.y - boardH, bw, 1);
        ctx.fillRect(pL.x, pL.y - 1, bw, 1);

        const midX = Math.round((pL.x + pR.x) * 0.5);
        if (midX > -40 && midX < CANVAS_W + 40) {
          ctx.font = `700 ${Math.max(5, Math.round(5.5 * pL.scale))}px Silkscreen, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = idx % 2 === 0 ? '#fde047' : '#f8fafc';
          ctx.fillText(LED_ADS[idx % LED_ADS.length], midX, pL.y - Math.floor(boardH * 0.45), bw - 4);
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
        }
      }

      // Pixel LED boards behind Left & Right Goal Lines
      [-1, 1].forEach((sideSign) => {
        const bx = (PITCH.halfW + 30) * sideSign;
        [
          [-235, -75],
          [75, 235]
        ].forEach(([y0, y1], bi) => {
          drawProjectedPoly(
            [
              [bx, y0, 0],
              [bx, y1, 0],
              [bx, y1, 7],
              [bx, y0, 7]
            ],
            bi % 2 === 0 ? '#0f172a' : '#1e1b4b',
            '#38bdf8',
            1
          );
        });
      });

      // Pixel Team Dugouts (Bancos de Reservas)
      [
        { x0: -255, x1: -115, team: config.homeTeam, useAway: config.homeUseAway },
        { x0: 115, x1: 255, team: config.awayTeam, useAway: config.awayUseAway }
      ].forEach((dug) => {
        drawProjectedPoly(
          [
            [dug.x0, -PITCH.halfH - 46],
            [dug.x1, -PITCH.halfH - 46],
            [dug.x1, -PITCH.halfH - 30],
            [dug.x0, -PITCH.halfH - 30]
          ],
          '#0f172a',
          '#64748b',
          1
        );
        for (let si = 0; si < 4; si++) {
          const dp = worldToScreen(dug.x0 + 22 + si * 30, -PITCH.halfH - 36, 0, camOverride);
          if (dp.x > -12 && dp.x < CANVAS_W + 12) {
            const sc = dp.scale;
            const sw = Math.max(4, Math.round(5 * sc));
            const sh = Math.max(5, Math.round(6 * sc));
            ctx.fillStyle = '#111111';
            ctx.fillRect(dp.x - Math.floor(sw / 2) - 1, dp.y - sh - 1, sw + 2, sh + 2);
            ctx.fillStyle = si === 0 ? '#475569' : dug.useAway ? dug.team.kit.awayC1 : dug.team.kit.c1;
            ctx.fillRect(dp.x - Math.floor(sw / 2), dp.y - sh, sw, sh);
            ctx.fillStyle = '#e2b289';
            ctx.fillRect(dp.x - 1, dp.y - sh - 3, 3, 3);
          }
        }
      });

      // Pixel Security Stewards in Yellow Vests
      [-340, -90, 90, 340].forEach((sx) => {
        drawPixelSteward(sx, -PITCH.halfH - 13, 1);
      });
      [-1, 1].forEach((sideSign) => {
        [-170, 170].forEach((sy) => drawPixelSteward((PITCH.halfW + 46) * sideSign, sy, -sideSign));
      });

      // Pixel-Art Photographers behind Left & Right Goal Lines (Matched Scale to Players)
      [-1, 1].forEach((sideSign) => {
        [-130, -90, 90, 130].forEach((py) => {
          const pp = worldToScreen((PITCH.halfW + 48) * sideSign, py, 0, camOverride);
          if (pp.x > -24 && pp.x < CANVAS_W + 24 && pp.y > 0 && pp.y < CANVAS_H) {
            const sc = 0.88 * pp.scale;
            const px = pp.x;
            const pyy = pp.y;
            const u = (v: number) => Math.max(1, Math.round(v * sc));
            // Ground shadow
            ctx.fillStyle = 'rgba(0,0,0,0.36)';
            ctx.fillRect(px - u(6), pyy, u(12), u(3));
            // Kneeling trousers
            ctx.fillStyle = '#111111';
            ctx.fillRect(px - u(5), pyy - u(9), u(10), u(9));
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(px - u(4), pyy - u(8), u(8), u(7));
            // Photographer orange bib
            ctx.fillStyle = '#111111';
            ctx.fillRect(px - u(6), pyy - u(20), u(12), u(12));
            ctx.fillStyle = '#ea580c';
            ctx.fillRect(px - u(5), pyy - u(19), u(10), u(10));
            // Head + hair
            ctx.fillStyle = '#111111';
            ctx.fillRect(px - u(4), pyy - u(28), u(8), u(8));
            ctx.fillStyle = '#e2b289';
            ctx.fillRect(px - u(3), pyy - u(27), u(6), u(6));
            ctx.fillStyle = '#1f1713';
            ctx.fillRect(px - u(4), pyy - u(28), u(8), u(3));
            // White Telephoto Lens aimed toward pitch
            const aimDir = sideSign > 0 ? -1 : 1;
            ctx.fillStyle = '#111111';
            ctx.fillRect(px + (aimDir > 0 ? u(2) : -u(13)), pyy - u(19), u(11), u(5));
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(px + (aimDir > 0 ? u(3) : -u(12)), pyy - u(18), u(9), u(3));

            if (g.photoFlash > 0 && Math.random() < 0.35) {
              const flashX = px + aimDir * u(12);
              const flashY = pyy - u(17);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
              ctx.fillRect(flashX - u(4), flashY - u(4), u(8), u(8));
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(flashX - u(2), flashY - u(2), u(4), u(4));
            }
          }
        });
      });

      // Turf wear / slide tackle skid marks
      for (const sk of g.skidMarks) {
        const alpha = Math.max(0.1, (sk.life / sk.maxLife) * 0.45);
        drawProjectedLine(sk.x1, sk.y1, 0, sk.x2, sk.y2, 0, `rgba(14, 38, 22, ${alpha})`, 2);
      }

      // Crisp Pixel-Stepped Pitch Markings (Pixel Cup Soccer Style)
      const lineCol = weather === 'night' ? '#ecfdf5' : '#f8fafc';
      drawProjectedPoly(
        [
          [-PITCH.halfW, -PITCH.halfH],
          [PITCH.halfW, -PITCH.halfH],
          [PITCH.halfW, PITCH.halfH],
          [-PITCH.halfW, PITCH.halfH]
        ],
        null,
        lineCol,
        2
      );
      drawProjectedLine(0, -PITCH.halfH, 0, 0, PITCH.halfH, 0, lineCol, 2);

      // Pixel-Stepped Center Circle & Kickoff Spot
      let prevC = worldToScreen(72, 0, 0, camOverride);
      for (let a = 1; a <= 44; a++) {
        const ang = (a / 44) * Math.PI * 2;
        const curC = worldToScreen(Math.cos(ang) * 72, Math.sin(ang) * 72, 0, camOverride);
        plotPixelLine(prevC.x, prevC.y, curC.x, curC.y, lineCol, 2);
        prevC = curC;
      }
      const cs = worldToScreen(0, 0, 0, camOverride);
      ctx.fillStyle = lineCol;
      ctx.fillRect(cs.x - 2, cs.y - 1, 4, 3);

      // Penalty boxes, 6-yard boxes, pixel-stepped D-arcs & crisp pixel "X" penalty spots
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
          2
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
          2
        );

        let prevArc: { x: number; y: number } | null = null;
        for (let a = -20; a <= 20; a++) {
          const ang = (a / 20) * 0.72;
          const ax = (PITCH.halfW - 82) * side - Math.cos(ang) * 58 * side;
          const ay = Math.sin(ang) * 58;
          if ((side === -1 && ax > bx) || (side === 1 && ax < bx)) {
            const sp = worldToScreen(ax, ay, 0, camOverride);
            if (prevArc) {
              plotPixelLine(prevArc.x, prevArc.y, sp.x, sp.y, lineCol, 2);
            }
            prevArc = sp;
          }
        }

        // Pixel "X" Penalty Mark
        const ps = worldToScreen((PITCH.halfW - 82) * side, 0, 0, camOverride);
        plotPixelLine(ps.x - 2, ps.y - 2, ps.x + 2, ps.y + 2, lineCol, 1);
        plotPixelLine(ps.x - 2, ps.y + 2, ps.x + 2, ps.y - 2, lineCol, 1);
      });

      // Set Piece Aiming & Curve Guide
      if (g.state === 'SET_PIECE' && g.setPiece.side === 'home') {
        const atkDir = 1;
        const aimWorldY = g.setPiece.aimY * (PITCH.goalHalfW - 6);
        const midX = (g.ball.x + PITCH.halfW * atkDir) * 0.5;
        const midY = (g.ball.y + aimWorldY) * 0.5 + g.setPiece.curve * 45;
        drawProjectedLine(g.ball.x, g.ball.y, 4, midX, midY, 10, '#facc15', 2);
        drawProjectedLine(midX, midY, 10, PITCH.halfW * atkDir, aimWorldY, 6, '#facc15', 2);
      }

      // Free-Kick Training Corner Pixel Targets
      if (isTraining && trainingModeRef.current === 'free_kicks') {
        [-PITCH.goalHalfW + 14, PITCH.goalHalfW - 14].forEach((ty, ti) => {
          const hit = g.training.targetHits[ti];
          const tp = worldToScreen(PITCH.halfW - 1, ty, 24, camOverride);
          const sz = Math.max(5, Math.round(7 * tp.scale));
          ctx.fillStyle = '#111111';
          ctx.fillRect(tp.x - sz - 1, tp.y - sz - 1, sz * 2 + 2, sz * 2 + 2);
          ctx.fillStyle = hit ? '#4ade80' : '#facc15';
          ctx.fillRect(tp.x - sz, tp.y - sz, sz * 2, sz * 2);
          ctx.fillStyle = hit ? '#14532d' : '#ef4444';
          ctx.fillRect(tp.x - Math.floor(sz / 2), tp.y - Math.floor(sz / 2), sz, sz);
        });
      }

      // Player Career Tactical Positioning Indicator on Turf
      if (lockedIdx !== undefined && g.activeHome && !snap && g.ball.owner !== g.activeHome) {
        const up = g.activeHome;
        const teamHas = g.ball.owner?.side === 'home';
        const idealX = Math.max(-PITCH.halfW + 45, Math.min(PITCH.halfW - 45, up.homeX + g.ball.x * 0.38 + (teamHas ? 85 : -40)));
        const idealY = Math.max(-PITCH.halfH + 28, Math.min(PITCH.halfH - 28, up.homeY + g.ball.y * 0.28));
        if (Math.hypot(up.x - idealX, up.y - idealY) > 48) {
          const ip = worldToScreen(idealX, idealY, 0, camOverride);
          const rx = Math.round(10 * ip.scale);
          const ry = Math.round(5 * ip.scale);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
          ctx.fillRect(ip.x - rx, ip.y - ry, rx * 2, ry * 2);
          ctx.strokeStyle = '#6ee7b7';
          ctx.lineWidth = 1;
          ctx.strokeRect(ip.x - rx, ip.y - ry, rx * 2, ry * 2);
          ctx.font = '700 6px Silkscreen, monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#6ee7b7';
          ctx.fillText(`POS (${up.data.role})`, ip.x, ip.y + ry + 8);
          ctx.textAlign = 'left';
        }
      }

      // 3D Pixel Art Goals with Cyan/White Stanchions & Crisp Grid Net
      const drawGoal = (sideSign: number, ripple: number) => {
        const gx = PITCH.halfW * sideSign;
        const backX = (PITCH.halfW + PITCH.goalDepth) * sideSign + Math.sin(ripple * 18) * ripple * 6.5 * sideSign;
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
          'rgba(6, 20, 14, 0.32)'
        );

        const netC = 'rgba(240, 253, 250, 0.65)';
        for (let i = 1; i <= 10; i++) {
          const ny = topY + ((botY - topY) * i) / 11;
          drawProjectedLine(backX, ny, 0, backX, ny, gh, netC, 1);
          drawProjectedLine(gx, ny, gh, backX, ny, gh, netC, 1);
        }
        for (let j = 1; j <= 5; j++) {
          const nz = (gh * j) / 6;
          drawProjectedLine(backX, topY, nz, backX, botY, nz, netC, 1);
          drawProjectedLine(gx, topY, nz, backX, topY, nz, netC, 1);
          drawProjectedLine(gx, botY, nz, backX, botY, nz, netC, 1);
        }

        // Rear support frame (teal/slate pixel beams)
        drawProjectedLine(gx, topY, gh, backX, topY, gh, '#94a3b8', 2);
        drawProjectedLine(gx, botY, gh, backX, botY, gh, '#94a3b8', 2);
        drawProjectedLine(backX, topY, 0, backX, topY, gh, '#0e7490', 2);
        drawProjectedLine(backX, botY, 0, backX, botY, gh, '#0e7490', 2);
        drawProjectedLine(backX, topY, 0, backX, botY, 0, '#0f172a', 2);

        // Front Pixel Goal Posts & Crossbar
        drawProjectedLine(gx, topY, 0, gx, topY, gh, '#0e7490', 4);
        drawProjectedLine(gx, topY, 0, gx, topY, gh, '#ffffff', 2);
        drawProjectedLine(gx, botY, 0, gx, botY, gh, '#0e7490', 4);
        drawProjectedLine(gx, botY, 0, gx, botY, gh, '#ffffff', 2);
        drawProjectedLine(gx, topY, gh, gx, botY, gh, '#94a3b8', 4);
        drawProjectedLine(gx, topY, gh, gx, botY, gh, '#ffffff', 2);
      };

      const activeBall = snap ? snap.ball : g.ball;
      const drawBall = () => {
        const sh = worldToScreen(activeBall.x, activeBall.y, 0, camOverride);
        if (activeBall.z > 4) {
          // Crisp Pixel Cup Soccer dark dash shadow when ball is airborne
          const dashW = Math.max(5, Math.round((8 - activeBall.z * 0.04) * sh.scale));
          ctx.fillStyle = 'rgba(6, 20, 12, 0.72)';
          ctx.fillRect(sh.x - Math.floor(dashW / 2), sh.y, dashW, 2);
        } else {
          ctx.fillStyle = 'rgba(6, 20, 12, 0.48)';
          ctx.fillRect(sh.x - 4, sh.y, 8, 2);
          ctx.fillRect(sh.x - 3, sh.y - 1, 6, 4);
        }

        const pos = worldToScreen(activeBall.x, activeBall.y, activeBall.z, camOverride);
        const r = Math.max(4, Math.round(4.6 * pos.scale));
        drawSoccerBallHD(ctx, pos.x, Math.round(pos.y - r * 0.72), r, activeBall.spin);
      };

      const drawables: { y: number; fn: () => void }[] = [
        { y: -PITCH.goalHalfW - 2, fn: () => drawGoal(-1, g.netRippleLeft) },
        { y: -PITCH.goalHalfW - 1, fn: () => drawGoal(1, g.netRippleRight) }
      ];

      // Draw Pixel Referee
      const refX = snap ? snap.refX : g.ref.x;
      const refY = snap ? snap.refY : g.ref.y;
      drawables.push({
        y: refY,
        fn: () => {
          const rp = worldToScreen(refX, refY, 0, camOverride);
          drawHDPlayerSprite(
            ctx,
            rp.x,
            rp.y,
            0.88 * rp.scale,
            REFEREE_SPEC,
            config.homeTeam,
            false,
            {
              dirX: snap ? snap.refDir : g.ref.dirX,
              frame: snap ? snap.refFrame : g.ref.frame,
              animTime: snap ? snap.refAnimTime : g.ref.animTime,
              action: 'run',
              shadow: true,
              isReferee: true
            }
          );
        }
      });

      // Draw Pixel Players
      for (const pl of g.players) {
        const snapP = snap ? snap.players.find((sp) => sp.id === pl.id) : null;
        const isEjected = snapP ? snapP.ejected : pl.ejected;
        if (isEjected) continue;

        const wx = snapP ? snapP.x : pl.x;
        const wy = snapP ? snapP.y : pl.y;
        const dirX = snapP ? snapP.dirX : pl.dirX;
        const frame = snapP ? snapP.frame : pl.frame;
        const animTime = snapP ? snapP.animTime : pl.animTime;
        const action = snapP ? snapP.action : pl.action;
        const diveDir = snapP ? snapP.diveDir : pl.diveDir;

        drawables.push({
          y: wy,
          fn: () => {
            const pos = worldToScreen(wx, wy, 0, camOverride);
            const px = pos.x;
            const py = pos.y;
            const sc = 0.92 * pos.scale;

            const isP1 = pl === g.activeHome;
            const isP2 = isTwoPlayer && pl === g.activeAway;
            const isCarrier = snap ? snap.ball.ownerId === pl.id : g.ball.owner === pl;

            // Iconic Pixel Cup Soccer 4-Arc Segmented Selector Ring
            if (isP1 || isP2 || isCarrier) {
              const col = isP2 && !isP1 ? '#fb7185' : '#22d3ee';
              const rx = 11 * pos.scale;
              const ry = 4.6 * pos.scale;
              ctx.save();
              ctx.strokeStyle = col;
              ctx.lineWidth = 2;
              const arcs = [
                [0.2, 1.25],
                [1.8, 2.9],
                [3.35, 4.4],
                [4.95, 6.0]
              ];
              for (const [a0, a1] of arcs) {
                ctx.beginPath();
                ctx.ellipse(px, py + 1, rx, ry, 0, a0, a1);
                ctx.stroke();
              }
              ctx.restore();
            }

            if (!snap && ((isP1 && g.p1Charging) || (isP2 && g.p2Charging))) {
              const pwr = isP1 ? g.p1Power : g.p2Power;
              const bw = Math.round(24 * pos.scale);
              ctx.fillStyle = '#090d16';
              ctx.fillRect(px - Math.floor(bw / 2), py + 5, bw, 4);
              ctx.fillStyle = pwr > 0.7 ? '#ef4444' : pwr > 0.4 ? '#facc15' : '#22c55e';
              ctx.fillRect(px - Math.floor(bw / 2) + 1, py + 6, Math.max(2, Math.round((bw - 2) * pwr)), 2);
            }

            drawHDPlayerSprite(ctx, px, py, sc, pl.data, pl.team, pl.useAway, {
              dirX,
              frame,
              animTime,
              action,
              diveDir,
              shadow: true
            });

            // Crisp Pixel Triangle Indicator above controlled player
            if (isP1 || isP2) {
              const bob = Math.round(Math.sin(performance.now() * 0.009) * 1.5);
              const ay = Math.round(py - 33 * sc + bob);
              const col = isP1 ? '#22d3ee' : '#fb7185';
              ctx.fillStyle = '#111111';
              ctx.fillRect(px - 4, ay - 5, 8, 2);
              ctx.fillRect(px - 3, ay - 3, 6, 2);
              ctx.fillRect(px - 2, ay - 1, 4, 1);
              ctx.fillRect(px - 1, ay, 2, 1);
              ctx.fillStyle = col;
              ctx.fillRect(px - 3, ay - 4, 6, 1);
              ctx.fillRect(px - 2, ay - 3, 4, 2);
              ctx.fillRect(px - 1, ay - 1, 2, 1);
            }

            // Crisp Pixel Nameplate
            if (isCarrier || isP1) {
              const lbl = `${pl.data.num}. ${pl.data.name}`;
              ctx.font = '700 6px Silkscreen, monospace';
              ctx.textAlign = 'center';
              ctx.lineWidth = 2;
              ctx.strokeStyle = '#090d16';
              ctx.strokeText(lbl, px, Math.round(py - 40 * sc));
              ctx.fillStyle = '#ffffff';
              ctx.fillText(lbl, px, Math.round(py - 40 * sc));
              ctx.textAlign = 'left';
            }
          }
        });
      }

      drawables.push({ y: activeBall.y + 0.5, fn: drawBall });
      drawables.sort((a, b) => a.y - b.y);
      for (const d of drawables) d.fn();

      // Pixel Square Turf/Dust/Confetti Particles
      for (const pt of g.particles) {
        const s = worldToScreen(pt.x, pt.y, pt.z, camOverride);
        const psz = Math.max(2, Math.round(pt.size * 0.65));
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, pt.life / pt.maxLife));
        ctx.fillRect(s.x - Math.floor(psz / 2), s.y - Math.floor(psz / 2), psz, psz);
      }
      ctx.globalAlpha = 1;

      if (weather === 'night') {
        const grad = ctx.createRadialGradient(CANVAS_W * 0.5, CANVAS_H * 0.52, 90, CANVAS_W * 0.5, CANVAS_H * 0.52, 370);
        grad.addColorStop(0, 'rgba(255, 255, 230, 0.03)');
        grad.addColorStop(1, 'rgba(4, 10, 22, 0.42)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      } else if (weather === 'rain') {
        for (const rd of g.rainDrops) {
          plotPixelLine(rd.x, rd.y, rd.x - 3, rd.y + 10, 'rgba(203, 213, 225, 0.36)', 1);
        }
      }

      // Yellow / Red Card Toast Pixel Banner
      if (g.cardBanner && g.state !== 'REPLAY') {
        ctx.fillStyle = 'rgba(9, 15, 24, 0.94)';
        ctx.fillRect(195, 56, 250, 32);
        ctx.strokeStyle = g.cardBanner.color === 'red' ? '#ef4444' : '#facc15';
        ctx.lineWidth = 2;
        ctx.strokeRect(195, 56, 250, 32);

        ctx.fillStyle = g.cardBanner.color === 'red' ? '#ef4444' : '#facc15';
        ctx.fillRect(204, 62, 12, 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 8px Silkscreen, monospace';
        ctx.fillText(
          `${g.cardBanner.color === 'red' ? 'EXPULSO' : 'AMARELO'}: ${g.cardBanner.playerName} (${g.cardBanner.abbr})`,
          224,
          75
        );
      }

      // Goal / Event Pixel Banner
      if (g.bannerTimer > 0 && g.state !== 'REPLAY' && g.state !== 'PRE_MATCH') {
        const bw = 310;
        const bh = 48;
        const bx = Math.round(CANVAS_W * 0.5 - bw * 0.5);
        const by = 68;
        ctx.fillStyle = 'rgba(9, 15, 24, 0.92)';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#facc15';
        ctx.font = '700 16px Silkscreen, monospace';
        ctx.fillText(g.bannerText, CANVAS_W * 0.5, by + 23);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 8px Silkscreen, monospace';
        ctx.fillText(g.bannerSub, CANVAS_W * 0.5, by + 38, bw - 16);
        ctx.textAlign = 'left';
      }

      ctx.restore();

      // Pixel-Art Tactical Radar Minimap
      const rc = radarRef.current;
      if (rc) {
        const rctx = rc.getContext('2d');
        if (rctx) {
          rctx.imageSmoothingEnabled = false;
          rctx.clearRect(0, 0, rc.width, rc.height);
          rctx.fillStyle = '#15803d';
          rctx.fillRect(0, 0, rc.width, rc.height);
          rctx.fillStyle = '#166534';
          for (let sx = 0; sx < rc.width; sx += 20) {
            rctx.fillRect(sx, 0, 10, rc.height);
          }

          rctx.strokeStyle = 'rgba(240, 253, 244, 0.85)';
          rctx.lineWidth = 1;
          rctx.strokeRect(3.5, 3.5, rc.width - 7, rc.height - 7);
          rctx.beginPath();
          rctx.moveTo(Math.round(rc.width / 2) + 0.5, 4);
          rctx.lineTo(Math.round(rc.width / 2) + 0.5, rc.height - 4);
          rctx.stroke();
          rctx.strokeRect(Math.round(rc.width / 2) - 9, Math.round(rc.height / 2) - 9, 18, 18);
          rctx.strokeRect(3.5, 16.5, 18, rc.height - 33);
          rctx.strokeRect(rc.width - 21.5, 16.5, 18, rc.height - 33);

          for (const pl of g.players) {
            const sp = snap ? snap.players.find((x) => x.id === pl.id) : null;
            if (sp ? sp.ejected : pl.ejected) continue;
            const px = sp ? sp.x : pl.x;
            const py = sp ? sp.y : pl.y;
            const rx = Math.round(((px + PITCH.halfW) / (PITCH.halfW * 2)) * (rc.width - 12) + 6);
            const ry = Math.round(((py + PITCH.halfH) / (PITCH.halfH * 2)) * (rc.height - 12) + 6);
            rctx.fillStyle = '#090d16';
            rctx.fillRect(rx - 3, ry - 3, 6, 6);
            rctx.fillStyle = pl.side === 'home' ? '#38bdf8' : '#ef4444';
            rctx.fillRect(rx - 2, ry - 2, 4, 4);
          }

          const brx = Math.round(((activeBall.x + PITCH.halfW) / (PITCH.halfW * 2)) * (rc.width - 12) + 6);
          const bry = Math.round(((activeBall.y + PITCH.halfH) / (PITCH.halfH * 2)) * (rc.height - 12) + 6);
          rctx.fillStyle = '#090d16';
          rctx.fillRect(brx - 3, bry - 3, 6, 6);
          rctx.fillStyle = '#ffffff';
          rctx.fillRect(brx - 2, bry - 2, 4, 4);
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
          p2Stamina: Math.round(p2 ? p2.stamina : 100),
          setPieceHint: hint
        });

        if (isTraining) {
          setTrainingHud({
            points: g.training.points,
            streak: g.training.streak,
            attempts: g.training.attempts,
            goals: g.training.goals,
            penHistory: [...g.training.penHistory]
          });
        }

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
    <div className="relative w-full h-full flex items-center justify-center bg-[#07130d] overflow-hidden">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="block w-full h-full max-w-[177.78vh] max-h-[56.25vw] shadow-2xl pixelated"
      />

      {/* Pixel Cup Soccer Inspired Broadcast HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 z-10">
        <div className="relative flex items-start justify-between gap-2">
          {/* Top-Left Commentary & Training Controls */}
          <div className="flex flex-col items-start gap-1.5 mt-14 lg:mt-0 max-w-[230px] xl:max-w-[290px]">
            <div className="bg-slate-950/88 border-2 border-slate-900 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-amber-200 shadow-lg truncate max-w-full">
              {commentary}
            </div>

            {hudState.setPieceHint && (
              <div className="bg-amber-400 text-slate-950 border-2 border-slate-950 rounded-lg px-2.5 py-1 text-[11px] font-extrabold shadow-lg">
                {hudState.setPieceHint}
              </div>
            )}

            {/* Interactive Training Arena Challenge Selector */}
            {config.mode === 'training' && (
              <div className="pointer-events-auto flex flex-wrap items-center gap-1 bg-slate-950/92 border-2 border-slate-900 rounded-xl p-1.5 shadow-xl">
                {(
                  [
                    ['free', 'Livre'],
                    ['free_kicks', 'Faltas'],
                    ['penalties', 'Pênaltis'],
                    ['finishing_cross', 'Cruzamentos']
                  ] as const
                ).map(([tId, tLabel]) => (
                  <button
                    key={tId}
                    type="button"
                    onClick={() => {
                      setTrainingMode(tId);
                      trainingModeRef.current = tId;
                      resetTrainingRef.current = true;
                    }}
                    className={`min-h-[28px] px-2 rounded-lg text-[10px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition ${
                      trainingMode === tId
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {tLabel}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    resetTrainingRef.current = true;
                  }}
                  className="min-h-[28px] px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-amber-300 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Reiniciar
                </button>
                {trainingMode !== 'free' && (
                  <div className="flex items-center gap-2 px-1.5 text-[10px] font-mono font-bold text-slate-200 tabular-nums border-l border-white/15">
                    <span className="text-amber-300">{trainingHud.points} pts</span>
                    <span>{trainingHud.streak}x</span>
                    {trainingMode === 'penalties' ? (
                      <span className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => {
                          const res = trainingHud.penHistory[i];
                          return (
                            <span
                              key={i}
                              className={`w-2 h-2 rounded-full inline-block ${
                                res === 'goal' ? 'bg-emerald-400' : res === 'miss' ? 'bg-rose-500' : 'bg-slate-700'
                              }`}
                            />
                          );
                        })}
                      </span>
                    ) : (
                      <span>{trainingHud.goals}/{trainingHud.attempts}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top-Center Pixel Cup Soccer Pill Scoreboard */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center pointer-events-none">
            <div className="px-3 py-0.5 bg-slate-800/95 border-2 border-b-0 border-slate-950 rounded-t-lg font-pixel text-[10px] sm:text-xs text-white tracking-wider shadow">
              {hudState.clockText}
            </div>
            <div className="flex items-center bg-slate-700/95 border-2 border-slate-950 rounded-full px-1.5 py-0.5 shadow-2xl tabular-nums">
              <div className="flex items-center gap-1.5 pl-1 pr-2">
                <canvas ref={homeJerseyRef} width={36} height={36} className="pixelated w-5 h-5 sm:w-6 sm:h-6" />
                <canvas ref={homeCrestRef} width={48} height={48} className="pixelated w-5 h-5 sm:w-6 sm:h-6" />
                <span className="font-pixel text-[11px] sm:text-sm text-white drop-shadow-[0_1px_0_#000]">
                  {config.homeTeam.abbr}
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-0.5 bg-[#8b2c2c] border-2 border-slate-950 rounded-full font-pixel text-sm sm:text-base text-white drop-shadow-[0_1px_0_#000]">
                <span>{hudState.homeScore}</span>
                <span className="text-rose-200">-</span>
                <span>{hudState.awayScore}</span>
              </div>

              <div className="flex items-center gap-1.5 pr-1 pl-2">
                <span className="font-pixel text-[11px] sm:text-sm text-white drop-shadow-[0_1px_0_#000]">
                  {config.awayTeam.abbr}
                </span>
                <canvas ref={awayCrestRef} width={48} height={48} className="pixelated w-5 h-5 sm:w-6 sm:h-6" />
                <canvas ref={awayJerseyRef} width={36} height={36} className="pixelated w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>

          {/* Top-Right TV Watermark & Controls */}
          <div className="flex flex-wrap items-center justify-end gap-1.5 pointer-events-auto mt-14 lg:mt-0">
            {isReplay ? (
              <div className="flex items-center gap-2 bg-rose-600/95 border-2 border-white/40 rounded-lg px-2.5 py-1 text-[11px] font-pixel text-white shadow-lg">
                <span>BRFC ● REPLAY</span>
              </div>
            ) : (
              <div className="hidden xl:block text-[10px] font-bold text-slate-200 bg-slate-950/85 border-2 border-slate-900 rounded-lg px-2.5 py-1">
                {config.mode === 'training' ? 'Treino' : `${DIFFICULTIES[config.difficulty].label} · ${WEATHER_LABELS[weather]}`}
              </div>
            )}
            {isReplay && (
              <button
                type="button"
                onClick={() => {
                  skipReplayRef.current = true;
                }}
                className="min-h-[30px] px-2.5 rounded-lg border-2 border-slate-950 bg-amber-400 text-[11px] font-extrabold text-slate-950 cursor-pointer shadow"
              >
                Pular Replay
              </button>
            )}
            <button
              type="button"
              onClick={() => setVoiceOn(Narrator.setVoiceEnabled(!Narrator.isVoiceEnabled()))}
              className="min-h-[30px] px-2.5 rounded-lg border-2 border-slate-900 bg-slate-950/90 text-[11px] font-bold text-slate-100 hover:bg-slate-800 cursor-pointer"
            >
              {voiceOn ? 'Voz: ON' : 'Voz: OFF'}
            </button>
            <button
              type="button"
              onClick={() => setMuted(AudioFX.setMuted(!AudioFX.isMuted()))}
              className="min-h-[30px] px-2.5 rounded-lg border-2 border-slate-900 bg-slate-950/90 text-[11px] font-bold text-slate-100 hover:bg-slate-800 cursor-pointer"
            >
              {muted ? 'Som: OFF' : 'Som: ON'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPauseTab('menu');
                setPaused((p) => !p);
              }}
              className="min-h-[30px] px-2.5 rounded-lg border-2 border-slate-900 bg-slate-950/90 text-[11px] font-bold text-slate-100 hover:bg-slate-800 cursor-pointer"
            >
              Pausa
            </button>
          </div>
        </div>

        {/* Bottom Pixel Cup Soccer Strip: P1 Gauges | Pixel Radar | P2 Gauges */}
        <div className="flex items-end justify-between gap-2 sm:gap-4">
          <div className="flex flex-col gap-1 bg-slate-950/80 border-2 border-slate-900 rounded-lg px-2.5 py-1.5 shadow-xl">
            <div className="flex items-center gap-1.5">
              <div className="grid grid-cols-8 gap-0.5 w-24 sm:w-28 h-2.5 bg-slate-900 p-0.5 border border-slate-950">
                {Array.from({ length: 8 }).map((_, idx) => {
                  const active = hudState.p1Power >= (idx + 1) * 12.5;
                  return (
                    <span
                      key={idx}
                      className={
                        active
                          ? idx >= 6
                            ? 'bg-rose-500'
                            : idx >= 4
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                          : 'bg-slate-700/60'
                      }
                    />
                  );
                })}
              </div>
              <span className="font-pixel text-[9px] text-amber-300">CHUTE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-24 sm:w-28 h-2.5 bg-slate-900 p-0.5 border border-slate-950">
                <div className="h-full bg-cyan-400 transition-all duration-75" style={{ width: `${hudState.p1Stamina}%` }} />
              </div>
              <span className="font-pixel text-[9px] text-cyan-300">FÔLEGO</span>
            </div>
            <div className="font-pixel text-[10px] sm:text-xs text-white tracking-wide drop-shadow-[0_1px_0_#000] tabular-nums">
              {hudState.p1Num}. {hudState.p1Name.toUpperCase()} <span className="text-cyan-300">.{hudState.p1Role.slice(0, 2)}</span>
            </div>
          </div>

          <canvas
            ref={radarRef}
            width={160}
            height={76}
            className="pixelated w-[148px] h-[70px] sm:w-[196px] sm:h-[92px] border-2 border-white/65 rounded bg-emerald-900 shadow-2xl"
          />

          <div className="flex flex-col items-end gap-1 bg-slate-950/80 border-2 border-slate-900 rounded-lg px-2.5 py-1.5 shadow-xl">
            <div className="flex items-center gap-1.5">
              <span className="font-pixel text-[9px] text-amber-300">CHUTE</span>
              <div className="grid grid-cols-8 gap-0.5 w-24 sm:w-28 h-2.5 bg-slate-900 p-0.5 border border-slate-950">
                {Array.from({ length: 8 }).map((_, idx) => {
                  const active = hudState.p2Power >= (idx + 1) * 12.5;
                  return (
                    <span
                      key={idx}
                      className={
                        active
                          ? idx >= 6
                            ? 'bg-rose-500'
                            : idx >= 4
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                          : 'bg-slate-700/60'
                      }
                    />
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-pixel text-[9px] text-rose-300">FÔLEGO</span>
              <div className="w-24 sm:w-28 h-2.5 bg-slate-900 p-0.5 border border-slate-950">
                <div className="h-full bg-rose-400 transition-all duration-75" style={{ width: `${hudState.p2Stamina}%` }} />
              </div>
            </div>
            <div className="font-pixel text-[10px] sm:text-xs text-white tracking-wide drop-shadow-[0_1px_0_#000] tabular-nums">
              {hudState.p2Num}. {hudState.p2Name.toUpperCase()} <span className="text-rose-300">.{hudState.p2Role.slice(0, 2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Pre-Match Lineup Presentation Overlay */}
      {isPreMatch && (
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm z-20 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-950/95 border border-amber-400/35 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-display text-xs font-extrabold uppercase tracking-wider text-amber-400">
                BRFC · Escalações Confirmadas
              </span>
              <span className="text-xs font-semibold text-slate-300">{WEATHER_LABELS[weather]}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/90 border border-white/10 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2.5 border-b border-white/10 pb-2">
                  <ClubCrest team={config.homeTeam} className="w-7 h-7" />
                  <div>
                    <div className="text-sm font-extrabold text-white">{config.homeTeam.name}</div>
                    <div className="text-[11px] font-bold text-emerald-400">Esquema {formation}</div>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  {config.homeTeam.players.map((pl) => (
                    <div key={pl.num + pl.name} className="flex justify-between text-slate-200">
                      <span>
                        <strong className="text-amber-400 font-mono">#{pl.num}</strong> {pl.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">{pl.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/90 border border-white/10 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2.5 border-b border-white/10 pb-2">
                  <ClubCrest team={config.awayTeam} className="w-7 h-7" />
                  <div>
                    <div className="text-sm font-extrabold text-white">{config.awayTeam.name}</div>
                    <div className="text-[11px] font-bold text-rose-400">Esquema 4-3-3</div>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  {config.awayTeam.players.map((pl) => (
                    <div key={pl.num + pl.name} className="flex justify-between text-slate-200">
                      <span>
                        <strong className="text-amber-400 font-mono">#{pl.num}</strong> {pl.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">{pl.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Pressione Espaço ou K para dar a saída</span>
              <button
                type="button"
                onClick={() => {
                  skipPreMatchRef.current = true;
                }}
                className="min-h-[38px] px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-extrabold text-white cursor-pointer"
              >
                Iniciar Partida →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause & Squad Management Modal */}
      {paused && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-950 border border-white/15 rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <h2 className="font-display text-xl font-black text-amber-400">
                {pauseTab === 'menu' ? 'Jogo Pausado' : `Gerenciamento de Elenco · ${config.homeTeam.abbr}`}
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPauseTab('menu')}
                  className={`min-h-[34px] px-3.5 rounded-lg text-xs font-bold cursor-pointer ${
                    pauseTab === 'menu' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  Resumo & Controles
                </button>
                <button
                  type="button"
                  onClick={() => setPauseTab('squad')}
                  className={`min-h-[34px] px-3.5 rounded-lg text-xs font-bold cursor-pointer ${
                    pauseTab === 'squad' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  Gerenciamento de Elenco
                </button>
              </div>
            </div>

            {pauseTab === 'menu' ? (
              <div className="space-y-4 text-left">
                <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 space-y-2 text-xs text-slate-300">
                  <div className="font-display font-extrabold text-white uppercase mb-1">Comandos da Partida</div>
                  <div>
                    <strong className="text-amber-400">WASD / Setas:</strong> Movimentar jogador
                  </div>
                  <div>
                    <strong className="text-amber-400">Shift:</strong> Trocar marcador (sem posse) / Sprint (segurar correndo)
                  </div>
                  <div>
                    <strong className="text-amber-400">J:</strong> Passe rasteiro curto · <strong className="text-amber-400">H:</strong> Passe em profundidade (enfiada)
                  </div>
                  <div>
                    <strong className="text-amber-400">L:</strong> Cruzamento / Lançamento alto · <strong className="text-amber-400">Espaço:</strong> Proteger bola / Corte de corpo
                  </div>
                  <div>
                    <strong className="text-amber-400">K:</strong> Chute colocado/potente (segure) · Carrinho (sem posse) · Voleio (bola no ar)
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-900/70 border border-white/10 rounded-xl p-3 space-y-2">
                    <div className="text-[11px] font-extrabold uppercase text-slate-400">Esquema Tático</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['4-3-3', '4-4-2', '4-2-3-1', '3-5-2'] as FormationId[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFormation(f)}
                          className={`min-h-[34px] rounded-lg border text-xs font-bold cursor-pointer ${
                            formation === f
                              ? 'bg-emerald-600 border-amber-400 text-white'
                              : 'bg-slate-950 border-white/10 text-slate-300'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900/70 border border-white/10 rounded-xl p-3 space-y-2">
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
                          className={`min-h-[34px] rounded-lg border text-[11px] font-bold cursor-pointer ${
                            mentality === mId
                              ? 'bg-emerald-600 border-amber-400 text-white'
                              : 'bg-slate-950 border-white/10 text-slate-300'
                          }`}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/70 border border-white/10 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-slate-300">
                      Substituições ({subsUsed}/5 usadas)
                    </span>
                    <span className="text-[11px] text-amber-400">
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
                          className={`w-full px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-xs cursor-pointer disabled:opacity-45 ${
                            selectedSubStarterIdx === pl.slotIdx
                              ? 'bg-amber-400/20 border-amber-400 text-white'
                              : 'bg-slate-950 border-white/10 text-slate-200'
                          }`}
                        >
                          <span className="font-bold truncate">
                            #{pl.num} {pl.name} ({pl.role}) {pl.yellowCards > 0 ? '🟨' : ''} {pl.ejected ? '🟥' : ''}
                          </span>
                          <span
                            className={`font-mono text-[11px] font-bold ${
                              pl.stamina < 45 ? 'text-rose-400' : pl.stamina < 70 ? 'text-amber-400' : 'text-emerald-400'
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
                          className="w-full px-2.5 py-1.5 rounded-lg border bg-slate-950 border-white/10 hover:border-emerald-400 disabled:opacity-40 flex items-center justify-between text-xs text-slate-200 cursor-pointer"
                        >
                          <span className="font-bold truncate">
                            #{b.num} {b.name} ({b.role})
                          </span>
                          <span className="font-mono text-[11px] text-amber-400">OVR {b.ovr}</span>
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
                className="min-h-[40px] px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white cursor-pointer"
              >
                Continuar Partida
              </button>
              <button
                type="button"
                onClick={onExit}
                className="min-h-[40px] px-5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-sm font-bold text-white cursor-pointer"
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

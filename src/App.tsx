import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AudioFX } from './audio/sound';
import { ClubCrest, KitSwatch, PlayerSpritePreview } from './components/ClubPreview';
import { OfflineIndicator, PWAInstallButton } from './components/PWAPrompt';
import { DIFFICULTIES, LEAGUES, TEAMS, isKitClash } from './data/leagues';
import { MatchCanvas } from './game/MatchCanvas';
import { CareerView } from './modes/CareerView';
import { OnlineAuthSession, OnlineView } from './modes/OnlineView';
import { TournamentView } from './modes/TournamentView';
import {
  DifficultyId,
  FormationId,
  MatchConfig,
  MatchResult,
  TeamSpec,
  TrainingChallengeId,
  WeatherId
} from './types';

type Screen = 'HOME' | 'QUICK' | 'CAREER' | 'TOURNAMENT' | 'ONLINE' | 'PLAYING' | 'RESULT';

function calcTeamRatings(team: TeamSpec) {
  const gk = team.players.find((p) => p.role === 'GOL')?.ovr || team.ovr;
  const defList = team.players.filter((p) => p.role === 'ZAG');
  const midList = team.players.filter((p) => p.role === 'MEI');
  const atkList = team.players.filter((p) => p.role === 'ATA');

  const avg = (arr: typeof team.players, fallback: number) =>
    arr.length ? Math.round(arr.reduce((s, p) => s + p.ovr, 0) / arr.length) : fallback;

  return {
    atk: avg(atkList, team.ovr),
    mid: avg(midList, team.ovr),
    def: Math.round((avg(defList, team.ovr) + gk) / 2)
  };
}

const StadiumNightBackdrop: React.FC = () => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const motes = Array.from({ length: 46 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.9 + Math.random() * 1.9,
      vy: 0.012 + Math.random() * 0.025,
      vx: (Math.random() - 0.5) * 0.01,
      a: 0.14 + Math.random() * 0.32
    }));

    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = (canvas.width = window.innerWidth);
      const h = (canvas.height = window.innerHeight);

      // Vibrant night stadium atmosphere
      const bg = ctx.createRadialGradient(w * 0.52, h * 0.18, 40, w * 0.5, h * 0.55, Math.max(w, h) * 0.85);
      bg.addColorStop(0, '#12422d');
      bg.addColorStop(0.45, '#091f1a');
      bg.addColorStop(1, '#050b16');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Sweeping Stadium Floodlight Cones
      const t = now * 0.00035;
      const drawBeam = (ox: number, oy: number, angle: number, spread: number, col: string) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        const len = Math.max(w, h) * 1.15;
        ctx.lineTo(ox + Math.cos(angle - spread) * len, oy + Math.sin(angle - spread) * len);
        ctx.lineTo(ox + Math.cos(angle + spread) * len, oy + Math.sin(angle + spread) * len);
        ctx.closePath();
        const g = ctx.createLinearGradient(ox, oy, ox + Math.cos(angle) * len * 0.7, oy + Math.sin(angle) * len * 0.7);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
      };

      drawBeam(w * 0.12, -20, Math.PI * 0.34 + Math.sin(t) * 0.07, 0.16, 'rgba(34, 211, 238, 0.11)');
      drawBeam(w * 0.88, -20, Math.PI * 0.66 + Math.cos(t * 0.9) * 0.07, 0.16, 'rgba(250, 204, 21, 0.1)');
      drawBeam(w * 0.5, -40, Math.PI * 0.5 + Math.sin(t * 0.6) * 0.04, 0.22, 'rgba(52, 211, 153, 0.09)');

      // Subtle turf perspective lines near bottom edge
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.96, w * 0.24, h * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Floating stadium light motes
      for (const m of motes) {
        m.y -= m.vy * dt;
        m.x += m.vx * dt;
        if (m.y < -0.02) {
          m.y = 1.02;
          m.x = Math.random();
        }
        ctx.fillStyle = `rgba(253, 224, 71, ${m.a})`;
        ctx.beginPath();
        ctx.arc(m.x * w, m.y * h, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className="fixed inset-0 pointer-events-none w-full h-full" />;
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('HOME');
  const [muted, setMuted] = useState(AudioFX.isMuted());
  const [onlineSession, setOnlineSession] = useState<OnlineAuthSession | null>(null);

  // Quick Match / 2P / Training state
  const [quickMode, setQuickMode] = useState<'quick' | 'two_player' | 'training'>('quick');
  const [trainingChallenge, setTrainingChallenge] = useState<TrainingChallengeId>('free');
  const [difficulty, setDifficulty] = useState<DifficultyId>('amador');
  const [weather, setWeather] = useState<WeatherId>('night');
  const [formation, setFormation] = useState<FormationId>('4-3-3');
  const [matchMinutes, setMatchMinutes] = useState<3 | 5 | 8>(3);
  const [homeLeague, setHomeLeague] = useState('brasileirao');
  const [awayLeague, setAwayLeague] = useState('brasileirao');
  const [homeTeamId, setHomeTeamId] = useState('flamengo');
  const [awayTeamId, setAwayTeamId] = useState('palmeiras');
  const [homeKitReserve, setHomeKitReserve] = useState(false);
  const [awayKitReserve, setAwayKitReserve] = useState(false);

  const [activeMatch, setActiveMatch] = useState<MatchConfig | null>(null);
  const [lastResult, setLastResult] = useState<MatchResult | null>(null);
  const returnScreenRef = useRef<Screen>('QUICK');
  const matchCallbackRef = useRef<((res: MatchResult) => void) | null>(null);

  const homeLeagueTeams = useMemo(() => TEAMS.filter((t) => t.leagueId === homeLeague), [homeLeague]);
  const awayLeagueTeams = useMemo(() => TEAMS.filter((t) => t.leagueId === awayLeague), [awayLeague]);

  const homeTeam = TEAMS.find((t) => t.id === homeTeamId) || homeLeagueTeams[0];
  const awayTeam = TEAMS.find((t) => t.id === awayTeamId) || awayLeagueTeams[0];
  const autoClash = isKitClash(homeTeam, awayTeam) && !homeKitReserve && !awayKitReserve;

  const homeRatings = useMemo(() => calcTeamRatings(homeTeam), [homeTeam]);
  const awayRatings = useMemo(() => calcTeamRatings(awayTeam), [awayTeam]);

  const spotlightTeam = TEAMS.find((t) => t.id === 'flamengo') || TEAMS[0];
  const spotlightStar = spotlightTeam.players[4];
  const derbyAway = TEAMS.find((t) => t.id === 'palmeiras') || TEAMS[1];

  const launchMatch = (cfg: MatchConfig, fromScreen: Screen, cb?: (res: MatchResult) => void) => {
    returnScreenRef.current = fromScreen;
    matchCallbackRef.current = cb || null;
    setActiveMatch(cfg);
    setScreen('PLAYING');
  };

  const handleMatchFinish = (res: MatchResult) => {
    setLastResult(res);
    if (matchCallbackRef.current) {
      matchCallbackRef.current(res);
    }
    setScreen('RESULT');
  };

  const toggleMute = () => setMuted(AudioFX.setMuted(!AudioFX.isMuted()));

  const isOnlineMatch =
    activeMatch?.mode === 'online_host' || activeMatch?.mode === 'online_guest';
  const keepOnlineAlive =
    screen === 'ONLINE' ||
    ((screen === 'PLAYING' || screen === 'RESULT') && isOnlineMatch);

  return (
    <>
      {screen === 'PLAYING' && activeMatch && (
        <div className="w-screen h-[100dvh] bg-[#07130d] overflow-hidden">
          <MatchCanvas
            config={activeMatch}
            onFinish={handleMatchFinish}
            onExit={() => setScreen(returnScreenRef.current)}
          />
        </div>
      )}

      {screen !== 'PLAYING' && (
        <div className="w-screen min-h-[100dvh] bg-[#04070d] text-slate-100 flex items-center justify-center p-3 sm:p-6 overflow-y-auto relative">
          <StadiumNightBackdrop />

          <div className="relative z-10 w-full max-w-6xl">
        {/* ==================== CINEMATIC EA FC HOME SCREEN ==================== */}
        {screen === 'HOME' && (
          <div className="space-y-4 sm:space-y-5">
            {/* Top Broadcast Header */}
            <header className="bg-slate-950/75 backdrop-blur-xl border border-white/15 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 sm:gap-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-700 to-slate-950 border border-amber-400/60 flex items-center justify-center shadow-lg shrink-0">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
                    <polygon points="12,6.8 15.6,9.5 14.2,13.8 9.8,13.8 8.4,9.5" fill="#0f172a" />
                  </svg>
                </div>
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight uppercase leading-none">
                    BR<span className="text-amber-400">FC</span>
                  </h1>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                    28 Ligas · 20 Times/Liga · Mobile &amp; PC · Online
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <OfflineIndicator />
                <PWAInstallButton />

                <div className="flex items-center bg-slate-900/90 border border-white/10 rounded-xl p-1 gap-1 overflow-x-auto max-w-full">
                  {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        AudioFX.playSelectBeep(true);
                        setDifficulty(d);
                      }}
                      className={`min-h-[34px] px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition ${
                        difficulty === d
                          ? 'bg-amber-400 text-slate-950 shadow'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {DIFFICULTIES[d].label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={toggleMute}
                  className="min-h-[40px] px-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition"
                >
                  {muted ? 'Som: Mudo' : 'Som: Ligado'}
                </button>
              </div>
            </header>

            {/* Main Grid: 4 Mode Cards (Left) + Season Spotlight Showcase (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    AudioFX.playSelectBeep(true);
                    setQuickMode('quick');
                    setScreen('QUICK');
                  }}
                  className="group relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-emerald-900/85 via-slate-900/85 to-teal-950/90 backdrop-blur-xl border border-emerald-400/50 hover:border-amber-400 text-left transition-all duration-200 hover:-translate-y-0.5 shadow-2xl cursor-pointer flex flex-col justify-between min-h-[146px]"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/25 border border-emerald-400/50 flex items-center justify-center text-amber-300">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <polygon points="6 3 20 12 6 21 6 3" />
                      </svg>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-emerald-300">1P / 2P LOCAL</span>
                  </div>
                  <div className="mt-3">
                    <div className="font-display text-xl font-black text-white group-hover:text-amber-300 transition">
                      Jogo Rápido
                    </div>
                    <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                      Escolha entre 28 ligas (20 clubes cada), uniformes titular/reserva e duração da partida.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    AudioFX.playSelectBeep(true);
                    setScreen('CAREER');
                  }}
                  className="group relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-sky-900/80 via-slate-900/85 to-indigo-950/85 backdrop-blur-xl border border-sky-400/45 hover:border-amber-400 text-left transition-all duration-200 hover:-translate-y-0.5 shadow-2xl cursor-pointer flex flex-col justify-between min-h-[146px]"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/25 border border-sky-400/50 flex items-center justify-center text-sky-300">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-sky-300">TREINADOR · JOGADOR</span>
                  </div>
                  <div className="mt-3">
                    <div className="font-display text-xl font-black text-white group-hover:text-amber-300 transition">
                      Modo Carreira
                    </div>
                    <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                      Temporada com 20 times em qualquer liga, mercado de transferências ou crie seu craque.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    AudioFX.playSelectBeep(true);
                    setScreen('TOURNAMENT');
                  }}
                  className="group relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-amber-900/75 via-slate-900/85 to-rose-950/75 backdrop-blur-xl border border-amber-400/45 hover:border-amber-300 text-left transition-all duration-200 hover:-translate-y-0.5 shadow-2xl cursor-pointer flex flex-col justify-between min-h-[146px]"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/25 border border-amber-400/50 flex items-center justify-center text-amber-300">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                        <path d="M4 22h16" />
                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                      </svg>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-amber-300">27 LIGAS · 3 COPAS</span>
                  </div>
                  <div className="mt-3">
                    <div className="font-display text-xl font-black text-white group-hover:text-amber-300 transition">
                      Torneios &amp; Copas
                    </div>
                    <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                      Séries A/B/C/D, ligas europeias e sul-americanas com 20 clubes, Libertadores e Copa do Mundo.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    AudioFX.playSelectBeep(true);
                    setQuickMode('training');
                    setScreen('QUICK');
                  }}
                  className="group relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-fuchsia-900/65 via-slate-900/85 to-cyan-950/80 backdrop-blur-xl border border-fuchsia-400/40 hover:border-cyan-400 text-left transition-all duration-200 hover:-translate-y-0.5 shadow-2xl cursor-pointer flex flex-col justify-between min-h-[146px]"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/25 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="6" />
                        <circle cx="12" cy="12" r="2" />
                      </svg>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-cyan-300">4 DESAFIOS</span>
                  </div>
                  <div className="mt-3">
                    <div className="font-display text-xl font-black text-white group-hover:text-cyan-300 transition">
                      Arena de Treino
                    </div>
                    <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                      Treino livre, faltas com alvos na gaveta, série de pênaltis e cruzamentos para voleio.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    AudioFX.playSelectBeep(true);
                    setScreen('ONLINE');
                  }}
                  className="sm:col-span-2 group relative overflow-hidden p-4 rounded-2xl bg-gradient-to-r from-cyan-950/90 via-indigo-950/85 to-emerald-950/90 backdrop-blur-xl border border-cyan-400/55 hover:border-amber-400 text-left transition-all duration-200 hover:-translate-y-0.5 shadow-2xl cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-cyan-500/25 border border-cyan-300/50 flex items-center justify-center text-cyan-200 shrink-0">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-display text-xl font-black text-white group-hover:text-amber-300 transition">
                        Multiplayer Online &amp; Ranking
                      </div>
                      <p className="text-xs text-slate-200 mt-0.5">
                        Salas 1v1 em tempo real, chat no vestiário, contas persistentes no banco de dados SQLite e ranking ELO.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/25 border border-emerald-400/40 text-emerald-200">
                      {onlineSession ? onlineSession.player.nickname : '1v1 ONLINE'}
                    </span>
                  </div>
                </button>
              </div>

              {/* Season Spotlight & Instant Derby Card (Right) */}
              <div className="lg:col-span-5 bg-gradient-to-b from-slate-900/85 via-slate-950/90 to-emerald-950/75 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-2xl flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                      Destaque da Temporada
                    </div>
                    <div className="font-display text-lg font-black text-white">
                      Clássico Nacional · Ao Vivo
                    </div>
                  </div>
                  <ClubCrest team={spotlightTeam} className="w-9 h-9" />
                </div>

                <div className="flex items-center justify-between gap-4 bg-slate-950/70 border border-white/10 rounded-xl p-4">
                  <div className="space-y-2">
                    <div className="font-display text-2xl font-black text-white">
                      #{spotlightStar.num} {spotlightStar.name}
                    </div>
                    <div className="text-xs text-slate-300 font-semibold">
                      {spotlightTeam.name} · {spotlightStar.role} · <strong className="text-amber-400 font-mono">OVR {spotlightStar.ovr}</strong>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono tabular-nums">
                      <div className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-center">
                        <div className="text-slate-400">ATQ</div>
                        <div className="text-emerald-400 font-extrabold">86</div>
                      </div>
                      <div className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-center">
                        <div className="text-slate-400">MEI</div>
                        <div className="text-amber-300 font-extrabold">85</div>
                      </div>
                      <div className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-center">
                        <div className="text-slate-400">DEF</div>
                        <div className="text-cyan-300 font-extrabold">83</div>
                      </div>
                    </div>
                  </div>
                  <PlayerSpritePreview
                    player={spotlightStar}
                    team={spotlightTeam}
                    className="w-24 h-28"
                    spriteScale={1.9}
                    action="celebrate"
                  />
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      AudioFX.playSelectBeep(true);
                      launchMatch(
                        {
                          mode: 'quick',
                          homeTeam: spotlightTeam,
                          awayTeam: derbyAway,
                          homeUseAway: false,
                          awayUseAway: isKitClash(spotlightTeam, derbyAway),
                          difficulty,
                          weather: 'night',
                          formation: '4-3-3',
                          matchDurationSec: matchMinutes * 60
                        },
                        'HOME'
                      );
                    }}
                    className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg cursor-pointer transition"
                  >
                    Jogar Clássico Agora ({spotlightTeam.abbr} x {derbyAway.abbr})
                  </button>
                </div>
              </div>
            </div>

            {/* Clean Controls Strip */}
            <footer className="bg-slate-950/70 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-400 flex flex-wrap justify-between gap-2">
              <span>
                <strong className="text-slate-200">Controles:</strong> Mobile (Analógico + Botões na tela) · PC (WASD/Setas · J Passe · H Enfiada · L Cruzamento · Espaço / K Chute · C Cortar)
              </span>
              <span className="font-mono hidden sm:inline">P / Esc Pausar · M Som</span>
            </footer>
          </div>
        )}

        {/* ==================== QUICK MATCH / 2P / TRAINING SETUP ==================== */}
        {screen === 'QUICK' && (
          <div className="w-full max-w-6xl mx-auto bg-slate-950/92 backdrop-blur-xl border border-white/15 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl max-h-[94dvh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
              <div>
                <h2 className="font-display text-xl font-black text-amber-400 uppercase tracking-tight">
                  {quickMode === 'training'
                    ? 'Arena de Treino Interativa'
                    : quickMode === 'two_player'
                    ? 'Jogo Rápido · 2 Jogadores Local'
                    : 'Jogo Rápido · 1 Jogador'}
                </h2>
                <p className="text-xs text-slate-400">Configure clubes, comparação tática, estádio e tempo de partida</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['quick', 'two_player', 'training'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setQuickMode(m)}
                    className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                      quickMode === m ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {m === 'quick' ? '1 Jogador' : m === 'two_player' ? '2P Local' : 'Treino'}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setScreen('HOME')}
                  className="min-h-[38px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Voltar
                </button>
              </div>
            </div>

            {quickMode === 'training' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(
                  [
                    ['free', 'Treino Livre', 'Campo aberto para finalizações, dribles e cruzamentos'],
                    ['free_kicks', 'Treino de Faltas', 'Barreira real e alvos luminosos nos ângulos'],
                    ['penalties', 'Série de Pênaltis', '5 cobranças alternando cantos contra o goleiro'],
                    ['finishing_cross', 'Cruzamento & Voleio', 'Bolas aéreas na área para bater de primeira']
                  ] as const
                ).map(([cId, cTitle, cDesc]) => (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => setTrainingChallenge(cId)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      trainingChallenge === cId ? 'bg-cyan-950/75 border-cyan-400' : 'bg-slate-900 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="text-xs font-extrabold text-white">{cTitle}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{cDesc}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      difficulty === d ? 'bg-emerald-950/75 border-amber-400' : 'bg-slate-900 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="text-xs font-extrabold text-white">{DIFFICULTIES[d].label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{DIFFICULTIES[d].desc}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Stadium Weather, Formation & Match Duration */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="bg-slate-900/75 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold uppercase text-slate-300">Estádio</span>
                <div className="flex gap-1">
                  {(
                    [
                      ['sunny', 'Dia'],
                      ['night', 'Noite'],
                      ['rain', 'Chuva']
                    ] as const
                  ).map(([wId, wLbl]) => (
                    <button
                      key={wId}
                      type="button"
                      onClick={() => setWeather(wId)}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                        weather === wId ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-950 text-slate-300 border-white/10'
                      }`}
                    >
                      {wLbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/75 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold uppercase text-slate-300">Esquema</span>
                <div className="flex gap-1">
                  {(['4-3-3', '4-4-2', '4-2-3-1', '3-5-2'] as FormationId[]).map((fId) => (
                    <button
                      key={fId}
                      type="button"
                      onClick={() => setFormation(fId)}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                        formation === fId ? 'bg-emerald-600 text-white border-amber-400' : 'bg-slate-950 text-slate-300 border-white/10'
                      }`}
                    >
                      {fId}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/75 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold uppercase text-slate-300">Duração</span>
                <div className="flex gap-1">
                  {([3, 5, 8] as const).map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setMatchMinutes(mins)}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                        matchMinutes === mins ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-950 text-slate-300 border-white/10'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Home & Away Team Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* HOME */}
              <div className="bg-slate-900/75 border border-white/10 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase text-cyan-300">Mandante (P1)</span>
                  <div className="flex items-center gap-2">
                    <ClubCrest team={homeTeam} className="w-6 h-6" />
                    <span className="text-sm font-extrabold text-white">{homeTeam.name} ({homeTeam.ovr})</span>
                    <button
                      type="button"
                      onClick={() => setHomeKitReserve((v) => !v)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 border border-white/15 text-[10px] font-bold text-slate-200 cursor-pointer"
                    >
                      {homeKitReserve ? 'Reserva' : 'Titular'}
                    </button>
                  </div>
                </div>

                <select
                  value={homeLeague}
                  onChange={(e) => {
                    const nl = e.target.value;
                    setHomeLeague(nl);
                    const first = TEAMS.find((t) => t.leagueId === nl);
                    if (first) setHomeTeamId(first.id);
                  }}
                  className="w-full bg-slate-950 border border-white/15 rounded-lg px-3 py-2 text-xs font-bold text-white"
                >
                  {LEAGUES.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {homeLeagueTeams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        AudioFX.playSelectBeep(true);
                        setHomeTeamId(t.id);
                      }}
                      className={`min-h-[40px] px-2.5 rounded-lg border flex items-center gap-2 text-xs font-bold cursor-pointer ${
                        homeTeamId === t.id ? 'bg-slate-800 border-amber-400 text-white' : 'bg-slate-950 border-white/10 text-slate-300'
                      }`}
                    >
                      <KitSwatch team={t} useAway={homeTeamId === t.id && homeKitReserve} className="w-5 h-5" />
                      <span className="truncate">{t.name}</span>
                      <span className="ml-auto font-mono text-[10px] text-amber-400">{t.ovr}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-5 gap-1 pt-2 border-t border-white/10">
                  {homeTeam.players.map((pl) => (
                    <div key={pl.num + pl.name} className="flex flex-col items-center bg-slate-950/75 rounded-lg p-1">
                      <PlayerSpritePreview player={pl} team={homeTeam} useAway={homeKitReserve} className="w-9 h-11" spriteScale={1.4} />
                      <span className="text-[10px] font-bold text-white truncate max-w-full">{pl.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AWAY */}
              <div className="bg-slate-900/75 border border-white/10 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase text-rose-300">
                    {quickMode === 'two_player' ? 'Visitante (P2)' : 'Adversário (CPU)'}
                  </span>
                  <div className="flex items-center gap-2">
                    <ClubCrest team={awayTeam} className="w-6 h-6" />
                    <span className="text-sm font-extrabold text-white">{awayTeam.name} ({awayTeam.ovr})</span>
                    <button
                      type="button"
                      onClick={() => setAwayKitReserve((v) => !v)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 border border-white/15 text-[10px] font-bold text-slate-200 cursor-pointer"
                    >
                      {awayKitReserve || autoClash ? 'Reserva' : 'Titular'}
                    </button>
                  </div>
                </div>

                <select
                  value={awayLeague}
                  onChange={(e) => {
                    const nl = e.target.value;
                    setAwayLeague(nl);
                    const first = TEAMS.find((t) => t.leagueId === nl);
                    if (first) setAwayTeamId(first.id);
                  }}
                  className="w-full bg-slate-950 border border-white/15 rounded-lg px-3 py-2 text-xs font-bold text-white"
                >
                  {LEAGUES.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {awayLeagueTeams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        AudioFX.playSelectBeep(true);
                        setAwayTeamId(t.id);
                      }}
                      className={`min-h-[40px] px-2.5 rounded-lg border flex items-center gap-2 text-xs font-bold cursor-pointer ${
                        awayTeamId === t.id ? 'bg-slate-800 border-amber-400 text-white' : 'bg-slate-950 border-white/10 text-slate-300'
                      }`}
                    >
                      <KitSwatch team={t} useAway={awayTeamId === t.id && (awayKitReserve || autoClash)} className="w-5 h-5" />
                      <span className="truncate">{t.name}</span>
                      <span className="ml-auto font-mono text-[10px] text-amber-400">{t.ovr}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-5 gap-1 pt-2 border-t border-white/10">
                  {awayTeam.players.map((pl) => (
                    <div key={pl.num + pl.name} className="flex flex-col items-center bg-slate-950/75 rounded-lg p-1">
                      <PlayerSpritePreview player={pl} team={awayTeam} useAway={awayKitReserve || autoClash} className="w-9 h-11" spriteScale={1.4} />
                      <span className="text-[10px] font-bold text-white truncate max-w-full">{pl.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Visual Team Attribute Comparison Bars */}
            <div className="bg-slate-900/75 border border-white/10 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
              {(
                [
                  ['Ataque', homeRatings.atk, awayRatings.atk],
                  ['Meio-Campo', homeRatings.mid, awayRatings.mid],
                  ['Defesa', homeRatings.def, awayRatings.def]
                ] as const
              ).map(([label, hVal, aVal]) => (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="font-mono text-cyan-300">{hVal}</span>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400">{label}</span>
                    <span className="font-mono text-rose-300">{aVal}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 h-2">
                    <div className="bg-slate-950 rounded-l-full overflow-hidden flex justify-end">
                      <div className="h-full bg-cyan-400 rounded-l-full" style={{ width: `${hVal}%` }} />
                    </div>
                    <div className="bg-slate-950 rounded-r-full overflow-hidden">
                      <div className="h-full bg-rose-400 rounded-r-full" style={{ width: `${aVal}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-400">
                {quickMode === 'two_player'
                  ? 'P1: WASD + Shift + J (Passe) + Espaço / K (Chute) · P2: Setas + Ctrl/,(Trocar) + N (Passe) + M/Enter (Chute)'
                  : 'Mobile: Analógico + Botões na tela · PC: WASD/Setas · Shift Correr · J Passe · H Enfiada · L Cruzamento · Espaço/K Chute · C Cortar'}
              </div>
              <button
                type="button"
                onClick={() =>
                  launchMatch(
                    {
                      mode: quickMode,
                      trainingChallenge: quickMode === 'training' ? trainingChallenge : undefined,
                      homeTeam,
                      awayTeam,
                      homeUseAway: homeKitReserve,
                      awayUseAway: awayKitReserve || autoClash,
                      difficulty,
                      weather,
                      formation,
                      matchDurationSec: matchMinutes * 60
                    },
                    'QUICK'
                  )
                }
                className="w-full sm:w-auto min-h-[48px] px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-black uppercase tracking-wider text-white shadow-lg cursor-pointer"
              >
                {quickMode === 'training' ? 'Entrar na Arena' : 'Iniciar Partida'}
              </button>
            </div>
          </div>
        )}

        {/* CAREER MODE */}
        {screen === 'CAREER' && (
          <CareerView
            defaultDifficulty={difficulty}
            onBack={() => setScreen('HOME')}
            onStartMatch={(cfg, cb) => launchMatch(cfg, 'CAREER', cb)}
          />
        )}

        {/* TOURNAMENTS MODE */}
        {screen === 'TOURNAMENT' && (
          <TournamentView
            defaultDifficulty={difficulty}
            onBack={() => setScreen('HOME')}
            onStartMatch={(cfg, cb) => launchMatch(cfg, 'TOURNAMENT', cb)}
          />
        )}

        {/* MATCH RESULT SUMMARY MODAL */}
        {screen === 'RESULT' && activeMatch && lastResult && (
          <div className="w-full max-w-md mx-auto bg-slate-950/95 backdrop-blur-xl border border-white/15 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <h2 className="font-display text-2xl font-black text-amber-400">
              {lastResult.homeScore > lastResult.awayScore
                ? `Vitória: ${activeMatch.homeTeam.name}!`
                : lastResult.awayScore > lastResult.homeScore
                ? `Vitória: ${activeMatch.awayTeam.name}!`
                : 'Fim de Jogo · Empate'}
            </h2>

            <div className="flex items-center justify-center gap-5 bg-slate-900 rounded-xl p-4 tabular-nums">
              <div className="flex flex-col items-center gap-1 min-w-[90px]">
                <ClubCrest team={activeMatch.homeTeam} className="w-9 h-9" />
                <strong className="text-xs">{activeMatch.homeTeam.name}</strong>
              </div>
              <div className="font-mono text-3xl font-extrabold text-white">
                {lastResult.homeScore} - {lastResult.awayScore}
              </div>
              <div className="flex flex-col items-center gap-1 min-w-[90px]">
                <ClubCrest team={activeMatch.awayTeam} className="w-9 h-9" />
                <strong className="text-xs">{activeMatch.awayTeam.name}</strong>
              </div>
            </div>

            <div className="flex justify-around text-xs text-slate-400 tabular-nums">
              <span>Chutes: {lastResult.homeShots} x {lastResult.awayShots}</span>
              <span>Posse: {lastResult.homePossPct}% x {lastResult.awayPossPct}%</span>
            </div>

            {activeMatch.mode === 'career_player' && (
              <div className="bg-sky-950/60 border border-sky-500/30 rounded-xl p-3 text-xs text-sky-200 tabular-nums">
                Nota de Atuação: <strong className="text-amber-400">{lastResult.playerRating}</strong> · Gols: {lastResult.userGoals} · Assistências: {lastResult.userAssists}
              </div>
            )}

            <div className="flex justify-center gap-3 pt-2">
              {returnScreenRef.current === 'QUICK' && (
                <button
                  type="button"
                  onClick={() => setScreen('PLAYING')}
                  className="min-h-[42px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white cursor-pointer"
                >
                  Jogar Novamente
                </button>
              )}
              <button
                type="button"
                onClick={() => setScreen(returnScreenRef.current)}
                className="min-h-[42px] px-5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-sm font-bold text-white cursor-pointer"
              >
                Continuar
              </button>
            </div>
          </div>
        )}
          </div>
        </div>
      )}

      {keepOnlineAlive && (
        <div
          className={
            screen === 'ONLINE'
              ? 'fixed inset-0 z-20 flex items-center justify-center p-4 sm:p-6 overflow-y-auto pointer-events-auto'
              : 'hidden'
          }
        >
          <OnlineView
            session={onlineSession}
            onSessionChange={setOnlineSession}
            onBack={() => setScreen('HOME')}
            onStartOnlineMatch={(cfg, cb) => launchMatch(cfg, 'ONLINE', cb)}
          />
        </div>
      )}
    </>
  );
}

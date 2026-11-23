import { useMemo, useRef, useState } from 'react';
import { AudioFX } from './audio/sound';
import { KitSwatch, PlayerSpritePreview } from './components/PixelPreview';
import { DIFFICULTIES, LEAGUES, TEAMS, isKitClash } from './data/leagues';
import { MatchCanvas } from './game/MatchCanvas';
import { CareerView } from './modes/CareerView';
import { TournamentView } from './modes/TournamentView';
import { DifficultyId, MatchConfig, MatchResult } from './types';

type Screen = 'HOME' | 'QUICK' | 'CAREER' | 'TOURNAMENT' | 'PLAYING' | 'RESULT';

export default function App() {
  const [screen, setScreen] = useState<Screen>('HOME');
  const [muted, setMuted] = useState(AudioFX.isMuted());

  // Quick Match / 2P / Training state
  const [quickMode, setQuickMode] = useState<'quick' | 'two_player' | 'training'>('quick');
  const [difficulty, setDifficulty] = useState<DifficultyId>('amador');
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

  if (screen === 'PLAYING' && activeMatch) {
    return (
      <div className="w-screen h-screen bg-[#07130d]">
        <MatchCanvas
          config={activeMatch}
          onFinish={handleMatchFinish}
          onExit={() => setScreen(returnScreenRef.current)}
        />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-[#07130d] text-slate-100 flex items-center justify-center p-4 overflow-y-auto relative">
      {/* Subtle Stadium Turf Backdrop */}
      <div
        className="absolute inset-0 pointer-events-none opacity-35"
        style={{
          backgroundImage: 'repeating-linear-gradient(90deg, #124d2c 0px, #124d2c 64px, #165d36 64px, #165d36 128px)'
        }}
      />

      <div className="relative z-10 w-full max-w-6xl">
        {/* HOME TITLE SCREEN */}
        {screen === 'HOME' && (
          <div className="w-full max-w-4xl mx-auto bg-slate-950/92 border border-white/15 rounded-xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="3" fill="#0f5132" stroke="#facc15" strokeWidth="1.6" />
                  <circle cx="12" cy="12" r="6" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.2" />
                  <polygon points="12,8 14.5,10.2 13.5,13.5 10.5,13.5 9.5,10.2" fill="#0f172a" />
                </svg>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide uppercase">
                    BRASILEIRÃO <span className="text-yellow-400">SIDEKICKS 16-BIT</span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">Arcade Pixel Cup · 8 Ligas & Seleções · 4 Níveis de IA</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleMute}
                className="min-h-[40px] px-4 rounded bg-slate-900 hover:bg-slate-800 border border-white/15 text-xs font-bold cursor-pointer"
              >
                {muted ? 'Som: Mudo' : 'Som: Ligado'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  AudioFX.playSelectBeep(true);
                  setQuickMode('quick');
                  setScreen('QUICK');
                }}
                className="p-5 rounded-lg bg-emerald-950/75 hover:bg-emerald-900/80 border border-emerald-500/40 hover:border-yellow-400 text-left transition cursor-pointer"
              >
                <div className="text-lg font-extrabold text-yellow-400">Jogo Rápido (1P / 2P)</div>
                <p className="text-xs text-slate-300 mt-1">1 Jogador vs IA, 2 Jogadores Local ou Arena de Treino</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  AudioFX.playSelectBeep(true);
                  setScreen('CAREER');
                }}
                className="p-5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-white/15 hover:border-yellow-400 text-left transition cursor-pointer"
              >
                <div className="text-lg font-extrabold text-white">Modo Carreira</div>
                <p className="text-xs text-slate-400 mt-1">Carreira de Treinador ou Carreira de Jogador com evolução e mercado</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  AudioFX.playSelectBeep(true);
                  setScreen('TOURNAMENT');
                }}
                className="p-5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-white/15 hover:border-yellow-400 text-left transition cursor-pointer"
              >
                <div className="text-lg font-extrabold text-white">Torneios</div>
                <p className="text-xs text-slate-400 mt-1">Brasileirão em pontos corridos e Copa do Mundo com mata-mata</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  AudioFX.playSelectBeep(true);
                  setQuickMode('training');
                  setScreen('QUICK');
                }}
                className="p-5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-white/15 hover:border-yellow-400 text-left transition cursor-pointer"
              >
                <div className="text-lg font-extrabold text-cyan-300">Arena de Treino</div>
                <p className="text-xs text-slate-400 mt-1">Treine finalizações, passes, cruzamentos e voleios sem pressão</p>
              </button>
            </div>

            <div className="border-t border-white/10 pt-3 text-xs text-slate-400 flex flex-wrap justify-between gap-2">
              <span>
                <strong className="text-slate-200">Controles:</strong> WASD correr · Shift trocar jogador · J passar · K chutar / carrinho
              </span>
              <span>P / Esc Pausar · M Som</span>
            </div>
          </div>
        )}

        {/* QUICK MATCH / 2P / TRAINING SETUP */}
        {screen === 'QUICK' && (
          <div className="w-full max-w-5xl mx-auto bg-slate-950/95 border border-white/15 rounded-xl p-5 space-y-4 shadow-2xl max-h-[95vh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h2 className="text-xl font-extrabold text-yellow-400">
                  {quickMode === 'training' ? 'Arena de Treino' : quickMode === 'two_player' ? 'Jogo Rápido · 2 Jogadores Local' : 'Jogo Rápido · 1 Jogador'}
                </h2>
                <p className="text-xs text-slate-400">Selecione ligas, clubes, uniformes e nível de dificuldade</p>
              </div>
              <div className="flex gap-2">
                {(['quick', 'two_player', 'training'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setQuickMode(m)}
                    className={`min-h-[38px] px-3 rounded text-xs font-bold cursor-pointer ${quickMode === m ? 'bg-yellow-400 text-slate-950' : 'bg-slate-800 text-slate-200'}`}
                  >
                    {m === 'quick' ? '1 Jogador' : m === 'two_player' ? '2P Local' : 'Treino'}
                  </button>
                ))}
                <button type="button" onClick={() => setScreen('HOME')} className="min-h-[38px] px-4 rounded bg-slate-800 text-xs font-bold text-white cursor-pointer">
                  Voltar
                </button>
              </div>
            </div>

            {/* Difficulty Selector */}
            {quickMode !== 'training' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`p-2.5 rounded border text-left cursor-pointer ${difficulty === d ? 'bg-emerald-950/75 border-yellow-400' : 'bg-slate-900 border-white/10'}`}
                  >
                    <div className="text-xs font-extrabold text-white">{DIFFICULTIES[d].label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{DIFFICULTIES[d].desc}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Home & Away Team Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* HOME */}
              <div className="bg-slate-900/70 border border-white/10 rounded-lg p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase text-cyan-300">Lado Esquerdo (P1)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white">{homeTeam.name} (OVR {homeTeam.ovr})</span>
                    <button
                      type="button"
                      onClick={() => setHomeKitReserve((v) => !v)}
                      className="px-2 py-1 rounded bg-slate-800 border border-white/15 text-[10px] font-bold text-slate-200 cursor-pointer"
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
                  className="w-full bg-slate-950 border border-white/15 rounded px-3 py-2 text-xs font-bold text-white"
                >
                  {LEAGUES.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                  {homeLeagueTeams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        AudioFX.playSelectBeep(true);
                        setHomeTeamId(t.id);
                      }}
                      className={`min-h-[40px] px-2.5 rounded border flex items-center gap-2 text-xs font-bold cursor-pointer ${homeTeamId === t.id ? 'bg-slate-800 border-yellow-400 text-white' : 'bg-slate-950 border-white/10 text-slate-300'}`}
                    >
                      <KitSwatch team={t} useAway={homeTeamId === t.id && homeKitReserve} className="w-4 h-4" />
                      <span className="truncate">{t.name}</span>
                      <span className="ml-auto font-mono text-[10px] text-yellow-400">{t.ovr}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-5 gap-1 pt-2 border-t border-white/10">
                  {homeTeam.players.map((pl) => (
                    <div key={pl.num + pl.name} className="flex flex-col items-center bg-slate-950/70 rounded p-1">
                      <PlayerSpritePreview player={pl} team={homeTeam} useAway={homeKitReserve} className="w-8 h-10" />
                      <span className="text-[10px] font-bold text-white truncate max-w-full">{pl.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AWAY */}
              <div className="bg-slate-900/70 border border-white/10 rounded-lg p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase text-rose-300">
                    {quickMode === 'two_player' ? 'Lado Direito (P2)' : 'Adversário (CPU)'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white">{awayTeam.name} (OVR {awayTeam.ovr})</span>
                    <button
                      type="button"
                      onClick={() => setAwayKitReserve((v) => !v)}
                      className="px-2 py-1 rounded bg-slate-800 border border-white/15 text-[10px] font-bold text-slate-200 cursor-pointer"
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
                  className="w-full bg-slate-950 border border-white/15 rounded px-3 py-2 text-xs font-bold text-white"
                >
                  {LEAGUES.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                  {awayLeagueTeams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        AudioFX.playSelectBeep(true);
                        setAwayTeamId(t.id);
                      }}
                      className={`min-h-[40px] px-2.5 rounded border flex items-center gap-2 text-xs font-bold cursor-pointer ${awayTeamId === t.id ? 'bg-slate-800 border-yellow-400 text-white' : 'bg-slate-950 border-white/10 text-slate-300'}`}
                    >
                      <KitSwatch team={t} useAway={awayTeamId === t.id && (awayKitReserve || autoClash)} className="w-4 h-4" />
                      <span className="truncate">{t.name}</span>
                      <span className="ml-auto font-mono text-[10px] text-yellow-400">{t.ovr}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-5 gap-1 pt-2 border-t border-white/10">
                  {awayTeam.players.map((pl) => (
                    <div key={pl.num + pl.name} className="flex flex-col items-center bg-slate-950/70 rounded p-1">
                      <PlayerSpritePreview player={pl} team={awayTeam} useAway={awayKitReserve || autoClash} className="w-8 h-10" />
                      <span className="text-[10px] font-bold text-white truncate max-w-full">{pl.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-400">
                {quickMode === 'two_player'
                  ? 'P1: WASD + Shift (Trocar) + J (Passe) + K (Chute) · P2: Setas + Ctrl/,(Trocar) + N (Passe) + M/Enter (Chute)'
                  : 'WASD ou Setas Mover · Shift Trocar · J ou X Passe · K, Z ou Espaço Chute / Carrinho'}
              </div>
              <button
                type="button"
                onClick={() =>
                  launchMatch(
                    {
                      mode: quickMode,
                      homeTeam,
                      awayTeam,
                      homeUseAway: homeKitReserve,
                      awayUseAway: awayKitReserve || autoClash,
                      difficulty
                    },
                    'QUICK'
                  )
                }
                className="min-h-[46px] px-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-extrabold uppercase tracking-wider text-white cursor-pointer"
              >
                {quickMode === 'training' ? 'Entrar no Treino' : 'Jogar'}
              </button>
            </div>
          </div>
        )}

        {/* CAREER MODE */}
        {screen === 'CAREER' && (
          <CareerView
            onBack={() => setScreen('HOME')}
            onStartMatch={(cfg, cb) => launchMatch(cfg, 'CAREER', cb)}
          />
        )}

        {/* TOURNAMENTS MODE */}
        {screen === 'TOURNAMENT' && (
          <TournamentView
            onBack={() => setScreen('HOME')}
            onStartMatch={(cfg, cb) => launchMatch(cfg, 'TOURNAMENT', cb)}
          />
        )}

        {/* MATCH RESULT SUMMARY MODAL */}
        {screen === 'RESULT' && activeMatch && lastResult && (
          <div className="w-full max-w-md mx-auto bg-slate-950/95 border border-white/15 rounded-xl p-6 text-center space-y-4 shadow-2xl">
            <h2 className="text-2xl font-extrabold text-yellow-400">
              {lastResult.homeScore > lastResult.awayScore
                ? `Vitória: ${activeMatch.homeTeam.name}!`
                : lastResult.awayScore > lastResult.homeScore
                ? `Vitória: ${activeMatch.awayTeam.name}!`
                : 'Fim de Jogo · Empate'}
            </h2>

            <div className="flex items-center justify-center gap-5 bg-slate-900 rounded-lg p-4 tabular-nums">
              <div className="flex flex-col items-center gap-1 min-w-[90px]">
                <KitSwatch team={activeMatch.homeTeam} useAway={activeMatch.homeUseAway} className="w-7 h-7" />
                <strong className="text-xs">{activeMatch.homeTeam.name}</strong>
              </div>
              <div className="font-mono text-3xl font-extrabold text-white">
                {lastResult.homeScore} - {lastResult.awayScore}
              </div>
              <div className="flex flex-col items-center gap-1 min-w-[90px]">
                <KitSwatch team={activeMatch.awayTeam} useAway={activeMatch.awayUseAway} className="w-7 h-7" />
                <strong className="text-xs">{activeMatch.awayTeam.name}</strong>
              </div>
            </div>

            <div className="flex justify-around text-xs text-slate-400 tabular-nums">
              <span>Chutes: {lastResult.homeShots} x {lastResult.awayShots}</span>
              <span>Posse: {lastResult.homePossPct}% x {lastResult.awayPossPct}%</span>
            </div>

            {activeMatch.mode === 'career_player' && (
              <div className="bg-sky-950/60 border border-sky-500/30 rounded p-2.5 text-xs text-sky-200 tabular-nums">
                Nota de Atuação: <strong className="text-yellow-400">{lastResult.playerRating}</strong> · Gols: {lastResult.userGoals} · Assistências: {lastResult.userAssists}
              </div>
            )}

            <div className="flex justify-center gap-3 pt-2">
              {(returnScreenRef.current === 'QUICK') && (
                <button
                  type="button"
                  onClick={() => setScreen('PLAYING')}
                  className="min-h-[42px] px-5 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white cursor-pointer"
                >
                  Jogar Novamente
                </button>
              )}
              <button
                type="button"
                onClick={() => setScreen(returnScreenRef.current)}
                className="min-h-[42px] px-5 rounded bg-slate-800 hover:bg-slate-700 border border-white/15 text-sm font-bold text-white cursor-pointer"
              >
                Continuar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

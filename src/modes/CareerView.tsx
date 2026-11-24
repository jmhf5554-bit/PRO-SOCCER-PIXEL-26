import React, { useEffect, useMemo, useState } from 'react';
import { ChampionshipTrophy, ClubCrest, PlayerSpritePreview } from '../components/ClubPreview';
import { DIFFICULTIES, TEAMS, getTeamBench, isKitClash } from '../data/leagues';
import {
  DifficultyId,
  FormationId,
  HairStyleId,
  MatchConfig,
  MatchResult,
  PlayerRole,
  PlayerSpec,
  SkinToneId,
  TacticId,
  TeamSpec
} from '../types';

const STORAGE_MANAGER_KEY = 'brfc_career_manager_v2';
const STORAGE_PLAYER_KEY = 'brfc_career_player_v2';

export interface CareerPlayer extends PlayerSpec {
  fatigue: number;
  injuredRounds: number;
  salary: number; // R$ mil / semana
  value: number; // R$ M
  goals: number;
}

interface FixtureEntry {
  homeId: string;
  awayId: string;
  homeGoals?: number;
  awayGoals?: number;
}

interface ManagerSave {
  teamId: string;
  difficulty: DifficultyId;
  round: number;
  season: number;
  budget: number;
  morale: number;
  tactic: TacticId;
  formation: FormationId;
  squad: CareerPlayer[];
  bench: CareerPlayer[];
  points: Record<string, { p: number; j: number; v: number; e: number; d: number; gp: number; gc: number }>;
  schedule: FixtureEntry[][];
  scorers: Record<string, { name: string; clubId: string; goals: number }>;
}

interface PlayerSave {
  clubId: string;
  difficulty: DifficultyId;
  round: number;
  season: number;
  xp: number;
  goals: number;
  assists: number;
  salary: number;
  ratings: number[];
  tactic: TacticId;
  custom: PlayerSpec;
  points: Record<string, { p: number; j: number; v: number; e: number; d: number; gp: number; gc: number }>;
  schedule: FixtureEntry[][];
}

interface MarketCandidate {
  id: string;
  name: string;
  originClub: string;
  role: PlayerRole;
  ovr: number;
  price: number;
  wageDemand: number;
  skin: SkinToneId;
  hair: HairStyleId;
  hairColor: string;
  boots: string;
  beard?: boolean;
}

const MARKET_STARS: MarketCandidate[] = [
  { id: 'mkt_pec', name: 'Gabriel Pec', originClub: 'LA Galaxy', role: 'ATA', ovr: 82, price: 320, wageDemand: 180, skin: 'fair', hair: 'short_fade', hairColor: '#3b281e', boots: '#22c55e' },
  { id: 'mkt_mh', name: 'Matheus Henrique', originClub: 'Cruzeiro', role: 'MEI', ovr: 83, price: 380, wageDemand: 210, skin: 'tan', hair: 'curly_afro', hairColor: '#181412', boots: '#facc15' },
  { id: 'mkt_jk', name: 'John Kennedy', originClub: 'Fluminense', role: 'ATA', ovr: 81, price: 290, wageDemand: 155, skin: 'brown', hair: 'dreads', hairColor: '#181412', boots: '#ef4444' },
  { id: 'mkt_almada', name: 'Thiago Almada', originClub: 'Lyon', role: 'MEI', ovr: 85, price: 520, wageDemand: 290, skin: 'olive', hair: 'short_fade', hairColor: '#211915', boots: '#ec4899' },
  { id: 'mkt_nino', name: 'Nino', originClub: 'Zenit', role: 'ZAG', ovr: 84, price: 440, wageDemand: 230, skin: 'fair', hair: 'short_parted', hairColor: '#3a271c', boots: '#38bdf8' },
  { id: 'mkt_andreas', name: 'Andreas Pereira', originClub: 'Fulham', role: 'MEI', ovr: 84, price: 460, wageDemand: 260, skin: 'fair', hair: 'short_parted', hairColor: '#4c3425', boots: '#f97316' }
];

function toCareerPlayer(p: PlayerSpec, startFatigue = 8): CareerPlayer {
  const val = Math.max(85, Math.round((p.ovr - 65) * 24));
  const sal = Math.max(60, Math.round((p.ovr - 68) * 14));
  return {
    ...p,
    pace: p.pace || p.ovr,
    shooting: p.shooting || p.ovr,
    passing: p.passing || p.ovr,
    dribbling: p.dribbling || p.ovr,
    fatigue: startFatigue,
    injuredRounds: 0,
    salary: sal,
    value: val,
    goals: 0
  };
}

function buildLeagueSchedule(teams: TeamSpec[]): FixtureEntry[][] {
  const ids = teams.map((t) => t.id);
  const n = ids.length;
  const arr = [...ids];
  const rounds: FixtureEntry[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const rd: FixtureEntry[] = [];
    for (let i = 0; i < n / 2; i++) {
      rd.push(r % 2 === 0 ? { homeId: arr[i], awayId: arr[n - 1 - i] } : { homeId: arr[n - 1 - i], awayId: arr[i] });
    }
    rounds.push(rd);
    const last = arr.pop()!;
    arr.splice(1, 0, last);
  }
  return rounds;
}

function initTable(teams: TeamSpec[]) {
  const rec: Record<string, { p: number; j: number; v: number; e: number; d: number; gp: number; gc: number }> = {};
  teams.forEach((t) => (rec[t.id] = { p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }));
  return rec;
}

interface Props {
  defaultDifficulty?: DifficultyId;
  onStartMatch: (cfg: MatchConfig, onComplete: (res: MatchResult) => void) => void;
  onBack: () => void;
}

export const CareerView: React.FC<Props> = ({ defaultDifficulty = 'amador', onStartMatch, onBack }) => {
  const brasileiraoClubs = useMemo(() => TEAMS.filter((t) => t.leagueId === 'brasileirao'), []);
  const transferClubs = useMemo(() => TEAMS.filter((t) => t.leagueId !== 'selecoes'), []);

  const [careerKind, setCareerKind] = useState<'select' | 'manager' | 'player'>('select');
  const [managerSave, setManagerSave] = useState<ManagerSave | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_MANAGER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [playerSave, setPlayerSave] = useState<PlayerSave | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PLAYER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Setup & Hub State
  const [setupClubId, setSetupClubId] = useState<string>('flamengo');
  const [setupDiff, setSetupDiff] = useState<DifficultyId>(defaultDifficulty);
  const [hubTab, setHubTab] = useState<'hub' | 'squad' | 'market' | 'table'>('hub');
  const [statusNote, setStatusNote] = useState<string>('');
  const [swapStarterIdx, setSwapStarterIdx] = useState<number | null>(null);

  // Market & Negotiation state
  const [marketQuery, setMarketQuery] = useState('');
  const [marketRoleFilter, setMarketRoleFilter] = useState<'ALL' | PlayerRole>('ALL');
  const [negotiating, setNegotiating] = useState<MarketCandidate | null>(null);
  const [offerFee, setOfferFee] = useState(0);
  const [offerWage, setOfferWage] = useState(0);
  const [negFeedback, setNegFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Custom player builder state
  const [pName, setPName] = useState('Silva Jr.');
  const [pNum, setPNum] = useState(10);
  const [pRole, setPRole] = useState<PlayerRole>('ATA');
  const [pSkin, setPSkin] = useState<SkinToneId>('brown');
  const [pHair, setPHair] = useState<HairStyleId>('platinum_fade');
  const [pHairCol, setPHairCol] = useState('#f5f5f4');
  const [pBoots, setPBoots] = useState('#facc15');

  useEffect(() => {
    if (managerSave) localStorage.setItem(STORAGE_MANAGER_KEY, JSON.stringify(managerSave));
  }, [managerSave]);

  useEffect(() => {
    if (playerSave) localStorage.setItem(STORAGE_PLAYER_KEY, JSON.stringify(playerSave));
  }, [playerSave]);

  const startManagerCareer = () => {
    const club = brasileiraoClubs.find((t) => t.id === setupClubId) || brasileiraoClubs[0];
    const save: ManagerSave = {
      teamId: club.id,
      difficulty: setupDiff,
      round: 0,
      season: 1,
      budget: 820,
      morale: 84,
      tactic: 'equilibrado',
      formation: '4-3-3',
      squad: club.players.map((p) => toCareerPlayer(p, 8)),
      bench: getTeamBench(club).map((p) => toCareerPlayer(p, 4)),
      points: initTable(brasileiraoClubs),
      schedule: buildLeagueSchedule(brasileiraoClubs),
      scorers: {}
    };
    setManagerSave(save);
    setCareerKind('manager');
    setHubTab('hub');
    setStatusNote('');
  };

  const startPlayerCareer = () => {
    const club = brasileiraoClubs.find((t) => t.id === setupClubId) || brasileiraoClubs[0];
    const custom: PlayerSpec = {
      num: pNum,
      name: pName.trim() || 'Craque',
      role: pRole,
      skin: pSkin,
      hair: pHair,
      hairColor: pHairCol,
      boots: pBoots,
      ovr: 75,
      pace: 76,
      shooting: 75,
      passing: 74,
      dribbling: 76
    };
    const save: PlayerSave = {
      clubId: club.id,
      difficulty: setupDiff,
      round: 0,
      season: 1,
      xp: 150,
      goals: 0,
      assists: 0,
      salary: 95,
      ratings: [],
      tactic: 'equilibrado',
      custom,
      points: initTable(brasileiraoClubs),
      schedule: buildLeagueSchedule(brasileiraoClubs)
    };
    setPlayerSave(save);
    setCareerKind('player');
    setHubTab('hub');
    setStatusNote('');
  };

  const advanceRoundTable = (
    pts: ManagerSave['points'],
    schedule: FixtureEntry[][],
    round: number,
    userClubId: string,
    userHomeGoals: number,
    userAwayGoals: number,
    userIsHome: boolean,
    scorers?: ManagerSave['scorers'],
    userScorersPool?: CareerPlayer[]
  ) => {
    const nextPts = JSON.parse(JSON.stringify(pts)) as ManagerSave['points'];
    const nextSchedule = schedule.map((rd, rI) =>
      rI !== round
        ? rd
        : rd.map((fx) => {
            let hg = 0;
            let ag = 0;
            const isUserMatch = fx.homeId === userClubId || fx.awayId === userClubId;
            if (isUserMatch) {
              hg = userIsHome ? userHomeGoals : userAwayGoals;
              ag = userIsHome ? userAwayGoals : userHomeGoals;
            } else {
              const th = brasileiraoClubs.find((t) => t.id === fx.homeId)!;
              const ta = brasileiraoClubs.find((t) => t.id === fx.awayId)!;
              const diff = (th.ovr - ta.ovr) * 0.04;
              hg = Math.max(0, Math.round(Math.random() * 2.3 + diff));
              ag = Math.max(0, Math.round(Math.random() * 2.0 - diff));
            }
            const rh = nextPts[fx.homeId];
            const ra = nextPts[fx.awayId];
            rh.j++;
            ra.j++;
            rh.gp += hg;
            rh.gc += ag;
            ra.gp += ag;
            ra.gc += hg;
            if (hg > ag) {
              rh.v++;
              rh.p += 3;
              ra.d++;
            } else if (ag > hg) {
              ra.v++;
              ra.p += 3;
              rh.d++;
            } else {
              rh.e++;
              ra.e++;
              rh.p++;
              ra.p++;
            }

            // Record Artilharia goals
            if (scorers) {
              const addGoal = (clubId: string, count: number, customPool?: CareerPlayer[]) => {
                const club = brasileiraoClubs.find((t) => t.id === clubId);
                if (!club || count <= 0) return;
                const pool = customPool && customPool.length ? customPool : club.players;
                const attackers = pool.filter((p) => p.role === 'ATA' || p.role === 'MEI');
                for (let g = 0; g < count; g++) {
                  const chosen = attackers[g % attackers.length] || pool[pool.length - 1];
                  const key = `${clubId}_${chosen.name}`;
                  if (!scorers[key]) scorers[key] = { name: chosen.name, clubId, goals: 0 };
                  scorers[key].goals += 1;
                }
              };
              addGoal(fx.homeId, hg, fx.homeId === userClubId ? userScorersPool : undefined);
              addGoal(fx.awayId, ag, fx.awayId === userClubId ? userScorersPool : undefined);
            }

            return { ...fx, homeGoals: hg, awayGoals: ag };
          })
    );
    return { nextPts, nextSchedule };
  };

  // ==================== CAREER SELECTOR SCREEN ====================
  if (careerKind === 'select') {
    const previewClub = brasileiraoClubs.find((t) => t.id === setupClubId) || brasileiraoClubs[0];
    const customPreview: PlayerSpec = {
      num: pNum,
      name: pName || 'Craque',
      role: pRole,
      skin: pSkin,
      hair: pHair,
      hairColor: pHairCol,
      boots: pBoots,
      ovr: 75
    };

    return (
      <div className="w-full max-w-5xl mx-auto bg-slate-950/92 backdrop-blur-xl border border-white/15 rounded-2xl p-6 space-y-5 shadow-2xl max-h-[94vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div>
            <h2 className="font-display text-2xl font-black text-amber-400 tracking-tight uppercase">Modo Carreira</h2>
            <p className="text-xs text-slate-400">Gerencie elenco, salários e contratações como Treinador ou evolua seu próprio Craque</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="min-h-[40px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-xs font-bold text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            Voltar
          </button>
        </div>

        {(managerSave || playerSave) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {managerSave && (
              <button
                type="button"
                onClick={() => {
                  setCareerKind('manager');
                  setHubTab('hub');
                }}
                className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 to-slate-900/90 border border-emerald-500/40 hover:border-amber-400 text-left flex items-center justify-between gap-3 cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  <ClubCrest team={brasileiraoClubs.find((t) => t.id === managerSave.teamId) || brasileiraoClubs[0]} className="w-9 h-9" />
                  <div>
                    <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Continuar Treinador</div>
                    <div className="text-sm font-extrabold text-white mt-0.5">
                      {brasileiraoClubs.find((t) => t.id === managerSave.teamId)?.name} · T{managerSave.season} · Rodada {Math.min(7, managerSave.round + 1)}/7
                    </div>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-amber-400 whitespace-nowrap shrink-0">Continuar →</span>
              </button>
            )}
            {playerSave && (
              <button
                type="button"
                onClick={() => {
                  setCareerKind('player');
                  setHubTab('hub');
                }}
                className="p-4 rounded-xl bg-gradient-to-r from-sky-950/80 to-slate-900/90 border border-sky-500/40 hover:border-amber-400 text-left flex items-center justify-between gap-3 cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  <ClubCrest team={transferClubs.find((t) => t.id === playerSave.clubId) || brasileiraoClubs[0]} className="w-9 h-9" />
                  <div>
                    <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider">Continuar Jogador</div>
                    <div className="text-sm font-extrabold text-white mt-0.5">
                      {playerSave.custom.name} (OVR {playerSave.custom.ovr}) · {transferClubs.find((t) => t.id === playerSave.clubId)?.name}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-amber-400 whitespace-nowrap shrink-0">Continuar →</span>
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Shared Club & Difficulty Setup */}
          <div className="bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-4">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300">1. Clube Inicial & Dificuldade</div>
            <div className="grid grid-cols-2 gap-2">
              {brasileiraoClubs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSetupClubId(c.id)}
                  className={`min-h-[42px] px-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold cursor-pointer transition ${
                    setupClubId === c.id ? 'bg-slate-800 border-amber-400 text-white' : 'bg-slate-950 border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <ClubCrest team={c} className="w-5 h-5" />
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto font-mono text-[10px] text-amber-400">{c.ovr}</span>
                </button>
              ))}
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1.5">Dificuldade</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSetupDiff(d)}
                    className={`min-h-[36px] rounded-lg border text-xs font-bold cursor-pointer ${
                      setupDiff === d ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-950 text-slate-300 border-white/10'
                    }`}
                  >
                    {DIFFICULTIES[d].label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={startManagerCareer}
              className="w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-extrabold text-white cursor-pointer shadow-lg transition"
            >
              Nova Carreira de Treinador ({previewClub.abbr})
            </button>
          </div>

          {/* Player Creator for Player Career */}
          <div className="bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300">2. Criar Meu Jogador</div>
                <div className="text-[11px] text-slate-400">Personalize visual, posição e chuteira</div>
              </div>
              <div className="bg-slate-950/80 border border-white/10 rounded-xl px-3 py-1">
                <PlayerSpritePreview player={customPreview} team={previewClub} className="w-12 h-14" spriteScale={1.55} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                maxLength={14}
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="Nome"
                className="col-span-2 bg-slate-950 border border-white/15 rounded-lg px-3 py-2 text-xs font-bold text-white"
              />
              <input
                type="number"
                min={1}
                max={99}
                value={pNum}
                onChange={(e) => setPNum(Math.max(1, Math.min(99, Number(e.target.value) || 10)))}
                className="bg-slate-950 border border-white/15 rounded-lg px-3 py-2 text-xs font-bold text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <select value={pRole} onChange={(e) => setPRole(e.target.value as PlayerRole)} className="bg-slate-950 border border-white/15 rounded-lg px-2 py-2 text-white font-bold">
                <option value="ATA">Atacante</option>
                <option value="MEI">Meia</option>
                <option value="ZAG">Zagueiro</option>
              </select>
              <select value={pSkin} onChange={(e) => setPSkin(e.target.value as SkinToneId)} className="bg-slate-950 border border-white/15 rounded-lg px-2 py-2 text-white font-bold">
                <option value="fair">Pele Clara</option>
                <option value="olive">Pele Morena</option>
                <option value="tan">Pele Bronze</option>
                <option value="brown">Pele Negra</option>
                <option value="dark">Pele Retinta</option>
              </select>
              <select value={pHair} onChange={(e) => setPHair(e.target.value as HairStyleId)} className="bg-slate-950 border border-white/15 rounded-lg px-2 py-2 text-white font-bold">
                <option value="platinum_fade">Platinado</option>
                <option value="short_fade">Degradê Curto</option>
                <option value="curly_afro">Cacheado</option>
                <option value="dreads">Dreads</option>
                <option value="mohawk">Moicano</option>
                <option value="shaggy">Longo</option>
                <option value="bald">Careca</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center justify-between bg-slate-950 border border-white/15 rounded-lg px-3 py-1.5">
                <span className="text-slate-300 font-bold">Cor Cabelo</span>
                <input type="color" value={pHairCol} onChange={(e) => setPHairCol(e.target.value)} className="w-7 h-6 bg-transparent border-0 cursor-pointer" />
              </label>
              <label className="flex items-center justify-between bg-slate-950 border border-white/15 rounded-lg px-3 py-1.5">
                <span className="text-slate-300 font-bold">Chuteira</span>
                <input type="color" value={pBoots} onChange={(e) => setPBoots(e.target.value)} className="w-7 h-6 bg-transparent border-0 cursor-pointer" />
              </label>
            </div>

            <button
              type="button"
              onClick={startPlayerCareer}
              className="w-full min-h-[46px] rounded-xl bg-sky-600 hover:bg-sky-500 text-sm font-extrabold text-white cursor-pointer shadow-lg transition"
            >
              Iniciar Carreira de Jogador ({previewClub.abbr})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MANAGER CAREER HUB ====================
  if (careerKind === 'manager' && managerSave) {
    const club = brasileiraoClubs.find((t) => t.id === managerSave.teamId) || brasileiraoClubs[0];
    const customClub: TeamSpec = {
      ...club,
      players: managerSave.squad.map((p) => ({
        ...p,
        // Injured or exhausted players perform slightly slower on pitch
        ovr: p.injuredRounds > 0 ? Math.max(60, p.ovr - 12) : p.fatigue > 75 ? Math.max(66, p.ovr - 5) : p.ovr
      })),
      bench: managerSave.bench
    };
    const seasonFinished = managerSave.round >= managerSave.schedule.length;
    const nextFx = !seasonFinished
      ? managerSave.schedule[managerSave.round].find((f) => f.homeId === club.id || f.awayId === club.id)
      : null;
    const nextOpp = nextFx ? brasileiraoClubs.find((t) => t.id === (nextFx.homeId === club.id ? nextFx.awayId : nextFx.homeId)) : null;

    const sortedTable = Object.entries(managerSave.points)
      .map(([id, st]) => ({ team: brasileiraoClubs.find((t) => t.id === id)!, ...st }))
      .sort((a, b) => b.p - a.p || b.gp - b.gc - (a.gp - a.gc) || b.gp - a.gp);
    const rank = sortedTable.findIndex((r) => r.team.id === club.id) + 1;
    const avgFatigue = Math.round(managerSave.squad.reduce((acc, p) => acc + p.fatigue, 0) / managerSave.squad.length);
    const injuredCount = [...managerSave.squad, ...managerSave.bench].filter((p) => p.injuredRounds > 0).length;

    const marketPool: MarketCandidate[] = [
      ...MARKET_STARS,
      ...TEAMS.filter((t) => t.id !== club.id && t.leagueId !== 'selecoes')
        .flatMap((t) =>
          t.players
            .filter((p) => p.role !== 'GOL')
            .map((p) => ({
              id: `${t.id}_${p.num}_${p.name}`,
              name: p.name,
              originClub: t.name,
              role: p.role,
              ovr: p.ovr,
              price: Math.max(180, Math.round((p.ovr - 66) * 28)),
              wageDemand: Math.max(85, Math.round((p.ovr - 68) * 15)),
              skin: p.skin,
              hair: p.hair,
              hairColor: p.hairColor,
              boots: p.boots,
              beard: p.beard
            }))
        )
    ].filter((cand) => {
      const alreadyOwned = [...managerSave.squad, ...managerSave.bench].some((s) => s.name === cand.name);
      if (alreadyOwned) return false;
      const matchesRole = marketRoleFilter === 'ALL' || cand.role === marketRoleFilter;
      const q = marketQuery.trim().toLowerCase();
      const matchesQ = !q || cand.name.toLowerCase().includes(q) || cand.originClub.toLowerCase().includes(q);
      return matchesRole && matchesQ;
    });

    const playManagerMatch = () => {
      if (!nextFx || !nextOpp) return;
      const isHome = nextFx.homeId === club.id;
      onStartMatch(
        {
          mode: 'career_manager',
          homeTeam: customClub,
          awayTeam: nextOpp,
          homeUseAway: false,
          awayUseAway: isKitClash(customClub, nextOpp),
          difficulty: managerSave.difficulty,
          tactic: managerSave.tactic,
          formation: managerSave.formation
        },
        (res) => {
          const won = res.homeScore > res.awayScore;
          const draw = res.homeScore === res.awayScore;
          const prize = won ? 280 : draw ? 135 : 70;
          const totalWages = Math.round(
            [...managerSave.squad, ...managerSave.bench].reduce((s, p) => s + p.salary, 0) * 0.08
          );
          const nextScorers = { ...(managerSave.scorers || {}) };
          const { nextPts, nextSchedule } = advanceRoundTable(
            managerSave.points,
            managerSave.schedule,
            managerSave.round,
            club.id,
            res.homeScore,
            res.awayScore,
            isHome,
            nextScorers,
            managerSave.squad
          );

          // Update squad fatigue & injury risk + heal bench
          let newInjuryMsg = '';
          const nextSquad = managerSave.squad.map((p) => {
            const newFatigue = Math.min(100, p.fatigue + 16 + Math.floor(Math.random() * 8));
            let inj = Math.max(0, p.injuredRounds - 1);
            if (inj === 0 && newFatigue > 78 && Math.random() < 0.28) {
              inj = 1;
              newInjuryMsg = `${p.name} sentiu fadiga muscular (1 rodada).`;
            }
            return { ...p, fatigue: newFatigue, injuredRounds: inj };
          });
          const nextBench = managerSave.bench.map((b) => ({
            ...b,
            fatigue: Math.max(0, b.fatigue - 18),
            injuredRounds: Math.max(0, b.injuredRounds - 1)
          }));

          setManagerSave({
            ...managerSave,
            round: managerSave.round + 1,
            budget: Math.max(50, managerSave.budget + prize - totalWages),
            morale: Math.max(40, Math.min(100, managerSave.morale + (won ? 7 : draw ? 1 : -5))),
            squad: nextSquad,
            bench: nextBench,
            points: nextPts,
            schedule: nextSchedule,
            scorers: nextScorers
          });
          if (newInjuryMsg) setStatusNote(newInjuryMsg);
        }
      );
    };

    const handleMedicalRecovery = () => {
      if (managerSave.budget < 45) return;
      setManagerSave({
        ...managerSave,
        budget: managerSave.budget - 45,
        morale: Math.min(100, managerSave.morale + 3),
        squad: managerSave.squad.map((p) => ({
          ...p,
          fatigue: Math.max(0, p.fatigue - 28),
          injuredRounds: Math.max(0, p.injuredRounds - 1)
        })),
        bench: managerSave.bench.map((b) => ({
          ...b,
          fatigue: Math.max(0, b.fatigue - 28),
          injuredRounds: Math.max(0, b.injuredRounds - 1)
        }))
      });
      setStatusNote('Departamento médico recuperou o fôlego e tratou lesões do elenco!');
    };

    const upgradePlayer = (idx: number) => {
      if (managerSave.budget < 150) return;
      const nextSquad = managerSave.squad.map((p, i) =>
        i === idx
          ? {
              ...p,
              ovr: Math.min(96, p.ovr + 2),
              pace: Math.min(97, (p.pace || p.ovr) + 2),
              shooting: Math.min(97, (p.shooting || p.ovr) + 2),
              passing: Math.min(97, (p.passing || p.ovr) + 2),
              fatigue: Math.min(100, p.fatigue + 6),
              value: p.value + 35
            }
          : p
      );
      setManagerSave({ ...managerSave, budget: managerSave.budget - 150, squad: nextSquad });
      setStatusNote(`${managerSave.squad[idx].name} evoluiu +2 OVR nos treinos!`);
    };

    const restSinglePlayer = (idx: number) => {
      const nextSquad = managerSave.squad.map((p, i) =>
        i === idx ? { ...p, fatigue: Math.max(0, p.fatigue - 24), injuredRounds: 0 } : p
      );
      setManagerSave({ ...managerSave, squad: nextSquad });
      setStatusNote(`${managerSave.squad[idx].name} realizou sessão de recuperação.`);
    };

    const swapWithBench = (benchIdx: number) => {
      if (swapStarterIdx === null) return;
      const starter = managerSave.squad[swapStarterIdx];
      const sub = managerSave.bench[benchIdx];
      if (!starter || !sub) return;
      const nextSquad = managerSave.squad.map((p, i) => (i === swapStarterIdx ? sub : p));
      const nextBench = managerSave.bench.map((b, i) => (i === benchIdx ? starter : b));
      setManagerSave({ ...managerSave, squad: nextSquad, bench: nextBench });
      setSwapStarterIdx(null);
      setStatusNote(`${sub.name} assumiu a titularidade no lugar de ${starter.name}.`);
    };

    const sellBenchPlayer = (benchIdx: number) => {
      if (managerSave.bench.length <= 1) {
        setStatusNote('Você precisa manter pelo menos 1 reserva no banco.');
        return;
      }
      const target = managerSave.bench[benchIdx];
      const nextBench = managerSave.bench.filter((_, i) => i !== benchIdx);
      setManagerSave({
        ...managerSave,
        budget: managerSave.budget + target.value,
        bench: nextBench
      });
      setStatusNote(`${target.name} vendido por R$ ${target.value}M!`);
    };

    const openNegotiation = (cand: MarketCandidate) => {
      setNegotiating(cand);
      setOfferFee(cand.price);
      setOfferWage(cand.wageDemand);
      setNegFeedback(null);
    };

    const submitNegotiation = () => {
      if (!negotiating) return;
      if (managerSave.budget < offerFee) {
        setNegFeedback({ ok: false, text: 'Orçamento insuficiente para essa proposta.' });
        return;
      }
      const feeRatio = offerFee / negotiating.price;
      const wageRatio = offerWage / negotiating.wageDemand;
      if (feeRatio < 0.88) {
        setNegFeedback({
          ok: false,
          text: `${negotiating.originClub} recusou. Eles exigem pelo menos R$ ${Math.round(negotiating.price * 0.9)}M pelo passe.`
        });
        return;
      }
      if (wageRatio < 0.92) {
        setNegFeedback({
          ok: false,
          text: `O empresário de ${negotiating.name} recusou o salário. Peça perto de R$ ${negotiating.wageDemand} mil/sem.`
        });
        return;
      }

      const newPlayer: CareerPlayer = {
        num: Math.floor(11 + Math.random() * 80),
        name: negotiating.name,
        role: negotiating.role,
        skin: negotiating.skin,
        hair: negotiating.hair,
        hairColor: negotiating.hairColor,
        beard: negotiating.beard,
        boots: negotiating.boots,
        ovr: negotiating.ovr,
        pace: negotiating.ovr,
        shooting: negotiating.ovr,
        passing: negotiating.ovr,
        dribbling: negotiating.ovr,
        fatigue: 5,
        injuredRounds: 0,
        salary: offerWage,
        value: offerFee,
        goals: 0
      };

      const targetSlot = negotiating.role === 'ZAG' ? 1 : negotiating.role === 'MEI' ? 2 : 4;
      const displaced = managerSave.squad[targetSlot];
      const nextSquad = managerSave.squad.map((p, i) => (i === targetSlot ? newPlayer : p));
      const nextBench = [displaced, ...managerSave.bench].slice(0, 7);

      setManagerSave({
        ...managerSave,
        budget: managerSave.budget - offerFee,
        morale: Math.min(100, managerSave.morale + 5),
        squad: nextSquad,
        bench: nextBench
      });
      setStatusNote(`CONTRATADO! ${negotiating.name} assinou com salário de R$ ${offerWage} mil/sem e assumiu a camisa titular!`);
      setNegotiating(null);
    };

    const topScorersList = Object.values(managerSave.scorers || {})
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 8);

    return (
      <div className="w-full max-w-6xl mx-auto bg-slate-950/92 backdrop-blur-xl border border-white/15 rounded-2xl p-5 space-y-4 shadow-2xl max-h-[94vh] overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-3">
            <ClubCrest team={club} className="w-9 h-9" />
            <div>
              <h2 className="font-display text-lg font-black text-white tracking-tight">
                Carreira Treinador · {club.name} <span className="text-amber-400">T{managerSave.season}</span>
              </h2>
              <p className="text-xs text-slate-400 tabular-nums">
                Caixa: <strong className="text-emerald-400">R$ {managerSave.budget}M</strong> · Moral: {managerSave.morale}% · Fadiga Média: {avgFatigue}%{injuredCount > 0 ? ` · Lesionados: ${injuredCount}` : ''} · Posição: #{rank}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['hub', 'Central'],
                ['squad', 'Elenco & Treino'],
                ['market', 'Mercado & Salários'],
                ['table', 'Tabela & Artilharia']
              ] as const
            ).map(([tId, tLbl]) => (
              <button
                key={tId}
                type="button"
                onClick={() => setHubTab(tId)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition ${
                  hubTab === tId ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tLbl}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCareerKind('select')}
              className="min-h-[36px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>

        {statusNote && (
          <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs font-semibold text-emerald-200 flex items-center justify-between gap-2">
            <span>{statusNote}</span>
            <button type="button" onClick={() => setStatusNote('')} className="text-[11px] font-bold text-emerald-300 cursor-pointer">
              Fechar
            </button>
          </div>
        )}

        {hubTab === 'hub' && (
          <div className="space-y-4">
            {seasonFinished ? (
              <div className="bg-slate-900 border border-amber-400/50 rounded-xl p-6 text-center space-y-3">
                <ChampionshipTrophy gold={rank === 1} label={rank === 1 ? `Campeão Brasileiro! ${club.name}` : `Temporada ${managerSave.season} Concluída · ${rank}º Lugar`} />
                <p className="text-xs text-slate-300">
                  {rank <= 3 ? 'Diretoria satisfeita! Bônus de R$ 300M creditado para a próxima temporada.' : 'A diretoria espera brigar pelo Top 3 na próxima temporada.'}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setManagerSave({
                      ...managerSave,
                      round: 0,
                      season: managerSave.season + 1,
                      budget: managerSave.budget + (rank <= 3 ? 300 : 120),
                      points: initTable(brasileiraoClubs),
                      schedule: buildLeagueSchedule(brasileiraoClubs),
                      scorers: {}
                    })
                  }
                  className="min-h-[42px] px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white cursor-pointer"
                >
                  Iniciar Temporada {managerSave.season + 1}
                </button>
              </div>
            ) : nextOpp ? (
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/50 border border-white/15 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                    Próximo Confronto · Rodada {managerSave.round + 1} de 7
                  </div>
                  <div className="flex items-center gap-3 text-base font-extrabold text-white">
                    <ClubCrest team={club} className="w-7 h-7" />
                    <span>{club.name}</span>
                    <span className="text-slate-400 text-xs">VS</span>
                    <ClubCrest team={nextOpp} className="w-7 h-7" />
                    <span>{nextOpp.name}</span>
                    <span className="text-xs font-mono text-amber-300">(OVR {nextOpp.ovr})</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={managerSave.budget < 45}
                    onClick={handleMedicalRecovery}
                    className="min-h-[42px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-white/10 text-xs font-bold text-cyan-200 cursor-pointer"
                  >
                    Dept. Médico (R$ 45M · -Fadiga)
                  </button>
                  <button
                    type="button"
                    onClick={playManagerMatch}
                    className="min-h-[42px] px-7 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-extrabold text-white shadow-lg cursor-pointer"
                  >
                    Jogar Partida
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="text-xs font-extrabold text-slate-300 uppercase">Esquema & Postura Tática</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['4-3-3', '4-4-2', '4-2-3-1', '3-5-2'] as FormationId[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setManagerSave({ ...managerSave, formation: f })}
                      className={`min-h-[34px] rounded-lg border text-[11px] font-bold cursor-pointer ${
                        managerSave.formation === f ? 'bg-emerald-600 text-white border-amber-400' : 'bg-slate-950 text-slate-300 border-white/10'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['retranca', 'equilibrado', 'ofensivo'] as TacticId[]).map((tac) => (
                    <button
                      key={tac}
                      type="button"
                      onClick={() => setManagerSave({ ...managerSave, tactic: tac })}
                      className={`min-h-[34px] rounded-lg border text-[11px] font-bold capitalize cursor-pointer ${
                        managerSave.tactic === tac ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-950 text-slate-300 border-white/10'
                      }`}
                    >
                      {tac}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-2.5">
                <div className="text-xs font-extrabold text-slate-300 uppercase">Calendário do Clube na Temporada</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {managerSave.schedule.map((rd, rIdx) => {
                    const fx = rd.find((f) => f.homeId === club.id || f.awayId === club.id);
                    if (!fx) return null;
                    const home = brasileiraoClubs.find((t) => t.id === fx.homeId)!;
                    const away = brasileiraoClubs.find((t) => t.id === fx.awayId)!;
                    const played = fx.homeGoals !== undefined && fx.awayGoals !== undefined;
                    return (
                      <div
                        key={rIdx}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs tabular-nums ${
                          rIdx === managerSave.round
                            ? 'bg-emerald-950/60 border-amber-400/70 text-white font-bold'
                            : 'bg-slate-950/80 border-white/10 text-slate-300'
                        }`}
                      >
                        <span className="font-mono text-[10px] text-slate-400">R{rIdx + 1}</span>
                        <span className="flex items-center gap-1.5">
                          <ClubCrest team={home} className="w-4 h-4" />
                          <span>{home.abbr}</span>
                          <span className="text-slate-500">x</span>
                          <span>{away.abbr}</span>
                          <ClubCrest team={away} className="w-4 h-4" />
                        </span>
                        <span className="font-mono font-bold text-amber-300">
                          {played ? `${fx.homeGoals}-${fx.awayGoals}` : rIdx === managerSave.round ? 'PRÓX' : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {hubTab === 'squad' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <span>
                <strong className="text-amber-300">Titulares (5)</strong> · Clique em &quot;Trocar&quot; e depois selecione um reserva abaixo para rodar o elenco
              </span>
              {swapStarterIdx !== null && (
                <button
                  type="button"
                  onClick={() => setSwapStarterIdx(null)}
                  className="px-3 py-1 rounded bg-slate-800 text-amber-300 font-bold cursor-pointer"
                >
                  Cancelar Troca (#{managerSave.squad[swapStarterIdx].name})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {managerSave.squad.map((pl, idx) => (
                <div
                  key={idx}
                  className={`bg-slate-900 border rounded-xl p-3 flex flex-col items-center gap-2 text-center ${
                    swapStarterIdx === idx ? 'border-amber-400 ring-1 ring-amber-400/50' : 'border-white/10'
                  }`}
                >
                  <PlayerSpritePreview player={pl} team={club} className="w-12 h-14" />
                  <div className="text-xs font-extrabold text-white truncate max-w-full">{pl.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                    #{pl.num} · {pl.role} · <strong className="text-amber-300">OVR {pl.ovr}</strong>
                  </div>
                  <div className="w-full space-y-1 text-[10px]">
                    <div className="flex justify-between text-slate-400 tabular-nums">
                      <span>Fadiga</span>
                      <span className={pl.fatigue > 70 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>{pl.fatigue}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${pl.fatigue > 70 ? 'bg-rose-500' : pl.fatigue > 40 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        style={{ width: `${pl.fatigue}%` }}
                      />
                    </div>
                    {pl.injuredRounds > 0 && (
                      <div className="text-rose-400 font-extrabold">Lesionado ({pl.injuredRounds} rod.)</div>
                    )}
                  </div>
                  <div className="w-full grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      disabled={managerSave.budget < 150}
                      onClick={() => upgradePlayer(idx)}
                      className="min-h-[30px] rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-[10px] font-bold text-white cursor-pointer"
                    >
                      Treinar +2
                    </button>
                    <button
                      type="button"
                      onClick={() => setSwapStarterIdx(idx)}
                      className="min-h-[30px] rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-amber-300 cursor-pointer"
                    >
                      Trocar
                    </button>
                  </div>
                  {(pl.fatigue > 25 || pl.injuredRounds > 0) && (
                    <button
                      type="button"
                      onClick={() => restSinglePlayer(idx)}
                      className="w-full min-h-[28px] rounded-lg bg-sky-900/60 hover:bg-sky-800/70 text-[10px] font-bold text-sky-200 cursor-pointer"
                    >
                      Recuperar Físico
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-2.5">
              <div className="text-xs font-extrabold uppercase text-slate-300">Banco de Reservas (Escalar ou Vender)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {managerSave.bench.map((b, bi) => (
                  <div key={b.name + bi} className="bg-slate-950 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white truncate">#{b.num} {b.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                        {b.role} · OVR {b.ovr} · Fadiga {b.fatigue}% · Passe R${b.value}M
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {swapStarterIdx !== null && (
                        <button
                          type="button"
                          onClick={() => swapWithBench(bi)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-extrabold cursor-pointer"
                        >
                          Escalar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => sellBenchPlayer(bi)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-900/70 hover:bg-rose-800 text-[10px] font-bold text-rose-100 cursor-pointer"
                      >
                        Vender
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {hubTab === 'market' && (
          <div className="space-y-4">
            {/* Inline Salary & Transfer Negotiation Panel */}
            {negotiating && (
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/35 border border-amber-400/50 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase text-amber-400">Mesa de Negociação</div>
                    <div className="text-sm font-extrabold text-white">
                      {negotiating.name} ({negotiating.role} · OVR {negotiating.ovr}) · {negotiating.originClub}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNegotiating(null)}
                    className="px-3 py-1 rounded-lg bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">Proposta ao Clube (Passe)</span>
                      <span className="font-mono text-emerald-400">R$ {offerFee}M</span>
                    </div>
                    <input
                      type="range"
                      min={Math.round(negotiating.price * 0.7)}
                      max={Math.round(negotiating.price * 1.4)}
                      step={10}
                      value={offerFee}
                      onChange={(e) => setOfferFee(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                    <div className="text-[10px] text-slate-400">Valor pedido: R$ {negotiating.price}M</div>
                  </div>

                  <div className="bg-slate-950/80 border border-white/10 rounded-xl p-3 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-300">Oferta Salarial Semanal</span>
                      <span className="font-mono text-amber-300">R$ {offerWage} mil/sem</span>
                    </div>
                    <input
                      type="range"
                      min={Math.round(negotiating.wageDemand * 0.7)}
                      max={Math.round(negotiating.wageDemand * 1.5)}
                      step={5}
                      value={offerWage}
                      onChange={(e) => setOfferWage(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                    <div className="text-[10px] text-slate-400">Pedida salarial: R$ {negotiating.wageDemand} mil/sem</div>
                  </div>
                </div>

                {negFeedback && (
                  <div className={`text-xs font-bold px-3 py-2 rounded-lg ${negFeedback.ok ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950/80 text-rose-300'}`}>
                    {negFeedback.text}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={submitNegotiation}
                    className="min-h-[40px] px-6 rounded-xl bg-amber-400 hover:bg-amber-300 text-xs font-black text-slate-950 cursor-pointer"
                  >
                    Enviar Proposta Oficial (R$ {offerFee}M)
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <input
                type="text"
                value={marketQuery}
                onChange={(e) => setMarketQuery(e.target.value)}
                placeholder="Buscar jogador ou clube no mercado..."
                className="flex-1 min-w-[220px] bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs font-bold text-white"
              />
              <div className="flex gap-1.5">
                {(['ALL', 'ZAG', 'MEI', 'ATA'] as const).map((rf) => (
                  <button
                    key={rf}
                    type="button"
                    onClick={() => setMarketRoleFilter(rf)}
                    className={`min-h-[34px] px-3 rounded-lg text-xs font-bold cursor-pointer ${
                      marketRoleFilter === rf ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-slate-300 border border-white/10'
                    }`}
                  >
                    {rf === 'ALL' ? 'Todos' : rf}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {marketPool.slice(0, 24).map((cand) => (
                <div key={cand.id} className="bg-slate-900 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-white truncate">{cand.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {cand.originClub} · {cand.role} · <strong className="text-amber-300">OVR {cand.ovr}</strong>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      Passe R${cand.price}M · Salário R${cand.wageDemand}k/sem
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openNegotiation(cand)}
                    className="min-h-[36px] px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-xs font-extrabold text-slate-950 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Negociar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {hubTab === 'table' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-slate-900/70 border border-white/10 rounded-xl p-4 overflow-x-auto">
              <div className="text-xs font-extrabold uppercase text-slate-300 mb-2">Classificação do Brasileirão</div>
              <table className="w-full text-xs tabular-nums">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10 text-left">
                    <th className="py-1.5">#</th>
                    <th className="py-1.5">Clube</th>
                    <th className="py-1.5 text-center">P</th>
                    <th className="py-1.5 text-center">J</th>
                    <th className="py-1.5 text-center">V</th>
                    <th className="py-1.5 text-center">E</th>
                    <th className="py-1.5 text-center">D</th>
                    <th className="py-1.5 text-center">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTable.map((r, i) => (
                    <tr key={r.team.id} className={`border-b border-white/5 ${r.team.id === club.id ? 'bg-emerald-950/60 text-amber-300 font-bold' : 'text-slate-200'}`}>
                      <td className="py-1.5">{i + 1}</td>
                      <td className="py-1.5 flex items-center gap-2"><ClubCrest team={r.team} className="w-4 h-4" />{r.team.name}</td>
                      <td className="py-1.5 text-center font-extrabold">{r.p}</td>
                      <td className="py-1.5 text-center">{r.j}</td>
                      <td className="py-1.5 text-center">{r.v}</td>
                      <td className="py-1.5 text-center">{r.e}</td>
                      <td className="py-1.5 text-center">{r.d}</td>
                      <td className="py-1.5 text-center">{r.gp - r.gc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-2.5">
              <div className="text-xs font-extrabold uppercase text-amber-400">Artilharia da Liga</div>
              {topScorersList.length === 0 ? (
                <p className="text-xs text-slate-400">Jogue a primeira rodada para acompanhar os artilheiros.</p>
              ) : (
                <div className="space-y-1.5">
                  {topScorersList.map((sc, i) => {
                    const c = brasileiraoClubs.find((t) => t.id === sc.clubId);
                    return (
                      <div key={sc.name + sc.clubId} className="flex items-center justify-between bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs tabular-nums">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-slate-400">{i + 1}.</span>
                          {c && <ClubCrest team={c} className="w-4 h-4" />}
                          <span className="font-bold text-white truncate">{sc.name}</span>
                        </div>
                        <span className="font-mono font-extrabold text-amber-300">{sc.goals} gols</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== PLAYER CAREER HUB ====================
  if (careerKind === 'player' && playerSave) {
    const club = transferClubs.find((t) => t.id === playerSave.clubId) || brasileiraoClubs[0];
    const slotIdx = playerSave.custom.role === 'ZAG' ? 1 : playerSave.custom.role === 'MEI' ? 2 : 4;
    const seasonFinished = playerSave.round >= playerSave.schedule.length;
    const activeScheduleClub = brasileiraoClubs.some((t) => t.id === club.id) ? club.id : brasileiraoClubs[0].id;
    const nextFx = !seasonFinished
      ? playerSave.schedule[playerSave.round].find((f) => f.homeId === activeScheduleClub || f.awayId === activeScheduleClub)
      : null;
    const nextOpp = nextFx
      ? brasileiraoClubs.find((t) => t.id === (nextFx.homeId === activeScheduleClub ? nextFx.awayId : nextFx.homeId))
      : null;

    const avgRating = playerSave.ratings.length
      ? (playerSave.ratings.reduce((a, b) => a + b, 0) / playerSave.ratings.length).toFixed(1)
      : '—';

    const playPlayerMatch = () => {
      if (!nextFx || !nextOpp) return;
      const isHome = nextFx.homeId === activeScheduleClub;
      onStartMatch(
        {
          mode: 'career_player',
          homeTeam: club,
          awayTeam: nextOpp,
          homeUseAway: false,
          awayUseAway: isKitClash(club, nextOpp),
          difficulty: playerSave.difficulty,
          lockedPlayerSlot: slotIdx,
          customPlayer: playerSave.custom
        },
        (res) => {
          const earnedXp = Math.round(res.playerRating * 16 + res.userGoals * 40 + res.userAssists * 24);
          const { nextPts, nextSchedule } = advanceRoundTable(
            playerSave.points,
            playerSave.schedule,
            playerSave.round,
            activeScheduleClub,
            res.homeScore,
            res.awayScore,
            isHome
          );
          setPlayerSave({
            ...playerSave,
            round: playerSave.round + 1,
            xp: playerSave.xp + earnedXp,
            goals: playerSave.goals + res.userGoals,
            assists: playerSave.assists + res.userAssists,
            ratings: [...playerSave.ratings, res.playerRating],
            points: nextPts,
            schedule: nextSchedule
          });
        }
      );
    };

    const trainAttr = (attr: 'pace' | 'shooting' | 'passing' | 'dribbling') => {
      if (playerSave.xp < 100) return;
      const c = { ...playerSave.custom };
      c[attr] = Math.min(97, (c[attr] || 75) + 2);
      c.ovr = Math.round(((c.pace || 75) + (c.shooting || 75) + (c.passing || 75) + (c.dribbling || 75)) / 4);
      setPlayerSave({ ...playerSave, xp: playerSave.xp - 100, custom: c });
    };

    const transferOffers = transferClubs
      .filter((t) => t.id !== club.id && t.ovr >= Math.min(86, playerSave.custom.ovr + 4))
      .slice(0, 4);

    return (
      <div className="w-full max-w-5xl mx-auto bg-slate-950/92 backdrop-blur-xl border border-white/15 rounded-2xl p-5 space-y-4 shadow-2xl max-h-[94vh] overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-3">
            <PlayerSpritePreview player={playerSave.custom} team={club} className="w-12 h-14" spriteScale={1.55} />
            <div>
              <h2 className="font-display text-lg font-black text-white">
                #{playerSave.custom.num} {playerSave.custom.name} · {club.name}
              </h2>
              <p className="text-xs text-slate-400 tabular-nums">
                OVR <strong className="text-amber-300">{playerSave.custom.ovr}</strong> · XP <strong className="text-emerald-400">{playerSave.xp}</strong> · Gols: {playerSave.goals} · Assist: {playerSave.assists} · Nota Média: {avgRating} · Salário: R${playerSave.salary}k/sem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCareerKind('select')}
            className="min-h-[38px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
          >
            Sair
          </button>
        </div>

        {seasonFinished ? (
          <div className="bg-slate-900 border border-amber-400/50 rounded-xl p-6 text-center space-y-3">
            <ChampionshipTrophy label={`Temporada ${playerSave.season} Finalizada · Nota Média ${avgRating}`} />
            <button
              type="button"
              onClick={() =>
                setPlayerSave({
                  ...playerSave,
                  round: 0,
                  season: playerSave.season + 1,
                  points: initTable(brasileiraoClubs),
                  schedule: buildLeagueSchedule(brasileiraoClubs)
                })
              }
              className="min-h-[42px] px-6 rounded-xl bg-emerald-600 text-sm font-bold text-white cursor-pointer"
            >
              Iniciar Temporada {playerSave.season + 1}
            </button>
          </div>
        ) : nextOpp ? (
          <div className="bg-gradient-to-r from-slate-900 to-sky-950/50 border border-white/15 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-extrabold uppercase text-amber-400">
                Temporada {playerSave.season} · Rodada {playerSave.round + 1} de 7
              </div>
              <div className="flex items-center gap-3 text-base font-extrabold text-white mt-0.5">
                <ClubCrest team={club} className="w-7 h-7" />
                <span>{club.name}</span>
                <span className="text-slate-400 text-xs">VS</span>
                <ClubCrest team={nextOpp} className="w-7 h-7" />
                <span>{nextOpp.name}</span>
              </div>
              <div className="text-[11px] text-sky-300 mt-1">
                Câmera focada no seu craque + indicador tático de posicionamento em campo
              </div>
            </div>
            <button
              type="button"
              onClick={playPlayerMatch}
              className="min-h-[44px] px-7 rounded-xl bg-sky-600 hover:bg-sky-500 text-sm font-extrabold text-white cursor-pointer shadow-lg"
            >
              Entrar em Campo
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-2.5">
            <div className="text-xs font-extrabold uppercase text-slate-300">Evolução com XP (100 XP por treino)</div>
            {(
              [
                ['pace', 'Velocidade'],
                ['shooting', 'Chute'],
                ['passing', 'Passe'],
                ['dribbling', 'Drible']
              ] as const
            ).map(([k, lbl]) => {
              const val = playerSave.custom[k] || 75;
              return (
                <div key={k} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">
                      {lbl}: <strong className="text-amber-400 font-mono">{val}</strong>
                    </span>
                    <button
                      type="button"
                      disabled={playerSave.xp < 100}
                      onClick={() => trainAttr(k)}
                      className="min-h-[30px] px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-[11px] font-bold text-white cursor-pointer"
                    >
                      +2 {lbl}
                    </button>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${val}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-2.5">
            <div className="text-xs font-extrabold uppercase text-slate-300">Propostas de Transferência</div>
            {playerSave.ratings.length === 0 ? (
              <p className="text-xs text-slate-400">Jogue ao menos 1 partida para despertar interesse de clubes do Brasil e da Europa.</p>
            ) : (
              transferOffers.map((offer) => {
                const salaryOffer = Math.max(playerSave.salary + 25, Math.round((offer.ovr - 65) * 16));
                return (
                  <div key={offer.id} className="flex items-center justify-between bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs">
                    <div className="flex items-center gap-2.5 font-bold text-white">
                      <ClubCrest team={offer} className="w-6 h-6" />
                      <div>
                        <div>{offer.name} (OVR {offer.ovr})</div>
                        <div className="text-[10px] text-emerald-400 font-mono">Salário: R${salaryOffer}k/sem</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPlayerSave({ ...playerSave, clubId: offer.id, salary: salaryOffer })}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold cursor-pointer"
                    >
                      Assinar
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

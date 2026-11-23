import React, { useEffect, useMemo, useState } from 'react';
import { KitSwatch, PixelTrophy, PlayerSpritePreview } from '../components/PixelPreview';
import { DIFFICULTIES, TEAMS, isKitClash } from '../data/leagues';
import { DifficultyId, HairStyleId, MatchConfig, MatchResult, PlayerRole, PlayerSpec, SkinToneId, TacticId, TeamSpec } from '../types';

const STORAGE_MANAGER_KEY = 'br_sidekicks_career_manager_v1';
const STORAGE_PLAYER_KEY = 'br_sidekicks_career_player_v1';

interface ManagerSave {
  teamId: string;
  difficulty: DifficultyId;
  round: number;
  budget: number;
  morale: number;
  energy: number;
  tactic: TacticId;
  squad: PlayerSpec[];
  points: Record<string, { p: number; j: number; v: number; e: number; d: number; gp: number; gc: number }>;
  schedule: { homeId: string; awayId: string }[][];
}

interface PlayerSave {
  clubId: string;
  difficulty: DifficultyId;
  round: number;
  xp: number;
  goals: number;
  assists: number;
  ratings: number[];
  tactic: TacticId;
  custom: PlayerSpec;
  points: Record<string, { p: number; j: number; v: number; e: number; d: number; gp: number; gc: number }>;
  schedule: { homeId: string; awayId: string }[][];
}

const MARKET_STARS: { name: string; role: PlayerRole; ovr: number; price: number; skin: SkinToneId; hair: HairStyleId; hairColor: string; boots: string }[] = [
  { name: 'Gabriel Pec', role: 'ATA', ovr: 82, price: 450, skin: 'fair', hair: 'short_fade', hairColor: '#3b281e', boots: '#22c55e' },
  { name: 'Matheus Henrique', role: 'MEI', ovr: 83, price: 520, skin: 'tan', hair: 'curly_afro', hairColor: '#181412', boots: '#facc15' },
  { name: 'Murilo', role: 'ZAG', ovr: 84, price: 560, skin: 'fair', hair: 'platinum_fade', hairColor: '#f5f5f4', boots: '#38bdf8' },
  { name: 'John Kennedy', role: 'ATA', ovr: 81, price: 380, skin: 'brown', hair: 'dreads', hairColor: '#181412', boots: '#ef4444' },
  { name: 'Almada', role: 'MEI', ovr: 85, price: 680, skin: 'olive', hair: 'short_fade', hairColor: '#211915', boots: '#ec4899' }
];

function buildLeagueSchedule(teams: TeamSpec[]) {
  const ids = teams.map((t) => t.id);
  const n = ids.length;
  const arr = [...ids];
  const rounds: { homeId: string; awayId: string }[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const rd: { homeId: string; awayId: string }[] = [];
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
  onStartMatch: (cfg: MatchConfig, onComplete: (res: MatchResult) => void) => void;
  onBack: () => void;
}

export const CareerView: React.FC<Props> = ({ onStartMatch, onBack }) => {
  const brasileiraoClubs = useMemo(() => TEAMS.filter((t) => t.leagueId === 'brasileirao'), []);

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

  // Setup state
  const [setupClubId, setSetupClubId] = useState<string>('flamengo');
  const [setupDiff, setSetupDiff] = useState<DifficultyId>('amador');
  const [hubTab, setHubTab] = useState<'hub' | 'squad' | 'table' | 'market'>('hub');

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
      budget: 750,
      morale: 82,
      energy: 92,
      tactic: 'equilibrado',
      squad: club.players.map((p) => ({ ...p, pace: p.ovr, shooting: p.ovr, passing: p.ovr })),
      points: initTable(brasileiraoClubs),
      schedule: buildLeagueSchedule(brasileiraoClubs)
    };
    setManagerSave(save);
    setCareerKind('manager');
    setHubTab('hub');
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
      ovr: 74,
      pace: 75,
      shooting: 74,
      passing: 73,
      dribbling: 75
    };
    const save: PlayerSave = {
      clubId: club.id,
      difficulty: setupDiff,
      round: 0,
      xp: 120,
      goals: 0,
      assists: 0,
      ratings: [],
      tactic: 'equilibrado',
      custom,
      points: initTable(brasileiraoClubs),
      schedule: buildLeagueSchedule(brasileiraoClubs)
    };
    setPlayerSave(save);
    setCareerKind('player');
    setHubTab('hub');
  };

  const advanceRoundTable = (
    pts: ManagerSave['points'],
    schedule: ManagerSave['schedule'],
    round: number,
    userClubId: string,
    userHomeGoals: number,
    userAwayGoals: number,
    userIsHome: boolean
  ) => {
    const next = JSON.parse(JSON.stringify(pts)) as ManagerSave['points'];
    schedule[round].forEach((fx) => {
      let hg = 0;
      let ag = 0;
      if (fx.homeId === userClubId || fx.awayId === userClubId) {
        hg = userIsHome ? userHomeGoals : userAwayGoals;
        ag = userIsHome ? userAwayGoals : userHomeGoals;
      } else {
        const th = brasileiraoClubs.find((t) => t.id === fx.homeId)!;
        const ta = brasileiraoClubs.find((t) => t.id === fx.awayId)!;
        const diff = (th.ovr - ta.ovr) * 0.04;
        hg = Math.max(0, Math.round(Math.random() * 2.3 + diff));
        ag = Math.max(0, Math.round(Math.random() * 2.0 - diff));
      }
      const rh = next[fx.homeId];
      const ra = next[fx.awayId];
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
    });
    return next;
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
      ovr: 74
    };

    return (
      <div className="w-full max-w-5xl mx-auto bg-slate-950/95 border border-white/15 rounded-xl p-6 space-y-5 shadow-2xl max-h-[94vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h2 className="text-xl font-extrabold text-yellow-400">Modo Carreira</h2>
            <p className="text-xs text-slate-400">Escolha seguir como Treinador ou criar seu próprio Jogador</p>
          </div>
          <button type="button" onClick={onBack} className="min-h-[40px] px-4 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer">
            Voltar
          </button>
        </div>

        {(managerSave || playerSave) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {managerSave && (
              <button
                type="button"
                onClick={() => setCareerKind('manager')}
                className="p-3.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 hover:border-yellow-400 text-left flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-emerald-300 uppercase">Continuar Carreira de Treinador</div>
                  <div className="text-sm font-extrabold text-white mt-0.5">
                    {brasileiraoClubs.find((t) => t.id === managerSave.teamId)?.name} · Rodada {Math.min(7, managerSave.round + 1)}/7
                  </div>
                </div>
                <span className="text-xs font-bold text-yellow-400">Abrir →</span>
              </button>
            )}
            {playerSave && (
              <button
                type="button"
                onClick={() => setCareerKind('player')}
                className="p-3.5 rounded-lg bg-sky-950/70 border border-sky-500/40 hover:border-yellow-400 text-left flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="text-xs font-bold text-sky-300 uppercase">Continuar Carreira de Jogador</div>
                  <div className="text-sm font-extrabold text-white mt-0.5">
                    {playerSave.custom.name} (OVR {playerSave.custom.ovr}) · {brasileiraoClubs.find((t) => t.id === playerSave.clubId)?.name}
                  </div>
                </div>
                <span className="text-xs font-bold text-yellow-400">Abrir →</span>
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Shared Club & Difficulty Setup */}
          <div className="bg-slate-900/70 border border-white/10 rounded-lg p-4 space-y-4">
            <div className="text-xs font-extrabold uppercase text-slate-300">1. Clube & Dificuldade</div>
            <div className="grid grid-cols-2 gap-2">
              {brasileiraoClubs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSetupClubId(c.id)}
                  className={`min-h-[40px] px-2.5 rounded border flex items-center gap-2 text-xs font-bold cursor-pointer ${setupClubId === c.id ? 'bg-slate-800 border-yellow-400 text-white' : 'bg-slate-950 border-white/10 text-slate-300'}`}
                >
                  <KitSwatch team={c} className="w-4 h-4" />
                  <span className="truncate">{c.name}</span>
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
                    className={`min-h-[36px] rounded border text-xs font-bold cursor-pointer ${setupDiff === d ? 'bg-yellow-400 text-slate-950 border-yellow-300' : 'bg-slate-950 text-slate-300 border-white/10'}`}
                  >
                    {DIFFICULTIES[d].label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={startManagerCareer}
              className="w-full min-h-[44px] rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-extrabold text-white cursor-pointer"
            >
              Nova Carreira de Treinador ({previewClub.abbr})
            </button>
          </div>

          {/* Player Creator for Player Career */}
          <div className="bg-slate-900/70 border border-white/10 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold uppercase text-slate-300">2. Criar Meu Jogador</div>
              <PlayerSpritePreview player={customPreview} team={previewClub} className="w-10 h-12" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                maxLength={14}
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="Nome"
                className="col-span-2 bg-slate-950 border border-white/15 rounded px-2.5 py-2 text-xs font-bold text-white"
              />
              <input
                type="number"
                min={1}
                max={99}
                value={pNum}
                onChange={(e) => setPNum(Math.max(1, Math.min(99, Number(e.target.value) || 10)))}
                className="bg-slate-950 border border-white/15 rounded px-2.5 py-2 text-xs font-bold text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <select value={pRole} onChange={(e) => setPRole(e.target.value as PlayerRole)} className="bg-slate-950 border border-white/15 rounded px-2 py-2 text-white font-bold">
                <option value="ATA">Atacante</option>
                <option value="MEI">Meia</option>
                <option value="ZAG">Zagueiro</option>
              </select>
              <select value={pSkin} onChange={(e) => setPSkin(e.target.value as SkinToneId)} className="bg-slate-950 border border-white/15 rounded px-2 py-2 text-white font-bold">
                <option value="fair">Pele Clara</option>
                <option value="olive">Pele Morena</option>
                <option value="tan">Pele Bronze</option>
                <option value="brown">Pele Negra</option>
                <option value="dark">Pele Retinta</option>
              </select>
              <select value={pHair} onChange={(e) => setPHair(e.target.value as HairStyleId)} className="bg-slate-950 border border-white/15 rounded px-2 py-2 text-white font-bold">
                <option value="platinum_fade">Platinado</option>
                <option value="short_fade">Degradê Curto</option>
                <option value="curly_afro">Cacheado</option>
                <option value="dreads">Dreads</option>
                <option value="mohawk">Moicano</option>
                <option value="shaggy">Longo / Repicado</option>
                <option value="bald">Careca</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center justify-between bg-slate-950 border border-white/15 rounded px-2.5 py-1.5">
                <span className="text-slate-300 font-bold">Cor Cabelo</span>
                <input type="color" value={pHairCol} onChange={(e) => setPHairCol(e.target.value)} className="w-7 h-6 bg-transparent border-0 cursor-pointer" />
              </label>
              <label className="flex items-center justify-between bg-slate-950 border border-white/15 rounded px-2.5 py-1.5">
                <span className="text-slate-300 font-bold">Chuteira</span>
                <input type="color" value={pBoots} onChange={(e) => setPBoots(e.target.value)} className="w-7 h-6 bg-transparent border-0 cursor-pointer" />
              </label>
            </div>

            <button
              type="button"
              onClick={startPlayerCareer}
              className="w-full min-h-[44px] rounded bg-sky-600 hover:bg-sky-500 text-sm font-extrabold text-white cursor-pointer"
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
    const customClub: TeamSpec = { ...club, players: managerSave.squad };
    const seasonFinished = managerSave.round >= managerSave.schedule.length;
    const nextFx = !seasonFinished
      ? managerSave.schedule[managerSave.round].find((f) => f.homeId === club.id || f.awayId === club.id)
      : null;
    const nextOpp = nextFx ? brasileiraoClubs.find((t) => t.id === (nextFx.homeId === club.id ? nextFx.awayId : nextFx.homeId)) : null;

    const sortedTable = Object.entries(managerSave.points)
      .map(([id, st]) => ({ team: brasileiraoClubs.find((t) => t.id === id)!, ...st }))
      .sort((a, b) => b.p - a.p || b.gp - b.gc - (a.gp - a.gc) || b.gp - a.gp);
    const rank = sortedTable.findIndex((r) => r.team.id === club.id) + 1;

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
          tactic: managerSave.tactic
        },
        (res) => {
          const won = res.homeScore > res.awayScore;
          const draw = res.homeScore === res.awayScore;
          const prize = won ? 260 : draw ? 120 : 60;
          const nextPts = advanceRoundTable(managerSave.points, managerSave.schedule, managerSave.round, club.id, res.homeScore, res.awayScore, isHome);
          setManagerSave({
            ...managerSave,
            round: managerSave.round + 1,
            budget: managerSave.budget + prize,
            morale: Math.max(40, Math.min(100, managerSave.morale + (won ? 6 : draw ? 1 : -5))),
            energy: Math.max(45, managerSave.energy - 12),
            points: nextPts
          });
        }
      );
    };

    const upgradePlayer = (idx: number) => {
      if (managerSave.budget < 150) return;
      const nextSquad = managerSave.squad.map((p, i) =>
        i === idx ? { ...p, ovr: Math.min(95, p.ovr + 2), pace: (p.pace || p.ovr) + 2, shooting: (p.shooting || p.ovr) + 2 } : p
      );
      setManagerSave({ ...managerSave, budget: managerSave.budget - 150, squad: nextSquad });
    };

    const signStar = (star: (typeof MARKET_STARS)[number]) => {
      if (managerSave.budget < star.price) return;
      const targetIdx = star.role === 'ZAG' ? 1 : star.role === 'MEI' ? 2 : 4;
      const nextSquad = managerSave.squad.map((p, i) =>
        i === targetIdx
          ? {
              num: p.num,
              name: star.name,
              role: star.role,
              skin: star.skin,
              hair: star.hair,
              hairColor: star.hairColor,
              boots: star.boots,
              ovr: star.ovr,
              pace: star.ovr,
              shooting: star.ovr
            }
          : p
      );
      setManagerSave({ ...managerSave, budget: managerSave.budget - star.price, squad: nextSquad });
    };

    return (
      <div className="w-full max-w-5xl mx-auto bg-slate-950/95 border border-white/15 rounded-xl p-5 space-y-4 shadow-2xl max-h-[94vh] overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <KitSwatch team={club} className="w-7 h-7" />
            <div>
              <h2 className="text-lg font-extrabold text-white">Carreira de Treinador · {club.name}</h2>
              <p className="text-xs text-slate-400 tabular-nums">
                Caixa: R$ {managerSave.budget}M · Moral: {managerSave.morale}% · Energia: {managerSave.energy}% · Meta: Top 3 (Atual #{rank})
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {(['hub', 'squad', 'table', 'market'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setHubTab(t)}
                className={`min-h-[36px] px-3 rounded text-xs font-bold cursor-pointer ${hubTab === t ? 'bg-yellow-400 text-slate-950' : 'bg-slate-800 text-slate-200'}`}
              >
                {t === 'hub' ? 'Central' : t === 'squad' ? 'Elenco & Tática' : t === 'table' ? 'Tabela' : 'Mercado'}
              </button>
            ))}
            <button type="button" onClick={() => setCareerKind('select')} className="min-h-[36px] px-3 rounded bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer">
              Sair
            </button>
          </div>
        </div>

        {hubTab === 'hub' && (
          <div className="space-y-4">
            {seasonFinished ? (
              <div className="bg-slate-900 border border-yellow-400/50 rounded-lg p-6 text-center space-y-3">
                <PixelTrophy gold={rank === 1} label={rank === 1 ? `Campeão Brasileiro! ${club.name}` : `Temporada Concluída · ${rank}º Lugar`} />
                <p className="text-xs text-slate-300">
                  {rank <= 3 ? 'Meta da diretoria cumprida com sucesso!' : 'A diretoria esperava uma colocação no Top 3.'}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setManagerSave({
                      ...managerSave,
                      round: 0,
                      points: initTable(brasileiraoClubs),
                      schedule: buildLeagueSchedule(brasileiraoClubs)
                    })
                  }
                  className="min-h-[42px] px-6 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white cursor-pointer"
                >
                  Iniciar Nova Temporada
                </button>
              </div>
            ) : nextOpp ? (
              <div className="bg-slate-900 border border-white/10 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase text-yellow-400">Rodada {managerSave.round + 1} de 7</div>
                  <div className="flex items-center gap-3 text-base font-extrabold text-white">
                    <KitSwatch team={club} />
                    <span>{club.name}</span>
                    <span className="text-slate-400">x</span>
                    <KitSwatch team={nextOpp} />
                    <span>{nextOpp.name}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setManagerSave({ ...managerSave, energy: Math.min(100, managerSave.energy + 18), morale: Math.min(100, managerSave.morale + 3) })}
                    className="min-h-[42px] px-4 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    Descansar Elenco (+Energia)
                  </button>
                  <button
                    type="button"
                    onClick={playManagerMatch}
                    className="min-h-[42px] px-6 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-extrabold text-white cursor-pointer"
                  >
                    Jogar Partida
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Postura Tática</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['retranca', 'equilibrado', 'ofensivo'] as TacticId[]).map((tac) => (
                    <button
                      key={tac}
                      type="button"
                      onClick={() => setManagerSave({ ...managerSave, tactic: tac })}
                      className={`min-h-[38px] rounded border text-xs font-bold capitalize cursor-pointer ${managerSave.tactic === tac ? 'bg-yellow-400 text-slate-950 border-yellow-300' : 'bg-slate-950 text-slate-300 border-white/10'}`}
                    >
                      {tac}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Objetivo da Diretoria</div>
                <p className="text-sm font-bold text-white">Terminar entre os 3 primeiros colocados do Brasileirão.</p>
              </div>
            </div>
          </div>
        )}

        {hubTab === 'squad' && (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {managerSave.squad.map((pl, idx) => (
              <div key={idx} className="bg-slate-900 border border-white/10 rounded-lg p-3 flex flex-col items-center gap-2 text-center">
                <PlayerSpritePreview player={pl} team={club} className="w-10 h-12" />
                <div className="text-xs font-extrabold text-white">{pl.name}</div>
                <div className="text-[11px] text-slate-400 font-mono">#{pl.num} · {pl.role} · OVR {pl.ovr}</div>
                <button
                  type="button"
                  disabled={managerSave.budget < 150}
                  onClick={() => upgradePlayer(idx)}
                  className="w-full min-h-[34px] rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-[11px] font-bold text-white cursor-pointer"
                >
                  Treinar +2 (R$150M)
                </button>
              </div>
            ))}
          </div>
        )}

        {hubTab === 'table' && (
          <div className="bg-slate-900/70 border border-white/10 rounded-lg p-3 overflow-x-auto">
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
                  <tr key={r.team.id} className={`border-b border-white/5 ${r.team.id === club.id ? 'bg-emerald-950/60 text-yellow-300 font-bold' : 'text-slate-200'}`}>
                    <td className="py-1.5">{i + 1}</td>
                    <td className="py-1.5 flex items-center gap-2"><KitSwatch team={r.team} className="w-4 h-4" />{r.team.name}</td>
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
        )}

        {hubTab === 'market' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MARKET_STARS.map((st) => (
              <div key={st.name} className="bg-slate-900 border border-white/10 rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-white">{st.name}</div>
                  <div className="text-xs text-slate-400">{st.role} · OVR {st.ovr}</div>
                </div>
                <button
                  type="button"
                  disabled={managerSave.budget < st.price}
                  onClick={() => signStar(st)}
                  className="min-h-[36px] px-3 rounded bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-xs font-extrabold text-slate-950 cursor-pointer"
                >
                  Contratar R${st.price}M
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ==================== PLAYER CAREER HUB ====================
  if (careerKind === 'player' && playerSave) {
    const club = brasileiraoClubs.find((t) => t.id === playerSave.clubId) || brasileiraoClubs[0];
    const slotIdx = playerSave.custom.role === 'ZAG' ? 1 : playerSave.custom.role === 'MEI' ? 2 : 4;
    const seasonFinished = playerSave.round >= playerSave.schedule.length;
    const nextFx = !seasonFinished
      ? playerSave.schedule[playerSave.round].find((f) => f.homeId === club.id || f.awayId === club.id)
      : null;
    const nextOpp = nextFx ? brasileiraoClubs.find((t) => t.id === (nextFx.homeId === club.id ? nextFx.awayId : nextFx.homeId)) : null;

    const avgRating = playerSave.ratings.length
      ? (playerSave.ratings.reduce((a, b) => a + b, 0) / playerSave.ratings.length).toFixed(1)
      : '—';

    const playPlayerMatch = () => {
      if (!nextFx || !nextOpp) return;
      const isHome = nextFx.homeId === club.id;
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
          const earnedXp = Math.round(res.playerRating * 14 + res.userGoals * 35 + res.userAssists * 20);
          const nextPts = advanceRoundTable(playerSave.points, playerSave.schedule, playerSave.round, club.id, res.homeScore, res.awayScore, isHome);
          setPlayerSave({
            ...playerSave,
            round: playerSave.round + 1,
            xp: playerSave.xp + earnedXp,
            goals: playerSave.goals + res.userGoals,
            assists: playerSave.assists + res.userAssists,
            ratings: [...playerSave.ratings, res.playerRating],
            points: nextPts
          });
        }
      );
    };

    const trainAttr = (attr: 'pace' | 'shooting' | 'passing' | 'dribbling') => {
      if (playerSave.xp < 100) return;
      const c = { ...playerSave.custom };
      c[attr] = Math.min(96, (c[attr] || 74) + 2);
      c.ovr = Math.round(((c.pace || 74) + (c.shooting || 74) + (c.passing || 74) + (c.dribbling || 74)) / 4);
      setPlayerSave({ ...playerSave, xp: playerSave.xp - 100, custom: c });
    };

    const transferOffers = brasileiraoClubs.filter((t) => t.id !== club.id && t.ovr >= club.ovr - 2).slice(0, 3);

    return (
      <div className="w-full max-w-5xl mx-auto bg-slate-950/95 border border-white/15 rounded-xl p-5 space-y-4 shadow-2xl max-h-[94vh] overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <PlayerSpritePreview player={playerSave.custom} team={club} className="w-10 h-12" />
            <div>
              <h2 className="text-lg font-extrabold text-white">
                #{playerSave.custom.num} {playerSave.custom.name} · {club.name}
              </h2>
              <p className="text-xs text-slate-400 tabular-nums">
                OVR {playerSave.custom.ovr} · XP {playerSave.xp} · Gols: {playerSave.goals} · Assist: {playerSave.assists} · Nota Média: {avgRating}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setCareerKind('select')} className="min-h-[38px] px-4 rounded bg-slate-800 text-xs font-bold text-white cursor-pointer">
            Sair
          </button>
        </div>

        {seasonFinished ? (
          <div className="bg-slate-900 border border-yellow-400/50 rounded-lg p-6 text-center space-y-3">
            <PixelTrophy label={`Temporada Finalizada · Nota Média ${avgRating}`} />
            <button
              type="button"
              onClick={() => setPlayerSave({ ...playerSave, round: 0, points: initTable(brasileiraoClubs), schedule: buildLeagueSchedule(brasileiraoClubs) })}
              className="min-h-[42px] px-6 rounded bg-emerald-600 text-sm font-bold text-white cursor-pointer"
            >
              Nova Temporada
            </button>
          </div>
        ) : nextOpp ? (
          <div className="bg-slate-900 border border-white/10 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase text-yellow-400">Rodada {playerSave.round + 1} de 7</div>
              <div className="flex items-center gap-3 text-base font-extrabold text-white mt-0.5">
                <KitSwatch team={club} />
                <span>{club.name}</span>
                <span className="text-slate-400">x</span>
                <KitSwatch team={nextOpp} />
                <span>{nextOpp.name}</span>
              </div>
            </div>
            <button type="button" onClick={playPlayerMatch} className="min-h-[44px] px-6 rounded bg-sky-600 hover:bg-sky-500 text-sm font-extrabold text-white cursor-pointer">
              Entrar em Campo
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/70 border border-white/10 rounded-lg p-4 space-y-2.5">
            <div className="text-xs font-extrabold uppercase text-slate-300">Evolução com XP (100 XP por treino)</div>
            {(
              [
                ['pace', 'Velocidade'],
                ['shooting', 'Chute'],
                ['passing', 'Passe'],
                ['dribbling', 'Drible']
              ] as const
            ).map(([k, lbl]) => (
              <div key={k} className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">
                  {lbl}: <strong className="text-yellow-400">{playerSave.custom[k] || 74}</strong>
                </span>
                <button
                  type="button"
                  disabled={playerSave.xp < 100}
                  onClick={() => trainAttr(k)}
                  className="min-h-[32px] px-3 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 font-bold text-white cursor-pointer"
                >
                  +2 {lbl}
                </button>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/70 border border-white/10 rounded-lg p-4 space-y-2.5">
            <div className="text-xs font-extrabold uppercase text-slate-300">Propostas de Transferência</div>
            {playerSave.ratings.length === 0 ? (
              <p className="text-xs text-slate-400">Jogue ao menos 1 partida com boa nota para receber propostas de outros clubes.</p>
            ) : (
              transferOffers.map((offer) => (
                <div key={offer.id} className="flex items-center justify-between bg-slate-950 border border-white/10 rounded px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <KitSwatch team={offer} />
                    <span>{offer.name} (OVR {offer.ovr})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlayerSave({ ...playerSave, clubId: offer.id })}
                    className="px-3 py-1 rounded bg-yellow-400 text-slate-950 font-extrabold cursor-pointer"
                  >
                    Aceitar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

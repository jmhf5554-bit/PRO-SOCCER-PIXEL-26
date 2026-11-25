import React, { useMemo, useState } from 'react';
import { ChampionshipTrophy, ClubCrest } from '../components/ClubPreview';
import { TeamPickerModal } from '../components/TeamPickerModal';
import { DIFFICULTIES, LEAGUES, TEAMS, isKitClash } from '../data/leagues';
import { DifficultyId, MatchConfig, MatchResult, TeamSpec } from '../types';

type CompKind = 'league' | 'knockout16' | 'knockout8' | 'worldcup';

interface CompMeta {
  id: string;
  name: string;
  subtitle: string;
  format: CompKind;
  badgeColor: string;
}

const CUP_COMPETITIONS: CompMeta[] = [
  {
    id: 'libertadores',
    name: 'Copa Libertadores',
    subtitle: '16 clubes sul-americanos · Mata-mata (Oitavas à Final)',
    format: 'knockout16',
    badgeColor: 'from-amber-950/80 to-emerald-950/70 border-amber-400/50'
  },
  {
    id: 'copabrasil',
    name: 'Copa do Brasil',
    subtitle: '8 clubes nacionais · Mata-mata (Quartas à Final)',
    format: 'knockout8',
    badgeColor: 'from-emerald-950/80 to-sky-950/70 border-emerald-400/50'
  },
  {
    id: 'copamundo',
    name: 'Copa do Mundo',
    subtitle: '8 seleções sorteadas de 20 · Grupos + Semifinal e Final',
    format: 'worldcup',
    badgeColor: 'from-cyan-950/80 to-indigo-950/70 border-cyan-400/50'
  }
];

interface TableRow {
  team: TeamSpec;
  p: number;
  j: number;
  v: number;
  e: number;
  d: number;
  gp: number;
  gc: number;
}

interface Fixture {
  homeId: string;
  awayId: string;
  homeGoals?: number;
  awayGoals?: number;
}

interface ScorerEntry {
  name: string;
  teamId: string;
  goals: number;
}

interface Props {
  defaultDifficulty?: DifficultyId;
  onStartMatch: (cfg: MatchConfig, onComplete: (res: MatchResult) => void) => void;
  onBack: () => void;
}

function buildRoundRobin(teams: TeamSpec[], doubleRound = false): Fixture[][] {
  const ids = teams.map((t) => t.id);
  const n = ids.length;
  const rounds: Fixture[][] = [];
  const arr = [...ids];
  for (let r = 0; r < n - 1; r++) {
    const round: Fixture[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      round.push(r % 2 === 0 ? { homeId: a, awayId: b } : { homeId: b, awayId: a });
    }
    rounds.push(round);
    const last = arr.pop()!;
    arr.splice(1, 0, last);
  }
  if (doubleRound) {
    const secondLeg = rounds.map((rd) => rd.map((f) => ({ homeId: f.awayId, awayId: f.homeId })));
    return [...rounds, ...secondLeg];
  }
  return rounds;
}

function simScore(a: TeamSpec, b: TeamSpec, allowDraw = true): [number, number] {
  const diff = (a.ovr - b.ovr) * 0.04;
  let gA = Math.max(0, Math.round(Math.random() * 2.4 + diff));
  let gB = Math.max(0, Math.round(Math.random() * 2.1 - diff));
  if (!allowDraw && gA === gB) {
    if (a.ovr >= b.ovr ? Math.random() < 0.65 : Math.random() < 0.35) gA++;
    else gB++;
  }
  return [gA, gB];
}

function calcTable(teams: TeamSpec[], rounds: Fixture[][]): TableRow[] {
  const map = new Map<string, TableRow>();
  teams.forEach((t) => map.set(t.id, { team: t, p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }));
  rounds.forEach((rd) =>
    rd.forEach((fx) => {
      if (fx.homeGoals === undefined || fx.awayGoals === undefined) return;
      const h = map.get(fx.homeId);
      const a = map.get(fx.awayId);
      if (!h || !a) return;
      h.j++;
      a.j++;
      h.gp += fx.homeGoals;
      h.gc += fx.awayGoals;
      a.gp += fx.awayGoals;
      a.gc += fx.homeGoals;
      if (fx.homeGoals > fx.awayGoals) {
        h.v++;
        h.p += 3;
        a.d++;
      } else if (fx.awayGoals > fx.homeGoals) {
        a.v++;
        a.p += 3;
        h.d++;
      } else {
        h.e++;
        a.e++;
        h.p++;
        a.p++;
      }
    })
  );
  return Array.from(map.values()).sort((x, y) => y.p - x.p || y.gp - y.gc - (x.gp - x.gc) || y.gp - x.gp);
}

function pairIntoKnockout(teams: TeamSpec[]): Fixture[] {
  const res: Fixture[] = [];
  for (let i = 0; i < teams.length; i += 2) {
    if (teams[i] && teams[i + 1]) res.push({ homeId: teams[i].id, awayId: teams[i + 1].id });
  }
  return res;
}

export const TournamentView: React.FC<Props> = ({ defaultDifficulty = 'amador', onStartMatch, onBack }) => {
  const clubLeagues = useMemo(() => LEAGUES.filter((l) => !l.isNational), []);
  const [compCategory, setCompCategory] = useState<'league' | 'cup'>('league');
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('brasileirao');
  const [selectedCupId, setSelectedCupId] = useState<string>('libertadores');
  const [difficulty, setDifficulty] = useState<DifficultyId>(defaultDifficulty);
  const [userTeamId, setUserTeamId] = useState<string>('flamengo');
  const [started, setStarted] = useState(false);
  const [crestPickerOpen, setCrestPickerOpen] = useState(false);

  // League & Cup State
  const [rounds, setRounds] = useState<Fixture[][]>([]);
  const [groupBRounds, setGroupBRounds] = useState<Fixture[][]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [stage, setStage] = useState<'group' | 'r16' | 'qf' | 'semi' | 'final' | 'done'>('group');
  const [r16Matches, setR16Matches] = useState<Fixture[]>([]);
  const [qfMatches, setQfMatches] = useState<Fixture[]>([]);
  const [semiMatches, setSemiMatches] = useState<Fixture[]>([]);
  const [finalMatch, setFinalMatch] = useState<Fixture | null>(null);
  const [champion, setChampion] = useState<TeamSpec | null>(null);
  const [scorers, setScorers] = useState<Record<string, ScorerEntry>>({});

  const compId = compCategory === 'league' ? selectedLeagueId : selectedCupId;

  const compMeta: CompMeta = useMemo(() => {
    if (compCategory === 'cup') {
      return CUP_COMPETITIONS.find((c) => c.id === selectedCupId) || CUP_COMPETITIONS[0];
    }
    const lg = clubLeagues.find((l) => l.id === selectedLeagueId) || clubLeagues[0];
    return {
      id: lg.id,
      name: lg.name,
      subtitle: '20 clubes · Pontos corridos (19 rodadas)',
      format: 'league',
      badgeColor: 'from-emerald-950/80 to-slate-900 border-emerald-400/50'
    };
  }, [compCategory, selectedLeagueId, selectedCupId, clubLeagues]);

  const compTeams = useMemo(() => {
    if (compId === 'copabrasil') return TEAMS.filter((t) => t.leagueId === 'brasileirao' || t.leagueId === 'br_b');
    if (compId === 'libertadores') {
      return TEAMS.filter((t) =>
        ['brasileirao', 'argentina', 'colombia', 'chile', 'uruguay', 'ecuador', 'paraguay'].includes(t.leagueId)
      );
    }
    if (compId === 'copamundo') return TEAMS.filter((t) => t.leagueId === 'selecoes');
    return TEAMS.filter((t) => t.leagueId === compId);
  }, [compId]);

  const userTeam = compTeams.find((t) => t.id === userTeamId) || compTeams[0];

  const recordMatchGoals = (
    acc: Record<string, ScorerEntry>,
    teamId: string,
    goals: number,
    preferUserGoals?: number
  ) => {
    if (goals <= 0) return;
    const team = compTeams.find((t) => t.id === teamId);
    if (!team) return;
    const attackers = team.players.filter((p) => p.role === 'ATA' || p.role === 'MEI');
    for (let i = 0; i < goals; i++) {
      const p = preferUserGoals && i < preferUserGoals ? team.players[4] : attackers[i % attackers.length] || team.players[4];
      const key = `${teamId}_${p.name}`;
      if (!acc[key]) acc[key] = { name: p.name, teamId, goals: 0 };
      acc[key].goals++;
    }
  };

  const startCompetition = () => {
    setRoundIdx(0);
    setR16Matches([]);
    setQfMatches([]);
    setSemiMatches([]);
    setFinalMatch(null);
    setChampion(null);
    setScorers({});

    if (compMeta.format === 'league') {
      setRounds(buildRoundRobin(compTeams, compTeams.length <= 4));
      setGroupBRounds([]);
      setStage('group');
    } else if (compMeta.format === 'worldcup') {
      const others = compTeams.filter((t) => t.id !== userTeam.id).sort(() => Math.random() - 0.5);
      const ordered = [userTeam, ...others.slice(0, 7)];
      setRounds(buildRoundRobin(ordered.slice(0, 4)));
      setGroupBRounds(buildRoundRobin(ordered.slice(4, 8)));
      setStage('group');
    } else if (compMeta.format === 'knockout16') {
      const others = compTeams.filter((t) => t.id !== userTeam.id).sort(() => Math.random() - 0.5);
      const seeded = [userTeam, ...others.slice(0, 15)];
      setRounds([]);
      setGroupBRounds([]);
      setR16Matches(pairIntoKnockout(seeded));
      setStage('r16');
    } else {
      const others = compTeams.filter((t) => t.id !== userTeam.id).sort(() => Math.random() - 0.5);
      const seeded = [userTeam, ...others.slice(0, 7)];
      setRounds([]);
      setGroupBRounds([]);
      setQfMatches(pairIntoKnockout(seeded));
      setStage('qf');
    }
    setStarted(true);
  };

  const groupATeams = useMemo(() => {
    if (compMeta.format !== 'worldcup') return compTeams;
    const activeIds = new Set<string>();
    rounds[0]?.forEach((f) => {
      activeIds.add(f.homeId);
      activeIds.add(f.awayId);
    });
    if (activeIds.size > 0) return compTeams.filter((t) => activeIds.has(t.id));
    const ordered = [userTeam, ...compTeams.filter((t) => t.id !== userTeam.id)];
    return ordered.slice(0, 4);
  }, [compMeta.format, compTeams, userTeam, rounds]);

  const groupBTeams = useMemo(() => {
    if (compMeta.format !== 'worldcup') return [];
    const activeIds = new Set<string>();
    groupBRounds[0]?.forEach((f) => {
      activeIds.add(f.homeId);
      activeIds.add(f.awayId);
    });
    if (activeIds.size > 0) return compTeams.filter((t) => activeIds.has(t.id));
    const ordered = [userTeam, ...compTeams.filter((t) => t.id !== userTeam.id)];
    return ordered.slice(4, 8);
  }, [compMeta.format, compTeams, userTeam, groupBRounds]);

  const tableA = useMemo(() => calcTable(groupATeams, rounds), [groupATeams, rounds]);
  const tableB = useMemo(() => calcTable(groupBTeams, groupBRounds), [groupBTeams, groupBRounds]);

  const findNextUserFixture = (): Fixture | null => {
    if (stage === 'group' && rounds[roundIdx]) {
      return rounds[roundIdx].find((f) => f.homeId === userTeam.id || f.awayId === userTeam.id) || null;
    }
    if (stage === 'r16') return r16Matches.find((f) => f.homeId === userTeam.id || f.awayId === userTeam.id) || null;
    if (stage === 'qf') return qfMatches.find((f) => f.homeId === userTeam.id || f.awayId === userTeam.id) || null;
    if (stage === 'semi') return semiMatches.find((f) => f.homeId === userTeam.id || f.awayId === userTeam.id) || null;
    if (stage === 'final' && finalMatch && (finalMatch.homeId === userTeam.id || finalMatch.awayId === userTeam.id)) {
      return finalMatch;
    }
    return null;
  };

  const simRemainingBracket = (
    currentStage: 'qf' | 'semi' | 'final',
    matches: Fixture[],
    accScorers: Record<string, ScorerEntry>
  ) => {
    let cur = matches;
    let st: 'qf' | 'semi' | 'final' = currentStage;
    let builtQf = qfMatches;
    let builtSemi = semiMatches;
    let builtFinal = finalMatch;

    while (true) {
      const winners: string[] = [];
      const played = cur.map((m) => {
        if (m.homeGoals !== undefined && m.awayGoals !== undefined) {
          winners.push(m.homeGoals >= m.awayGoals ? m.homeId : m.awayId);
          return m;
        }
        const [g1, g2] = simScore(compTeams.find((t) => t.id === m.homeId)!, compTeams.find((t) => t.id === m.awayId)!, false);
        recordMatchGoals(accScorers, m.homeId, g1);
        recordMatchGoals(accScorers, m.awayId, g2);
        winners.push(g1 >= g2 ? m.homeId : m.awayId);
        return { ...m, homeGoals: g1, awayGoals: g2 };
      });

      if (st === 'qf') {
        builtQf = played;
        cur = [
          { homeId: winners[0], awayId: winners[1] },
          { homeId: winners[2], awayId: winners[3] }
        ];
        st = 'semi';
      } else if (st === 'semi') {
        builtSemi = played;
        cur = [{ homeId: winners[0], awayId: winners[1] }];
        st = 'final';
      } else {
        builtFinal = played[0];
        setQfMatches(builtQf);
        setSemiMatches(builtSemi);
        setFinalMatch(builtFinal);
        setChampion(compTeams.find((t) => t.id === winners[0])!);
        setStage('done');
        break;
      }
    }
  };

  const playNextFixture = () => {
    const fx = findNextUserFixture();
    if (!fx) return;
    const isHome = fx.homeId === userTeam.id;
    const oppId = isHome ? fx.awayId : fx.homeId;
    const oppTeam = compTeams.find((t) => t.id === oppId)!;
    const clash = isKitClash(userTeam, oppTeam);

    onStartMatch(
      {
        mode: 'tournament',
        homeTeam: userTeam,
        awayTeam: oppTeam,
        homeUseAway: false,
        awayUseAway: clash,
        difficulty
      },
      (res: MatchResult) => {
        const nextScorers = { ...scorers };
        const userGoalsTotal = res.homeScore;
        const oppGoalsTotal = res.awayScore;
        recordMatchGoals(nextScorers, userTeam.id, userGoalsTotal, res.userGoals);
        recordMatchGoals(nextScorers, oppTeam.id, oppGoalsTotal);

        if (stage === 'group') {
          const updatedA = rounds.map((rd, rI) =>
            rI !== roundIdx
              ? rd
              : rd.map((f) => {
                  if (f === fx) {
                    return {
                      ...f,
                      homeGoals: isHome ? res.homeScore : res.awayScore,
                      awayGoals: isHome ? res.awayScore : res.homeScore
                    };
                  }
                  const [g1, g2] = simScore(compTeams.find((t) => t.id === f.homeId)!, compTeams.find((t) => t.id === f.awayId)!);
                  recordMatchGoals(nextScorers, f.homeId, g1);
                  recordMatchGoals(nextScorers, f.awayId, g2);
                  return { ...f, homeGoals: g1, awayGoals: g2 };
                })
          );
          const updatedB = groupBRounds.map((rd, rI) =>
            rI !== roundIdx
              ? rd
              : rd.map((f) => {
                  const [g1, g2] = simScore(compTeams.find((t) => t.id === f.homeId)!, compTeams.find((t) => t.id === f.awayId)!);
                  recordMatchGoals(nextScorers, f.homeId, g1);
                  recordMatchGoals(nextScorers, f.awayId, g2);
                  return { ...f, homeGoals: g1, awayGoals: g2 };
                })
          );
          setRounds(updatedA);
          setGroupBRounds(updatedB);
          setScorers(nextScorers);

          if (roundIdx + 1 < updatedA.length) {
            setRoundIdx(roundIdx + 1);
          } else if (compMeta.format === 'league') {
            const finalTable = calcTable(groupATeams, updatedA);
            setChampion(finalTable[0].team);
            setStage('done');
          } else {
            const tA = calcTable(groupATeams, updatedA);
            const tB = calcTable(groupBTeams, updatedB);
            const semis: Fixture[] = [
              { homeId: tA[0].team.id, awayId: tB[1].team.id },
              { homeId: tB[0].team.id, awayId: tA[1].team.id }
            ];
            setSemiMatches(semis);
            const userInSemi = semis.some((s) => s.homeId === userTeam.id || s.awayId === userTeam.id);
            if (!userInSemi) {
              simRemainingBracket('semi', semis, nextScorers);
              setScorers(nextScorers);
            } else {
              setStage('semi');
            }
          }
          return;
        }

        const resolveKnockoutRound = (
          list: Fixture[],
          nextStage: 'qf' | 'semi' | 'final',
          setCur: (f: Fixture[]) => void,
          setNext: (f: Fixture[]) => void
        ) => {
          const uWin = res.homeScore >= res.awayScore;
          const winners: string[] = [];
          const updated = list.map((m) => {
            if (m === fx) {
              const hg = isHome ? res.homeScore : res.awayScore;
              const ag = isHome ? res.awayScore : res.homeScore;
              winners.push(uWin ? userTeam.id : oppId);
              return { ...m, homeGoals: hg, awayGoals: ag };
            }
            const [g1, g2] = simScore(compTeams.find((t) => t.id === m.homeId)!, compTeams.find((t) => t.id === m.awayId)!, false);
            recordMatchGoals(nextScorers, m.homeId, g1);
            recordMatchGoals(nextScorers, m.awayId, g2);
            winners.push(g1 >= g2 ? m.homeId : m.awayId);
            return { ...m, homeGoals: g1, awayGoals: g2 };
          });
          setCur(updated);
          const nextPairs: Fixture[] = [];
          for (let i = 0; i < winners.length; i += 2) {
            nextPairs.push({ homeId: winners[i], awayId: winners[i + 1] });
          }
          setNext(nextPairs);
          setScorers(nextScorers);

          if (uWin) {
            setStage(nextStage);
          } else {
            simRemainingBracket(nextStage, nextPairs, nextScorers);
            setScorers(nextScorers);
          }
        };

        if (stage === 'r16') {
          resolveKnockoutRound(r16Matches, 'qf', setR16Matches, setQfMatches);
        } else if (stage === 'qf') {
          resolveKnockoutRound(qfMatches, 'semi', setQfMatches, setSemiMatches);
        } else if (stage === 'semi') {
          const uWin = res.homeScore >= res.awayScore;
          const winners: string[] = [];
          const updated = semiMatches.map((s) => {
            if (s === fx) {
              const hg = isHome ? res.homeScore : res.awayScore;
              const ag = isHome ? res.awayScore : res.homeScore;
              winners.push(uWin ? userTeam.id : oppId);
              return { ...s, homeGoals: hg, awayGoals: ag };
            }
            const [g1, g2] = simScore(compTeams.find((t) => t.id === s.homeId)!, compTeams.find((t) => t.id === s.awayId)!, false);
            recordMatchGoals(nextScorers, s.homeId, g1);
            recordMatchGoals(nextScorers, s.awayId, g2);
            winners.push(g1 >= g2 ? s.homeId : s.awayId);
            return { ...s, homeGoals: g1, awayGoals: g2 };
          });
          setSemiMatches(updated);
          const fMatch = { homeId: winners[0], awayId: winners[1] };
          setFinalMatch(fMatch);
          setScorers(nextScorers);
          if (uWin) {
            setStage('final');
          } else {
            simRemainingBracket('final', [fMatch], nextScorers);
            setScorers(nextScorers);
          }
        } else if (stage === 'final' && finalMatch) {
          const uWin = res.homeScore >= res.awayScore;
          setFinalMatch({
            ...finalMatch,
            homeGoals: isHome ? res.homeScore : res.awayScore,
            awayGoals: isHome ? res.awayScore : res.homeScore
          });
          setScorers(nextScorers);
          setChampion(uWin ? userTeam : oppTeam);
          setStage('done');
        }
      }
    );
  };

  if (!started) {
    return (
      <div className="w-full max-w-5xl mx-auto bg-slate-950/92 backdrop-blur-xl border border-emerald-400/30 rounded-2xl p-6 space-y-5 shadow-2xl max-h-[94vh] overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div>
            <h2 className="font-display text-2xl font-black bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-300 bg-clip-text text-transparent tracking-tight uppercase">
              Torneios &amp; Copas Oficiais
            </h2>
            <p className="text-xs text-slate-300">27 Ligas Nacionais e Europeias (20 clubes cada) + Copas Continentais e Mundial</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="min-h-[40px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-xs font-bold text-white cursor-pointer"
          >
            Voltar
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setCompCategory('league');
              const first = TEAMS.find((t) => t.leagueId === selectedLeagueId);
              if (first) setUserTeamId(first.id);
            }}
            className={`min-h-[40px] px-4 rounded-xl border text-xs font-extrabold uppercase tracking-wider cursor-pointer transition ${
              compCategory === 'league'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 border-emerald-300'
                : 'bg-slate-900 text-slate-300 border-white/15 hover:border-white/30'
            }`}
          >
            Ligas Nacionais (27 · 20 Times)
          </button>
          <button
            type="button"
            onClick={() => {
              setCompCategory('cup');
              const first =
                selectedCupId === 'copamundo'
                  ? TEAMS.find((t) => t.leagueId === 'selecoes')
                  : TEAMS.find((t) => t.leagueId === 'brasileirao');
              if (first) setUserTeamId(first.id);
            }}
            className={`min-h-[40px] px-4 rounded-xl border text-xs font-extrabold uppercase tracking-wider cursor-pointer transition ${
              compCategory === 'cup'
                ? 'bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950 border-amber-300'
                : 'bg-slate-900 text-slate-300 border-white/15 hover:border-white/30'
            }`}
          >
            Copas &amp; Mata-Mata (3)
          </button>
        </div>

        {compCategory === 'league' ? (
          <div className="bg-slate-900/80 border border-emerald-400/25 rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                Selecione o Campeonato ({clubLeagues.length} ligas · 20 clubes por liga)
              </span>
              <span className="text-[11px] text-amber-300 font-bold">19 rodadas de pontos corridos</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {clubLeagues.map((lg) => (
                <button
                  key={lg.id}
                  type="button"
                  onClick={() => {
                    setSelectedLeagueId(lg.id);
                    const first = TEAMS.find((t) => t.leagueId === lg.id);
                    if (first) setUserTeamId(first.id);
                  }}
                  className={`px-3 py-2 rounded-xl border text-left text-xs font-bold cursor-pointer transition ${
                    selectedLeagueId === lg.id
                      ? 'bg-gradient-to-r from-emerald-900/90 to-cyan-950/90 border-amber-400 text-white shadow'
                      : 'bg-slate-950/90 border-white/10 text-slate-300 hover:border-emerald-400/40'
                  }`}
                >
                  <div className="truncate">{lg.name}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CUP_COMPETITIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCupId(c.id);
                  const list =
                    c.id === 'copamundo'
                      ? TEAMS.filter((t) => t.leagueId === 'selecoes')
                      : TEAMS.filter((t) => t.leagueId === 'brasileirao');
                  if (list[0]) setUserTeamId(list[0].id);
                }}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition bg-gradient-to-br ${
                  selectedCupId === c.id ? c.badgeColor : 'from-slate-900 to-slate-950 border-white/10 hover:border-white/30'
                }`}
              >
                <div className="font-display text-sm font-extrabold text-white">{c.name}</div>
                <div className="text-[11px] text-slate-300 mt-1">{c.subtitle}</div>
              </button>
            ))}
          </div>
        )}

        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Dificuldade</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`min-h-[40px] px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                  difficulty === d ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-900 text-slate-200 border-white/10'
                }`}
              >
                {DIFFICULTIES[d].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <ClubCrest team={userTeam} className="w-7 h-7" />
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Escolha sua Equipe ({compTeams.length} disponíveis · {userTeam.name})
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCrestPickerOpen(true)}
              className="min-h-[34px] px-3 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-[11px] font-extrabold text-amber-300 cursor-pointer"
            >
              Menu com Escudos
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
            {compTeams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setUserTeamId(t.id)}
                className={`min-h-[44px] px-3 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold cursor-pointer transition ${
                  userTeamId === t.id ? 'bg-slate-800 border-amber-400 text-white' : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <ClubCrest team={t} className="w-6 h-6 shrink-0" />
                <span className="truncate">{t.name}</span>
                <span className="ml-auto font-mono text-amber-400">{t.ovr}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={startCompetition}
            className="min-h-[46px] px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-sm font-extrabold uppercase tracking-wider text-slate-950 shadow-lg cursor-pointer"
          >
            Iniciar {compMeta.name}
          </button>
        </div>

        <TeamPickerModal
          open={crestPickerOpen}
          title={`Escolher Equipe · ${compMeta.name}`}
          selectedTeamId={userTeam.id}
          teams={compTeams}
          onSelect={(team) => setUserTeamId(team.id)}
          onClose={() => setCrestPickerOpen(false)}
        />
      </div>
    );
  }

  const nextFx = findNextUserFixture();
  const nextOpp = nextFx ? compTeams.find((t) => t.id === (nextFx.homeId === userTeam.id ? nextFx.awayId : nextFx.homeId)) : null;
  const topScorers = Object.values(scorers)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 8);

  const stageLabel =
    stage === 'group'
      ? `Rodada ${roundIdx + 1} de ${rounds.length}`
      : stage === 'r16'
      ? 'Oitavas de Final'
      : stage === 'qf'
      ? 'Quartas de Final'
      : stage === 'semi'
      ? 'Semifinal'
      : 'Grande Final';

  const renderBracketMatchCard = (m: Fixture, key: string | number, highlightFinal = false) => {
    const h = compTeams.find((t) => t.id === m.homeId);
    const a = compTeams.find((t) => t.id === m.awayId);
    if (!h || !a) return null;
    const involvesUser = h.id === userTeam.id || a.id === userTeam.id;
    return (
      <div
        key={key}
        className={`rounded-xl border p-2.5 text-xs space-y-1.5 tabular-nums ${
          highlightFinal
            ? 'bg-amber-950/30 border-amber-400/60'
            : involvesUser
            ? 'bg-emerald-950/60 border-emerald-400/60'
            : 'bg-slate-950/90 border-white/10'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 min-w-0 font-bold text-white">
            <ClubCrest team={h} className="w-4 h-4" />
            <span className="truncate">{h.abbr}</span>
          </span>
          <span className="font-mono font-extrabold text-amber-300">{m.homeGoals !== undefined ? m.homeGoals : '-'}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 min-w-0 font-bold text-white">
            <ClubCrest team={a} className="w-4 h-4" />
            <span className="truncate">{a.abbr}</span>
          </span>
          <span className="font-mono font-extrabold text-amber-300">{m.awayGoals !== undefined ? m.awayGoals : '-'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-slate-950/92 backdrop-blur-xl border border-emerald-400/30 rounded-2xl p-5 space-y-4 shadow-2xl max-h-[94vh] overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <ClubCrest team={userTeam} className="w-8 h-8" />
          <div>
            <h2 className="font-display text-lg font-black text-white">{compMeta.name}</h2>
            <p className="text-xs text-slate-400">
              {userTeam.name} · Dificuldade: {DIFFICULTIES[difficulty].label}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setStarted(false)}
          className="min-h-[38px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
        >
          Sair do Torneio
        </button>
      </div>

      {stage === 'done' && champion ? (
        <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/30 border border-amber-400/50 rounded-2xl p-6 text-center space-y-3">
          <ChampionshipTrophy
            gold
            label={champion.id === userTeam.id ? `CAMPEÃO! ${champion.name}` : `Campeão: ${champion.name}`}
          />
          <p className="text-sm text-slate-300">
            {champion.id === userTeam.id
              ? `Parabéns! O ${userTeam.name} conquistou a taça de ${compMeta.name}!`
              : `Fim da edição de ${compMeta.name}. Tente levantar a taça na próxima temporada!`}
          </p>
          {topScorers[0] && (
            <div className="inline-block bg-slate-950/80 border border-white/15 rounded-xl px-4 py-2 text-xs text-amber-300 font-bold">
              Chuteira de Ouro: {topScorers[0].name} ({topScorers[0].goals} gols)
            </div>
          )}
          <div>
            <button
              type="button"
              onClick={startCompetition}
              className="min-h-[44px] px-7 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-extrabold text-white cursor-pointer"
            >
              Jogar Nova Edição
            </button>
          </div>
        </div>
      ) : nextFx && nextOpp ? (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-emerald-950/55 border border-emerald-400/25 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">{stageLabel}</span>
            <div className="flex items-center gap-2.5 font-extrabold text-sm sm:text-base text-white">
              <ClubCrest team={userTeam} className="w-6 h-6" />
              <span>{userTeam.name}</span>
              <span className="text-slate-400 text-xs">VS</span>
              <ClubCrest team={nextOpp} className="w-6 h-6" />
              <span>{nextOpp.name}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={playNextFixture}
            className="min-h-[44px] px-7 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-sm font-extrabold text-slate-950 shadow-lg cursor-pointer"
          >
            Jogar Partida
          </button>
        </div>
      ) : null}

      {/* Visual Horizontal Knockout Bracket */}
      {(r16Matches.length > 0 || qfMatches.length > 0 || semiMatches.length > 0 || finalMatch) && (
        <div className="bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-3 overflow-x-auto">
          <div className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">Chaveamento Visual (Mata-Mata)</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 min-w-[680px]">
            {r16Matches.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase text-slate-400 text-center">Oitavas de Final</div>
                {r16Matches.map((m, i) => renderBracketMatchCard(m, `r16_${i}`))}
              </div>
            )}
            {qfMatches.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase text-slate-400 text-center">Quartas de Final</div>
                {qfMatches.map((m, i) => renderBracketMatchCard(m, `qf_${i}`))}
              </div>
            )}
            {semiMatches.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase text-slate-400 text-center">Semifinais</div>
                {semiMatches.map((m, i) => renderBracketMatchCard(m, `sf_${i}`))}
              </div>
            )}
            {finalMatch && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase text-amber-400 text-center">Grande Final</div>
                {renderBracketMatchCard(finalMatch, 'final', true)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Group / League Tables + Artilharia */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(compMeta.format === 'league' || compMeta.format === 'worldcup') && (
          <div className="lg:col-span-2 grid grid-cols-1 gap-4">
            {[
              { title: compMeta.format === 'league' ? `Classificação Geral (${tableA.length} clubes)` : 'Grupo A', rows: tableA },
              ...(compMeta.format === 'worldcup' ? [{ title: 'Grupo B', rows: tableB }] : [])
            ].map((grp) => (
              <div key={grp.title} className="bg-slate-900/70 border border-white/10 rounded-xl p-3.5 overflow-x-auto max-h-[420px] overflow-y-auto">
                <div className="text-xs font-extrabold text-slate-300 uppercase mb-2">{grp.title}</div>
                <table className="w-full text-xs tabular-nums">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/10 text-left">
                      <th className="py-1.5 pr-2">#</th>
                      <th className="py-1.5">Equipe</th>
                      <th className="py-1.5 text-center">P</th>
                      <th className="py-1.5 text-center">J</th>
                      <th className="py-1.5 text-center">V</th>
                      <th className="py-1.5 text-center">E</th>
                      <th className="py-1.5 text-center">D</th>
                      <th className="py-1.5 text-center">SG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grp.rows.map((r, idx) => (
                      <tr
                        key={r.team.id}
                        className={`border-b border-white/5 ${
                          r.team.id === userTeam.id
                            ? 'bg-emerald-950/60 font-bold text-amber-300'
                            : idx < 4 && compMeta.format === 'league'
                            ? 'text-emerald-200'
                            : idx >= grp.rows.length - 4 && compMeta.format === 'league'
                            ? 'text-rose-300'
                            : 'text-slate-200'
                        }`}
                      >
                        <td className="py-1.5 pr-2">{idx + 1}</td>
                        <td className="py-1.5 flex items-center gap-2">
                          <ClubCrest team={r.team} className="w-4 h-4" />
                          <span>{r.team.name}</span>
                        </td>
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
            ))}
          </div>
        )}

        <div
          className={`${
            compMeta.format === 'league' || compMeta.format === 'worldcup' ? '' : 'lg:col-span-3'
          } bg-slate-900/70 border border-white/10 rounded-xl p-4 space-y-2.5`}
        >
          <div className="text-xs font-extrabold uppercase text-amber-400">Artilharia da Competição</div>
          {topScorers.length === 0 ? (
            <p className="text-xs text-slate-400">Os artilheiros aparecerão após a primeira partida.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5">
              {topScorers.map((sc, i) => {
                const tm = compTeams.find((t) => t.id === sc.teamId);
                return (
                  <div
                    key={sc.teamId + sc.name}
                    className="flex items-center justify-between bg-slate-950/85 border border-white/10 rounded-lg px-3 py-2 text-xs tabular-nums"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-slate-400">{i + 1}.</span>
                      {tm && <ClubCrest team={tm} className="w-4 h-4" />}
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
    </div>
  );
};

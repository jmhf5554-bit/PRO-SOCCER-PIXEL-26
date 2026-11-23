import React, { useMemo, useState } from 'react';
import { KitSwatch, PixelTrophy } from '../components/PixelPreview';
import { DIFFICULTIES, TEAMS, isKitClash } from '../data/leagues';
import { DifficultyId, MatchConfig, MatchResult, TeamSpec } from '../types';

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

interface Props {
  onStartMatch: (cfg: MatchConfig, onComplete: (res: MatchResult) => void) => void;
  onBack: () => void;
}

function buildRoundRobin(teams: TeamSpec[]): Fixture[][] {
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
  return rounds;
}

function simScore(a: TeamSpec, b: TeamSpec): [number, number] {
  const diff = (a.ovr - b.ovr) * 0.04;
  const gA = Math.max(0, Math.round(Math.random() * 2.4 + diff));
  const gB = Math.max(0, Math.round(Math.random() * 2.1 - diff));
  return [gA, gB];
}

function calcTable(teams: TeamSpec[], rounds: Fixture[][]): TableRow[] {
  const map = new Map<string, TableRow>();
  teams.forEach((t) => map.set(t.id, { team: t, p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }));
  rounds.forEach((rd) =>
    rd.forEach((fx) => {
      if (fx.homeGoals === undefined || fx.awayGoals === undefined) return;
      const h = map.get(fx.homeId)!;
      const a = map.get(fx.awayId)!;
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

export const TournamentView: React.FC<Props> = ({ onStartMatch, onBack }) => {
  const [compType, setCompType] = useState<'brasileirao' | 'copa'>('brasileirao');
  const [difficulty, setDifficulty] = useState<DifficultyId>('amador');
  const [userTeamId, setUserTeamId] = useState<string>('flamengo');
  const [started, setStarted] = useState(false);

  // League / World Cup state
  const [rounds, setRounds] = useState<Fixture[][]>([]);
  const [groupBRounds, setGroupBRounds] = useState<Fixture[][]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [stage, setStage] = useState<'group' | 'semi' | 'final' | 'done'>('group');
  const [semiMatches, setSemiMatches] = useState<Fixture[]>([]);
  const [finalMatch, setFinalMatch] = useState<Fixture | null>(null);
  const [champion, setChampion] = useState<TeamSpec | null>(null);

  const compTeams = useMemo(() => {
    const lid = compType === 'brasileirao' ? 'brasileirao' : 'selecoes';
    return TEAMS.filter((t) => t.leagueId === lid);
  }, [compType]);

  const userTeam = compTeams.find((t) => t.id === userTeamId) || compTeams[0];

  const startCompetition = () => {
    if (compType === 'brasileirao') {
      setRounds(buildRoundRobin(compTeams));
      setGroupBRounds([]);
      setStage('group');
    } else {
      const ordered = [userTeam, ...compTeams.filter((t) => t.id !== userTeam.id)];
      setRounds(buildRoundRobin(ordered.slice(0, 4)));
      setGroupBRounds(buildRoundRobin(ordered.slice(4, 8)));
      setStage('group');
    }
    setRoundIdx(0);
    setSemiMatches([]);
    setFinalMatch(null);
    setChampion(null);
    setStarted(true);
  };

  const groupATeams = useMemo(() => {
    if (compType === 'brasileirao') return compTeams;
    const ordered = [userTeam, ...compTeams.filter((t) => t.id !== userTeam.id)];
    return ordered.slice(0, 4);
  }, [compType, compTeams, userTeam]);

  const groupBTeams = useMemo(() => {
    if (compType === 'brasileirao') return [];
    const ordered = [userTeam, ...compTeams.filter((t) => t.id !== userTeam.id)];
    return ordered.slice(4, 8);
  }, [compType, compTeams, userTeam]);

  const tableA = useMemo(() => calcTable(groupATeams, rounds), [groupATeams, rounds]);
  const tableB = useMemo(() => calcTable(groupBTeams, groupBRounds), [groupBTeams, groupBRounds]);

  const findNextUserFixture = (): Fixture | null => {
    if (stage === 'group' && rounds[roundIdx]) {
      return rounds[roundIdx].find((f) => f.homeId === userTeam.id || f.awayId === userTeam.id) || null;
    }
    if (stage === 'semi') {
      return semiMatches.find((f) => f.homeId === userTeam.id || f.awayId === userTeam.id) || null;
    }
    if (stage === 'final' && finalMatch && (finalMatch.homeId === userTeam.id || finalMatch.awayId === userTeam.id)) {
      return finalMatch;
    }
    return null;
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
        // Record user match + sim other fixtures
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
                  return { ...f, homeGoals: g1, awayGoals: g2 };
                })
          );
          const updatedB = groupBRounds.map((rd, rI) =>
            rI !== roundIdx
              ? rd
              : rd.map((f) => {
                  const [g1, g2] = simScore(compTeams.find((t) => t.id === f.homeId)!, compTeams.find((t) => t.id === f.awayId)!);
                  return { ...f, homeGoals: g1, awayGoals: g2 };
                })
          );
          setRounds(updatedA);
          setGroupBRounds(updatedB);

          if (roundIdx + 1 < updatedA.length) {
            setRoundIdx(roundIdx + 1);
          } else if (compType === 'brasileirao') {
            const finalTable = calcTable(groupATeams, updatedA);
            setChampion(finalTable[0].team);
            setStage('done');
          } else {
            // Advance to World Cup Semifinals
            const tA = calcTable(groupATeams, updatedA);
            const tB = calcTable(groupBTeams, updatedB);
            const semis: Fixture[] = [
              { homeId: tA[0].team.id, awayId: tB[1].team.id },
              { homeId: tB[0].team.id, awayId: tA[1].team.id }
            ];
            setSemiMatches(semis);
            const userInSemi = semis.some((s) => s.homeId === userTeam.id || s.awayId === userTeam.id);
            if (!userInSemi) {
              // Eliminated in group stage -> sim remaining knockout
              const [s1h, s1a] = simScore(compTeams.find((t) => t.id === semis[0].homeId)!, compTeams.find((t) => t.id === semis[0].awayId)!);
              const [s2h, s2a] = simScore(compTeams.find((t) => t.id === semis[1].homeId)!, compTeams.find((t) => t.id === semis[1].awayId)!);
              const w1 = s1h >= s1a ? semis[0].homeId : semis[0].awayId;
              const w2 = s2h >= s2a ? semis[1].homeId : semis[1].awayId;
              const [fh, fa] = simScore(compTeams.find((t) => t.id === w1)!, compTeams.find((t) => t.id === w2)!);
              const champId = fh >= fa ? w1 : w2;
              setChampion(compTeams.find((t) => t.id === champId)!);
              setStage('done');
            } else {
              setStage('semi');
            }
          }
        } else if (stage === 'semi') {
          let uWin = res.homeScore > res.awayScore;
          if (res.homeScore === res.awayScore) uWin = true; // golden tie-break advantage on draw
          const winners: string[] = [];
          const nextSemis = semiMatches.map((s) => {
            if (s === fx) {
              const hg = isHome ? res.homeScore : res.awayScore;
              const ag = isHome ? res.awayScore : res.homeScore;
              winners.push(uWin ? userTeam.id : oppId);
              return { ...s, homeGoals: hg, awayGoals: ag };
            }
            const [g1, g2] = simScore(compTeams.find((t) => t.id === s.homeId)!, compTeams.find((t) => t.id === s.awayId)!);
            winners.push(g1 >= g2 ? s.homeId : s.awayId);
            return { ...s, homeGoals: g1, awayGoals: g2 };
          });
          setSemiMatches(nextSemis);
          const fMatch = { homeId: winners[0], awayId: winners[1] };
          setFinalMatch(fMatch);
          if (uWin) {
            setStage('final');
          } else {
            const [fh, fa] = simScore(compTeams.find((t) => t.id === winners[0])!, compTeams.find((t) => t.id === winners[1])!);
            setChampion(compTeams.find((t) => t.id === (fh >= fa ? winners[0] : winners[1]))!);
            setStage('done');
          }
        } else if (stage === 'final' && finalMatch) {
          const uWin = res.homeScore >= res.awayScore;
          setFinalMatch({
            ...finalMatch,
            homeGoals: isHome ? res.homeScore : res.awayScore,
            awayGoals: isHome ? res.awayScore : res.homeScore
          });
          setChampion(uWin ? userTeam : oppTeam);
          setStage('done');
        }
      }
    );
  };

  if (!started) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-slate-950/95 border border-white/15 rounded-xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h2 className="text-xl font-extrabold text-yellow-400">Torneios Oficiais</h2>
            <p className="text-xs text-slate-400">Escolha a competição, seu time e a dificuldade</p>
          </div>
          <button type="button" onClick={onBack} className="min-h-[40px] px-4 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer">
            Voltar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setCompType('brasileirao');
              setUserTeamId('flamengo');
            }}
            className={`p-4 rounded-lg border text-left cursor-pointer ${compType === 'brasileirao' ? 'bg-emerald-950/70 border-yellow-400' : 'bg-slate-900 border-white/10 hover:border-white/30'}`}
          >
            <div className="font-extrabold text-white">Brasileirão · Pontos Corridos</div>
            <div className="text-xs text-slate-400 mt-1">8 clubes brasileiros · 7 rodadas · Troféu Oficial</div>
          </button>
          <button
            type="button"
            onClick={() => {
              setCompType('copa');
              setUserTeamId('sel_brasil');
            }}
            className={`p-4 rounded-lg border text-left cursor-pointer ${compType === 'copa' ? 'bg-emerald-950/70 border-yellow-400' : 'bg-slate-900 border-white/10 hover:border-white/30'}`}
          >
            <div className="font-extrabold text-white">Copa do Mundo · Seleções</div>
            <div className="text-xs text-slate-400 mt-1">Fase de Grupos + Semifinal e Final · Troféu Dourado</div>
          </button>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Dificuldade</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`min-h-[42px] px-3 rounded border text-xs font-bold cursor-pointer ${difficulty === d ? 'bg-yellow-400 text-slate-950 border-yellow-300' : 'bg-slate-900 text-slate-200 border-white/10'}`}
              >
                {DIFFICULTIES[d].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Escolha sua Equipe</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {compTeams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setUserTeamId(t.id)}
                className={`min-h-[44px] px-3 py-2 rounded border flex items-center gap-2 text-xs font-bold cursor-pointer ${userTeamId === t.id ? 'bg-slate-800 border-yellow-400 text-white' : 'bg-slate-900 border-white/10 text-slate-300'}`}
              >
                <KitSwatch team={t} />
                <span className="truncate">{t.name}</span>
                <span className="ml-auto font-mono text-yellow-400">{t.ovr}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={startCompetition}
            className="min-h-[46px] px-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-extrabold uppercase tracking-wider text-white cursor-pointer"
          >
            Iniciar Torneio
          </button>
        </div>
      </div>
    );
  }

  const nextFx = findNextUserFixture();
  const nextOpp = nextFx ? compTeams.find((t) => t.id === (nextFx.homeId === userTeam.id ? nextFx.awayId : nextFx.homeId)) : null;

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-950/95 border border-white/15 rounded-xl p-5 space-y-4 shadow-2xl max-h-[94vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <KitSwatch team={userTeam} className="w-7 h-7" />
          <div>
            <h2 className="text-lg font-extrabold text-white">{compType === 'brasileirao' ? 'Brasileirão' : 'Copa do Mundo'}</h2>
            <p className="text-xs text-slate-400">
              {userTeam.name} · Dificuldade: {DIFFICULTIES[difficulty].label}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setStarted(false)} className="min-h-[38px] px-4 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer">
          Sair do Torneio
        </button>
      </div>

      {stage === 'done' && champion ? (
        <div className="bg-slate-900/80 border border-yellow-400/50 rounded-lg p-6 text-center space-y-3">
          <PixelTrophy label={champion.id === userTeam.id ? `Campeão! ${champion.name}` : `Campeão: ${champion.name}`} />
          <p className="text-sm text-slate-300">
            {champion.id === userTeam.id ? 'Parabéns! Você levantou a taça oficial!' : 'Fim do torneio. Tente novamente na próxima edição!'}
          </p>
          <button type="button" onClick={startCompetition} className="min-h-[42px] px-6 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white cursor-pointer">
            Jogar Nova Edição
          </button>
        </div>
      ) : nextFx && nextOpp ? (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold uppercase text-yellow-400">
              {stage === 'group' ? `Rodada ${roundIdx + 1}` : stage === 'semi' ? 'Semifinal' : 'Grande Final'}
            </span>
            <div className="flex items-center gap-2 font-extrabold text-sm">
              <KitSwatch team={userTeam} />
              <span>{userTeam.name}</span>
              <span className="text-slate-400 mx-1">x</span>
              <KitSwatch team={nextOpp} />
              <span>{nextOpp.name}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={playNextFixture}
            className="min-h-[44px] px-6 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-extrabold text-white cursor-pointer"
          >
            Jogar Partida
          </button>
        </div>
      ) : null}

      <div className={`grid gap-4 ${compType === 'copa' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {[
          { title: compType === 'brasileirao' ? 'Classificação Geral' : 'Grupo A', rows: tableA },
          ...(compType === 'copa' ? [{ title: 'Grupo B', rows: tableB }] : [])
        ].map((grp) => (
          <div key={grp.title} className="bg-slate-900/70 border border-white/10 rounded-lg p-3 overflow-x-auto">
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
                  <tr key={r.team.id} className={`border-b border-white/5 ${r.team.id === userTeam.id ? 'bg-emerald-950/60 font-bold text-yellow-300' : 'text-slate-200'}`}>
                    <td className="py-1.5 pr-2">{idx + 1}</td>
                    <td className="py-1.5 flex items-center gap-2">
                      <KitSwatch team={r.team} className="w-4 h-4" />
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

      {compType === 'copa' && (semiMatches.length > 0 || finalMatch) && (
        <div className="bg-slate-900/70 border border-white/10 rounded-lg p-3 space-y-2">
          <div className="text-xs font-extrabold text-yellow-400 uppercase">Chaveamento Mata-Mata</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {semiMatches.map((s, idx) => {
              const h = compTeams.find((t) => t.id === s.homeId)!;
              const a = compTeams.find((t) => t.id === s.awayId)!;
              return (
                <div key={idx} className="bg-slate-950 border border-white/10 rounded p-2 flex justify-between">
                  <span>SF{idx + 1}: {h.abbr} x {a.abbr}</span>
                  <span className="font-mono text-yellow-400">{s.homeGoals !== undefined ? `${s.homeGoals}-${s.awayGoals}` : '-'}</span>
                </div>
              );
            })}
            {finalMatch && (
              <div className="bg-slate-950 border border-yellow-400/40 rounded p-2 flex justify-between">
                <span>FINAL: {compTeams.find((t) => t.id === finalMatch.homeId)!.abbr} x {compTeams.find((t) => t.id === finalMatch.awayId)!.abbr}</span>
                <span className="font-mono text-yellow-400">{finalMatch.homeGoals !== undefined ? `${finalMatch.homeGoals}-${finalMatch.awayGoals}` : '-'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

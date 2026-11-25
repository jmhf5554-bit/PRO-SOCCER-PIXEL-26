import React, { useEffect, useMemo, useState } from 'react';
import { AudioFX } from '../audio/sound';
import { LEAGUES, TEAMS } from '../data/leagues';
import { LeagueSpec, TeamSpec } from '../types';
import { ClubCrest, KitSwatch } from './ClubPreview';

interface TeamPickerModalProps {
  open: boolean;
  title: string;
  selectedTeamId: string;
  leagues?: LeagueSpec[];
  teams?: TeamSpec[];
  initialLeagueId?: string;
  onSelect: (team: TeamSpec, leagueId: string) => void;
  onClose: () => void;
}

export const TeamPickerModal: React.FC<TeamPickerModalProps> = ({
  open,
  title,
  selectedTeamId,
  leagues,
  teams,
  initialLeagueId,
  onSelect,
  onClose
}) => {
  const availableLeagues = useMemo(() => leagues || LEAGUES, [leagues]);
  const availableTeams = useMemo(() => teams || TEAMS, [teams]);

  const [leagueId, setLeagueId] = useState<string>(
    initialLeagueId || availableLeagues[0]?.id || 'brasileirao'
  );
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      if (initialLeagueId) setLeagueId(initialLeagueId);
      setQuery('');
    }
  }, [open, initialLeagueId]);

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return availableTeams.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.abbr.toLowerCase().includes(q)
      );
    }
    if (teams) return teams;
    return availableTeams.filter((t) => t.leagueId === leagueId);
  }, [availableTeams, teams, leagueId, query]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl bg-slate-950 border border-amber-400/35 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-2xl max-h-[92dvh]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 pb-3">
          <div>
            <h3 className="font-display text-lg sm:text-xl font-black text-amber-400 uppercase tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-400">
              Toque ou clique no escudo para escolher o time
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-bold text-white cursor-pointer"
          >
            Fechar
          </button>
        </div>

        {/* Search + League Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar clube pelo nome ou sigla (ex: FLA, PAL, Real)..."
            className="w-full min-h-[44px] bg-slate-900 border border-white/15 rounded-xl px-3.5 text-xs font-semibold text-white placeholder:text-slate-500"
          />

          {!teams && (
            <select
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              disabled={Boolean(query.trim())}
              className="w-full min-h-[44px] bg-slate-900 border border-white/15 rounded-xl px-3.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {availableLeagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Visual Club Crest Gallery */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 overflow-y-auto pr-1 py-1">
          {filteredTeams.length === 0 ? (
            <div className="col-span-full py-10 text-center text-xs text-slate-400">
              Nenhum clube encontrado para "{query}".
            </div>
          ) : (
            filteredTeams.map((t) => {
              const selected = t.id === selectedTeamId;
              const lgName = availableLeagues.find((l) => l.id === t.leagueId)?.name;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    AudioFX.playSelectBeep(true);
                    onSelect(t, t.leagueId);
                    onClose();
                  }}
                  className={`relative min-h-[118px] p-3 rounded-2xl border flex flex-col items-center justify-between gap-2 text-center transition cursor-pointer ${
                    selected
                      ? 'bg-gradient-to-b from-emerald-950/90 to-slate-900 border-amber-400 ring-2 ring-amber-400/40 shadow-xl'
                      : 'bg-slate-900/75 border-white/10 hover:border-cyan-400/70 hover:bg-slate-900'
                  }`}
                >
                  <div className="absolute top-2 right-2">
                    <KitSwatch team={t} className="w-5 h-5" />
                  </div>
                  <div className="absolute top-2 left-2 font-mono text-[10px] font-black text-amber-300">
                    {t.ovr}
                  </div>
                  <ClubCrest team={t} className="w-14 h-14 mt-1 drop-shadow-lg" />
                  <div className="w-full">
                    <div className="text-xs font-extrabold text-white truncate">{t.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {t.abbr}
                      {query.trim() && lgName ? ` · ${lgName.split('(')[0].trim()}` : ''}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

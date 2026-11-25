import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClubCrest } from '../components/ClubPreview';
import { TeamPickerModal } from '../components/TeamPickerModal';
import { LEAGUES, TEAMS, isKitClash } from '../data/leagues';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  DifficultyId,
  MatchConfig,
  MatchResult,
  OnlineBridge,
  OnlineGuestInput,
  OnlineSyncedState,
  WeatherId
} from '../types';

export interface OnlinePlayerProfile {
  id: number;
  uid?: string;
  nickname: string;
  favoriteTeamId: string;
  elo: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface OnlineAuthSession {
  token: string;
  player: OnlinePlayerProfile;
}

interface RoomParticipantView {
  id: number;
  nickname: string;
  elo: number;
  teamId: string;
  useAway: boolean;
  ready: boolean;
}

interface RoomStateView {
  code: string;
  status: 'waiting' | 'playing';
  weather: WeatherId;
  durationSec: number;
  difficulty: DifficultyId;
  host: RoomParticipantView;
  guest: RoomParticipantView | null;
}

interface HistoryMatch {
  id: number;
  roomCode: string;
  homeNickname: string;
  awayNickname: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  homeShots: number;
  awayShots: number;
  homePoss: number;
  createdAt?: string | null;
}

interface ChatEntry {
  sender: string;
  text: string;
  ts: number;
}

interface Props {
  session: OnlineAuthSession | null;
  onSessionChange: (session: OnlineAuthSession | null) => void;
  onStartOnlineMatch: (cfg: MatchConfig, onComplete: (res: MatchResult) => void) => void;
  onBack: () => void;
}

export const OnlineView: React.FC<Props> = ({
  session,
  onSessionChange,
  onStartOnlineMatch,
  onBack
}) => {
  const [nickname, setNickname] = useState('');
  const [favLeagueId, setFavLeagueId] = useState('brasileirao');
  const [favTeamId, setFavTeamId] = useState('flamengo');
  const [authLoading, setAuthLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');

  const [tab, setTab] = useState<'lobby' | 'ranking' | 'history'>('lobby');
  const [wsConnected, setWsConnected] = useState(false);
  const [openRooms, setOpenRooms] = useState<RoomStateView[]>([]);
  const [room, setRoom] = useState<RoomStateView | null>(null);
  const [crestPickerOpen, setCrestPickerOpen] = useState(false);
  const [role, setRole] = useState<'host' | 'guest' | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<ChatEntry[]>([]);

  const [selectedLeagueId, setSelectedLeagueId] = useState('brasileirao');
  const [selectedTeamId, setSelectedTeamId] = useState('flamengo');
  const [useAwayKit, setUseAwayKit] = useState(false);

  const [leaderboard, setLeaderboard] = useState<OnlinePlayerProfile[]>([]);
  const [history, setHistory] = useState<HistoryMatch[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const guestInputHandlersRef = useRef<Set<(inp: OnlineGuestInput) => void>>(new Set());
  const remoteStateHandlersRef = useRef<Set<(st: OnlineSyncedState) => void>>(new Set());
  const onStartMatchRef = useRef(onStartOnlineMatch);
  const onSessionChangeRef = useRef(onSessionChange);
  const roleRef = useRef(role);
  const sessionRef = useRef(session);
  const nickRef = useRef(nickname);
  const favTeamRef = useRef(favTeamId);

  useEffect(() => {
    onStartMatchRef.current = onStartOnlineMatch;
  }, [onStartOnlineMatch]);

  useEffect(() => {
    onSessionChangeRef.current = onSessionChange;
  }, [onSessionChange]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    nickRef.current = nickname;
  }, [nickname]);

  useEffect(() => {
    favTeamRef.current = favTeamId;
  }, [favTeamId]);

  const leagueTeams = useMemo(
    () => TEAMS.filter((t) => t.leagueId === selectedLeagueId),
    [selectedLeagueId]
  );

  const favLeagueTeams = useMemo(
    () => TEAMS.filter((t) => t.leagueId === favLeagueId),
    [favLeagueId]
  );

  const fetchBoardData = useCallback(async () => {
    try {
      const [lbRes, histRes, roomsRes] = await Promise.all([
        fetch('/api/online/leaderboard'),
        fetch('/api/online/history'),
        fetch('/api/online/rooms')
      ]);
      if (lbRes.ok) {
        const d = await lbRes.json();
        setLeaderboard(d.leaderboard || []);
      }
      if (histRes.ok) {
        const d = await histRes.json();
        setHistory(d.history || []);
      }
      if (roomsRes.ok) {
        const d = await roomsRes.json();
        setOpenRooms(d.rooms || []);
      }
    } catch {
      // Transient network error
    }
  }, []);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // Restore active Firebase user into in-memory token session without localStorage
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (sessionRef.current) onSessionChangeRef.current(null);
        return;
      }
      if (sessionRef.current) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/online/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            nickname: nickRef.current.trim() || user.displayName || '',
            favoriteTeamId: favTeamRef.current
          })
        });
        if (res.ok) {
          const data = await res.json();
          onSessionChangeRef.current({ token, player: data.player });
          setNickname(data.player.nickname);
          setSelectedTeamId(data.player.favoriteTeamId || 'flamengo');
          fetchBoardData();
        }
      } catch {
        // User can retry via sign-in button
      }
    });
    return () => unsub();
  }, [fetchBoardData]);

  const buildOnlineBridge = useCallback(
    (activeRoom: RoomStateView): OnlineBridge => ({
      roomCode: activeRoom.code,
      hostNickname: activeRoom.host.nickname,
      guestNickname: activeRoom.guest?.nickname,
      sendState: (payload: OnlineSyncedState) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'match_state', payload }));
        }
      },
      sendGuestInput: (input: OnlineGuestInput) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'guest_input', input }));
        }
      },
      onGuestInput: (handler) => {
        guestInputHandlersRef.current.add(handler);
        return () => guestInputHandlersRef.current.delete(handler);
      },
      onRemoteState: (handler) => {
        remoteStateHandlersRef.current.add(handler);
        return () => remoteStateHandlersRef.current.delete(handler);
      }
    }),
    []
  );

  const launchRoomMatch = useCallback(
    (activeRoom: RoomStateView, myRole: 'host' | 'guest') => {
      const homeTeam = TEAMS.find((t) => t.id === activeRoom.host.teamId) || TEAMS[0];
      const awayTeam = TEAMS.find((t) => t.id === activeRoom.guest?.teamId) || TEAMS[1];
      const clash = isKitClash(homeTeam, awayTeam) && !activeRoom.host.useAway && !activeRoom.guest?.useAway;
      const bridge = buildOnlineBridge(activeRoom);

      onStartMatchRef.current(
        {
          mode: myRole === 'host' ? 'online_host' : 'online_guest',
          homeTeam,
          awayTeam,
          homeUseAway: activeRoom.host.useAway,
          awayUseAway: Boolean(activeRoom.guest?.useAway || clash),
          difficulty: activeRoom.difficulty,
          weather: activeRoom.weather,
          matchDurationSec: activeRoom.durationSec,
          onlineBridge: bridge
        },
        (res: MatchResult) => {
          if (myRole === 'host' && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'match_end',
                homeScore: res.homeScore,
                awayScore: res.awayScore,
                homeShots: res.homeShots,
                awayShots: res.awayShots,
                homePossPct: res.homePossPct
              })
            );
          }
          fetchBoardData();
        }
      );
    },
    [buildOnlineBridge, fetchBoardData]
  );

  // Maintain WebSocket connection while authenticated in Online lobby / match
  useEffect(() => {
    if (!session?.token) {
      wsRef.current?.close();
      wsRef.current = null;
      setWsConnected(false);
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;

    const pingInterval = window.setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(JSON.stringify({ type: 'auth', token: session.token }));
    };

    ws.onmessage = (evt) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }

      const type = String(msg.type || '');
      if (type === 'authed') {
        setOpenRooms((msg.rooms as RoomStateView[]) || []);
        setErrorMsg('');
      } else if (type === 'rooms_list') {
        setOpenRooms((msg.rooms as RoomStateView[]) || []);
      } else if (type === 'room_joined') {
        const r = msg.room as RoomStateView;
        const myRole = msg.role as 'host' | 'guest';
        setRole(myRole);
        setRoom(r);
        setChatLog([]);
        setErrorMsg('');
        setNoticeMsg(`Conectado na sala ${r.code}!`);
      } else if (type === 'room_updated') {
        setRoom(msg.room as RoomStateView);
        if (typeof msg.notice === 'string') setNoticeMsg(msg.notice);
      } else if (type === 'room_closed' || type === 'room_left') {
        setRoom(null);
        setRole(null);
        if (Array.isArray(msg.rooms)) setOpenRooms(msg.rooms as RoomStateView[]);
        if (typeof msg.reason === 'string') setNoticeMsg(msg.reason);
      } else if (type === 'chat') {
        setChatLog((prev) => [
          ...prev.slice(-30),
          {
            sender: String(msg.sender || ''),
            text: String(msg.text || ''),
            ts: Number(msg.ts) || Date.now()
          }
        ]);
      } else if (type === 'match_started') {
        const startedRoom = msg.room as RoomStateView;
        setRoom(startedRoom);
        const myRole = roleRef.current || (startedRoom.host.id === sessionRef.current?.player.id ? 'host' : 'guest');
        launchRoomMatch(startedRoom, myRole);
      } else if (type === 'guest_input') {
        const inp = msg.input as OnlineGuestInput;
        guestInputHandlersRef.current.forEach((fn) => fn(inp));
      } else if (type === 'match_state') {
        const payload = msg.payload as OnlineSyncedState;
        remoteStateHandlersRef.current.forEach((fn) => fn(payload));
      } else if (type === 'match_recorded') {
        setRoom(msg.room as RoomStateView);
        setNoticeMsg(`Partida encerrada e salva no ranking! Placar ${msg.homeScore} x ${msg.awayScore}`);
        fetchBoardData();
        fetch('/api/online/me', {
          headers: { Authorization: `Bearer ${session.token}` }
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d?.player && sessionRef.current) {
              onSessionChangeRef.current({ token: sessionRef.current.token, player: d.player });
            }
          })
          .catch(() => {});
      } else if (type === 'error') {
        setErrorMsg(String(msg.error || 'Erro na conexão online.'));
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      window.clearInterval(pingInterval);
      ws.close();
    };
  }, [session?.token, fetchBoardData, launchRoomMatch]);

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setAuthLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      const res = await fetch('/api/online/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nickname: nickname.trim() || cred.user.displayName || '',
          favoriteTeamId: favTeamId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Não foi possível entrar no modo online.');
      } else {
        onSessionChange({ token, player: data.player });
        setNickname(data.player.nickname);
        setSelectedTeamId(data.player.favoriteTeamId || 'flamengo');
        setNoticeMsg(`Conectado como ${data.player.nickname}!`);
        fetchBoardData();
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Login cancelado.');
      } else {
        setErrorMsg('Não foi possível conectar com sua conta Google agora.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpdateNickname = async () => {
    if (!session || nickname.trim().length < 2) return;
    setProfileSaving(true);
    setErrorMsg('');
    try {
      const freshToken = (await auth.currentUser?.getIdToken()) || session.token;
      const res = await fetch('/api/online/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshToken}`
        },
        body: JSON.stringify({
          nickname: nickname.trim(),
          favoriteTeamId: selectedTeamId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Não foi possível salvar o apelido.');
      } else {
        onSessionChange({ token: freshToken, player: data.player });
        setNoticeMsg(`Apelido atualizado para ${data.player.nickname}!`);
        fetchBoardData();
      }
    } catch {
      setErrorMsg('Erro ao atualizar perfil.');
    } finally {
      setProfileSaving(false);
    }
  };

  const sendWs = (payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const createRoom = () => {
    setErrorMsg('');
    sendWs({
      type: 'create_room',
      teamId: selectedTeamId || session?.player.favoriteTeamId || 'flamengo',
      useAway: useAwayKit,
      weather: 'night',
      durationSec: 180,
      difficulty: 'amador'
    });
  };

  const joinRoomByCode = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setErrorMsg('');
    sendWs({
      type: 'join_room',
      code: clean,
      teamId: selectedTeamId || session?.player.favoriteTeamId || 'palmeiras',
      useAway: useAwayKit
    });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendWs({ type: 'chat', text: chatInput.trim() });
    setChatInput('');
  };

  const handleLogout = async () => {
    sendWs({ type: 'leave_room' });
    setRoom(null);
    setRole(null);
    await signOut(auth).catch(() => {});
    onSessionChange(null);
  };

  const myParticipant = room ? (role === 'host' ? room.host : room.guest) : null;

  return (
    <div className="w-full max-w-6xl mx-auto bg-slate-950/92 backdrop-blur-xl border border-cyan-400/30 rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl max-h-[94dvh] overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-2xl font-black bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-300 bg-clip-text text-transparent uppercase tracking-tight">
              BRFC Online · Multiplayer &amp; Ranking
            </h2>
            {session && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                  wsConnected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {wsConnected ? 'Ao Vivo' : 'Conectando...'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300">
            Jogue 1v1 em tempo real de qualquer dispositivo com ranking ELO e histórico sincronizado
          </p>
        </div>

        <div className="flex items-center gap-2">
          {session && (
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[38px] px-3.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-xs font-bold text-rose-200 cursor-pointer"
            >
              Sair da Conta
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="min-h-[38px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-xs font-bold text-white cursor-pointer"
          >
            Voltar
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-500/50 rounded-xl px-4 py-2.5 text-xs font-bold text-rose-200">
          {errorMsg}
        </div>
      )}
      {noticeMsg && !errorMsg && (
        <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-xs font-semibold text-emerald-200 flex justify-between items-center">
          <span>{noticeMsg}</span>
          <button type="button" onClick={() => setNoticeMsg('')} className="text-[11px] font-bold text-emerald-300 cursor-pointer">
            Fechar
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['lobby', 'Salas Online (1v1)'],
            ['ranking', `Ranking Global (${leaderboard.length})`],
            ['history', `Últimas Partidas (${history.length})`]
          ] as const
        ).map(([tId, label]) => (
          <button
            key={tId}
            type="button"
            onClick={() => {
              setTab(tId);
              fetchBoardData();
            }}
            className={`min-h-[38px] px-4 rounded-xl text-xs font-extrabold cursor-pointer transition ${
              tab === tId
                ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow'
                : 'bg-slate-900 text-slate-300 border border-white/10 hover:border-white/25'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'lobby' && (
        <>
          {!session ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-900/75 border border-white/10 rounded-2xl p-5">
              <div className="space-y-3.5 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <h3 className="font-display text-lg font-black text-amber-300 uppercase">
                    Entrar no Modo Online
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Entre com sua conta Google para salvar seu ELO, histórico e jogar salas 1v1 contra amigos no celular ou PC.
                  </p>
                  <input
                    type="text"
                    maxLength={18}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Apelido opcional (ex: CraqueBR)"
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white"
                  />
                </div>

                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full min-h-[48px] px-4 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-50 text-sm font-black text-slate-950 cursor-pointer shadow-lg flex items-center justify-center gap-2.5 transition"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                  {authLoading ? 'Conectando...' : 'Entrar com Google'}
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-extrabold uppercase text-cyan-300">Clube do Coração</div>
                <select
                  value={favLeagueId}
                  onChange={(e) => {
                    const nl = e.target.value;
                    setFavLeagueId(nl);
                    const first = TEAMS.find((t) => t.leagueId === nl);
                    if (first) setFavTeamId(first.id);
                  }}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white"
                >
                  {LEAGUES.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {favLeagueTeams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFavTeamId(t.id)}
                      className={`min-h-[40px] px-2.5 py-1.5 rounded-lg border flex items-center gap-2 text-xs font-bold cursor-pointer ${
                        favTeamId === t.id ? 'bg-slate-800 border-amber-400 text-white' : 'bg-slate-950 border-white/10 text-slate-300'
                      }`}
                    >
                      <ClubCrest team={t} className="w-5 h-5 shrink-0" />
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : room ? (
            /* ==================== INSIDE MULTIPLAYER ROOM ==================== */
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/60 border border-cyan-400/35 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300">
                    Sala Online · Código
                  </div>
                  <div className="font-mono text-2xl font-black text-amber-300 tracking-widest">
                    {room.code}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {role === 'host' && (
                    <>
                      <select
                        value={room.weather}
                        onChange={(e) => sendWs({ type: 'update_setup', weather: e.target.value })}
                        className="bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                      >
                        <option value="night">Noite</option>
                        <option value="sunny">Dia</option>
                        <option value="rain">Chuva</option>
                      </select>
                      <select
                        value={room.durationSec}
                        onChange={(e) => sendWs({ type: 'update_setup', durationSec: Number(e.target.value) })}
                        className="bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                      >
                        <option value={180}>3 min</option>
                        <option value={300}>5 min</option>
                        <option value={480}>8 min</option>
                      </select>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => sendWs({ type: 'leave_room' })}
                    className="min-h-[38px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
                  >
                    Sair da Sala
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Players in room */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Anfitrião (P1)', p: room.host },
                      { label: 'Visitante (P2)', p: room.guest }
                    ].map(({ label, p }) => {
                      const tm = p ? TEAMS.find((t) => t.id === p.teamId) : null;
                      return (
                        <div key={label} className="bg-slate-900/80 border border-white/10 rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-400">
                            <span>{label}</span>
                            {p && (
                              <span className={p.ready ? 'text-emerald-400' : 'text-amber-300'}>
                                {p.ready ? 'Pronto' : 'Escolhendo'}
                              </span>
                            )}
                          </div>
                          {p && tm ? (
                            <div className="flex items-center gap-2.5">
                              <ClubCrest team={tm} className="w-8 h-8" />
                              <div className="min-w-0">
                                <div className="text-sm font-black text-white truncate">{p.nickname}</div>
                                <div className="text-xs text-slate-300 truncate">
                                  {tm.name} · <span className="font-mono text-amber-300">ELO {p.elo}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 py-3">
                              Aguardando adversário entrar com o código <strong className="text-amber-300 font-mono">{room.code}</strong>...
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* My Team Selector inside Room */}
                  <div className="bg-slate-900/75 border border-white/10 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-extrabold uppercase text-emerald-300">Seu Clube na Sala</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCrestPickerOpen(true)}
                          className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-[11px] font-extrabold text-amber-300 cursor-pointer"
                        >
                          Escudos
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const nextAway = !useAwayKit;
                            setUseAwayKit(nextAway);
                            sendWs({ type: 'update_setup', useAway: nextAway });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 border border-white/15 text-[11px] font-bold text-white cursor-pointer"
                        >
                          Uniforme: {useAwayKit ? 'Reserva' : 'Titular'}
                        </button>
                      </div>
                    </div>
                    <select
                      value={selectedLeagueId}
                      onChange={(e) => setSelectedLeagueId(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                    >
                      {LEAGUES.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {leagueTeams.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedTeamId(t.id);
                            sendWs({ type: 'update_setup', teamId: t.id });
                          }}
                          className={`px-2 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                            myParticipant?.teamId === t.id
                              ? 'bg-slate-800 border-amber-400 text-white'
                              : 'bg-slate-950 border-white/10 text-slate-300'
                          }`}
                        >
                          <ClubCrest team={t} className="w-5 h-5 shrink-0" />
                          <span className="truncate">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {role === 'guest' && (
                      <button
                        type="button"
                        onClick={() => sendWs({ type: 'update_setup', ready: !room.guest?.ready })}
                        className={`flex-1 min-h-[44px] rounded-xl text-sm font-black uppercase cursor-pointer ${
                          room.guest?.ready
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {room.guest?.ready ? 'Cancelar Pronto' : 'Marcar como Pronto'}
                      </button>
                    )}
                    {role === 'host' && (
                      <button
                        type="button"
                        disabled={!room.guest}
                        onClick={() => sendWs({ type: 'start_match' })}
                        className="flex-1 min-h-[44px] rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 text-sm font-black uppercase text-slate-950 cursor-pointer shadow-lg"
                      >
                        {room.guest ? 'Iniciar Partida Online!' : 'Aguardando Adversário...'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Room Chat */}
                <div className="lg:col-span-5 bg-slate-900/75 border border-white/10 rounded-xl p-3.5 flex flex-col justify-between h-80">
                  <div className="text-xs font-extrabold uppercase text-cyan-300 mb-2">Chat da Sala</div>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {chatLog.length === 0 ? (
                      <p className="text-slate-500">Nenhuma mensagem ainda. Combine os times por aqui!</p>
                    ) : (
                      chatLog.map((c, idx) => (
                        <div key={idx} className="bg-slate-950/80 border border-white/5 rounded-lg px-2.5 py-1.5">
                          <strong className="text-amber-300">{c.sender}: </strong>
                          <span className="text-slate-200">{c.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleSendChat} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      maxLength={80}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Enviar mensagem..."
                      className="flex-1 bg-slate-950 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-extrabold cursor-pointer"
                    >
                      Enviar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            /* ==================== LOBBY: CREATE OR JOIN ROOM ==================== */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5 bg-slate-900/80 border border-white/10 rounded-xl p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div>
                    <div className="text-sm font-black text-white">{session.player.nickname}</div>
                    <div className="text-xs text-slate-400 font-mono tabular-nums">
                      ELO {session.player.elo} · {session.player.wins}V {session.player.draws}E {session.player.losses}D
                    </div>
                  </div>
                  <ClubCrest
                    team={TEAMS.find((t) => t.id === session.player.favoriteTeamId) || TEAMS[0]}
                    className="w-8 h-8"
                  />
                </div>

                {/* Nickname quick update */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    maxLength={18}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Seu apelido..."
                    className="flex-1 bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                  />
                  <button
                    type="button"
                    disabled={profileSaving}
                    onClick={handleUpdateNickname}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-[11px] font-bold text-amber-300 cursor-pointer"
                  >
                    {profileSaving ? '...' : 'Salvar'}
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-extrabold uppercase text-emerald-300">Seu Clube para Jogar</div>
                    <button
                      type="button"
                      onClick={() => setCrestPickerOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-[11px] font-extrabold text-amber-300 cursor-pointer"
                    >
                      Menu com Escudos
                    </button>
                  </div>
                  <select
                    value={selectedLeagueId}
                    onChange={(e) => {
                      const nl = e.target.value;
                      setSelectedLeagueId(nl);
                      const first = TEAMS.find((t) => t.leagueId === nl);
                      if (first) setSelectedTeamId(first.id);
                    }}
                    className="w-full bg-slate-950 border border-white/15 rounded-lg px-3 py-2 text-xs font-bold text-white"
                  >
                    {LEAGUES.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {leagueTeams.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTeamId(t.id)}
                        className={`px-2 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                          selectedTeamId === t.id ? 'bg-slate-800 border-amber-400 text-white' : 'bg-slate-950 border-white/10 text-slate-300'
                        }`}
                      >
                        <ClubCrest team={t} className="w-5 h-5 shrink-0" />
                        <span className="truncate">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={createRoom}
                  className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-sm font-black uppercase text-slate-950 cursor-pointer shadow-lg"
                >
                  Criar Nova Sala Online
                </button>
              </div>

              <div className="lg:col-span-7 bg-slate-900/80 border border-white/10 rounded-xl p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase text-amber-300">
                    Salas Abertas ({openRooms.length})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      maxLength={6}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Código (ex: A7K2)"
                      className="w-36 bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => joinRoomByCode(joinCode)}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold cursor-pointer"
                    >
                      Entrar
                    </button>
                    <button
                      type="button"
                      onClick={() => sendWs({ type: 'list_rooms' })}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                    >
                      Atualizar
                    </button>
                  </div>
                </div>

                {openRooms.length === 0 ? (
                  <div className="bg-slate-950/70 border border-white/5 rounded-xl p-6 text-center text-xs text-slate-400">
                    Nenhuma sala aguardando jogador neste instante. Crie uma sala ao lado e compartilhe o código!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {openRooms.map((rm) => {
                      const ht = TEAMS.find((t) => t.id === rm.host.teamId) || TEAMS[0];
                      return (
                        <div
                          key={rm.code}
                          className="bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs font-black px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                              {rm.code}
                            </span>
                            <ClubCrest team={ht} className="w-6 h-6" />
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-white truncate">
                                {rm.host.nickname} ({ht.abbr})
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                ELO {rm.host.elo} · {Math.round(rm.durationSec / 60)} min
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => joinRoomByCode(rm.code)}
                            className="min-h-[34px] px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold cursor-pointer"
                          >
                            Desafiar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'ranking' && (
        <div className="bg-slate-900/75 border border-white/10 rounded-xl p-4 overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-slate-400 border-b border-white/10 text-left">
                <th className="py-2">#</th>
                <th className="py-2">Jogador</th>
                <th className="py-2 text-center">ELO</th>
                <th className="py-2 text-center">V</th>
                <th className="py-2 text-center">E</th>
                <th className="py-2 text-center">D</th>
                <th className="py-2 text-center">Gols</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    Nenhum jogador cadastrado ainda. Seja o primeiro a entrar no ranking!
                  </td>
                </tr>
              ) : (
                leaderboard.map((p, i) => {
                  const tm = TEAMS.find((t) => t.id === p.favoriteTeamId) || TEAMS[0];
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-white/5 ${
                        session?.player.id === p.id ? 'bg-emerald-950/60 text-amber-300 font-bold' : 'text-slate-200'
                      }`}
                    >
                      <td className="py-2 font-mono">{i + 1}</td>
                      <td className="py-2 flex items-center gap-2">
                        <ClubCrest team={tm} className="w-4 h-4" />
                        <span>{p.nickname}</span>
                      </td>
                      <td className="py-2 text-center font-mono font-extrabold text-cyan-300">{p.elo}</td>
                      <td className="py-2 text-center">{p.wins}</td>
                      <td className="py-2 text-center">{p.draws}</td>
                      <td className="py-2 text-center">{p.losses}</td>
                      <td className="py-2 text-center">{p.goalsFor}:{p.goalsAgainst}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-slate-900/75 border border-white/10 rounded-xl p-4 space-y-2 max-h-[420px] overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Nenhuma partida online finalizada ainda.</p>
          ) : (
            history.map((m) => {
              const ht = TEAMS.find((t) => t.id === m.homeTeamId) || TEAMS[0];
              const at = TEAMS.find((t) => t.id === m.awayTeamId) || TEAMS[1];
              return (
                <div
                  key={m.id}
                  className="bg-slate-950/85 border border-white/10 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums"
                >
                  <div className="flex items-center gap-2 font-bold text-white">
                    <ClubCrest team={ht} className="w-5 h-5" />
                    <span>{m.homeNickname}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-amber-300">
                      {m.homeScore} - {m.awayScore}
                    </span>
                    <span>{m.awayNickname}</span>
                    <ClubCrest team={at} className="w-5 h-5" />
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Sala {m.roomCode} · Chutes {m.homeShots}x{m.awayShots}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <TeamPickerModal
        open={crestPickerOpen}
        title="Escolher Clube com Escudos"
        selectedTeamId={room ? myParticipant?.teamId || selectedTeamId : selectedTeamId}
        initialLeagueId={selectedLeagueId}
        onSelect={(team, lid) => {
          setSelectedLeagueId(lid);
          setSelectedTeamId(team.id);
          if (room) sendWs({ type: 'update_setup', teamId: team.id });
        }}
        onClose={() => setCrestPickerOpen(false)}
      />
    </div>
  );
};

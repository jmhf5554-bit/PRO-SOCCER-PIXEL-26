import crypto from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { WebSocket, WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

// Ensure SQLite data directory exists
const dataDir = path.resolve(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'brfc_online.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    favorite_team_id TEXT NOT NULL DEFAULT 'flamengo',
    elo INTEGER NOT NULL DEFAULT 1000,
    wins INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    goals_for INTEGER NOT NULL DEFAULT 0,
    goals_against INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    player_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS online_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT NOT NULL,
    home_player_id INTEGER NOT NULL,
    away_player_id INTEGER NOT NULL,
    home_nickname TEXT NOT NULL,
    away_nickname TEXT NOT NULL,
    home_team_id TEXT NOT NULL,
    away_team_id TEXT NOT NULL,
    home_score INTEGER NOT NULL,
    away_score INTEGER NOT NULL,
    home_shots INTEGER NOT NULL DEFAULT 0,
    away_shots INTEGER NOT NULL DEFAULT 0,
    home_poss INTEGER NOT NULL DEFAULT 50,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

interface PlayerRow {
  id: number;
  nickname: string;
  password_hash: string;
  password_salt: string;
  favorite_team_id: string;
  elo: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
}

interface PublicPlayer {
  id: number;
  nickname: string;
  favoriteTeamId: string;
  elo: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

function toPublicPlayer(row: PlayerRow): PublicPlayer {
  return {
    id: row.id,
    nickname: row.nickname,
    favoriteTeamId: row.favorite_team_id,
    elo: row.elo,
    wins: row.wins,
    draws: row.draws,
    losses: row.losses,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against
  };
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashPassword(password, salt), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function createSessionToken(playerId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
  db.prepare('INSERT INTO sessions (token, player_id, expires_at) VALUES (?, ?, ?)').run(token, playerId, expiresAt);
  return token;
}

function getPlayerByToken(token: string | undefined): PublicPlayer | null {
  if (!token || typeof token !== 'string') return null;
  const session = db
    .prepare('SELECT player_id, expires_at FROM sessions WHERE token = ?')
    .get(token) as { player_id: number; expires_at: number } | undefined;
  if (!session || session.expires_at < Date.now()) {
    if (session) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(session.player_id) as PlayerRow | undefined;
  return player ? toPublicPlayer(player) : null;
}

function extractBearer(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return undefined;
  return auth.slice(7).trim();
}

const stmtFindByNick = db.prepare('SELECT * FROM players WHERE nickname = ?');
const stmtInsertPlayer = db.prepare(
  'INSERT INTO players (nickname, password_hash, password_salt, favorite_team_id) VALUES (?, ?, ?, ?)'
);
const stmtUpdateFavTeam = db.prepare('UPDATE players SET favorite_team_id = ? WHERE id = ?');
const stmtLeaderboard = db.prepare(
  'SELECT id, nickname, favorite_team_id, elo, wins, draws, losses, goals_for, goals_against FROM players ORDER BY elo DESC, wins DESC, (goals_for - goals_against) DESC LIMIT 25'
);
const stmtHistory = db.prepare(
  'SELECT id, room_code, home_nickname, away_nickname, home_team_id, away_team_id, home_score, away_score, home_shots, away_shots, home_poss, created_at FROM online_matches ORDER BY id DESC LIMIT 25'
);
const stmtInsertMatch = db.prepare(
  'INSERT INTO online_matches (room_code, home_player_id, away_player_id, home_nickname, away_nickname, home_team_id, away_team_id, home_score, away_score, home_shots, away_shots, home_poss) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
const stmtUpdatePlayerStats = db.prepare(
  'UPDATE players SET elo = ?, wins = wins + ?, draws = draws + ?, losses = losses + ?, goals_for = goals_for + ?, goals_against = goals_against + ? WHERE id = ?'
);

const recordMatchTx = db.transaction(
  (params: {
    roomCode: string;
    homePlayerId: number;
    awayPlayerId: number;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    homeShots: number;
    awayShots: number;
    homePoss: number;
  }) => {
    const homeRow = db.prepare('SELECT * FROM players WHERE id = ?').get(params.homePlayerId) as PlayerRow | undefined;
    const awayRow = db.prepare('SELECT * FROM players WHERE id = ?').get(params.awayPlayerId) as PlayerRow | undefined;
    if (!homeRow || !awayRow) return null;

    const expectedHome = 1 / (1 + Math.pow(10, (awayRow.elo - homeRow.elo) / 400));
    const actualHome = params.homeScore > params.awayScore ? 1 : params.homeScore === params.awayScore ? 0.5 : 0;
    const k = 28;
    const delta = Math.round(k * (actualHome - expectedHome));

    const newHomeElo = Math.max(400, homeRow.elo + delta);
    const newAwayElo = Math.max(400, awayRow.elo - delta);

    const hWin = params.homeScore > params.awayScore ? 1 : 0;
    const draw = params.homeScore === params.awayScore ? 1 : 0;
    const aWin = params.awayScore > params.homeScore ? 1 : 0;

    stmtUpdatePlayerStats.run(newHomeElo, hWin, draw, aWin, params.homeScore, params.awayScore, homeRow.id);
    stmtUpdatePlayerStats.run(newAwayElo, aWin, draw, hWin, params.awayScore, params.homeScore, awayRow.id);

    stmtInsertMatch.run(
      params.roomCode,
      homeRow.id,
      awayRow.id,
      homeRow.nickname,
      awayRow.nickname,
      params.homeTeamId,
      params.awayTeamId,
      params.homeScore,
      params.awayScore,
      params.homeShots,
      params.awayShots,
      params.homePoss
    );

    return {
      homeDelta: newHomeElo - homeRow.elo,
      awayDelta: newAwayElo - awayRow.elo,
      homeElo: newHomeElo,
      awayElo: newAwayElo
    };
  }
);

// ==================== EXPRESS APP ====================
const app = express();
app.use(express.json({ limit: '256kb' }));

interface RoomParticipant {
  ws: WebSocket;
  player: PublicPlayer;
  teamId: string;
  useAway: boolean;
  ready: boolean;
}

interface OnlineRoom {
  code: string;
  status: 'waiting' | 'playing';
  weather: 'sunny' | 'night' | 'rain';
  durationSec: number;
  difficulty: 'iniciante' | 'amador' | 'profissional' | 'lenda';
  host: RoomParticipant;
  guest: RoomParticipant | null;
  matchRecorded: boolean;
  createdAt: number;
}

const rooms = new Map<string, OnlineRoom>();
const clientRoom = new Map<WebSocket, string>();
const clientPlayer = new Map<WebSocket, PublicPlayer>();

function serializeRoom(room: OnlineRoom) {
  return {
    code: room.code,
    status: room.status,
    weather: room.weather,
    durationSec: room.durationSec,
    difficulty: room.difficulty,
    host: {
      id: room.host.player.id,
      nickname: room.host.player.nickname,
      elo: room.host.player.elo,
      teamId: room.host.teamId,
      useAway: room.host.useAway,
      ready: room.host.ready
    },
    guest: room.guest
      ? {
          id: room.guest.player.id,
          nickname: room.guest.player.nickname,
          elo: room.guest.player.elo,
          teamId: room.guest.teamId,
          useAway: room.guest.useAway,
          ready: room.guest.ready
        }
      : null
  };
}

function getOpenRoomsList() {
  return Array.from(rooms.values())
    .filter((r) => r.status === 'waiting')
    .map(serializeRoom);
}

app.get('/api/health', (_req: Request, res: Response) => {
  const playerCount = (db.prepare('SELECT COUNT(*) as c FROM players').get() as { c: number }).c;
  const matchCount = (db.prepare('SELECT COUNT(*) as c FROM online_matches').get() as { c: number }).c;
  res.json({ ok: true, players: playerCount, matches: matchCount, openRooms: getOpenRoomsList().length });
});

app.post('/api/online/auth', (req: Request, res: Response) => {
  const rawNick = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const favoriteTeamId = typeof req.body?.favoriteTeamId === 'string' ? req.body.favoriteTeamId.slice(0, 40) : 'flamengo';

  if (rawNick.length < 2 || rawNick.length > 18 || !/^[a-zA-Z0-9À-ÿ _.-]+$/.test(rawNick)) {
    res.status(400).json({ error: 'Apelido deve ter entre 2 e 18 caracteres válidos.' });
    return;
  }
  if (password.length < 4 || password.length > 64) {
    res.status(400).json({ error: 'A senha/PIN deve ter pelo menos 4 caracteres.' });
    return;
  }

  const existing = stmtFindByNick.get(rawNick) as PlayerRow | undefined;
  if (existing) {
    if (!verifyPassword(password, existing.password_salt, existing.password_hash)) {
      res.status(401).json({ error: 'Apelido já cadastrado com outra senha. Verifique seu PIN.' });
      return;
    }
    if (favoriteTeamId && favoriteTeamId !== existing.favorite_team_id) {
      stmtUpdateFavTeam.run(favoriteTeamId, existing.id);
      existing.favorite_team_id = favoriteTeamId;
    }
    const token = createSessionToken(existing.id);
    res.json({ token, player: toPublicPlayer(existing), isNew: false });
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const info = stmtInsertPlayer.run(rawNick, hash, salt, favoriteTeamId);
  const created = db.prepare('SELECT * FROM players WHERE id = ?').get(info.lastInsertRowid) as PlayerRow;
  const token = createSessionToken(created.id);
  res.status(201).json({ token, player: toPublicPlayer(created), isNew: true });
});

app.get('/api/online/me', (req: Request, res: Response) => {
  const player = getPlayerByToken(extractBearer(req));
  if (!player) {
    res.status(401).json({ error: 'Sessão expirada ou inválida.' });
    return;
  }
  res.json({ player });
});

app.post('/api/online/favorite-team', (req: Request, res: Response) => {
  const player = getPlayerByToken(extractBearer(req));
  if (!player) {
    res.status(401).json({ error: 'Faça login para atualizar o clube.' });
    return;
  }
  const teamId = typeof req.body?.teamId === 'string' ? req.body.teamId.trim().slice(0, 40) : '';
  if (!teamId) {
    res.status(400).json({ error: 'Clube inválido.' });
    return;
  }
  stmtUpdateFavTeam.run(teamId, player.id);
  res.json({ ok: true, favoriteTeamId: teamId });
});

app.get('/api/online/leaderboard', (_req: Request, res: Response) => {
  const rows = stmtLeaderboard.all() as PlayerRow[];
  res.json({ leaderboard: rows.map(toPublicPlayer) });
});

app.get('/api/online/history', (_req: Request, res: Response) => {
  const rows = stmtHistory.all();
  res.json({ history: rows });
});

app.get('/api/online/rooms', (_req: Request, res: Response) => {
  res.json({ rooms: getOpenRoomsList() });
});

// ==================== HTTP + WEBSOCKET SERVER ====================
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function sendJson(ws: WebSocket, msg: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastRoom(room: OnlineRoom, msg: Record<string, unknown>) {
  sendJson(room.host.ws, msg);
  if (room.guest) sendJson(room.guest.ws, msg);
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    if (!rooms.has(code)) return code;
  }
  return `B${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

function removeFromRoom(ws: WebSocket) {
  const code = clientRoom.get(ws);
  if (!code) return;
  clientRoom.delete(ws);
  const room = rooms.get(code);
  if (!room) return;

  if (room.host.ws === ws) {
    if (room.guest) {
      sendJson(room.guest.ws, { type: 'room_closed', reason: 'O anfitrião saiu da sala.' });
      clientRoom.delete(room.guest.ws);
    }
    rooms.delete(code);
  } else if (room.guest && room.guest.ws === ws) {
    room.guest = null;
    room.status = 'waiting';
    sendJson(room.host.ws, { type: 'room_updated', room: serializeRoom(room), notice: 'O visitante saiu da sala.' });
  }
}

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (raw) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString()) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = typeof msg.type === 'string' ? msg.type : '';
    if (type === 'ping') {
      sendJson(ws, { type: 'pong' });
      return;
    }

    if (type === 'auth') {
      const token = typeof msg.token === 'string' ? msg.token : '';
      const player = getPlayerByToken(token);
      if (!player) {
        sendJson(ws, { type: 'error', error: 'Sessão inválida. Entre novamente.' });
        return;
      }
      clientPlayer.set(ws, player);
      sendJson(ws, { type: 'authed', player, rooms: getOpenRoomsList() });
      return;
    }

    if (type === 'list_rooms') {
      sendJson(ws, { type: 'rooms_list', rooms: getOpenRoomsList() });
      return;
    }

    const player = clientPlayer.get(ws);
    if (!player) {
      sendJson(ws, { type: 'error', error: 'Autenticação necessária para usar salas online.' });
      return;
    }

    if (type === 'create_room') {
      removeFromRoom(ws);
      const code = generateRoomCode();
      const teamId = typeof msg.teamId === 'string' ? msg.teamId.slice(0, 40) : 'flamengo';
      const weather = msg.weather === 'sunny' || msg.weather === 'rain' ? msg.weather : 'night';
      const durationSec = msg.durationSec === 180 || msg.durationSec === 300 || msg.durationSec === 480 ? msg.durationSec : 180;
      const difficulty =
        msg.difficulty === 'iniciante' || msg.difficulty === 'profissional' || msg.difficulty === 'lenda'
          ? msg.difficulty
          : 'amador';

      const room: OnlineRoom = {
        code,
        status: 'waiting',
        weather,
        durationSec,
        difficulty,
        host: {
          ws,
          player,
          teamId,
          useAway: Boolean(msg.useAway),
          ready: true
        },
        guest: null,
        matchRecorded: false,
        createdAt: Date.now()
      };
      rooms.set(code, room);
      clientRoom.set(ws, code);
      sendJson(ws, { type: 'room_joined', role: 'host', room: serializeRoom(room) });
      return;
    }

    if (type === 'join_room') {
      const code = typeof msg.code === 'string' ? msg.code.trim().toUpperCase() : '';
      const room = rooms.get(code);
      if (!room) {
        sendJson(ws, { type: 'error', error: `Sala "${code}" não encontrada.` });
        return;
      }
      if (room.status !== 'waiting' || room.guest) {
        sendJson(ws, { type: 'error', error: 'Esta sala já está cheia ou em andamento.' });
        return;
      }
      if (room.host.player.id === player.id) {
        sendJson(ws, { type: 'error', error: 'Você já é o anfitrião desta sala.' });
        return;
      }
      removeFromRoom(ws);
      room.guest = {
        ws,
        player,
        teamId: typeof msg.teamId === 'string' ? msg.teamId.slice(0, 40) : 'palmeiras',
        useAway: Boolean(msg.useAway),
        ready: false
      };
      clientRoom.set(ws, code);
      sendJson(ws, { type: 'room_joined', role: 'guest', room: serializeRoom(room) });
      sendJson(room.host.ws, {
        type: 'room_updated',
        room: serializeRoom(room),
        notice: `${player.nickname} entrou na sala!`
      });
      return;
    }

    if (type === 'leave_room') {
      removeFromRoom(ws);
      sendJson(ws, { type: 'room_left', rooms: getOpenRoomsList() });
      return;
    }

    const code = clientRoom.get(ws);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    const isHost = room.host.ws === ws;
    const participant = isHost ? room.host : room.guest?.ws === ws ? room.guest : null;
    if (!participant) return;

    if (type === 'update_setup') {
      if (typeof msg.teamId === 'string' && msg.teamId.trim()) participant.teamId = msg.teamId.trim().slice(0, 40);
      if (typeof msg.useAway === 'boolean') participant.useAway = msg.useAway;
      if (typeof msg.ready === 'boolean') participant.ready = msg.ready;
      if (isHost) {
        if (msg.weather === 'sunny' || msg.weather === 'night' || msg.weather === 'rain') room.weather = msg.weather;
        if (msg.durationSec === 180 || msg.durationSec === 300 || msg.durationSec === 480) room.durationSec = msg.durationSec;
      }
      broadcastRoom(room, { type: 'room_updated', room: serializeRoom(room) });
      return;
    }

    if (type === 'chat') {
      const text = typeof msg.text === 'string' ? msg.text.trim().slice(0, 80) : '';
      if (!text) return;
      broadcastRoom(room, {
        type: 'chat',
        sender: participant.player.nickname,
        text,
        ts: Date.now()
      });
      return;
    }

    if (type === 'start_match') {
      if (!isHost || !room.guest) return;
      room.status = 'playing';
      room.matchRecorded = false;
      broadcastRoom(room, { type: 'match_started', room: serializeRoom(room) });
      return;
    }

    if (type === 'guest_input') {
      if (!isHost && room.status === 'playing') {
        sendJson(room.host.ws, { type: 'guest_input', input: msg.input });
      }
      return;
    }

    if (type === 'match_state') {
      if (isHost && room.guest && room.status === 'playing') {
        sendJson(room.guest.ws, { type: 'match_state', payload: msg.payload });
      }
      return;
    }

    if (type === 'match_end') {
      if (!isHost || !room.guest || room.matchRecorded) return;
      room.matchRecorded = true;
      room.status = 'waiting';
      room.guest.ready = false;

      const homeScore = Math.max(0, Math.min(99, Math.round(Number(msg.homeScore) || 0)));
      const awayScore = Math.max(0, Math.min(99, Math.round(Number(msg.awayScore) || 0)));
      const homeShots = Math.max(0, Math.min(200, Math.round(Number(msg.homeShots) || 0)));
      const awayShots = Math.max(0, Math.min(200, Math.round(Number(msg.awayShots) || 0)));
      const homePoss = Math.max(0, Math.min(100, Math.round(Number(msg.homePossPct) || 50)));

      const summary = recordMatchTx({
        roomCode: room.code,
        homePlayerId: room.host.player.id,
        awayPlayerId: room.guest.player.id,
        homeTeamId: room.host.teamId,
        awayTeamId: room.guest.teamId,
        homeScore,
        awayScore,
        homeShots,
        awayShots,
        homePoss
      });

      if (summary) {
        room.host.player.elo = summary.homeElo;
        room.guest.player.elo = summary.awayElo;
      }

      broadcastRoom(room, {
        type: 'match_recorded',
        homeScore,
        awayScore,
        summary,
        room: serializeRoom(room)
      });
    }
  });

  ws.on('close', () => {
    removeFromRoom(ws);
    clientPlayer.delete(ws);
  });
});

// ==================== VITE / STATIC SERVING ====================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/ws')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`BRFC Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start BRFC server:', err);
  process.exit(1);
});

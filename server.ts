import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import {
  getLeaderboard,
  getMatchHistory,
  getOrCreatePlayerByUid,
  getPlayerByUid,
  PublicPlayer,
  recordOnlineMatch,
  updatePlayerProfile
} from './src/db/onlineRepo.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

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
  res.json({ ok: true, openRooms: getOpenRoomsList().length });
});

app.post('/api/online/session', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email || '';
    const googleName = typeof req.user!.name === 'string' ? req.user!.name : '';
    const rawNick = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : googleName;
    const favoriteTeamId =
      typeof req.body?.favoriteTeamId === 'string' ? req.body.favoriteTeamId.trim().slice(0, 40) : 'flamengo';

    const player = await getOrCreatePlayerByUid(uid, email, rawNick, favoriteTeamId);
    res.json({ player });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Erro ao iniciar sessão online.' });
  }
});

app.get('/api/online/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const player = await getPlayerByUid(req.user!.uid);
    if (!player) {
      const created = await getOrCreatePlayerByUid(req.user!.uid, req.user!.email || '');
      res.json({ player: created });
      return;
    }
    res.json({ player });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Erro ao buscar perfil.' });
  }
});

app.post('/api/online/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rawNick = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : undefined;
    const rawTeam = typeof req.body?.favoriteTeamId === 'string' ? req.body.favoriteTeamId.trim() : undefined;

    if (rawNick !== undefined && (rawNick.length < 2 || rawNick.length > 18 || !/^[a-zA-Z0-9À-ÿ _.-]+$/.test(rawNick))) {
      res.status(400).json({ error: 'Apelido deve ter entre 2 e 18 caracteres válidos.' });
      return;
    }

    const updated = await updatePlayerProfile(req.user!.uid, {
      nickname: rawNick,
      favoriteTeamId: rawTeam
    });

    for (const [ws, pl] of clientPlayer.entries()) {
      if (pl.uid === updated.uid) {
        clientPlayer.set(ws, updated);
      }
    }

    res.json({ player: updated });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Erro ao atualizar perfil.' });
  }
});

app.get('/api/online/leaderboard', async (_req: Request, res: Response) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json({ leaderboard });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Erro ao carregar ranking.' });
  }
});

app.get('/api/online/history', async (_req: Request, res: Response) => {
  try {
    const history = await getMatchHistory();
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Erro ao carregar histórico.' });
  }
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

function broadcastOpenRoomsToLobby() {
  const list = getOpenRoomsList();
  for (const [ws] of clientPlayer.entries()) {
    if (!clientRoom.has(ws)) {
      sendJson(ws, { type: 'rooms_list', rooms: list });
    }
  }
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
    broadcastOpenRoomsToLobby();
  } else if (room.guest && room.guest.ws === ws) {
    room.guest = null;
    room.status = 'waiting';
    sendJson(room.host.ws, { type: 'room_updated', room: serializeRoom(room), notice: 'O visitante saiu da sala.' });
    broadcastOpenRoomsToLobby();
  }
}

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', async (raw) => {
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
      if (!token) {
        sendJson(ws, { type: 'error', error: 'Autenticação necessária.' });
        return;
      }
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        const player =
          (await getPlayerByUid(decoded.uid)) ||
          (await getOrCreatePlayerByUid(decoded.uid, decoded.email || '', typeof decoded.name === 'string' ? decoded.name : undefined));
        clientPlayer.set(ws, player);
        sendJson(ws, { type: 'authed', player, rooms: getOpenRoomsList() });
      } catch {
        sendJson(ws, { type: 'error', error: 'Sessão expirada. Faça login novamente.' });
      }
      return;
    }

    if (type === 'list_rooms') {
      sendJson(ws, { type: 'rooms_list', rooms: getOpenRoomsList() });
      return;
    }

    const player = clientPlayer.get(ws);
    if (!player) {
      sendJson(ws, { type: 'error', error: 'Faça login para criar ou entrar em salas online.' });
      return;
    }

    if (type === 'create_room') {
      removeFromRoom(ws);
      const latestPlayer = (await getPlayerByUid(player.uid).catch(() => null)) || player;
      clientPlayer.set(ws, latestPlayer);

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
          player: latestPlayer,
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
      broadcastOpenRoomsToLobby();
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
      const latestPlayer = (await getPlayerByUid(player.uid).catch(() => null)) || player;
      clientPlayer.set(ws, latestPlayer);

      room.guest = {
        ws,
        player: latestPlayer,
        teamId: typeof msg.teamId === 'string' ? msg.teamId.slice(0, 40) : 'palmeiras',
        useAway: Boolean(msg.useAway),
        ready: false
      };
      clientRoom.set(ws, code);
      sendJson(ws, { type: 'room_joined', role: 'guest', room: serializeRoom(room) });
      sendJson(room.host.ws, {
        type: 'room_updated',
        room: serializeRoom(room),
        notice: `${latestPlayer.nickname} entrou na sala!`
      });
      broadcastOpenRoomsToLobby();
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
      broadcastOpenRoomsToLobby();
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

      try {
        const summary = await recordOnlineMatch({
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
      } catch (err) {
        console.error('Error recording online match:', err);
        broadcastRoom(room, {
          type: 'room_updated',
          room: serializeRoom(room),
          notice: `Partida encerrada (${homeScore} x ${awayScore}).`
        });
      }
      broadcastOpenRoomsToLobby();
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

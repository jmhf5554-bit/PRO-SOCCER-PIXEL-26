import { desc, eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { onlineMatches, players } from './schema.ts';

export interface PublicPlayer {
  id: number;
  uid: string;
  nickname: string;
  favoriteTeamId: string;
  elo: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface HistoryMatchRecord {
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
  createdAt: Date | null;
}

function toPublicPlayer(row: typeof players.$inferSelect): PublicPlayer {
  return {
    id: row.id,
    uid: row.uid,
    nickname: row.nickname,
    favoriteTeamId: row.favoriteTeamId,
    elo: row.elo,
    wins: row.wins,
    draws: row.draws,
    losses: row.losses,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst
  };
}

function deriveDefaultNickname(email: string, preferred?: string): string {
  const cleanPreferred = (preferred || '').trim().replace(/[^a-zA-Z0-9À-ÿ _.-]/g, '').slice(0, 18);
  if (cleanPreferred.length >= 2) return cleanPreferred;
  const emailLocal = (email.split('@')[0] || 'CraqueBR').replace(/[^a-zA-Z0-9À-ÿ _.-]/g, '').slice(0, 18);
  return emailLocal.length >= 2 ? emailLocal : 'CraqueBR';
}

export async function getOrCreatePlayerByUid(
  uid: string,
  email: string,
  preferredNickname?: string,
  favoriteTeamId?: string
): Promise<PublicPlayer> {
  try {
    const safeEmail = email || `${uid}@brfc.local`;
    const defaultNick = deriveDefaultNickname(safeEmail, preferredNickname);
    const fav = (favoriteTeamId || 'flamengo').trim().slice(0, 40) || 'flamengo';

    const result = await db
      .insert(players)
      .values({
        uid,
        email: safeEmail,
        nickname: defaultNick,
        favoriteTeamId: fav
      })
      .onConflictDoUpdate({
        target: players.uid,
        set: {
          email: safeEmail
        }
      })
      .returning();

    return toPublicPlayer(result[0]);
  } catch (error) {
    console.error('Database query failed in getOrCreatePlayerByUid:', error);
    throw new Error('Falha ao carregar perfil do jogador no servidor.', { cause: error });
  }
}

export async function getPlayerByUid(uid: string): Promise<PublicPlayer | null> {
  try {
    const rows = await db.select().from(players).where(eq(players.uid, uid)).limit(1);
    return rows[0] ? toPublicPlayer(rows[0]) : null;
  } catch (error) {
    console.error('Database query failed in getPlayerByUid:', error);
    throw new Error('Falha ao consultar perfil do jogador.', { cause: error });
  }
}

export async function updatePlayerProfile(
  uid: string,
  updates: { nickname?: string; favoriteTeamId?: string }
): Promise<PublicPlayer> {
  try {
    const setObj: Partial<typeof players.$inferInsert> = {};
    if (typeof updates.nickname === 'string' && updates.nickname.trim().length >= 2) {
      setObj.nickname = updates.nickname.trim().slice(0, 18);
    }
    if (typeof updates.favoriteTeamId === 'string' && updates.favoriteTeamId.trim()) {
      setObj.favoriteTeamId = updates.favoriteTeamId.trim().slice(0, 40);
    }

    if (Object.keys(setObj).length === 0) {
      const existing = await getPlayerByUid(uid);
      if (!existing) throw new Error('Jogador não encontrado.');
      return existing;
    }

    const updated = await db
      .update(players)
      .set(setObj)
      .where(eq(players.uid, uid))
      .returning();

    if (!updated[0]) throw new Error('Jogador não encontrado.');
    return toPublicPlayer(updated[0]);
  } catch (error) {
    console.error('Database query failed in updatePlayerProfile:', error);
    throw new Error('Não foi possível atualizar o perfil online.', { cause: error });
  }
}

export async function getLeaderboard(): Promise<PublicPlayer[]> {
  try {
    const rows = await db
      .select()
      .from(players)
      .orderBy(desc(players.elo), desc(players.wins), desc(sql`${players.goalsFor} - ${players.goalsAgainst}`))
      .limit(25);
    return rows.map(toPublicPlayer);
  } catch (error) {
    console.error('Database query failed in getLeaderboard:', error);
    throw new Error('Não foi possível carregar o ranking no momento.', { cause: error });
  }
}

export async function getMatchHistory(): Promise<HistoryMatchRecord[]> {
  try {
    const rows = await db
      .select({
        id: onlineMatches.id,
        roomCode: onlineMatches.roomCode,
        homeNickname: onlineMatches.homeNickname,
        awayNickname: onlineMatches.awayNickname,
        homeTeamId: onlineMatches.homeTeamId,
        awayTeamId: onlineMatches.awayTeamId,
        homeScore: onlineMatches.homeScore,
        awayScore: onlineMatches.awayScore,
        homeShots: onlineMatches.homeShots,
        awayShots: onlineMatches.awayShots,
        homePoss: onlineMatches.homePoss,
        createdAt: onlineMatches.createdAt
      })
      .from(onlineMatches)
      .orderBy(desc(onlineMatches.id))
      .limit(25);
    return rows;
  } catch (error) {
    console.error('Database query failed in getMatchHistory:', error);
    throw new Error('Não foi possível carregar o histórico de partidas.', { cause: error });
  }
}

export async function recordOnlineMatch(params: {
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
}): Promise<{ homeDelta: number; awayDelta: number; homeElo: number; awayElo: number } | null> {
  try {
    return await db.transaction(async (tx) => {
      const homeRows = await tx.select().from(players).where(eq(players.id, params.homePlayerId)).limit(1);
      const awayRows = await tx.select().from(players).where(eq(players.id, params.awayPlayerId)).limit(1);
      const homeRow = homeRows[0];
      const awayRow = awayRows[0];
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

      await tx
        .update(players)
        .set({
          elo: newHomeElo,
          wins: sql`${players.wins} + ${hWin}`,
          draws: sql`${players.draws} + ${draw}`,
          losses: sql`${players.losses} + ${aWin}`,
          goalsFor: sql`${players.goalsFor} + ${params.homeScore}`,
          goalsAgainst: sql`${players.goalsAgainst} + ${params.awayScore}`
        })
        .where(eq(players.id, homeRow.id));

      await tx
        .update(players)
        .set({
          elo: newAwayElo,
          wins: sql`${players.wins} + ${aWin}`,
          draws: sql`${players.draws} + ${draw}`,
          losses: sql`${players.losses} + ${hWin}`,
          goalsFor: sql`${players.goalsFor} + ${params.awayScore}`,
          goalsAgainst: sql`${players.goalsAgainst} + ${params.homeScore}`
        })
        .where(eq(players.id, awayRow.id));

      await tx.insert(onlineMatches).values({
        roomCode: params.roomCode,
        homePlayerId: homeRow.id,
        awayPlayerId: awayRow.id,
        homeNickname: homeRow.nickname,
        awayNickname: awayRow.nickname,
        homeTeamId: params.homeTeamId,
        awayTeamId: params.awayTeamId,
        homeScore: params.homeScore,
        awayScore: params.awayScore,
        homeShots: params.homeShots,
        awayShots: params.awayShots,
        homePoss: params.homePoss
      });

      return {
        homeDelta: newHomeElo - homeRow.elo,
        awayDelta: newAwayElo - awayRow.elo,
        homeElo: newHomeElo,
        awayElo: newAwayElo
      };
    });
  } catch (error) {
    console.error('Database query failed in recordOnlineMatch:', error);
    throw new Error('Não foi possível registrar o resultado da partida online.', { cause: error });
  }
}

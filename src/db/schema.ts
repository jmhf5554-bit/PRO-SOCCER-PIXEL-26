import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  nickname: text('nickname').notNull(),
  favoriteTeamId: text('favorite_team_id').notNull().default('flamengo'),
  elo: integer('elo').notNull().default(1000),
  wins: integer('wins').notNull().default(0),
  draws: integer('draws').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  goalsFor: integer('goals_for').notNull().default(0),
  goalsAgainst: integer('goals_against').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow()
});

export const onlineMatches = pgTable('online_matches', {
  id: serial('id').primaryKey(),
  roomCode: text('room_code').notNull(),
  homePlayerId: integer('home_player_id')
    .references(() => players.id)
    .notNull(),
  awayPlayerId: integer('away_player_id')
    .references(() => players.id)
    .notNull(),
  homeNickname: text('home_nickname').notNull(),
  awayNickname: text('away_nickname').notNull(),
  homeTeamId: text('home_team_id').notNull(),
  awayTeamId: text('away_team_id').notNull(),
  homeScore: integer('home_score').notNull(),
  awayScore: integer('away_score').notNull(),
  homeShots: integer('home_shots').notNull().default(0),
  awayShots: integer('away_shots').notNull().default(0),
  homePoss: integer('home_poss').notNull().default(50),
  createdAt: timestamp('created_at').defaultNow()
});

export const playersRelations = relations(players, ({ many }) => ({
  homeMatches: many(onlineMatches, { relationName: 'homeMatches' }),
  awayMatches: many(onlineMatches, { relationName: 'awayMatches' })
}));

export const onlineMatchesRelations = relations(onlineMatches, ({ one }) => ({
  homePlayer: one(players, {
    fields: [onlineMatches.homePlayerId],
    references: [players.id],
    relationName: 'homeMatches'
  }),
  awayPlayer: one(players, {
    fields: [onlineMatches.awayPlayerId],
    references: [players.id],
    relationName: 'awayMatches'
  })
}));

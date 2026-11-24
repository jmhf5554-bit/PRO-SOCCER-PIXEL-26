export type DifficultyId = 'iniciante' | 'amador' | 'profissional' | 'lenda';

export interface DifficultyConfig {
  id: DifficultyId;
  label: string;
  desc: string;
  aiSpeedMult: number;
  pressDist: number;
  passRate: number;
  shotFreq: number;
  shotAccuracy: number;
  gkSpeedMult: number;
  gkSaveBonus: number;
  tackleRate: number;
  punishFactor: number;
}

export type SkinToneId = 'fair' | 'olive' | 'tan' | 'brown' | 'dark';
export type HairStyleId =
  | 'platinum_fade'
  | 'platinum_curly'
  | 'silver_short'
  | 'silver_fade'
  | 'dreads'
  | 'curly_afro'
  | 'curly_tips'
  | 'mohawk'
  | 'shaggy'
  | 'bald'
  | 'short_parted'
  | 'short_fade';

export type PlayerRole = 'GOL' | 'ZAG' | 'MEI' | 'ATA';
export type KitPattern = 'hoops' | 'solid_trim' | 'tricolor_v' | 'chest_band' | 'stripes_v' | 'sash';

export interface PlayerSpec {
  num: number;
  name: string;
  role: PlayerRole;
  skin: SkinToneId;
  hair: HairStyleId;
  hairColor: string;
  beard?: boolean;
  headband?: string;
  boots: string;
  ovr: number;
  pace?: number;
  shooting?: number;
  passing?: number;
  dribbling?: number;
}

export interface TeamKit {
  pattern: KitPattern;
  c1: string;
  c2: string;
  c3?: string;
  shorts: string;
  socks: string;
  gk: string;
  gk2: string;
  awayC1: string;
  awayC2: string;
  awayShorts: string;
  awaySocks: string;
}

export type WeatherId = 'sunny' | 'night' | 'rain';
export type FormationId = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2';
export type MentalityId = 'retranca' | 'equilibrado' | 'pressao_alta';

export type CrestPattern =
  | 'shield_hoops'
  | 'shield_stripes'
  | 'shield_star'
  | 'shield_sash'
  | 'shield_tricolor'
  | 'shield_circle'
  | 'shield_cross'
  | 'flag_national';

export interface CrestSpec {
  pattern: CrestPattern;
  primary: string;
  secondary: string;
  accent?: string;
  stars?: number;
}

export interface TeamSpec {
  id: string;
  leagueId: string;
  name: string;
  abbr: string;
  ovr: number;
  kit: TeamKit;
  crest?: CrestSpec;
  players: PlayerSpec[];
  bench?: PlayerSpec[];
}

export interface LeagueSpec {
  id: string;
  name: string;
  isNational?: boolean;
}

export type GameMode = 'quick' | 'two_player' | 'training' | 'tournament' | 'career_manager' | 'career_player';
export type TrainingChallengeId = 'free' | 'free_kicks' | 'penalties' | 'finishing_cross';
export type TacticId = 'equilibrado' | 'ofensivo' | 'retranca';

export interface MatchConfig {
  mode: GameMode;
  trainingChallenge?: TrainingChallengeId;
  homeTeam: TeamSpec;
  awayTeam: TeamSpec;
  homeUseAway: boolean;
  awayUseAway: boolean;
  difficulty: DifficultyId;
  tactic?: TacticId;
  formation?: FormationId;
  mentality?: MentalityId;
  weather?: WeatherId;
  matchDurationSec?: number;
  lockedPlayerSlot?: number; // for Player Career
  customPlayer?: PlayerSpec;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  homeShots: number;
  awayShots: number;
  homePossPct: number;
  awayPossPct: number;
  userGoals: number;
  userAssists: number;
  userPasses: number;
  userTackles: number;
  playerRating: number;
}

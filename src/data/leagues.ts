import { DifficultyConfig, DifficultyId, LeagueSpec, TeamSpec } from '../types';

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  iniciante: {
    id: 'iniciante',
    label: 'Iniciante',
    desc: 'Marcação mais lenta, passes simples e chutes imprecisos',
    aiSpeedMult: 0.72,
    pressDist: 110,
    passRate: 0.025,
    shotFreq: 0.022,
    shotAccuracy: 0.55,
    gkSpeedMult: 0.72,
    gkSaveBonus: 0.15,
    tackleRate: 0.005,
    punishFactor: 0.35
  },
  amador: {
    id: 'amador',
    label: 'Amador',
    desc: 'Marcação equilibrada, troca de passes média e reações normais',
    aiSpeedMult: 0.86,
    pressDist: 165,
    passRate: 0.055,
    shotFreq: 0.04,
    shotAccuracy: 0.74,
    gkSpeedMult: 0.88,
    gkSaveBonus: 0.35,
    tackleRate: 0.015,
    punishFactor: 0.65
  },
  profissional: {
    id: 'profissional',
    label: 'Profissional',
    desc: 'Pressão forte na saída, cortes no tempo certo e chutes potentes',
    aiSpeedMult: 0.99,
    pressDist: 235,
    passRate: 0.095,
    shotFreq: 0.065,
    shotAccuracy: 0.89,
    gkSpeedMult: 1.04,
    gkSaveBonus: 0.55,
    tackleRate: 0.032,
    punishFactor: 0.88
  },
  lenda: {
    id: 'lenda',
    label: 'Lenda',
    desc: 'Marcação agressiva, tabelas rápidas e goleiro com reflexos altos',
    aiSpeedMult: 1.11,
    pressDist: 320,
    passRate: 0.14,
    shotFreq: 0.095,
    shotAccuracy: 0.98,
    gkSpeedMult: 1.2,
    gkSaveBonus: 0.76,
    tackleRate: 0.055,
    punishFactor: 1.0
  }
};

export const LEAGUES: LeagueSpec[] = [
  { id: 'brasileirao', name: 'Brasileirão' },
  { id: 'laliga', name: 'La Liga' },
  { id: 'premier', name: 'Premier League' },
  { id: 'bundesliga', name: 'Bundesliga' },
  { id: 'argentina', name: 'Campeonato Argentino' },
  { id: 'colombia', name: 'Campeonato Colombiano' },
  { id: 'outras', name: 'Outras Ligas' },
  { id: 'selecoes', name: 'Seleções (Copa do Mundo)', isNational: true }
];

export const TEAMS: TeamSpec[] = [
  // ================= BRASILEIRÃO (8 clubes - Elencos Atualizados + Banco de Reservas) =================
  {
    id: 'flamengo', leagueId: 'brasileirao', name: 'Flamengo', abbr: 'FLA', ovr: 84,
    crest: { pattern: 'shield_hoops', primary: '#d91e2a', secondary: '#141414', accent: '#f8fafc', stars: 1 },
    kit: { pattern: 'hoops', c1: '#d91e2a', c2: '#141414', shorts: '#141414', socks: '#d91e2a', gk: '#eab308', gk2: '#a16207', awayC1: '#f8fafc', awayC2: '#d91e2a', awayShorts: '#f8fafc', awaySocks: '#f8fafc' },
    players: [
      { num: 1, name: 'Rossi', role: 'GOL', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', boots: '#f97316', ovr: 82 },
      { num: 3, name: 'Léo Ortiz', role: 'ZAG', skin: 'fair', hair: 'short_parted', hairColor: '#3e2b20', boots: '#f8fafc', ovr: 83 },
      { num: 8, name: 'Gerson', role: 'MEI', skin: 'brown', hair: 'dreads', hairColor: '#191412', beard: true, boots: '#facc15', ovr: 85 },
      { num: 10, name: 'Arrascaeta', role: 'MEI', skin: 'fair', hair: 'shaggy', hairColor: '#2d2018', beard: true, boots: '#06b6d4', ovr: 86 },
      { num: 9, name: 'Pedro', role: 'ATA', skin: 'olive', hair: 'short_fade', hairColor: '#241a15', beard: true, boots: '#ef4444', ovr: 85 }
    ],
    bench: [
      { num: 27, name: 'B. Henrique', role: 'ATA', skin: 'brown', hair: 'platinum_fade', hairColor: '#f5f5f4', boots: '#ef4444', ovr: 83 },
      { num: 18, name: 'De La Cruz', role: 'MEI', skin: 'olive', hair: 'short_fade', hairColor: '#1b1512', boots: '#facc15', ovr: 83 },
      { num: 4, name: 'Léo Pereira', role: 'ZAG', skin: 'fair', hair: 'platinum_fade', hairColor: '#f5f5f4', beard: true, boots: '#38bdf8', ovr: 81 },
      { num: 43, name: 'Wesley', role: 'ZAG', skin: 'brown', hair: 'short_fade', hairColor: '#161210', boots: '#22c55e', ovr: 80 },
      { num: 25, name: 'M. Cunha', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#3d2b22', boots: '#f8fafc', ovr: 77 }
    ]
  },
  {
    id: 'palmeiras', leagueId: 'brasileirao', name: 'Palmeiras', abbr: 'PAL', ovr: 84,
    crest: { pattern: 'shield_circle', primary: '#0e6b38', secondary: '#f8fafc', accent: '#facc15', stars: 1 },
    kit: { pattern: 'solid_trim', c1: '#0e6b38', c2: '#094a26', shorts: '#f8fafc', socks: '#0e6b38', gk: '#0284c7', gk2: '#075985', awayC1: '#f8fafc', awayC2: '#0e6b38', awayShorts: '#0e6b38', awaySocks: '#f8fafc' },
    players: [
      { num: 21, name: 'Weverton', role: 'GOL', skin: 'dark', hair: 'bald', hairColor: '#3c200e', beard: true, boots: '#84cc16', ovr: 82 },
      { num: 15, name: 'G. Gómez', role: 'ZAG', skin: 'olive', hair: 'short_fade', hairColor: '#1f1713', beard: true, boots: '#facc15', ovr: 83 },
      { num: 8, name: 'Richard Ríos', role: 'MEI', skin: 'tan', hair: 'curly_tips', hairColor: '#1b1512', boots: '#ec4899', ovr: 82 },
      { num: 23, name: 'R. Veiga', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#3a271c', boots: '#f8fafc', ovr: 84 },
      { num: 41, name: 'Estêvão', role: 'ATA', skin: 'brown', hair: 'curly_afro', hairColor: '#161210', boots: '#22c55e', ovr: 85 }
    ],
    bench: [
      { num: 9, name: 'Vitor Roque', role: 'ATA', skin: 'tan', hair: 'short_fade', hairColor: '#1a1512', boots: '#f97316', ovr: 83 },
      { num: 10, name: 'Paulinho', role: 'ATA', skin: 'brown', hair: 'curly_afro', hairColor: '#161210', boots: '#ef4444', ovr: 82 },
      { num: 18, name: 'Maurício', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#3a271c', boots: '#38bdf8', ovr: 80 },
      { num: 26, name: 'Murilo', role: 'ZAG', skin: 'fair', hair: 'platinum_fade', hairColor: '#f5f5f4', boots: '#facc15', ovr: 81 },
      { num: 14, name: 'M. Lomba', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#4c3425', boots: '#f8fafc', ovr: 77 }
    ]
  },
  {
    id: 'botafogo', leagueId: 'brasileirao', name: 'Botafogo', abbr: 'BOT', ovr: 82,
    crest: { pattern: 'shield_star', primary: '#141414', secondary: '#f8fafc', accent: '#f8fafc', stars: 1 },
    kit: { pattern: 'stripes_v', c1: '#141414', c2: '#f8fafc', shorts: '#141414', socks: '#141414', gk: '#15803d', gk2: '#14532d', awayC1: '#1e293b', awayC2: '#334155', awayShorts: '#f8fafc', awaySocks: '#1e293b' },
    players: [
      { num: 12, name: 'John', role: 'GOL', skin: 'tan', hair: 'short_fade', hairColor: '#1a1512', boots: '#f8fafc', ovr: 82 },
      { num: 15, name: 'Bastos', role: 'ZAG', skin: 'dark', hair: 'short_fade', hairColor: '#141110', boots: '#facc15', ovr: 81 },
      { num: 10, name: 'Savarino', role: 'MEI', skin: 'tan', hair: 'curly_afro', hairColor: '#1e1714', boots: '#06b6d4', ovr: 83 },
      { num: 17, name: 'M. Freitas', role: 'MEI', skin: 'brown', hair: 'short_fade', hairColor: '#191412', beard: true, boots: '#22c55e', ovr: 81 },
      { num: 99, name: 'Igor Jesus', role: 'ATA', skin: 'brown', hair: 'dreads', hairColor: '#181412', beard: true, boots: '#facc15', ovr: 83 }
    ],
    bench: [
      { num: 11, name: 'M. Martins', role: 'ATA', skin: 'brown', hair: 'short_fade', hairColor: '#161210', boots: '#f43f5e', ovr: 79 },
      { num: 26, name: 'Gregore', role: 'MEI', skin: 'olive', hair: 'bald', hairColor: '#3c200e', beard: true, boots: '#f8fafc', ovr: 80 },
      { num: 20, name: 'Barboza', role: 'ZAG', skin: 'fair', hair: 'shaggy', hairColor: '#2c1f19', beard: true, boots: '#111827', ovr: 80 },
      { num: 7, name: 'Artur', role: 'ATA', skin: 'tan', hair: 'platinum_fade', hairColor: '#f5f5f4', boots: '#facc15', ovr: 80 },
      { num: 24, name: 'Léo Linck', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#38bdf8', ovr: 76 }
    ]
  },
  {
    id: 'saopaulo', leagueId: 'brasileirao', name: 'São Paulo', abbr: 'SAO', ovr: 81,
    crest: { pattern: 'shield_tricolor', primary: '#dc2626', secondary: '#111827', accent: '#f8fafc', stars: 3 },
    kit: { pattern: 'chest_band', c1: '#f8fafc', c2: '#dc2626', c3: '#111827', shorts: '#f8fafc', socks: '#f8fafc', gk: '#0e7490', gk2: '#164e63', awayC1: '#dc2626', awayC2: '#111827', awayShorts: '#111827', awaySocks: '#111827' },
    players: [
      { num: 23, name: 'Rafael', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#3d2b22', boots: '#f97316', ovr: 80 },
      { num: 5, name: 'Arboleda', role: 'ZAG', skin: 'dark', hair: 'platinum_fade', hairColor: '#f5f5f4', boots: '#eab308', ovr: 81 },
      { num: 8, name: 'Oscar', role: 'MEI', skin: 'olive', hair: 'short_parted', hairColor: '#261b16', boots: '#38bdf8', ovr: 83 },
      { num: 7, name: 'Lucas Moura', role: 'MEI', skin: 'brown', hair: 'bald', hairColor: '#6a3c1c', beard: true, boots: '#ef4444', ovr: 83 },
      { num: 9, name: 'Calleri', role: 'ATA', skin: 'fair', hair: 'shaggy', hairColor: '#563a28', beard: true, boots: '#111827', headband: '#dc2626', ovr: 81 }
    ],
    bench: [
      { num: 10, name: 'Luciano', role: 'ATA', skin: 'tan', hair: 'short_fade', hairColor: '#211915', beard: true, boots: '#f8fafc', ovr: 80 },
      { num: 11, name: 'Ferreira', role: 'ATA', skin: 'olive', hair: 'short_fade', hairColor: '#261b16', boots: '#22c55e', ovr: 79 },
      { num: 29, name: 'Pablo Maia', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#facc15', ovr: 79 },
      { num: 4, name: 'Alan Franco', role: 'ZAG', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', beard: true, boots: '#f8fafc', ovr: 79 },
      { num: 93, name: 'Jandrei', role: 'GOL', skin: 'fair', hair: 'short_fade', hairColor: '#3b281e', beard: true, boots: '#ef4444', ovr: 75 }
    ]
  },
  {
    id: 'fluminense', leagueId: 'brasileirao', name: 'Fluminense', abbr: 'FLU', ovr: 80,
    crest: { pattern: 'shield_tricolor', primary: '#7c1d34', secondary: '#006847', accent: '#f8fafc', stars: 1 },
    kit: { pattern: 'tricolor_v', c1: '#7c1d34', c2: '#006847', c3: '#f8fafc', shorts: '#f8fafc', socks: '#7c1d34', gk: '#334155', gk2: '#1e293b', awayC1: '#f8fafc', awayC2: '#7c1d34', awayShorts: '#7c1d34', awaySocks: '#f8fafc' },
    players: [
      { num: 1, name: 'Fábio', role: 'GOL', skin: 'olive', hair: 'silver_short', hairColor: '#e2e8f0', beard: true, boots: '#0f172a', ovr: 81 },
      { num: 3, name: 'Thiago Silva', role: 'ZAG', skin: 'brown', hair: 'silver_fade', hairColor: '#cbd5e1', beard: true, boots: '#facc15', ovr: 83 },
      { num: 10, name: 'Ganso', role: 'MEI', skin: 'olive', hair: 'short_parted', hairColor: '#251c18', beard: true, boots: '#38bdf8', ovr: 80 },
      { num: 21, name: 'Jhon Arias', role: 'MEI', skin: 'brown', hair: 'short_fade', hairColor: '#171412', boots: '#f97316', ovr: 82 },
      { num: 14, name: 'Germán Cano', role: 'ATA', skin: 'fair', hair: 'shaggy', hairColor: '#4c3425', boots: '#ef4444', ovr: 80 }
    ],
    bench: [
      { num: 9, name: 'Everaldo', role: 'ATA', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', boots: '#22c55e', ovr: 78 },
      { num: 11, name: 'Keno', role: 'ATA', skin: 'brown', hair: 'short_fade', hairColor: '#161210', boots: '#facc15', ovr: 78 },
      { num: 8, name: 'Martinelli', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#38bdf8', ovr: 78 },
      { num: 2, name: 'S. Xavier', role: 'ZAG', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', boots: '#f8fafc', ovr: 77 },
      { num: 98, name: 'Vitor Eudes', role: 'GOL', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', boots: '#f97316', ovr: 75 }
    ]
  },
  {
    id: 'cruzeiro', leagueId: 'brasileirao', name: 'Cruzeiro', abbr: 'CRU', ovr: 80,
    crest: { pattern: 'shield_circle', primary: '#1d4ed8', secondary: '#f8fafc', accent: '#facc15', stars: 5 },
    kit: { pattern: 'solid_trim', c1: '#1d4ed8', c2: '#1e3a8a', shorts: '#f8fafc', socks: '#1d4ed8', gk: '#eab308', gk2: '#ca8a04', awayC1: '#f8fafc', awayC2: '#1d4ed8', awayShorts: '#1d4ed8', awaySocks: '#f8fafc' },
    players: [
      { num: 1, name: 'Cássio', role: 'GOL', skin: 'fair', hair: 'shaggy', hairColor: '#2c1f19', beard: true, boots: '#f8fafc', ovr: 80 },
      { num: 15, name: 'F. Bruno', role: 'ZAG', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#38bdf8', ovr: 81 },
      { num: 10, name: 'M. Pereira', role: 'MEI', skin: 'olive', hair: 'short_parted', hairColor: '#2d2018', beard: true, boots: '#facc15', ovr: 83 },
      { num: 8, name: 'M. Henrique', role: 'MEI', skin: 'tan', hair: 'curly_afro', hairColor: '#181412', boots: '#f97316', ovr: 80 },
      { num: 9, name: 'Gabigol', role: 'ATA', skin: 'olive', hair: 'platinum_fade', hairColor: '#f5f5f4', beard: true, boots: '#22c55e', ovr: 81 }
    ],
    bench: [
      { num: 19, name: 'Kaio Jorge', role: 'ATA', skin: 'tan', hair: 'platinum_fade', hairColor: '#f5f5f4', boots: '#22c55e', ovr: 79 },
      { num: 7, name: 'Dudu', role: 'ATA', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', boots: '#facc15', ovr: 80 },
      { num: 29, name: 'L. Romero', role: 'MEI', skin: 'olive', hair: 'short_fade', hairColor: '#211915', boots: '#f97316', ovr: 78 },
      { num: 43, name: 'João Marcelo', role: 'ZAG', skin: 'brown', hair: 'short_fade', hairColor: '#191412', boots: '#38bdf8', ovr: 78 },
      { num: 81, name: 'Léo Aragão', role: 'GOL', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', boots: '#f8fafc', ovr: 75 }
    ]
  },
  {
    id: 'atleticomg', leagueId: 'brasileirao', name: 'Atlético-MG', abbr: 'CAM', ovr: 81,
    crest: { pattern: 'shield_stripes', primary: '#111111', secondary: '#f8fafc', accent: '#facc15', stars: 1 },
    kit: { pattern: 'stripes_v', c1: '#111111', c2: '#f8fafc', shorts: '#111111', socks: '#111111', gk: '#0ea5e9', gk2: '#0369a1', awayC1: '#f8fafc', awayC2: '#111111', awayShorts: '#f8fafc', awaySocks: '#f8fafc' },
    players: [
      { num: 22, name: 'Everson', role: 'GOL', skin: 'olive', hair: 'short_fade', hairColor: '#261b16', boots: '#facc15', ovr: 80 },
      { num: 8, name: 'J. Alonso', role: 'ZAG', skin: 'olive', hair: 'short_fade', hairColor: '#1c1714', beard: true, boots: '#f8fafc', ovr: 80 },
      { num: 13, name: 'G. Arana', role: 'MEI', skin: 'brown', hair: 'short_fade', hairColor: '#191412', boots: '#38bdf8', ovr: 82 },
      { num: 10, name: 'G. Scarpa', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#22c55e', ovr: 82 },
      { num: 7, name: 'Hulk', role: 'ATA', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', beard: true, boots: '#f97316', ovr: 84 }
    ],
    bench: [
      { num: 33, name: 'Rony', role: 'ATA', skin: 'brown', hair: 'short_fade', hairColor: '#161210', boots: '#ef4444', ovr: 79 },
      { num: 28, name: 'Cuello', role: 'ATA', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#facc15', ovr: 78 },
      { num: 23, name: 'Alan Franco', role: 'MEI', skin: 'dark', hair: 'short_fade', hairColor: '#141110', boots: '#22c55e', ovr: 79 },
      { num: 4, name: 'Lyanco', role: 'ZAG', skin: 'fair', hair: 'short_fade', hairColor: '#1c1714', beard: true, boots: '#f8fafc', ovr: 79 },
      { num: 31, name: 'M. Mendes', role: 'GOL', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', boots: '#0ea5e9', ovr: 76 }
    ]
  },
  {
    id: 'paysandu', leagueId: 'brasileirao', name: 'Paysandu', abbr: 'PAY', ovr: 75,
    crest: { pattern: 'shield_stripes', primary: '#0284c7', secondary: '#f8fafc', accent: '#facc15', stars: 2 },
    kit: { pattern: 'stripes_v', c1: '#0284c7', c2: '#f8fafc', shorts: '#f8fafc', socks: '#0284c7', gk: '#ea580c', gk2: '#9a3412', awayC1: '#0c4a6e', awayC2: '#0284c7', awayShorts: '#0c4a6e', awaySocks: '#f8fafc' },
    players: [
      { num: 1, name: 'Matheus N.', role: 'GOL', skin: 'tan', hair: 'short_parted', hairColor: '#2c2019', boots: '#facc15', ovr: 75 },
      { num: 4, name: 'Quintana', role: 'ZAG', skin: 'olive', hair: 'short_fade', hairColor: '#1f1713', boots: '#38bdf8', ovr: 74 },
      { num: 5, name: 'Matheus V.', role: 'MEI', skin: 'olive', hair: 'short_fade', hairColor: '#261b16', beard: true, boots: '#f8fafc', ovr: 75 },
      { num: 10, name: 'Giovanni', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#84cc16', ovr: 75 },
      { num: 9, name: 'Nicolas', role: 'ATA', skin: 'fair', hair: 'shaggy', hairColor: '#8d6539', beard: true, boots: '#0ea5e9', ovr: 77 }
    ],
    bench: [
      { num: 11, name: 'Rossi P.', role: 'ATA', skin: 'olive', hair: 'short_fade', hairColor: '#261b16', boots: '#facc15', ovr: 74 },
      { num: 7, name: 'Borasi', role: 'ATA', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#22c55e', ovr: 74 },
      { num: 8, name: 'Leandro V.', role: 'MEI', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', boots: '#38bdf8', ovr: 73 },
      { num: 3, name: 'Luan Freitas', role: 'ZAG', skin: 'brown', hair: 'short_fade', hairColor: '#181412', boots: '#f8fafc', ovr: 73 },
      { num: 12, name: 'Alisson', role: 'GOL', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', boots: '#ea580c', ovr: 72 }
    ]
  },

  // ================= LA LIGA =================
  {
    id: 'realmadrid', leagueId: 'laliga', name: 'Real Madrid', abbr: 'RMA', ovr: 89,
    kit: { pattern: 'solid_trim', c1: '#f8fafc', c2: '#eab308', shorts: '#f8fafc', socks: '#f8fafc', gk: '#22c55e', gk2: '#15803d', awayC1: '#f97316', awayC2: '#111827', awayShorts: '#f97316', awaySocks: '#f97316' },
    players: [
      { num: 1, name: 'Courtois', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', beard: true, boots: '#38bdf8', ovr: 89 },
      { num: 22, name: 'Rüdiger', role: 'ZAG', skin: 'dark', hair: 'short_fade', hairColor: '#141110', beard: true, boots: '#facc15', ovr: 88 },
      { num: 5, name: 'Bellingham', role: 'MEI', skin: 'brown', hair: 'curly_afro', hairColor: '#181412', boots: '#f8fafc', ovr: 90 },
      { num: 7, name: 'Vini Jr.', role: 'MEI', skin: 'dark', hair: 'dreads', hairColor: '#141110', boots: '#ec4899', ovr: 90 },
      { num: 9, name: 'Mbappé', role: 'ATA', skin: 'brown', hair: 'short_fade', hairColor: '#161210', boots: '#f97316', ovr: 91 }
    ]
  },
  {
    id: 'barcelona', leagueId: 'laliga', name: 'Barcelona', abbr: 'FCB', ovr: 87,
    kit: { pattern: 'stripes_v', c1: '#1d4ed8', c2: '#b91c1c', shorts: '#1e3a8a', socks: '#b91c1c', gk: '#22c55e', gk2: '#14532d', awayC1: '#111827', awayC2: '#b91c1c', awayShorts: '#111827', awaySocks: '#111827' },
    players: [
      { num: 1, name: 'Ter Stegen', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#7c5c3e', beard: true, boots: '#f8fafc', ovr: 87 },
      { num: 4, name: 'Araújo', role: 'ZAG', skin: 'brown', hair: 'platinum_fade', hairColor: '#f5f5f4', boots: '#22c55e', ovr: 86 },
      { num: 8, name: 'Pedri', role: 'MEI', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', boots: '#f97316', ovr: 87 },
      { num: 19, name: 'Lamine Yamal', role: 'MEI', skin: 'brown', hair: 'curly_tips', hairColor: '#181412', boots: '#ec4899', ovr: 86 },
      { num: 9, name: 'Lewandowski', role: 'ATA', skin: 'fair', hair: 'short_parted', hairColor: '#3a271c', boots: '#ef4444', ovr: 88 }
    ]
  },
  {
    id: 'atleticomadrid', leagueId: 'laliga', name: 'Atlético Madrid', abbr: 'ATM', ovr: 84,
    kit: { pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#1e3a8a', socks: '#dc2626', gk: '#eab308', gk2: '#a16207', awayC1: '#1e293b', awayC2: '#38bdf8', awayShorts: '#1e293b', awaySocks: '#1e293b' },
    players: [
      { num: 13, name: 'Oblak', role: 'GOL', skin: 'fair', hair: 'short_fade', hairColor: '#261b16', beard: true, boots: '#f8fafc', ovr: 87 },
      { num: 2, name: 'Giménez', role: 'ZAG', skin: 'olive', hair: 'short_fade', hairColor: '#1f1713', boots: '#facc15', ovr: 83 },
      { num: 5, name: 'De Paul', role: 'MEI', skin: 'olive', hair: 'platinum_fade', hairColor: '#fef08a', beard: true, boots: '#38bdf8', ovr: 84 },
      { num: 7, name: 'Griezmann', role: 'MEI', skin: 'fair', hair: 'shaggy', hairColor: '#8d6539', boots: '#ec4899', ovr: 86 },
      { num: 19, name: 'Julián Álvarez', role: 'ATA', skin: 'fair', hair: 'short_parted', hairColor: '#3d2b22', boots: '#22c55e', ovr: 85 }
    ]
  },
  {
    id: 'bilbao', leagueId: 'laliga', name: 'Athletic Bilbao', abbr: 'ATH', ovr: 81,
    kit: { pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#111827', socks: '#111827', gk: '#0ea5e9', gk2: '#0369a1', awayC1: '#1e3a8a', awayC2: '#f8fafc', awayShorts: '#1e3a8a', awaySocks: '#1e3a8a' },
    players: [
      { num: 1, name: 'Unai Simón', role: 'GOL', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', beard: true, boots: '#f97316', ovr: 82 },
      { num: 3, name: 'Vivian', role: 'ZAG', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#f8fafc', ovr: 81 },
      { num: 8, name: 'Sancet', role: 'MEI', skin: 'fair', hair: 'short_fade', hairColor: '#4c3425', boots: '#22c55e', ovr: 82 },
      { num: 10, name: 'Nico Williams', role: 'MEI', skin: 'dark', hair: 'curly_afro', hairColor: '#141110', boots: '#facc15', ovr: 84 },
      { num: 9, name: 'Iñaki Williams', role: 'ATA', skin: 'dark', hair: 'short_fade', hairColor: '#141110', beard: true, boots: '#ef4444', ovr: 82 }
    ]
  },

  // ================= PREMIER LEAGUE =================
  {
    id: 'mancity', leagueId: 'premier', name: 'Man. City', abbr: 'MCI', ovr: 88,
    kit: { pattern: 'solid_trim', c1: '#38bdf8', c2: '#0284c7', shorts: '#f8fafc', socks: '#38bdf8', gk: '#f97316', gk2: '#c2410c', awayC1: '#1e293b', awayC2: '#eab308', awayShorts: '#1e293b', awaySocks: '#1e293b' },
    players: [
      { num: 31, name: 'Ederson', role: 'GOL', skin: 'tan', hair: 'bald', hairColor: '#9b6236', beard: true, boots: '#22c55e', ovr: 87 },
      { num: 3, name: 'Rúben Dias', role: 'ZAG', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', beard: true, boots: '#f8fafc', ovr: 88 },
      { num: 16, name: 'Rodri', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#3a271c', boots: '#0ea5e9', ovr: 91 },
      { num: 47, name: 'Foden', role: 'MEI', skin: 'fair', hair: 'platinum_fade', hairColor: '#e2e8f0', boots: '#ec4899', ovr: 88 },
      { num: 9, name: 'Haaland', role: 'ATA', skin: 'fair', hair: 'shaggy', hairColor: '#facc15', boots: '#f97316', ovr: 91 }
    ]
  },
  {
    id: 'arsenal', leagueId: 'premier', name: 'Arsenal', abbr: 'ARS', ovr: 86,
    kit: { pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc', socks: '#dc2626', gk: '#22c55e', gk2: '#15803d', awayC1: '#111827', awayC2: '#dc2626', awayShorts: '#111827', awaySocks: '#111827' },
    players: [
      { num: 22, name: 'Raya', role: 'GOL', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', beard: true, boots: '#facc15', ovr: 84 },
      { num: 2, name: 'Saliba', role: 'ZAG', skin: 'brown', hair: 'short_fade', hairColor: '#181412', boots: '#f8fafc', ovr: 87 },
      { num: 41, name: 'Declan Rice', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#38bdf8', ovr: 87 },
      { num: 8, name: 'Ødegaard', role: 'MEI', skin: 'fair', hair: 'shaggy', hairColor: '#a17a48', beard: true, boots: '#f97316', ovr: 88 },
      { num: 7, name: 'Saka', role: 'ATA', skin: 'dark', hair: 'curly_afro', hairColor: '#141110', boots: '#22c55e', ovr: 87 }
    ]
  },
  {
    id: 'liverpool', leagueId: 'premier', name: 'Liverpool', abbr: 'LIV', ovr: 87,
    kit: { pattern: 'solid_trim', c1: '#b91c1c', c2: '#7f1d1d', shorts: '#b91c1c', socks: '#b91c1c', gk: '#84cc16', gk2: '#4d7c0f', awayC1: '#1e293b', awayC2: '#22c55e', awayShorts: '#1e293b', awaySocks: '#1e293b' },
    players: [
      { num: 1, name: 'Alisson', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#3d2b22', beard: true, boots: '#f8fafc', ovr: 88 },
      { num: 4, name: 'Van Dijk', role: 'ZAG', skin: 'brown', hair: 'short_fade', hairColor: '#181412', beard: true, boots: '#38bdf8', ovr: 89 },
      { num: 10, name: 'Mac Allister', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#7c4c2c', beard: true, boots: '#facc15', ovr: 86 },
      { num: 7, name: 'Luis Díaz', role: 'MEI', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', boots: '#ec4899', ovr: 85 },
      { num: 11, name: 'Salah', role: 'ATA', skin: 'olive', hair: 'curly_afro', hairColor: '#1b1512', beard: true, boots: '#ef4444', ovr: 89 }
    ]
  },
  {
    id: 'chelsea', leagueId: 'premier', name: 'Chelsea', abbr: 'CHE', ovr: 83,
    kit: { pattern: 'solid_trim', c1: '#1d4ed8', c2: '#1e40af', shorts: '#1d4ed8', socks: '#f8fafc', gk: '#eab308', gk2: '#a16207', awayC1: '#f8fafc', awayC2: '#f97316', awayShorts: '#f8fafc', awaySocks: '#f8fafc' },
    players: [
      { num: 1, name: 'R. Sánchez', role: 'GOL', skin: 'olive', hair: 'short_fade', hairColor: '#261b16', boots: '#22c55e', ovr: 80 },
      { num: 6, name: 'Colwill', role: 'ZAG', skin: 'brown', hair: 'curly_afro', hairColor: '#161210', boots: '#f8fafc', ovr: 81 },
      { num: 25, name: 'Caicedo', role: 'MEI', skin: 'dark', hair: 'short_fade', hairColor: '#141110', boots: '#38bdf8', ovr: 83 },
      { num: 20, name: 'Cole Palmer', role: 'MEI', skin: 'fair', hair: 'short_fade', hairColor: '#5c422c', boots: '#facc15', ovr: 86 },
      { num: 15, name: 'N. Jackson', role: 'ATA', skin: 'dark', hair: 'dreads', hairColor: '#141110', boots: '#f43f5e', ovr: 82 }
    ]
  },

  // ================= BUNDESLIGA =================
  {
    id: 'bayern', leagueId: 'bundesliga', name: 'Bayern Munich', abbr: 'BAY', ovr: 87,
    kit: { pattern: 'solid_trim', c1: '#dc2626', c2: '#991b1b', shorts: '#dc2626', socks: '#dc2626', gk: '#38bdf8', gk2: '#0284c7', awayC1: '#111827', awayC2: '#dc2626', awayShorts: '#111827', awaySocks: '#111827' },
    players: [
      { num: 1, name: 'Neuer', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#6b4f3b', boots: '#f8fafc', ovr: 86 },
      { num: 2, name: 'Upamecano', role: 'ZAG', skin: 'dark', hair: 'bald', hairColor: '#3c200e', boots: '#facc15', ovr: 84 },
      { num: 6, name: 'Kimmich', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#4c3425', beard: true, boots: '#22c55e', ovr: 87 },
      { num: 42, name: 'Musiala', role: 'MEI', skin: 'brown', hair: 'curly_afro', hairColor: '#181412', boots: '#ec4899', ovr: 87 },
      { num: 9, name: 'Harry Kane', role: 'ATA', skin: 'fair', hair: 'short_parted', hairColor: '#7c5c3e', beard: true, boots: '#38bdf8', ovr: 90 }
    ]
  },
  {
    id: 'leverkusen', leagueId: 'bundesliga', name: 'Bayer Leverkusen', abbr: 'LEV', ovr: 85,
    kit: { pattern: 'sash', c1: '#141414', c2: '#dc2626', shorts: '#141414', socks: '#141414', gk: '#eab308', gk2: '#ca8a04', awayC1: '#f8fafc', awayC2: '#dc2626', awayShorts: '#f8fafc', awaySocks: '#f8fafc' },
    players: [
      { num: 1, name: 'Hradecky', role: 'GOL', skin: 'fair', hair: 'short_fade', hairColor: '#523828', boots: '#f8fafc', ovr: 83 },
      { num: 4, name: 'Tah', role: 'ZAG', skin: 'brown', hair: 'short_fade', hairColor: '#181412', beard: true, boots: '#facc15', ovr: 85 },
      { num: 34, name: 'Xhaka', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#2c1f19', beard: true, boots: '#ef4444', ovr: 86 },
      { num: 10, name: 'Wirtz', role: 'MEI', skin: 'fair', hair: 'short_fade', hairColor: '#6b4f3b', boots: '#22c55e', ovr: 88 },
      { num: 22, name: 'Boniface', role: 'ATA', skin: 'dark', hair: 'platinum_fade', hairColor: '#f5f5f4', boots: '#f97316', ovr: 84 }
    ]
  },
  {
    id: 'dortmund', leagueId: 'bundesliga', name: 'B. Dortmund', abbr: 'BVB', ovr: 84,
    kit: { pattern: 'solid_trim', c1: '#facc15', c2: '#111827', shorts: '#111827', socks: '#facc15', gk: '#0284c7', gk2: '#075985', awayC1: '#111827', awayC2: '#facc15', awayShorts: '#111827', awaySocks: '#111827' },
    players: [
      { num: 1, name: 'Kobel', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#f8fafc', ovr: 86 },
      { num: 4, name: 'Schlotterbeck', role: 'ZAG', skin: 'fair', hair: 'short_parted', hairColor: '#4c3425', boots: '#facc15', ovr: 83 },
      { num: 10, name: 'Brandt', role: 'MEI', skin: 'fair', hair: 'shaggy', hairColor: '#d4a359', boots: '#38bdf8', ovr: 84 },
      { num: 27, name: 'Adeyemi', role: 'MEI', skin: 'brown', hair: 'dreads', hairColor: '#181412', boots: '#ec4899', ovr: 82 },
      { num: 9, name: 'Guirassy', role: 'ATA', skin: 'dark', hair: 'short_fade', hairColor: '#141110', beard: true, boots: '#22c55e', ovr: 84 }
    ]
  },
  {
    id: 'leipzig', leagueId: 'bundesliga', name: 'RB Leipzig', abbr: 'RBL', ovr: 82,
    kit: { pattern: 'solid_trim', c1: '#f8fafc', c2: '#dc2626', shorts: '#dc2626', socks: '#f8fafc', gk: '#15803d', gk2: '#14532d', awayC1: '#1e3a8a', awayC2: '#dc2626', awayShorts: '#1e3a8a', awaySocks: '#1e3a8a' },
    players: [
      { num: 1, name: 'Gulácsi', role: 'GOL', skin: 'fair', hair: 'short_fade', hairColor: '#3b281e', beard: true, boots: '#f97316', ovr: 82 },
      { num: 4, name: 'Orbán', role: 'ZAG', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', beard: true, boots: '#f8fafc', ovr: 82 },
      { num: 10, name: 'Xavi Simons', role: 'MEI', skin: 'brown', hair: 'dreads', hairColor: '#181412', boots: '#facc15', ovr: 84 },
      { num: 11, name: 'Openda', role: 'MEI', skin: 'dark', hair: 'short_fade', hairColor: '#141110', boots: '#22c55e', ovr: 83 },
      { num: 30, name: 'Šeško', role: 'ATA', skin: 'fair', hair: 'short_parted', hairColor: '#4c3425', boots: '#ef4444', ovr: 82 }
    ]
  },

  // ================= CAMPEONATO ARGENTINO =================
  {
    id: 'river', leagueId: 'argentina', name: 'River Plate', abbr: 'RIV', ovr: 81,
    kit: { pattern: 'sash', c1: '#f8fafc', c2: '#dc2626', shorts: '#111827', socks: '#f8fafc', gk: '#22c55e', gk2: '#15803d', awayC1: '#111827', awayC2: '#dc2626', awayShorts: '#111827', awaySocks: '#111827' },
    players: [
      { num: 1, name: 'Armani', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#4c3425', beard: true, boots: '#f8fafc', ovr: 81 },
      { num: 6, name: 'Pezzella', role: 'ZAG', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', beard: true, boots: '#facc15', ovr: 81 },
      { num: 8, name: 'Meza', role: 'MEI', skin: 'olive', hair: 'short_fade', hairColor: '#1f1713', boots: '#38bdf8', ovr: 79 },
      { num: 10, name: 'Lanzini', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#ef4444', ovr: 79 },
      { num: 9, name: 'Borja', role: 'ATA', skin: 'brown', hair: 'platinum_fade', hairColor: '#f5f5f4', beard: true, boots: '#22c55e', ovr: 81 }
    ]
  },
  {
    id: 'boca', leagueId: 'argentina', name: 'Boca Juniors', abbr: 'BOC', ovr: 80,
    kit: { pattern: 'chest_band', c1: '#1e3a8a', c2: '#facc15', c3: '#facc15', shorts: '#1e3a8a', socks: '#1e3a8a', gk: '#f97316', gk2: '#c2410c', awayC1: '#facc15', awayC2: '#1e3a8a', awayShorts: '#facc15', awaySocks: '#facc15' },
    players: [
      { num: 1, name: 'Romero', role: 'GOL', skin: 'olive', hair: 'shaggy', hairColor: '#261b16', beard: true, boots: '#f8fafc', ovr: 79 },
      { num: 6, name: 'Marcos Rojo', role: 'ZAG', skin: 'olive', hair: 'mohawk', hairColor: '#1f1713', beard: true, boots: '#facc15', ovr: 80 },
      { num: 8, name: 'G. Fernández', role: 'MEI', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', boots: '#38bdf8', ovr: 78 },
      { num: 19, name: 'Zenón', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#22c55e', ovr: 79 },
      { num: 10, name: 'Cavani', role: 'ATA', skin: 'olive', hair: 'shaggy', hairColor: '#1f1713', beard: true, boots: '#0ea5e9', headband: '#1e3a8a', ovr: 82 }
    ]
  },
  {
    id: 'racing', leagueId: 'argentina', name: 'Racing Club', abbr: 'RAC', ovr: 79,
    kit: { pattern: 'stripes_v', c1: '#38bdf8', c2: '#f8fafc', shorts: '#111827', socks: '#f8fafc', gk: '#eab308', gk2: '#a16207', awayC1: '#1e3a8a', awayC2: '#38bdf8', awayShorts: '#1e3a8a', awaySocks: '#1e3a8a' },
    players: [
      { num: 21, name: 'Arias', role: 'GOL', skin: 'olive', hair: 'short_fade', hairColor: '#261b16', boots: '#f8fafc', ovr: 79 },
      { num: 3, name: 'Di Cesare', role: 'ZAG', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#facc15', ovr: 78 },
      { num: 8, name: 'Quintero', role: 'MEI', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', beard: true, boots: '#22c55e', ovr: 80 },
      { num: 32, name: 'Almendra', role: 'MEI', skin: 'brown', hair: 'short_fade', hairColor: '#181412', boots: '#ec4899', ovr: 78 },
      { num: 9, name: 'A. Martínez', role: 'ATA', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', beard: true, boots: '#ef4444', ovr: 80 }
    ]
  },
  {
    id: 'independiente', leagueId: 'argentina', name: 'Independiente', abbr: 'IND', ovr: 77,
    kit: { pattern: 'solid_trim', c1: '#dc2626', c2: '#991b1b', shorts: '#1e3a8a', socks: '#dc2626', gk: '#15803d', gk2: '#14532d', awayC1: '#f8fafc', awayC2: '#dc2626', awayShorts: '#f8fafc', awaySocks: '#f8fafc' },
    players: [
      { num: 33, name: 'Rey', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#facc15', ovr: 78 },
      { num: 26, name: 'Lomónaco', role: 'ZAG', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', boots: '#f8fafc', ovr: 77 },
      { num: 23, name: 'Marcone', role: 'MEI', skin: 'olive', hair: 'short_fade', hairColor: '#1f1713', beard: true, boots: '#38bdf8', ovr: 77 },
      { num: 10, name: 'L. Cabral', role: 'MEI', skin: 'olive', hair: 'short_parted', hairColor: '#261b16', boots: '#22c55e', ovr: 77 },
      { num: 9, name: 'Ávalos', role: 'ATA', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', beard: true, boots: '#f97316', ovr: 78 }
    ]
  },

  // ================= CAMPEONATO COLOMBIANO =================
  {
    id: 'atlnacional', leagueId: 'colombia', name: 'Atl. Nacional', abbr: 'ATN', ovr: 77,
    kit: { pattern: 'stripes_v', c1: '#15803d', c2: '#f8fafc', shorts: '#f8fafc', socks: '#15803d', gk: '#eab308', gk2: '#a16207', awayC1: '#111827', awayC2: '#22c55e', awayShorts: '#111827', awaySocks: '#111827' },
    players: [
      { num: 1, name: 'Ospina', role: 'GOL', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', beard: true, boots: '#f8fafc', ovr: 79 },
      { num: 16, name: 'Tesillo', role: 'ZAG', skin: 'brown', hair: 'short_fade', hairColor: '#181412', boots: '#facc15', ovr: 76 },
      { num: 10, name: 'Cardona', role: 'MEI', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', beard: true, boots: '#38bdf8', ovr: 78 },
      { num: 18, name: 'Hinestroza', role: 'MEI', skin: 'dark', hair: 'platinum_fade', hairColor: '#f5f5f4', boots: '#ec4899', ovr: 77 },
      { num: 9, name: 'Morelos', role: 'ATA', skin: 'brown', hair: 'short_fade', hairColor: '#181412', beard: true, boots: '#22c55e', ovr: 78 }
    ]
  },
  {
    id: 'millonarios', leagueId: 'colombia', name: 'Millonarios', abbr: 'MIL', ovr: 76,
    kit: { pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#f8fafc', socks: '#1d4ed8', gk: '#f97316', gk2: '#c2410c', awayC1: '#f8fafc', awayC2: '#1d4ed8', awayShorts: '#1d4ed8', awaySocks: '#f8fafc' },
    players: [
      { num: 31, name: 'Montero', role: 'GOL', skin: 'brown', hair: 'short_fade', hairColor: '#181412', boots: '#facc15', ovr: 77 },
      { num: 26, name: 'Llinás', role: 'ZAG', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#f8fafc', ovr: 76 },
      { num: 14, name: 'Mackalister', role: 'MEI', skin: 'olive', hair: 'silver_fade', hairColor: '#cbd5e1', beard: true, boots: '#38bdf8', ovr: 76 },
      { num: 10, name: 'Cataño', role: 'MEI', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', boots: '#22c55e', ovr: 76 },
      { num: 9, name: 'Falcao', role: 'ATA', skin: 'olive', hair: 'short_parted', hairColor: '#261b16', beard: true, boots: '#ef4444', ovr: 78 }
    ]
  },
  {
    id: 'americacali', leagueId: 'colombia', name: 'América de Cali', abbr: 'AMC', ovr: 75,
    kit: { pattern: 'solid_trim', c1: '#dc2626', c2: '#991b1b', shorts: '#dc2626', socks: '#dc2626', gk: '#0ea5e9', gk2: '#0369a1', awayC1: '#f8fafc', awayC2: '#dc2626', awayShorts: '#f8fafc', awaySocks: '#f8fafc' },
    players: [
      { num: 12, name: 'Soto', role: 'GOL', skin: 'olive', hair: 'short_fade', hairColor: '#261b16', boots: '#facc15', ovr: 75 },
      { num: 5, name: 'Mosquera', role: 'ZAG', skin: 'dark', hair: 'short_fade', hairColor: '#141110', boots: '#f8fafc', ovr: 75 },
      { num: 10, name: 'Vergara', role: 'MEI', skin: 'brown', hair: 'curly_afro', hairColor: '#181412', boots: '#22c55e', ovr: 77 },
      { num: 7, name: 'Barrios', role: 'MEI', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', boots: '#38bdf8', ovr: 75 },
      { num: 11, name: 'Holgado', role: 'ATA', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', beard: true, boots: '#f97316', ovr: 76 }
    ]
  },
  {
    id: 'junior', leagueId: 'colombia', name: 'Junior', abbr: 'JUN', ovr: 75,
    kit: { pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#1e3a8a', socks: '#f8fafc', gk: '#22c55e', gk2: '#15803d', awayC1: '#1e3a8a', awayC2: '#dc2626', awayShorts: '#1e3a8a', awaySocks: '#1e3a8a' },
    players: [
      { num: 77, name: 'Mele', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#f8fafc', ovr: 76 },
      { num: 18, name: 'Olivera', role: 'ZAG', skin: 'olive', hair: 'short_fade', hairColor: '#261b16', boots: '#facc15', ovr: 75 },
      { num: 8, name: 'Chará', role: 'MEI', skin: 'dark', hair: 'bald', hairColor: '#3c200e', boots: '#22c55e', ovr: 76 },
      { num: 99, name: 'Enamorado', role: 'MEI', skin: 'brown', hair: 'platinum_fade', hairColor: '#f5f5f4', boots: '#ec4899', ovr: 76 },
      { num: 70, name: 'Carlos Bacca', role: 'ATA', skin: 'brown', hair: 'short_fade', hairColor: '#181412', beard: true, boots: '#ef4444', ovr: 77 }
    ]
  },

  // ================= OUTRAS LIGAS =================
  {
    id: 'intermilan', leagueId: 'outras', name: 'Inter Milan', abbr: 'INT', ovr: 86,
    kit: { pattern: 'stripes_v', c1: '#1d4ed8', c2: '#111827', shorts: '#111827', socks: '#111827', gk: '#eab308', gk2: '#a16207', awayC1: '#f8fafc', awayC2: '#1d4ed8', awayShorts: '#f8fafc', awaySocks: '#f8fafc' },
    players: [
      { num: 1, name: 'Sommer', role: 'GOL', skin: 'fair', hair: 'shaggy', hairColor: '#4c3425', beard: true, boots: '#f8fafc', ovr: 86 },
      { num: 95, name: 'Bastoni', role: 'ZAG', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#38bdf8', ovr: 87 },
      { num: 23, name: 'Barella', role: 'MEI', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', beard: true, boots: '#facc15', ovr: 87 },
      { num: 20, name: 'Çalhanoğlu', role: 'MEI', skin: 'olive', hair: 'short_fade', hairColor: '#1f1713', beard: true, boots: '#22c55e', ovr: 86 },
      { num: 10, name: 'Lautaro', role: 'ATA', skin: 'olive', hair: 'short_fade', hairColor: '#1f1713', boots: '#ec4899', ovr: 89 }
    ]
  },
  {
    id: 'psg', leagueId: 'outras', name: 'PSG', abbr: 'PSG', ovr: 85,
    kit: { pattern: 'tricolor_v', c1: '#1e3a8a', c2: '#dc2626', c3: '#f8fafc', shorts: '#1e3a8a', socks: '#1e3a8a', gk: '#22c55e', gk2: '#15803d', awayC1: '#f8fafc', awayC2: '#1e3a8a', awayShorts: '#f8fafc', awaySocks: '#f8fafc' },
    players: [
      { num: 1, name: 'Donnarumma', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#2c1f19', beard: true, boots: '#f97316', ovr: 87 },
      { num: 5, name: 'Marquinhos', role: 'ZAG', skin: 'olive', hair: 'short_fade', hairColor: '#1f1713', boots: '#f8fafc', ovr: 86 },
      { num: 17, name: 'Vitinha', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', beard: true, boots: '#38bdf8', ovr: 85 },
      { num: 29, name: 'Barcola', role: 'MEI', skin: 'brown', hair: 'dreads', hairColor: '#181412', boots: '#facc15', ovr: 84 },
      { num: 10, name: 'Dembélé', role: 'ATA', skin: 'dark', hair: 'curly_afro', hairColor: '#141110', boots: '#ec4899', ovr: 86 }
    ]
  },
  {
    id: 'benfica', leagueId: 'outras', name: 'Benfica', abbr: 'BEN', ovr: 81,
    kit: { pattern: 'solid_trim', c1: '#dc2626', c2: '#991b1b', shorts: '#f8fafc', socks: '#dc2626', gk: '#0ea5e9', gk2: '#0369a1', awayC1: '#111827', awayC2: '#facc15', awayShorts: '#111827', awaySocks: '#111827' },
    players: [
      { num: 1, name: 'Trubin', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#6b4f3b', boots: '#f8fafc', ovr: 81 },
      { num: 30, name: 'Otamendi', role: 'ZAG', skin: 'olive', hair: 'short_fade', hairColor: '#1f1713', beard: true, boots: '#facc15', ovr: 81 },
      { num: 10, name: 'Kökçü', role: 'MEI', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', beard: true, boots: '#22c55e', ovr: 82 },
      { num: 11, name: 'Di María', role: 'MEI', skin: 'olive', hair: 'short_fade', hairColor: '#261b16', boots: '#38bdf8', ovr: 83 },
      { num: 14, name: 'Pavlidis', role: 'ATA', skin: 'fair', hair: 'short_parted', hairColor: '#2c1f19', beard: true, boots: '#f97316', ovr: 81 }
    ]
  },
  {
    id: 'alhilal', leagueId: 'outras', name: 'Al-Hilal', abbr: 'HIL', ovr: 81,
    kit: { pattern: 'solid_trim', c1: '#1d4ed8', c2: '#1e3a8a', shorts: '#1d4ed8', socks: '#1d4ed8', gk: '#eab308', gk2: '#a16207', awayC1: '#f8fafc', awayC2: '#1d4ed8', awayShorts: '#f8fafc', awaySocks: '#f8fafc' },
    players: [
      { num: 37, name: 'Bono', role: 'GOL', skin: 'olive', hair: 'short_fade', hairColor: '#1f1713', beard: true, boots: '#f8fafc', ovr: 83 },
      { num: 3, name: 'Koulibaly', role: 'ZAG', skin: 'dark', hair: 'bald', hairColor: '#3c200e', beard: true, boots: '#facc15', ovr: 83 },
      { num: 8, name: 'Rúben Neves', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', beard: true, boots: '#22c55e', ovr: 82 },
      { num: 10, name: 'Neymar Jr.', role: 'MEI', skin: 'tan', hair: 'mohawk', hairColor: '#1f1713', beard: true, boots: '#facc15', ovr: 85 },
      { num: 9, name: 'Mitrović', role: 'ATA', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', beard: true, boots: '#ef4444', ovr: 83 }
    ]
  },

  // ================= SELEÇÕES (COPA DO MUNDO - 8 seleções) =================
  {
    id: 'sel_brasil', leagueId: 'selecoes', name: 'Brasil', abbr: 'BRA', ovr: 86,
    kit: { pattern: 'solid_trim', c1: '#facc15', c2: '#16a34a', shorts: '#1d4ed8', socks: '#f8fafc', gk: '#0f172a', gk2: '#334155', awayC1: '#1d4ed8', awayC2: '#facc15', awayShorts: '#f8fafc', awaySocks: '#1d4ed8' },
    players: [
      { num: 1, name: 'Alisson', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#3d2b22', beard: true, boots: '#f8fafc', ovr: 88 },
      { num: 4, name: 'Marquinhos', role: 'ZAG', skin: 'olive', hair: 'short_fade', hairColor: '#1f1713', boots: '#38bdf8', ovr: 86 },
      { num: 5, name: 'B. Guimarães', role: 'MEI', skin: 'tan', hair: 'platinum_fade', hairColor: '#f5f5f4', boots: '#22c55e', ovr: 85 },
      { num: 10, name: 'Rodrygo', role: 'MEI', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', boots: '#f97316', ovr: 86 },
      { num: 7, name: 'Vini Jr.', role: 'ATA', skin: 'dark', hair: 'dreads', hairColor: '#141110', boots: '#ec4899', ovr: 90 }
    ]
  },
  {
    id: 'sel_argentina', leagueId: 'selecoes', name: 'Argentina', abbr: 'ARG', ovr: 87,
    kit: { pattern: 'stripes_v', c1: '#38bdf8', c2: '#f8fafc', shorts: '#111827', socks: '#f8fafc', gk: '#22c55e', gk2: '#15803d', awayC1: '#1e3a8a', awayC2: '#38bdf8', awayShorts: '#1e3a8a', awaySocks: '#1e3a8a' },
    players: [
      { num: 23, name: 'E. Martínez', role: 'GOL', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', beard: true, boots: '#facc15', ovr: 87 },
      { num: 13, name: 'C. Romero', role: 'ZAG', skin: 'olive', hair: 'short_fade', hairColor: '#1f1713', beard: true, boots: '#f8fafc', ovr: 86 },
      { num: 8, name: 'Enzo F.', role: 'MEI', skin: 'fair', hair: 'short_fade', hairColor: '#3b281e', boots: '#38bdf8', ovr: 84 },
      { num: 22, name: 'Lautaro', role: 'MEI', skin: 'olive', hair: 'short_fade', hairColor: '#1f1713', boots: '#ec4899', ovr: 88 },
      { num: 10, name: 'Messi', role: 'ATA', skin: 'fair', hair: 'short_parted', hairColor: '#2c1f19', beard: true, boots: '#facc15', ovr: 90 }
    ]
  },
  {
    id: 'sel_franca', leagueId: 'selecoes', name: 'França', abbr: 'FRA', ovr: 87,
    kit: { pattern: 'solid_trim', c1: '#1d4ed8', c2: '#dc2626', shorts: '#f8fafc', socks: '#dc2626', gk: '#eab308', gk2: '#a16207', awayC1: '#f8fafc', awayC2: '#1d4ed8', awayShorts: '#1d4ed8', awaySocks: '#f8fafc' },
    players: [
      { num: 16, name: 'Maignan', role: 'GOL', skin: 'dark', hair: 'short_fade', hairColor: '#141110', beard: true, boots: '#f8fafc', ovr: 86 },
      { num: 17, name: 'Saliba', role: 'ZAG', skin: 'brown', hair: 'short_fade', hairColor: '#181412', boots: '#38bdf8', ovr: 87 },
      { num: 8, name: 'Tchouaméni', role: 'MEI', skin: 'dark', hair: 'short_fade', hairColor: '#141110', boots: '#22c55e', ovr: 85 },
      { num: 7, name: 'Griezmann', role: 'MEI', skin: 'fair', hair: 'shaggy', hairColor: '#8d6539', boots: '#ec4899', ovr: 86 },
      { num: 10, name: 'Mbappé', role: 'ATA', skin: 'brown', hair: 'short_fade', hairColor: '#161210', boots: '#f97316', ovr: 91 }
    ]
  },
  {
    id: 'sel_espanha', leagueId: 'selecoes', name: 'Espanha', abbr: 'ESP', ovr: 86,
    kit: { pattern: 'solid_trim', c1: '#dc2626', c2: '#facc15', shorts: '#1e3a8a', socks: '#dc2626', gk: '#0ea5e9', gk2: '#0369a1', awayC1: '#fef08a', awayC2: '#dc2626', awayShorts: '#fef08a', awaySocks: '#fef08a' },
    players: [
      { num: 23, name: 'Unai Simón', role: 'GOL', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', beard: true, boots: '#f8fafc', ovr: 83 },
      { num: 14, name: 'Laporte', role: 'ZAG', skin: 'fair', hair: 'short_parted', hairColor: '#6b4f3b', beard: true, boots: '#facc15', ovr: 84 },
      { num: 16, name: 'Rodri', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#3a271c', boots: '#38bdf8', ovr: 91 },
      { num: 20, name: 'Pedri', role: 'MEI', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', boots: '#f97316', ovr: 87 },
      { num: 19, name: 'Lamine Yamal', role: 'ATA', skin: 'brown', hair: 'curly_tips', hairColor: '#181412', boots: '#ec4899', ovr: 86 }
    ]
  },
  {
    id: 'sel_inglaterra', leagueId: 'selecoes', name: 'Inglaterra', abbr: 'ING', ovr: 85,
    kit: { pattern: 'solid_trim', c1: '#f8fafc', c2: '#1e3a8a', shorts: '#1e3a8a', socks: '#f8fafc', gk: '#22c55e', gk2: '#15803d', awayC1: '#4c1d95', awayC2: '#facc15', awayShorts: '#4c1d95', awaySocks: '#4c1d95' },
    players: [
      { num: 1, name: 'Pickford', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#6b4f3b', boots: '#f97316', ovr: 83 },
      { num: 5, name: 'John Stones', role: 'ZAG', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#f8fafc', ovr: 85 },
      { num: 10, name: 'Bellingham', role: 'MEI', skin: 'brown', hair: 'curly_afro', hairColor: '#181412', boots: '#facc15', ovr: 90 },
      { num: 7, name: 'Saka', role: 'MEI', skin: 'dark', hair: 'curly_afro', hairColor: '#141110', boots: '#22c55e', ovr: 87 },
      { num: 9, name: 'Harry Kane', role: 'ATA', skin: 'fair', hair: 'short_parted', hairColor: '#7c5c3e', beard: true, boots: '#38bdf8', ovr: 90 }
    ]
  },
  {
    id: 'sel_alemanha', leagueId: 'selecoes', name: 'Alemanha', abbr: 'ALE', ovr: 85,
    kit: { pattern: 'chest_band', c1: '#f8fafc', c2: '#111827', c3: '#dc2626', shorts: '#111827', socks: '#f8fafc', gk: '#0ea5e9', gk2: '#0369a1', awayC1: '#ec4899', awayC2: '#4c1d95', awayShorts: '#4c1d95', awaySocks: '#ec4899' },
    players: [
      { num: 1, name: 'Ter Stegen', role: 'GOL', skin: 'fair', hair: 'short_parted', hairColor: '#7c5c3e', beard: true, boots: '#f8fafc', ovr: 87 },
      { num: 2, name: 'Rüdiger', role: 'ZAG', skin: 'dark', hair: 'short_fade', hairColor: '#141110', beard: true, boots: '#facc15', ovr: 88 },
      { num: 6, name: 'Kimmich', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#4c3425', beard: true, boots: '#22c55e', ovr: 87 },
      { num: 10, name: 'Musiala', role: 'MEI', skin: 'brown', hair: 'curly_afro', hairColor: '#181412', boots: '#ec4899', ovr: 87 },
      { num: 17, name: 'Wirtz', role: 'ATA', skin: 'fair', hair: 'short_fade', hairColor: '#6b4f3b', boots: '#38bdf8', ovr: 88 }
    ]
  },
  {
    id: 'sel_portugal', leagueId: 'selecoes', name: 'Portugal', abbr: 'POR', ovr: 84,
    kit: { pattern: 'solid_trim', c1: '#b91c1c', c2: '#15803d', shorts: '#15803d', socks: '#b91c1c', gk: '#eab308', gk2: '#a16207', awayC1: '#f8fafc', awayC2: '#0284c7', awayShorts: '#1e3a8a', awaySocks: '#f8fafc' },
    players: [
      { num: 22, name: 'Diogo Costa', role: 'GOL', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', beard: true, boots: '#f8fafc', ovr: 84 },
      { num: 3, name: 'Rúben Dias', role: 'ZAG', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', beard: true, boots: '#facc15', ovr: 88 },
      { num: 8, name: 'B. Fernandes', role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#2c1f19', beard: true, boots: '#38bdf8', ovr: 86 },
      { num: 17, name: 'Rafael Leão', role: 'MEI', skin: 'dark', hair: 'dreads', hairColor: '#141110', boots: '#ec4899', ovr: 86 },
      { num: 7, name: 'C. Ronaldo', role: 'ATA', skin: 'olive', hair: 'short_fade', hairColor: '#1f1713', boots: '#22c55e', ovr: 86 }
    ]
  },
  {
    id: 'sel_colombia', leagueId: 'selecoes', name: 'Colômbia', abbr: 'COL', ovr: 82,
    kit: { pattern: 'solid_trim', c1: '#facc15', c2: '#1e3a8a', shorts: '#1e3a8a', socks: '#dc2626', gk: '#0ea5e9', gk2: '#0369a1', awayC1: '#111827', awayC2: '#f97316', awayShorts: '#111827', awaySocks: '#111827' },
    players: [
      { num: 12, name: 'C. Vargas', role: 'GOL', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', boots: '#f8fafc', ovr: 80 },
      { num: 23, name: 'D. Sánchez', role: 'ZAG', skin: 'dark', hair: 'short_fade', hairColor: '#141110', boots: '#facc15', ovr: 81 },
      { num: 6, name: 'Richard Ríos', role: 'MEI', skin: 'tan', hair: 'curly_tips', hairColor: '#1b1512', boots: '#ec4899', ovr: 82 },
      { num: 10, name: 'James R.', role: 'MEI', skin: 'olive', hair: 'short_parted', hairColor: '#261b16', boots: '#38bdf8', ovr: 83 },
      { num: 7, name: 'Luis Díaz', role: 'ATA', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', boots: '#ef4444', ovr: 85 }
    ]
  }
];

export function isKitClash(a: TeamSpec, b: TeamSpec): boolean {
  if (a.id === b.id) return true;
  if (a.kit.c1 === b.kit.c1) return true;
  const whites = ['realmadrid', 'saopaulo', 'leipzig', 'river', 'sel_inglaterra', 'sel_alemanha'];
  if (whites.includes(a.id) && whites.includes(b.id)) return true;
  return false;
}

export function getTeamBench(team: TeamSpec): TeamSpec['players'] {
  if (team.bench && team.bench.length >= 5) return team.bench;
  const baseOvr = Math.max(70, team.ovr - 4);
  return [
    { num: 19, name: `${team.abbr} Atacante`, role: 'ATA', skin: 'olive', hair: 'short_fade', hairColor: '#261b16', boots: '#f97316', ovr: baseOvr + 1 },
    { num: 18, name: `${team.abbr} Ponta`, role: 'ATA', skin: 'brown', hair: 'curly_afro', hairColor: '#181412', boots: '#22c55e', ovr: baseOvr },
    { num: 16, name: `${team.abbr} Armador`, role: 'MEI', skin: 'fair', hair: 'short_parted', hairColor: '#3b281e', boots: '#38bdf8', ovr: baseOvr },
    { num: 14, name: `${team.abbr} Zagueiro`, role: 'ZAG', skin: 'tan', hair: 'short_fade', hairColor: '#1f1713', boots: '#facc15', ovr: baseOvr - 1 },
    { num: 12, name: `${team.abbr} Reserva`, role: 'GOL', skin: 'fair', hair: 'short_fade', hairColor: '#2c1f19', boots: '#f8fafc', ovr: baseOvr - 2 }
  ];
}

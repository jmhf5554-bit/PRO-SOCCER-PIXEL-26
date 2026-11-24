import { CrestPattern, HairStyleId, KitPattern, PlayerSpec, SkinToneId, TeamSpec } from '../types';

export interface CompactClubDef {
  id: string;
  leagueId: string;
  name: string;
  abbr: string;
  ovr: number;
  pattern: KitPattern;
  c1: string;
  c2: string;
  c3?: string;
  shorts?: string;
  socks?: string;
  awayC1?: string;
  awayC2?: string;
  crest?: CrestPattern;
  stars?: [string, string, string, string, string];
}

const SKINS_LATAM: SkinToneId[] = ['olive', 'tan', 'brown', 'fair', 'dark'];
const SKINS_EURO: SkinToneId[] = ['fair', 'olive', 'fair', 'brown', 'tan'];
const HAIRS: HairStyleId[] = [
  'short_fade',
  'short_parted',
  'curly_afro',
  'shaggy',
  'platinum_fade',
  'dreads',
  'curly_tips',
  'mohawk'
];
const HAIR_COLORS = ['#1b1512', '#2c1f19', '#3b281e', '#141110', '#6b4f3b', '#f5f5f4', '#261b16'];
const BOOTS = ['#facc15', '#22c55e', '#38bdf8', '#ef4444', '#f97316', '#ec4899', '#f8fafc'];
const GK_KITS = ['#eab308', '#0ea5e9', '#22c55e', '#f97316', '#334155'];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function defaultNamesForLeague(leagueId: string, abbr: string): [string, string, string, string, string] {
  if (leagueId.startsWith('br')) return [`Rafael ${abbr}`, `Lucas ${abbr}`, `Matheus`, `Gabriel`, `Pedro ${abbr}`];
  if (leagueId === 'premier' || leagueId === 'championship' || leagueId === 'scotland') {
    return [`Smith`, `Taylor`, `Walker`, `Davies`, `Wilson`];
  }
  if (leagueId === 'laliga' || leagueId === 'argentina' || leagueId === 'colombia' || leagueId === 'chile' || leagueId === 'uruguay' || leagueId === 'ecuador' || leagueId === 'peru' || leagueId === 'paraguay' || leagueId === 'bolivia' || leagueId === 'venezuela') {
    return [`Herrera`, `Gómez`, `Fernández`, `Rojas`, `Martínez`];
  }
  if (leagueId === 'seriea_it') return [`Rossi`, `Conti`, `Bianchi`, `Esposito`, `Moretti`];
  if (leagueId === 'bundesliga' || leagueId === 'austria' || leagueId === 'switzerland') return [`Müller`, `Weber`, `Becker`, `Wagner`, `Hofmann`];
  if (leagueId === 'ligue1' || leagueId === 'proleague_be') return [`Bernard`, `Morel`, `Laurent`, `Dupont`, `Mercier`];
  if (leagueId === 'primeira_pt') return [`Silva`, `Ferreira`, `Costa`, `Oliveira`, `Sousa`];
  if (leagueId === 'eredivisie') return [`De Vries`, `Bakker`, `Jansen`, `Visser`, `Van Dijk`];
  if (leagueId === 'superlig_tr') return [`Yılmaz`, `Kaya`, `Demir`, `Şahin`, `Çelik`];
  if (leagueId === 'greece') return [`Papadakis`, `Georgiou`, `Nikolaou`, `Alexiou`, `Petrou`];
  return [`GK ${abbr}`, `ZAG ${abbr}`, `MEI ${abbr}`, `ARM ${abbr}`, `ATA ${abbr}`];
}

export function buildCompactTeam(def: CompactClubDef): TeamSpec {
  const seed = hashStr(def.id);
  const isEuro = [
    'premier', 'championship', 'laliga', 'seriea_it', 'bundesliga', 'ligue1',
    'primeira_pt', 'eredivisie', 'proleague_be', 'superlig_tr', 'scotland',
    'greece', 'switzerland', 'austria'
  ].includes(def.leagueId);
  const skins = isEuro ? SKINS_EURO : SKINS_LATAM;
  const stars = def.stars || defaultNamesForLeague(def.leagueId, def.abbr);
  const roles: PlayerSpec['role'][] = ['GOL', 'ZAG', 'MEI', 'MEI', 'ATA'];
  const nums = [1, 4, 8, 10, 9];

  const players: PlayerSpec[] = roles.map((role, i) => {
    const k = seed + i * 31;
    return {
      num: nums[i],
      name: stars[i],
      role,
      skin: skins[k % skins.length],
      hair: HAIRS[(k >> 2) % HAIRS.length],
      hairColor: HAIR_COLORS[(k >> 3) % HAIR_COLORS.length],
      beard: (k % 3) === 0,
      boots: BOOTS[(k >> 1) % BOOTS.length],
      ovr: Math.max(60, Math.min(93, def.ovr + (i === 4 ? 2 : i === 3 ? 1 : i === 0 ? 0 : -1)))
    };
  });

  const bench: PlayerSpec[] = [
    { num: 19, name: `${def.abbr} Atac.`, role: 'ATA', skin: skins[(seed + 5) % skins.length], hair: 'short_fade', hairColor: '#261b16', boots: '#f97316', ovr: Math.max(58, def.ovr - 2) },
    { num: 11, name: `${def.abbr} Ponta`, role: 'ATA', skin: skins[(seed + 7) % skins.length], hair: 'curly_afro', hairColor: '#181412', boots: '#22c55e', ovr: Math.max(58, def.ovr - 3) },
    { num: 16, name: `${def.abbr} Meia`, role: 'MEI', skin: skins[(seed + 9) % skins.length], hair: 'short_parted', hairColor: '#3b281e', boots: '#38bdf8', ovr: Math.max(58, def.ovr - 3) },
    { num: 14, name: `${def.abbr} Zagu.`, role: 'ZAG', skin: skins[(seed + 11) % skins.length], hair: 'short_fade', hairColor: '#1f1713', boots: '#facc15', ovr: Math.max(58, def.ovr - 3) },
    { num: 12, name: `${def.abbr} Gol.`, role: 'GOL', skin: skins[(seed + 13) % skins.length], hair: 'short_parted', hairColor: '#2c1f19', boots: '#f8fafc', ovr: Math.max(58, def.ovr - 4) }
  ];

  const isLightPrimary = ['#f8fafc', '#ffffff', '#facc15', '#fde047', '#fef08a'].includes(def.c1.toLowerCase());
  const awayC1 = def.awayC1 || (isLightPrimary ? '#0f172a' : '#f8fafc');
  const awayC2 = def.awayC2 || def.c1;
  const gkCol = GK_KITS[seed % GK_KITS.length];

  const crestPattern: CrestPattern =
    def.crest ||
    (def.pattern === 'stripes_v'
      ? 'shield_stripes'
      : def.pattern === 'hoops'
      ? 'shield_hoops'
      : def.pattern === 'sash'
      ? 'shield_sash'
      : def.pattern === 'tricolor_v' || def.pattern === 'chest_band'
      ? 'shield_tricolor'
      : 'shield_circle');

  return {
    id: def.id,
    leagueId: def.leagueId,
    name: def.name,
    abbr: def.abbr,
    ovr: def.ovr,
    crest: {
      pattern: def.leagueId === 'selecoes' ? 'flag_national' : crestPattern,
      primary: def.c1,
      secondary: def.c2,
      accent: def.c3 || '#facc15',
      stars: def.ovr >= 84 ? 2 : 1
    },
    kit: {
      pattern: def.pattern,
      c1: def.c1,
      c2: def.c2,
      c3: def.c3,
      shorts: def.shorts || (isLightPrimary ? '#111827' : '#f8fafc'),
      socks: def.socks || def.c1,
      gk: gkCol,
      gk2: '#1e293b',
      awayC1,
      awayC2,
      awayShorts: awayC1,
      awaySocks: awayC1
    },
    players,
    bench
  };
}

export const EXTRA_CLUBS: CompactClubDef[] = [
  // ================= BRASILEIRÃO SÉRIE A (+12 para completar 20) =================
  { id: 'internacional', leagueId: 'brasileirao', name: 'Internacional', abbr: 'INT', ovr: 81, pattern: 'solid_trim', c1: '#dc2626', c2: '#991b1b', shorts: '#f8fafc', stars: ['Rochet', 'Vitão', 'Alan Patrick', 'Wesley', 'Borré'] },
  { id: 'bahia', leagueId: 'brasileirao', name: 'Bahia', abbr: 'BAH', ovr: 80, pattern: 'tricolor_v', c1: '#1d4ed8', c2: '#dc2626', c3: '#f8fafc', shorts: '#1d4ed8', stars: ['M. Felipe', 'Kanu', 'Éverton R.', 'Cauly', 'Lucho R.'] },
  { id: 'fortaleza', leagueId: 'brasileirao', name: 'Fortaleza', abbr: 'FOR', ovr: 80, pattern: 'hoops', c1: '#1d4ed8', c2: '#dc2626', c3: '#f8fafc', shorts: '#1d4ed8', stars: ['João Ricardo', 'Tinga', 'M. Rossetto', 'Pochettino', 'Lucero'] },
  { id: 'corinthians', leagueId: 'brasileirao', name: 'Corinthians', abbr: 'COR', ovr: 81, pattern: 'solid_trim', c1: '#f8fafc', c2: '#111827', shorts: '#111827', stars: ['Hugo Souza', 'André R.', 'Carrillo', 'Garro', 'Memphis'] },
  { id: 'gremio', leagueId: 'brasileirao', name: 'Grêmio', abbr: 'GRE', ovr: 79, pattern: 'stripes_v', c1: '#0284c7', c2: '#111827', c3: '#f8fafc', shorts: '#111827', stars: ['Tiago Volpi', 'Jemerson', 'Villasanti', 'Cristaldo', 'Braithwaite'] },
  { id: 'vasco', leagueId: 'brasileirao', name: 'Vasco da Gama', abbr: 'VAS', ovr: 78, pattern: 'sash', c1: '#111827', c2: '#f8fafc', shorts: '#111827', stars: ['Léo Jardim', 'João Victor', 'Jair', 'Coutinho', 'Vegetti'] },
  { id: 'santos', leagueId: 'brasileirao', name: 'Santos', abbr: 'SAN', ovr: 80, pattern: 'solid_trim', c1: '#f8fafc', c2: '#111827', shorts: '#f8fafc', stars: ['Brazão', 'Gil', 'Diego Pituca', 'Neymar Jr.', 'Guilherme'] },
  { id: 'bragantino', leagueId: 'brasileirao', name: 'RB Bragantino', abbr: 'RBB', ovr: 78, pattern: 'solid_trim', c1: '#f8fafc', c2: '#dc2626', shorts: '#dc2626', stars: ['Cleiton', 'Pedro H.', 'Jadsom', 'Lincoln', 'Sasha'] },
  { id: 'vitoria', leagueId: 'brasileirao', name: 'Vitória', abbr: 'VIT', ovr: 76, pattern: 'hoops', c1: '#dc2626', c2: '#111827', shorts: '#111827', stars: ['Lucas Arcanjo', 'Wagner L.', 'Willian O.', 'Matheuzinho', 'Alerrandro'] },
  { id: 'juventude', leagueId: 'brasileirao', name: 'Juventude', abbr: 'JUV', ovr: 76, pattern: 'stripes_v', c1: '#16a34a', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Gustavo', 'Danilo Boza', 'Jadson', 'Nenê', 'Gilberto'] },
  { id: 'ceara', leagueId: 'brasileirao', name: 'Ceará', abbr: 'CEA', ovr: 76, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827', stars: ['Bruno F.', 'Marllon', 'Lourenço', 'Mugni', 'Pedro Raul'] },
  { id: 'sport', leagueId: 'brasileirao', name: 'Sport Recife', abbr: 'SPT', ovr: 76, pattern: 'hoops', c1: '#dc2626', c2: '#111827', shorts: '#111827', stars: ['Caíque F.', 'Rafael T.', 'Fabricio D.', 'Lucas Lima', 'Pablo'] },

  // ================= BRASILEIRÃO SÉRIE B (20) =================
  { id: 'athleticopr', leagueId: 'br_b', name: 'Athletico-PR', abbr: 'CAP', ovr: 77, pattern: 'sash', c1: '#dc2626', c2: '#111827', shorts: '#111827', stars: ['Mycael', 'Belezi', 'Felipinho', 'Zapelli', 'Mastriani'] },
  { id: 'criciuma', leagueId: 'br_b', name: 'Criciúma', abbr: 'CRI', ovr: 75, pattern: 'chest_band', c1: '#facc15', c2: '#111827', c3: '#f8fafc', shorts: '#111827', stars: ['Alisson', 'Rodrigo', 'Fellipe M.', 'Matheusinho', 'Bolasie'] },
  { id: 'atleticogo', leagueId: 'br_b', name: 'Atlético-GO', abbr: 'ACG', ovr: 75, pattern: 'stripes_v', c1: '#dc2626', c2: '#111827', shorts: '#111827', stars: ['Ronaldo', 'Alix', 'Rhaldney', 'Shaylon', 'Luiz F.'] },
  { id: 'cuiaba', leagueId: 'br_b', name: 'Cuiabá', abbr: 'CUI', ovr: 75, pattern: 'stripes_v', c1: '#facc15', c2: '#15803d', shorts: '#15803d', stars: ['Walter', 'Alan E.', 'Denilson', 'Max', 'Pitta'] },
  { id: 'goias', leagueId: 'br_b', name: 'Goiás', abbr: 'GOI', ovr: 74, pattern: 'solid_trim', c1: '#15803d', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Tadeu', 'Lucas R.', 'Marcão', 'Régis', 'Paulo Baya'] },
  { id: 'coritiba', leagueId: 'br_b', name: 'Coritiba', abbr: 'CFC', ovr: 75, pattern: 'chest_band', c1: '#f8fafc', c2: '#15803d', c3: '#15803d', shorts: '#111827', stars: ['Pedro M.', 'Bruno Melo', 'Sebastián G.', 'Josué', 'Robson'] },
  { id: 'americamg', leagueId: 'br_b', name: 'América-MG', abbr: 'AMG', ovr: 74, pattern: 'stripes_v', c1: '#15803d', c2: '#111827', shorts: '#111827', stars: ['Elias', 'Ricardo S.', 'Alê', 'Benítez', 'Renato M.'] },
  { id: 'novorizontino', leagueId: 'br_b', name: 'Novorizontino', abbr: 'NOV', ovr: 74, pattern: 'solid_trim', c1: '#facc15', c2: '#111827', shorts: '#111827', stars: ['Jordi', 'Rafael D.', 'Geovane', 'Marlon', 'Neto Pessoa'] },
  { id: 'mirassol', leagueId: 'br_b', name: 'Mirassol', abbr: 'MIR', ovr: 75, pattern: 'solid_trim', c1: '#eab308', c2: '#15803d', shorts: '#15803d', stars: ['Muralha', 'João Victor', 'Danielzinho', 'Gabriel', 'Dellatorre'] },
  { id: 'vila_nova', leagueId: 'br_b', name: 'Vila Nova', abbr: 'VIL', ovr: 73, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Dênis Jr.', 'Jemmes', 'Ralf', 'Alessinho', 'Henrique A.'] },
  { id: 'avai', leagueId: 'br_b', name: 'Avaí', abbr: 'AVA', ovr: 73, pattern: 'stripes_v', c1: '#0284c7', c2: '#f8fafc', shorts: '#0284c7', stars: ['César', 'Tiago P.', 'Zé Ricardo', 'Giovanni', 'Poveda'] },
  { id: 'chapecoense', leagueId: 'br_b', name: 'Chapecoense', abbr: 'CHA', ovr: 72, pattern: 'solid_trim', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a', stars: ['Léo Vieira', 'Bruno L.', 'Tárik', 'Marlone', 'Mário Sérgio'] },
  { id: 'crb', leagueId: 'br_b', name: 'CRB', abbr: 'CRB', ovr: 73, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Matheus A.', 'Saimon', 'Falcão', 'Gegê', 'Anselmo R.'] },
  { id: 'operario', leagueId: 'br_b', name: 'Operário-PR', abbr: 'OPE', ovr: 72, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827', stars: ['Rafael S.', 'Willian M.', 'Índio', 'Boschilia', 'Daniel Lima'] },
  { id: 'botafogosp', leagueId: 'br_b', name: 'Botafogo-SP', abbr: 'BFC', ovr: 72, pattern: 'chest_band', c1: '#f8fafc', c2: '#dc2626', c3: '#111827', shorts: '#111827', stars: ['João Carlos', 'Lucas Dias', 'Matheus B.', 'Douglas B.', 'Alexandre J.'] },
  { id: 'amazonas', leagueId: 'br_b', name: 'Amazonas', abbr: 'AMA', ovr: 72, pattern: 'stripes_v', c1: '#eab308', c2: '#111827', shorts: '#111827', stars: ['Marcão', 'Miranda', 'Barros', 'Diego Torres', 'Sassá'] },
  { id: 'remo', leagueId: 'br_b', name: 'Remo', abbr: 'REM', ovr: 73, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#f8fafc', shorts: '#1e3a8a', stars: ['Marcelo R.', 'Rafael C.', 'Jaderson', 'Pavani', 'Ytalo'] },
  { id: 'volta_redonda', leagueId: 'br_b', name: 'Volta Redonda', abbr: 'VRE', ovr: 71, pattern: 'hoops', c1: '#facc15', c2: '#111827', shorts: '#111827', stars: ['Jean D.', 'Lucas S.', 'Bruno B.', 'PK', 'Bruno Santos'] },
  { id: 'ferroviaria', leagueId: 'br_b', name: 'Ferroviária', abbr: 'AFE', ovr: 71, pattern: 'solid_trim', c1: '#7c1d34', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Saulo', 'Gustavo M.', 'Ricardinho', 'Juninho', 'Carlão'] },
  { id: 'athleticmg', leagueId: 'br_b', name: 'Athletic Club', abbr: 'ATH', ovr: 71, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827', stars: ['Glauco', 'Edson', 'Diego F.', 'David Braga', 'Jonathas'] },

  // ================= BRASILEIRÃO SÉRIE C (20) =================
  { id: 'ponte_preta', leagueId: 'br_c', name: 'Ponte Preta', abbr: 'PON', ovr: 71, pattern: 'sash', c1: '#f8fafc', c2: '#111827', shorts: '#111827' },
  { id: 'guarani', leagueId: 'br_c', name: 'Guarani', abbr: 'GUA', ovr: 71, pattern: 'solid_trim', c1: '#15803d', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'ituano', leagueId: 'br_c', name: 'Ituano', abbr: 'ITU', ovr: 70, pattern: 'hoops', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'brusque', leagueId: 'br_c', name: 'Brusque', abbr: 'BRU', ovr: 70, pattern: 'stripes_v', c1: '#facc15', c2: '#dc2626', shorts: '#15803d' },
  { id: 'nautico', leagueId: 'br_c', name: 'Náutico', abbr: 'NAU', ovr: 71, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'figueirense', leagueId: 'br_c', name: 'Figueirense', abbr: 'FIG', ovr: 70, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'csa', leagueId: 'br_c', name: 'CSA', abbr: 'CSA', ovr: 70, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'botafogo_pb', leagueId: 'br_c', name: 'Botafogo-PB', abbr: 'BPB', ovr: 70, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'abc', leagueId: 'br_c', name: 'ABC', abbr: 'ABC', ovr: 69, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'londrina', leagueId: 'br_c', name: 'Londrina', abbr: 'LEC', ovr: 70, pattern: 'stripes_v', c1: '#38bdf8', c2: '#f8fafc', shorts: '#0284c7' },
  { id: 'sao_bernardo', leagueId: 'br_c', name: 'São Bernardo', abbr: 'SBE', ovr: 70, pattern: 'hoops', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'ypiranga', leagueId: 'br_c', name: 'Ypiranga-RS', abbr: 'YPI', ovr: 69, pattern: 'solid_trim', c1: '#facc15', c2: '#15803d', shorts: '#15803d' },
  { id: 'caxias', leagueId: 'br_c', name: 'Caxias', abbr: 'CAX', ovr: 69, pattern: 'solid_trim', c1: '#7c1d34', c2: '#0284c7', shorts: '#f8fafc' },
  { id: 'confianca', leagueId: 'br_c', name: 'Confiança', abbr: 'CON', ovr: 69, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'floresta', leagueId: 'br_c', name: 'Floresta', abbr: 'FLO', ovr: 68, pattern: 'solid_trim', c1: '#15803d', c2: '#f8fafc', shorts: '#15803d' },
  { id: 'tombense', leagueId: 'br_c', name: 'Tombense', abbr: 'TOM', ovr: 69, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'retro', leagueId: 'br_c', name: 'Retrô', abbr: 'RET', ovr: 69, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#facc15', shorts: '#1e3a8a' },
  { id: 'maringa', leagueId: 'br_c', name: 'Maringá', abbr: 'MFC', ovr: 69, pattern: 'stripes_v', c1: '#15803d', c2: '#111827', shorts: '#111827' },
  { id: 'anapolis', leagueId: 'br_c', name: 'Anápolis', abbr: 'ANA', ovr: 68, pattern: 'tricolor_v', c1: '#dc2626', c2: '#1e3a8a', c3: '#f8fafc', shorts: '#f8fafc' },
  { id: 'itabaiana', leagueId: 'br_c', name: 'Itabaiana', abbr: 'ITA', ovr: 68, pattern: 'tricolor_v', c1: '#1d4ed8', c2: '#dc2626', c3: '#f8fafc', shorts: '#1d4ed8' },

  // ================= BRASILEIRÃO SÉRIE D (20) =================
  { id: 'santa_cruz', leagueId: 'br_d', name: 'Santa Cruz', abbr: 'STC', ovr: 69, pattern: 'hoops', c1: '#dc2626', c2: '#111827', c3: '#f8fafc', shorts: '#111827' },
  { id: 'parana', leagueId: 'br_d', name: 'Paraná Clube', abbr: 'PRC', ovr: 68, pattern: 'tricolor_v', c1: '#dc2626', c2: '#1d4ed8', c3: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'portuguesa', leagueId: 'br_d', name: 'Portuguesa', abbr: 'POR', ovr: 69, pattern: 'hoops', c1: '#dc2626', c2: '#15803d', shorts: '#f8fafc' },
  { id: 'brasiliense', leagueId: 'br_d', name: 'Brasiliense', abbr: 'BRA', ovr: 68, pattern: 'solid_trim', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'america_rn', leagueId: 'br_d', name: 'América-RN', abbr: 'ARN', ovr: 68, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'treze', leagueId: 'br_d', name: 'Treze-PB', abbr: 'TRE', ovr: 67, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'manauara', leagueId: 'br_d', name: 'Manauara', abbr: 'MNA', ovr: 67, pattern: 'solid_trim', c1: '#ea580c', c2: '#111827', shorts: '#111827' },
  { id: 'tuna_luso', leagueId: 'br_d', name: 'Tuna Luso', abbr: 'TUN', ovr: 67, pattern: 'solid_trim', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'aguia_maraba', leagueId: 'br_d', name: 'Águia Marabá', abbr: 'AGU', ovr: 66, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#dc2626', shorts: '#1d4ed8' },
  { id: 'altos', leagueId: 'br_d', name: 'Altos-PI', abbr: 'ALT', ovr: 67, pattern: 'hoops', c1: '#16a34a', c2: '#facc15', shorts: '#16a34a' },
  { id: 'moto_club', leagueId: 'br_d', name: 'Moto Club', abbr: 'MOT', ovr: 67, pattern: 'hoops', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'sampaio_correa', leagueId: 'br_d', name: 'Sampaio Corrêa', abbr: 'SAM', ovr: 68, pattern: 'tricolor_v', c1: '#16a34a', c2: '#facc15', c3: '#dc2626', shorts: '#16a34a' },
  { id: 'aparecidense', leagueId: 'br_d', name: 'Aparecidense', abbr: 'APA', ovr: 67, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'inter_limeira', leagueId: 'br_d', name: 'Inter Limeira', abbr: 'INL', ovr: 68, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'agua_santa', leagueId: 'br_d', name: 'Água Santa', abbr: 'AGS', ovr: 67, pattern: 'solid_trim', c1: '#0284c7', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'nova_iguacu', leagueId: 'br_d', name: 'Nova Iguaçu', abbr: 'NIG', ovr: 68, pattern: 'solid_trim', c1: '#f97316', c2: '#f8fafc', shorts: '#111827' },
  { id: 'boavista', leagueId: 'br_d', name: 'Boavista-RJ', abbr: 'BOA', ovr: 67, pattern: 'stripes_v', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'joinville', leagueId: 'br_d', name: 'Joinville', abbr: 'JEC', ovr: 67, pattern: 'tricolor_v', c1: '#dc2626', c2: '#111827', c3: '#f8fafc', shorts: '#111827' },
  { id: 'sao_jose', leagueId: 'br_d', name: 'São José-RS', abbr: 'SJO', ovr: 67, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'cascavel', leagueId: 'br_d', name: 'FC Cascavel', abbr: 'CAS', ovr: 67, pattern: 'solid_trim', c1: '#facc15', c2: '#111827', shorts: '#111827' },

  // ================= PREMIER LEAGUE (+16 para completar 20) =================
  { id: 'tottenham', leagueId: 'premier', name: 'Tottenham', abbr: 'TOT', ovr: 83, pattern: 'solid_trim', c1: '#f8fafc', c2: '#1e3a8a', shorts: '#1e3a8a', stars: ['Vicario', 'Romero', 'Maddison', 'Kulusevski', 'Son'] },
  { id: 'manutd', leagueId: 'premier', name: 'Man. United', abbr: 'MUN', ovr: 82, pattern: 'solid_trim', c1: '#dc2626', c2: '#111827', shorts: '#f8fafc', stars: ['Onana', 'Martínez', 'Mainoo', 'B. Fernandes', 'Højlund'] },
  { id: 'newcastle', leagueId: 'premier', name: 'Newcastle', abbr: 'NEW', ovr: 83, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827', stars: ['Pope', 'Botman', 'B. Guimarães', 'Gordon', 'Isak'] },
  { id: 'astonvilla', leagueId: 'premier', name: 'Aston Villa', abbr: 'AVL', ovr: 82, pattern: 'solid_trim', c1: '#7c1d34', c2: '#38bdf8', shorts: '#f8fafc', stars: ['E. Martínez', 'Konsa', 'Tielemans', 'Rogers', 'Watkins'] },
  { id: 'brighton', leagueId: 'premier', name: 'Brighton', abbr: 'BHA', ovr: 80, pattern: 'stripes_v', c1: '#0284c7', c2: '#f8fafc', shorts: '#0284c7', stars: ['Verbruggen', 'Dunk', 'Baleba', 'Mitoma', 'João Pedro'] },
  { id: 'nottingham', leagueId: 'premier', name: 'Nottm Forest', abbr: 'NFO', ovr: 80, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Sels', 'Murillo', 'Gibbs-White', 'Elanga', 'Wood'] },
  { id: 'westham', leagueId: 'premier', name: 'West Ham', abbr: 'WHU', ovr: 79, pattern: 'solid_trim', c1: '#7c1d34', c2: '#38bdf8', shorts: '#f8fafc', stars: ['Areola', 'Kilman', 'Paquetá', 'Kudus', 'Bowen'] },
  { id: 'bournemouth', leagueId: 'premier', name: 'Bournemouth', abbr: 'BOU', ovr: 79, pattern: 'stripes_v', c1: '#dc2626', c2: '#111827', shorts: '#111827', stars: ['Kepa', 'Zabarnyi', 'Christie', 'Semenyo', 'Evanilson'] },
  { id: 'fulham', leagueId: 'premier', name: 'Fulham', abbr: 'FUL', ovr: 79, pattern: 'solid_trim', c1: '#f8fafc', c2: '#111827', shorts: '#111827', stars: ['Leno', 'Andersen', 'Andreas P.', 'Iwobi', 'Muniz'] },
  { id: 'brentford', leagueId: 'premier', name: 'Brentford', abbr: 'BRE', ovr: 78, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#111827', stars: ['Flekken', 'Collins', 'Nørgaard', 'Mbeumo', 'Wissa'] },
  { id: 'crystalpalace', leagueId: 'premier', name: 'Crystal Palace', abbr: 'CRY', ovr: 78, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#dc2626', shorts: '#1d4ed8', stars: ['Henderson', 'Guéhi', 'Wharton', 'Eze', 'Mateta'] },
  { id: 'everton', leagueId: 'premier', name: 'Everton', abbr: 'EVE', ovr: 77, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Pickford', 'Branthwaite', 'Gueye', 'Ndiaye', 'Calvert-L.'] },
  { id: 'wolves', leagueId: 'premier', name: 'Wolverhampton', abbr: 'WOL', ovr: 77, pattern: 'solid_trim', c1: '#f59e0b', c2: '#111827', shorts: '#111827', stars: ['José Sá', 'Toti', 'João Gomes', 'Matheus C.', 'Strand L.'] },
  { id: 'leicester', leagueId: 'premier', name: 'Leicester', abbr: 'LEI', ovr: 76, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#facc15', shorts: '#f8fafc', stars: ['Hermansen', 'Faes', 'Ndidi', 'Buonanotte', 'Vardy'] },
  { id: 'ipswich', leagueId: 'premier', name: 'Ipswich Town', abbr: 'IPS', ovr: 75, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Muric', 'Greaves', 'Morsy', 'Hutchinson', 'Delap'] },
  { id: 'southampton', leagueId: 'premier', name: 'Southampton', abbr: 'SOU', ovr: 75, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#111827', stars: ['Ramsdale', 'Harwood-B.', 'Fernandes', 'Dibling', 'Archer'] },

  // ================= EFL CHAMPIONSHIP (20) =================
  { id: 'leeds', leagueId: 'championship', name: 'Leeds United', abbr: 'LEE', ovr: 76, pattern: 'solid_trim', c1: '#f8fafc', c2: '#facc15', shorts: '#f8fafc' },
  { id: 'burnley', leagueId: 'championship', name: 'Burnley', abbr: 'BUR', ovr: 76, pattern: 'solid_trim', c1: '#7c1d34', c2: '#38bdf8', shorts: '#f8fafc' },
  { id: 'sheffutd', leagueId: 'championship', name: 'Sheffield Utd', abbr: 'SHU', ovr: 75, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#111827' },
  { id: 'sunderland', leagueId: 'championship', name: 'Sunderland', abbr: 'SUN', ovr: 75, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#111827' },
  { id: 'middlesbrough', leagueId: 'championship', name: 'Middlesbrough', abbr: 'MID', ovr: 74, pattern: 'chest_band', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'westbrom', leagueId: 'championship', name: 'West Brom', abbr: 'WBA', ovr: 74, pattern: 'stripes_v', c1: '#1e3a8a', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'norwich', leagueId: 'championship', name: 'Norwich City', abbr: 'NOR', ovr: 74, pattern: 'solid_trim', c1: '#facc15', c2: '#16a34a', shorts: '#16a34a' },
  { id: 'watford', leagueId: 'championship', name: 'Watford', abbr: 'WAT', ovr: 73, pattern: 'solid_trim', c1: '#facc15', c2: '#dc2626', shorts: '#111827' },
  { id: 'coventry', leagueId: 'championship', name: 'Coventry City', abbr: 'COV', ovr: 73, pattern: 'stripes_v', c1: '#38bdf8', c2: '#1e3a8a', shorts: '#38bdf8' },
  { id: 'blackburn', leagueId: 'championship', name: 'Blackburn', abbr: 'BLB', ovr: 73, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'luton', leagueId: 'championship', name: 'Luton Town', abbr: 'LUT', ovr: 73, pattern: 'solid_trim', c1: '#f97316', c2: '#1e3a8a', shorts: '#1e3a8a' },
  { id: 'hull', leagueId: 'championship', name: 'Hull City', abbr: 'HUL', ovr: 72, pattern: 'stripes_v', c1: '#f59e0b', c2: '#111827', shorts: '#111827' },
  { id: 'bristolcity', leagueId: 'championship', name: 'Bristol City', abbr: 'BRI', ovr: 72, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'swansea', leagueId: 'championship', name: 'Swansea City', abbr: 'SWA', ovr: 72, pattern: 'solid_trim', c1: '#f8fafc', c2: '#111827', shorts: '#f8fafc' },
  { id: 'stoke', leagueId: 'championship', name: 'Stoke City', abbr: 'STK', ovr: 72, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'millwall', leagueId: 'championship', name: 'Millwall', abbr: 'MIL', ovr: 72, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'qpr', leagueId: 'championship', name: 'QPR', abbr: 'QPR', ovr: 71, pattern: 'hoops', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'cardiff', leagueId: 'championship', name: 'Cardiff City', abbr: 'CAR', ovr: 71, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'sheffwed', leagueId: 'championship', name: 'Sheffield Wed', abbr: 'SHW', ovr: 72, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#111827' },
  { id: 'derby', leagueId: 'championship', name: 'Derby County', abbr: 'DER', ovr: 71, pattern: 'solid_trim', c1: '#f8fafc', c2: '#111827', shorts: '#111827' },

  // ================= LA LIGA (+16 para completar 20) =================
  { id: 'villarreal', leagueId: 'laliga', name: 'Villarreal', abbr: 'VIL', ovr: 81, pattern: 'solid_trim', c1: '#facc15', c2: '#1e3a8a', shorts: '#facc15', stars: ['Conde', 'Foyth', 'Parejo', 'Baena', 'Gerard M.'] },
  { id: 'realsociedad', leagueId: 'laliga', name: 'Real Sociedad', abbr: 'RSO', ovr: 81, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Remiro', 'Zubeldia', 'Zubimendi', 'Kubo', 'Oyarzabal'] },
  { id: 'betis', leagueId: 'laliga', name: 'Real Betis', abbr: 'BET', ovr: 80, pattern: 'stripes_v', c1: '#16a34a', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Rui Silva', 'Llorente', 'Lo Celso', 'Isco', 'Antony'] },
  { id: 'girona', leagueId: 'laliga', name: 'Girona', abbr: 'GIR', ovr: 79, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#1d4ed8', stars: ['Gazzaniga', 'Blind', 'Herrera', 'Tsygankov', 'Stuani'] },
  { id: 'sevilla', leagueId: 'laliga', name: 'Sevilla', abbr: 'SEV', ovr: 79, pattern: 'solid_trim', c1: '#f8fafc', c2: '#dc2626', shorts: '#f8fafc', stars: ['Nyland', 'Badé', 'Lokonga', 'Lukebakio', 'Isaac R.'] },
  { id: 'celta', leagueId: 'laliga', name: 'Celta de Vigo', abbr: 'CEL', ovr: 78, pattern: 'solid_trim', c1: '#38bdf8', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'osasuna', leagueId: 'laliga', name: 'Osasuna', abbr: 'OSA', ovr: 78, pattern: 'solid_trim', c1: '#b91c1c', c2: '#1e3a8a', shorts: '#1e3a8a' },
  { id: 'mallorca', leagueId: 'laliga', name: 'Mallorca', abbr: 'MLL', ovr: 78, pattern: 'solid_trim', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'rayovallecano', leagueId: 'laliga', name: 'Rayo Vallecano', abbr: 'RAY', ovr: 77, pattern: 'sash', c1: '#f8fafc', c2: '#dc2626', shorts: '#f8fafc' },
  { id: 'getafe', leagueId: 'laliga', name: 'Getafe', abbr: 'GET', ovr: 76, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'valencia', leagueId: 'laliga', name: 'Valencia', abbr: 'VAL', ovr: 77, pattern: 'solid_trim', c1: '#f8fafc', c2: '#111827', shorts: '#111827' },
  { id: 'espanyol', leagueId: 'laliga', name: 'Espanyol', abbr: 'ESP', ovr: 76, pattern: 'stripes_v', c1: '#0284c7', c2: '#f8fafc', shorts: '#0284c7' },
  { id: 'laspalmas', leagueId: 'laliga', name: 'Las Palmas', abbr: 'LPA', ovr: 76, pattern: 'solid_trim', c1: '#facc15', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'alaves', leagueId: 'laliga', name: 'Alavés', abbr: 'ALA', ovr: 75, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'leganes', leagueId: 'laliga', name: 'Leganés', abbr: 'LEG', ovr: 75, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'valladolid', leagueId: 'laliga', name: 'Valladolid', abbr: 'VLL', ovr: 74, pattern: 'stripes_v', c1: '#7e22ce', c2: '#f8fafc', shorts: '#f8fafc' },

  // ================= SERIE A ITÁLIA (+19 pois Inter Milan é movido para seriea_it) =================
  { id: 'napoli', leagueId: 'seriea_it', name: 'Napoli', abbr: 'NAP', ovr: 85, pattern: 'solid_trim', c1: '#0ea5e9', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Meret', 'Buongiorno', 'Lobotka', 'McTominay', 'Lukaku'] },
  { id: 'atalanta', leagueId: 'seriea_it', name: 'Atalanta', abbr: 'ATA', ovr: 84, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#111827', shorts: '#111827', stars: ['Carnesecchi', 'Hien', 'Éderson', 'De Ketelaere', 'Lookman'] },
  { id: 'juventus', leagueId: 'seriea_it', name: 'Juventus', abbr: 'JUV', ovr: 84, pattern: 'stripes_v', c1: '#f8fafc', c2: '#111827', shorts: '#f8fafc', stars: ['Di Gregorio', 'Bremer', 'Koopmeiners', 'Yıldız', 'Vlahović'] },
  { id: 'acmilan', leagueId: 'seriea_it', name: 'AC Milan', abbr: 'MIL', ovr: 84, pattern: 'stripes_v', c1: '#dc2626', c2: '#111827', shorts: '#f8fafc', stars: ['Maignan', 'Tomori', 'Reijnders', 'Pulisic', 'Rafael Leão'] },
  { id: 'lazio', leagueId: 'seriea_it', name: 'Lazio', abbr: 'LAZ', ovr: 81, pattern: 'solid_trim', c1: '#38bdf8', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Provedel', 'Romagnoli', 'Guendouzi', 'Zaccagni', 'Castellanos'] },
  { id: 'fiorentina', leagueId: 'seriea_it', name: 'Fiorentina', abbr: 'FIO', ovr: 81, pattern: 'solid_trim', c1: '#7e22ce', c2: '#f8fafc', shorts: '#7e22ce', stars: ['De Gea', 'Ranieri', 'Adli', 'Gudmundsson', 'Kean'] },
  { id: 'roma', leagueId: 'seriea_it', name: 'AS Roma', abbr: 'ROM', ovr: 81, pattern: 'solid_trim', c1: '#881337', c2: '#facc15', shorts: '#881337', stars: ['Svilar', 'Ndicka', 'Koné', 'Dybala', 'Dovbyk'] },
  { id: 'bologna', leagueId: 'seriea_it', name: 'Bologna', abbr: 'BOL', ovr: 80, pattern: 'stripes_v', c1: '#b91c1c', c2: '#1e3a8a', shorts: '#f8fafc' },
  { id: 'torino', leagueId: 'seriea_it', name: 'Torino', abbr: 'TOR', ovr: 77, pattern: 'solid_trim', c1: '#7c1d34', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'udinese', leagueId: 'seriea_it', name: 'Udinese', abbr: 'UDI', ovr: 77, pattern: 'stripes_v', c1: '#f8fafc', c2: '#111827', shorts: '#111827' },
  { id: 'genoa', leagueId: 'seriea_it', name: 'Genoa', abbr: 'GEN', ovr: 76, pattern: 'stripes_v', c1: '#b91c1c', c2: '#1e3a8a', shorts: '#1e3a8a' },
  { id: 'como', leagueId: 'seriea_it', name: 'Como', abbr: 'COM', ovr: 76, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'cagliari', leagueId: 'seriea_it', name: 'Cagliari', abbr: 'CAG', ovr: 75, pattern: 'stripes_v', c1: '#b91c1c', c2: '#1e3a8a', shorts: '#1e3a8a' },
  { id: 'parma', leagueId: 'seriea_it', name: 'Parma', abbr: 'PAR', ovr: 75, pattern: 'chest_band', c1: '#f8fafc', c2: '#111827', shorts: '#111827' },
  { id: 'verona', leagueId: 'seriea_it', name: 'Hellas Verona', abbr: 'VER', ovr: 75, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#facc15', shorts: '#1e3a8a' },
  { id: 'empoli', leagueId: 'seriea_it', name: 'Empoli', abbr: 'EMP', ovr: 75, pattern: 'solid_trim', c1: '#0284c7', c2: '#f8fafc', shorts: '#0284c7' },
  { id: 'lecce', leagueId: 'seriea_it', name: 'Lecce', abbr: 'LEC', ovr: 74, pattern: 'stripes_v', c1: '#facc15', c2: '#dc2626', shorts: '#1e3a8a' },
  { id: 'venezia', leagueId: 'seriea_it', name: 'Venezia', abbr: 'VEN', ovr: 74, pattern: 'chest_band', c1: '#111827', c2: '#f97316', c3: '#16a34a', shorts: '#111827' },
  { id: 'monza', leagueId: 'seriea_it', name: 'Monza', abbr: 'MON', ovr: 74, pattern: 'sash', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },

  // ================= BUNDESLIGA (+16 para completar 20) =================
  { id: 'frankfurt', leagueId: 'bundesliga', name: 'E. Frankfurt', abbr: 'SGE', ovr: 82, pattern: 'stripes_v', c1: '#dc2626', c2: '#111827', shorts: '#111827', stars: ['Trapp', 'Koch', 'Larsson', 'Götze', 'Ekitike'] },
  { id: 'stuttgart', leagueId: 'bundesliga', name: 'Stuttgart', abbr: 'VFB', ovr: 81, pattern: 'chest_band', c1: '#f8fafc', c2: '#dc2626', shorts: '#f8fafc', stars: ['Nübel', 'Chabot', 'Stiller', 'Millot', 'Undav'] },
  { id: 'freiburg', leagueId: 'bundesliga', name: 'Freiburg', abbr: 'SCF', ovr: 79, pattern: 'solid_trim', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'mainz', leagueId: 'bundesliga', name: 'Mainz 05', abbr: 'M05', ovr: 78, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'gladbach', leagueId: 'bundesliga', name: "B. M'gladbach", abbr: 'BMG', ovr: 78, pattern: 'solid_trim', c1: '#f8fafc', c2: '#16a34a', shorts: '#f8fafc' },
  { id: 'wolfsburg', leagueId: 'bundesliga', name: 'Wolfsburg', abbr: 'WOB', ovr: 78, pattern: 'solid_trim', c1: '#22c55e', c2: '#f8fafc', shorts: '#22c55e' },
  { id: 'werder', leagueId: 'bundesliga', name: 'Werder Bremen', abbr: 'SVW', ovr: 78, pattern: 'solid_trim', c1: '#15803d', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'augsburg', leagueId: 'bundesliga', name: 'Augsburg', abbr: 'FCA', ovr: 76, pattern: 'solid_trim', c1: '#f8fafc', c2: '#dc2626', shorts: '#f8fafc' },
  { id: 'unionberlin', leagueId: 'bundesliga', name: 'Union Berlin', abbr: 'FCU', ovr: 77, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'stpauli', leagueId: 'bundesliga', name: 'St. Pauli', abbr: 'STP', ovr: 75, pattern: 'solid_trim', c1: '#5c3a21', c2: '#f8fafc', shorts: '#5c3a21' },
  { id: 'hoffenheim', leagueId: 'bundesliga', name: 'Hoffenheim', abbr: 'TSG', ovr: 76, pattern: 'solid_trim', c1: '#0284c7', c2: '#f8fafc', shorts: '#0284c7' },
  { id: 'heidenheim', leagueId: 'bundesliga', name: 'Heidenheim', abbr: 'HDH', ovr: 75, pattern: 'solid_trim', c1: '#dc2626', c2: '#1e3a8a', shorts: '#1e3a8a' },
  { id: 'bochum', leagueId: 'bundesliga', name: 'VfL Bochum', abbr: 'BOC', ovr: 74, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'kiel', leagueId: 'bundesliga', name: 'Holstein Kiel', abbr: 'KIE', ovr: 74, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#dc2626', shorts: '#f8fafc' },
  { id: 'koln', leagueId: 'bundesliga', name: 'FC Köln', abbr: 'KOE', ovr: 76, pattern: 'solid_trim', c1: '#f8fafc', c2: '#dc2626', shorts: '#f8fafc' },
  { id: 'hamburg', leagueId: 'bundesliga', name: 'Hamburger SV', abbr: 'HSV', ovr: 76, pattern: 'solid_trim', c1: '#f8fafc', c2: '#1d4ed8', shorts: '#dc2626' },

  // ================= LIGUE 1 FRANÇA (+19 pois PSG é movido para ligue1) =================
  { id: 'marseille', leagueId: 'ligue1', name: 'O. Marseille', abbr: 'OM', ovr: 82, pattern: 'solid_trim', c1: '#f8fafc', c2: '#38bdf8', shorts: '#f8fafc', stars: ['Rulli', 'Balerdi', 'Højbjerg', 'Rabiot', 'Greenwood'] },
  { id: 'monaco', leagueId: 'ligue1', name: 'AS Monaco', abbr: 'ASM', ovr: 82, pattern: 'sash', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Majecki', 'Kehrer', 'Zakaria', 'Golovin', 'Embolo'] },
  { id: 'lille', leagueId: 'ligue1', name: 'Lille LOSC', abbr: 'LIL', ovr: 81, pattern: 'solid_trim', c1: '#dc2626', c2: '#1e3a8a', shorts: '#1e3a8a', stars: ['Chevalier', 'Diakité', 'André', 'Angel G.', 'Jonathan D.'] },
  { id: 'nice', leagueId: 'ligue1', name: 'OGC Nice', abbr: 'NIC', ovr: 80, pattern: 'stripes_v', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'lyon', leagueId: 'ligue1', name: 'O. Lyon', abbr: 'OL', ovr: 81, pattern: 'solid_trim', c1: '#f8fafc', c2: '#1d4ed8', shorts: '#f8fafc', stars: ['Lucas Perri', 'Niakhaté', 'Tolisso', 'Cherki', 'Lacazette'] },
  { id: 'lens', leagueId: 'ligue1', name: 'RC Lens', abbr: 'RCL', ovr: 79, pattern: 'stripes_v', c1: '#facc15', c2: '#dc2626', shorts: '#111827' },
  { id: 'strasbourg', leagueId: 'ligue1', name: 'Strasbourg', abbr: 'STR', ovr: 77, pattern: 'solid_trim', c1: '#0284c7', c2: '#f8fafc', shorts: '#0284c7' },
  { id: 'brest', leagueId: 'ligue1', name: 'Stade Brestois', abbr: 'BRE', ovr: 78, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'toulouse', leagueId: 'ligue1', name: 'Toulouse', abbr: 'TFC', ovr: 77, pattern: 'solid_trim', c1: '#7e22ce', c2: '#f8fafc', shorts: '#7e22ce' },
  { id: 'auxerre', leagueId: 'ligue1', name: 'AJ Auxerre', abbr: 'AJA', ovr: 75, pattern: 'solid_trim', c1: '#f8fafc', c2: '#0284c7', shorts: '#f8fafc' },
  { id: 'rennes', leagueId: 'ligue1', name: 'Stade Rennais', abbr: 'REN', ovr: 78, pattern: 'solid_trim', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'nantes', leagueId: 'ligue1', name: 'FC Nantes', abbr: 'FCN', ovr: 76, pattern: 'solid_trim', c1: '#facc15', c2: '#16a34a', shorts: '#facc15' },
  { id: 'reims', leagueId: 'ligue1', name: 'Stade de Reims', abbr: 'SDR', ovr: 76, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'angers', leagueId: 'ligue1', name: 'Angers SCO', abbr: 'ANG', ovr: 74, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'saintetienne', leagueId: 'ligue1', name: 'Saint-Étienne', abbr: 'ASS', ovr: 75, pattern: 'solid_trim', c1: '#16a34a', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'lehavre', leagueId: 'ligue1', name: 'Le Havre', abbr: 'HAC', ovr: 74, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#38bdf8', shorts: '#1e3a8a' },
  { id: 'montpellier', leagueId: 'ligue1', name: 'Montpellier', abbr: 'MHS', ovr: 75, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#f97316', shorts: '#1e3a8a' },
  { id: 'lorient', leagueId: 'ligue1', name: 'FC Lorient', abbr: 'FCL', ovr: 74, pattern: 'solid_trim', c1: '#f97316', c2: '#111827', shorts: '#111827' },
  { id: 'metz', leagueId: 'ligue1', name: 'FC Metz', abbr: 'MET', ovr: 74, pattern: 'solid_trim', c1: '#7c1d34', c2: '#f8fafc', shorts: '#7c1d34' },

  // ================= PRIMEIRA LIGA PORTUGAL (+19 pois Benfica é movido para primeira_pt) =================
  { id: 'sporting', leagueId: 'primeira_pt', name: 'Sporting CP', abbr: 'SCP', ovr: 83, pattern: 'hoops', c1: '#16a34a', c2: '#f8fafc', shorts: '#111827', stars: ['Israel', 'Diomande', 'Hjulmand', 'Pedro G.', 'Gyökeres'] },
  { id: 'porto', leagueId: 'primeira_pt', name: 'FC Porto', abbr: 'FCP', ovr: 82, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8', stars: ['Diogo Costa', 'Nehuen P.', 'Varela', 'Fábio V.', 'Samu'] },
  { id: 'braga', leagueId: 'primeira_pt', name: 'SC Braga', abbr: 'SCB', ovr: 79, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'vitoriasc', leagueId: 'primeira_pt', name: 'Vitória SC', abbr: 'VSC', ovr: 77, pattern: 'solid_trim', c1: '#f8fafc', c2: '#111827', shorts: '#111827' },
  { id: 'santaclara', leagueId: 'primeira_pt', name: 'Santa Clara', abbr: 'STC', ovr: 75, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'famalicao', leagueId: 'primeira_pt', name: 'Famalicão', abbr: 'FAM', ovr: 74, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#f8fafc', shorts: '#1e3a8a' },
  { id: 'casapia', leagueId: 'primeira_pt', name: 'Casa Pia', abbr: 'CPA', ovr: 73, pattern: 'solid_trim', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'moreirense', leagueId: 'primeira_pt', name: 'Moreirense', abbr: 'MOR', ovr: 73, pattern: 'hoops', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'estoril', leagueId: 'primeira_pt', name: 'Estoril Praia', abbr: 'EST', ovr: 73, pattern: 'solid_trim', c1: '#facc15', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'rioave', leagueId: 'primeira_pt', name: 'Rio Ave', abbr: 'RIO', ovr: 73, pattern: 'stripes_v', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'arouca', leagueId: 'primeira_pt', name: 'FC Arouca', abbr: 'ARO', ovr: 72, pattern: 'solid_trim', c1: '#facc15', c2: '#1e3a8a', shorts: '#1e3a8a' },
  { id: 'gilvicente', leagueId: 'primeira_pt', name: 'Gil Vicente', abbr: 'GIL', ovr: 72, pattern: 'solid_trim', c1: '#dc2626', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'nacionalpt', leagueId: 'primeira_pt', name: 'CD Nacional', abbr: 'NAC', ovr: 72, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'estrela', leagueId: 'primeira_pt', name: 'Estrela Amadora', abbr: 'AMA', ovr: 71, pattern: 'tricolor_v', c1: '#dc2626', c2: '#16a34a', c3: '#f8fafc', shorts: '#f8fafc' },
  { id: 'avs', leagueId: 'primeira_pt', name: 'AVS', abbr: 'AVS', ovr: 71, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'farense', leagueId: 'primeira_pt', name: 'SC Farense', abbr: 'FAR', ovr: 71, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'boavistapt', leagueId: 'primeira_pt', name: 'Boavista', abbr: 'BOA', ovr: 72, pattern: 'hoops', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'maritimo', leagueId: 'primeira_pt', name: 'Marítimo', abbr: 'MAR', ovr: 71, pattern: 'stripes_v', c1: '#16a34a', c2: '#dc2626', shorts: '#16a34a' },
  { id: 'pacosferreira', leagueId: 'primeira_pt', name: 'Paços Ferreira', abbr: 'PAF', ovr: 70, pattern: 'solid_trim', c1: '#facc15', c2: '#16a34a', shorts: '#16a34a' },

  // ================= EREDIVISIE PAÍSES BAIXOS (20) =================
  { id: 'psv', leagueId: 'eredivisie', name: 'PSV Eindhoven', abbr: 'PSV', ovr: 82, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#111827', stars: ['Benítez', 'Boscagli', 'Veerman', 'Tillman', 'De Jong'] },
  { id: 'ajax', leagueId: 'eredivisie', name: 'Ajax', abbr: 'AJA', ovr: 81, pattern: 'chest_band', c1: '#f8fafc', c2: '#dc2626', shorts: '#f8fafc', stars: ['Pasveer', 'Hato', 'Henderson', 'Taylor', 'Brobbey'] },
  { id: 'feyenoord', leagueId: 'eredivisie', name: 'Feyenoord', abbr: 'FEY', ovr: 81, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#111827', stars: ['Wellenreuther', 'Hancko', 'Timber', 'Milambo', 'Giménez'] },
  { id: 'utrecht', leagueId: 'eredivisie', name: 'FC Utrecht', abbr: 'UTR', ovr: 77, pattern: 'sash', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'az', leagueId: 'eredivisie', name: 'AZ Alkmaar', abbr: 'AZ', ovr: 78, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'twente', leagueId: 'eredivisie', name: 'FC Twente', abbr: 'TWE', ovr: 78, pattern: 'solid_trim', c1: '#dc2626', c2: '#b91c1c', shorts: '#dc2626' },
  { id: 'goahead', leagueId: 'eredivisie', name: 'Go Ahead Eagles', abbr: 'GAE', ovr: 75, pattern: 'chest_band', c1: '#dc2626', c2: '#facc15', shorts: '#dc2626' },
  { id: 'groningen', leagueId: 'eredivisie', name: 'FC Groningen', abbr: 'GRO', ovr: 74, pattern: 'stripes_v', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'heerenveen', leagueId: 'eredivisie', name: 'Heerenveen', abbr: 'HEE', ovr: 74, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'nec', leagueId: 'eredivisie', name: 'NEC Nijmegen', abbr: 'NEC', ovr: 74, pattern: 'tricolor_v', c1: '#dc2626', c2: '#16a34a', c3: '#111827', shorts: '#111827' },
  { id: 'fortuna', leagueId: 'eredivisie', name: 'Fortuna Sittard', abbr: 'FOR', ovr: 73, pattern: 'solid_trim', c1: '#facc15', c2: '#16a34a', shorts: '#16a34a' },
  { id: 'spartarot', leagueId: 'eredivisie', name: 'Sparta Rotterdam', abbr: 'SPA', ovr: 74, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#111827' },
  { id: 'peczwolle', leagueId: 'eredivisie', name: 'PEC Zwolle', abbr: 'PEC', ovr: 73, pattern: 'hoops', c1: '#0284c7', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'heracles', leagueId: 'eredivisie', name: 'Heracles Almelo', abbr: 'HER', ovr: 73, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'nacbreda', leagueId: 'eredivisie', name: 'NAC Breda', abbr: 'NAC', ovr: 72, pattern: 'sash', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'willemii', leagueId: 'eredivisie', name: 'Willem II', abbr: 'WIL', ovr: 72, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', c3: '#1d4ed8', shorts: '#f8fafc' },
  { id: 'almere', leagueId: 'eredivisie', name: 'Almere City', abbr: 'ALM', ovr: 71, pattern: 'solid_trim', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'rkc', leagueId: 'eredivisie', name: 'RKC Waalwijk', abbr: 'RKC', ovr: 71, pattern: 'solid_trim', c1: '#facc15', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'volendam', leagueId: 'eredivisie', name: 'FC Volendam', abbr: 'VOL', ovr: 71, pattern: 'solid_trim', c1: '#f97316', c2: '#111827', shorts: '#111827' },
  { id: 'vitesse', leagueId: 'eredivisie', name: 'Vitesse', abbr: 'VIT', ovr: 72, pattern: 'stripes_v', c1: '#facc15', c2: '#111827', shorts: '#f8fafc' },

  // ================= PRO LEAGUE BÉLGICA (20) =================
  { id: 'clubbrugge', leagueId: 'proleague_be', name: 'Club Brugge', abbr: 'BRU', ovr: 80, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#111827', shorts: '#111827', stars: ['Mignolet', 'Mechele', 'Vanaken', 'Tzolis', 'Jutglà'] },
  { id: 'genk', leagueId: 'proleague_be', name: 'KRC Genk', abbr: 'GNK', ovr: 79, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'unionsg', leagueId: 'proleague_be', name: 'Union SG', abbr: 'USG', ovr: 79, pattern: 'solid_trim', c1: '#facc15', c2: '#1e3a8a', shorts: '#1e3a8a' },
  { id: 'anderlecht', leagueId: 'proleague_be', name: 'Anderlecht', abbr: 'AND', ovr: 79, pattern: 'solid_trim', c1: '#6b21a8', c2: '#f8fafc', shorts: '#6b21a8' },
  { id: 'antwerp', leagueId: 'proleague_be', name: 'Royal Antwerp', abbr: 'ANT', ovr: 78, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'gent', leagueId: 'proleague_be', name: 'KAA Gent', abbr: 'GNT', ovr: 77, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'standard', leagueId: 'proleague_be', name: 'Standard Liège', abbr: 'STA', ovr: 75, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'mechelen', leagueId: 'proleague_be', name: 'KV Mechelen', abbr: 'KVM', ovr: 75, pattern: 'stripes_v', c1: '#facc15', c2: '#dc2626', shorts: '#111827' },
  { id: 'charleroi', leagueId: 'proleague_be', name: 'Charleroi', abbr: 'CHA', ovr: 74, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'westerlo', leagueId: 'proleague_be', name: 'Westerlo', abbr: 'WES', ovr: 74, pattern: 'solid_trim', c1: '#facc15', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'cercle', leagueId: 'proleague_be', name: 'Cercle Brugge', abbr: 'CER', ovr: 75, pattern: 'solid_trim', c1: '#16a34a', c2: '#111827', shorts: '#111827' },
  { id: 'sttruiden', leagueId: 'proleague_be', name: 'Sint-Truiden', abbr: 'STV', ovr: 73, pattern: 'solid_trim', c1: '#facc15', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'ohl', leagueId: 'proleague_be', name: 'OH Leuven', abbr: 'OHL', ovr: 73, pattern: 'solid_trim', c1: '#f8fafc', c2: '#dc2626', shorts: '#f8fafc' },
  { id: 'kortrijk', leagueId: 'proleague_be', name: 'KV Kortrijk', abbr: 'KVK', ovr: 72, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'dender', leagueId: 'proleague_be', name: 'FCV Dender', abbr: 'DEN', ovr: 71, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#111827', shorts: '#111827' },
  { id: 'beerschot', leagueId: 'proleague_be', name: 'Beerschot', abbr: 'BEE', ovr: 71, pattern: 'solid_trim', c1: '#6b21a8', c2: '#f8fafc', shorts: '#6b21a8' },
  { id: 'zultewaregem', leagueId: 'proleague_be', name: 'Zulte Waregem', abbr: 'ZWA', ovr: 72, pattern: 'solid_trim', c1: '#7c1d34', c2: '#16a34a', shorts: '#7c1d34' },
  { id: 'eupen', leagueId: 'proleague_be', name: 'KAS Eupen', abbr: 'EUP', ovr: 71, pattern: 'solid_trim', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'rwdbru', leagueId: 'proleague_be', name: 'RWD Molenbeek', abbr: 'RWD', ovr: 71, pattern: 'solid_trim', c1: '#111827', c2: '#dc2626', shorts: '#111827' },
  { id: 'lokeren', leagueId: 'proleague_be', name: 'Beveren', abbr: 'BEV', ovr: 70, pattern: 'solid_trim', c1: '#facc15', c2: '#1d4ed8', shorts: '#1d4ed8' },

  // ================= SÜPER LIG TURQUIA (20) =================
  { id: 'galatasaray', leagueId: 'superlig_tr', name: 'Galatasaray', abbr: 'GAL', ovr: 82, pattern: 'stripes_v', c1: '#dc2626', c2: '#facc15', shorts: '#f8fafc', stars: ['Muslera', 'Davinson S.', 'Torreira', 'Mertens', 'Osimhen'] },
  { id: 'fenerbahce', leagueId: 'superlig_tr', name: 'Fenerbahçe', abbr: 'FEN', ovr: 81, pattern: 'stripes_v', c1: '#facc15', c2: '#1e3a8a', shorts: '#f8fafc', stars: ['Livaković', 'Djiku', 'Fred', 'Tadić', 'En-Nesyri'] },
  { id: 'besiktas', leagueId: 'superlig_tr', name: 'Beşiktaş', abbr: 'BJK', ovr: 79, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827', stars: ['Mert G.', 'Paulista', 'Gedson F.', 'Rafa Silva', 'Immobile'] },
  { id: 'trabzonspor', leagueId: 'superlig_tr', name: 'Trabzonspor', abbr: 'TRA', ovr: 78, pattern: 'stripes_v', c1: '#7c1d34', c2: '#38bdf8', shorts: '#1e3a8a' },
  { id: 'basaksehir', leagueId: 'superlig_tr', name: 'Başakşehir', abbr: 'IBF', ovr: 76, pattern: 'solid_trim', c1: '#f97316', c2: '#1e3a8a', shorts: '#1e3a8a' },
  { id: 'samsunspor', leagueId: 'superlig_tr', name: 'Samsunspor', abbr: 'SAM', ovr: 76, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'eyupspor', leagueId: 'superlig_tr', name: 'Eyüpspor', abbr: 'EYU', ovr: 75, pattern: 'solid_trim', c1: '#6b21a8', c2: '#facc15', shorts: '#6b21a8' },
  { id: 'goztepe', leagueId: 'superlig_tr', name: 'Göztepe', abbr: 'GOZ', ovr: 75, pattern: 'stripes_v', c1: '#facc15', c2: '#dc2626', shorts: '#dc2626' },
  { id: 'kasimpasa', leagueId: 'superlig_tr', name: 'Kasımpaşa', abbr: 'KAS', ovr: 74, pattern: 'stripes_v', c1: '#1e3a8a', c2: '#f8fafc', shorts: '#1e3a8a' },
  { id: 'konyaspor', leagueId: 'superlig_tr', name: 'Konyaspor', abbr: 'KON', ovr: 74, pattern: 'stripes_v', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'rizespor', leagueId: 'superlig_tr', name: 'Ç. Rizespor', abbr: 'RIZ', ovr: 74, pattern: 'stripes_v', c1: '#16a34a', c2: '#1d4ed8', shorts: '#16a34a' },
  { id: 'gaziantep', leagueId: 'superlig_tr', name: 'Gaziantep FK', abbr: 'GFK', ovr: 73, pattern: 'stripes_v', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'antalyaspor', leagueId: 'superlig_tr', name: 'Antalyaspor', abbr: 'ANT', ovr: 74, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'alanyaspor', leagueId: 'superlig_tr', name: 'Alanyaspor', abbr: 'ALA', ovr: 74, pattern: 'solid_trim', c1: '#f97316', c2: '#16a34a', shorts: '#16a34a' },
  { id: 'sivasspor', leagueId: 'superlig_tr', name: 'Sivasspor', abbr: 'SIV', ovr: 73, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'kayserispor', leagueId: 'superlig_tr', name: 'Kayserispor', abbr: 'KAY', ovr: 73, pattern: 'solid_trim', c1: '#facc15', c2: '#dc2626', shorts: '#dc2626' },
  { id: 'hatayspor', leagueId: 'superlig_tr', name: 'Hatayspor', abbr: 'HAT', ovr: 72, pattern: 'solid_trim', c1: '#7c1d34', c2: '#f8fafc', shorts: '#7c1d34' },
  { id: 'adanademir', leagueId: 'superlig_tr', name: 'Adana Demirspor', abbr: 'ADS', ovr: 72, pattern: 'stripes_v', c1: '#0284c7', c2: '#1e3a8a', shorts: '#1e3a8a' },
  { id: 'bodrum', leagueId: 'superlig_tr', name: 'Bodrum FK', abbr: 'BOD', ovr: 72, pattern: 'solid_trim', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'ankaragucu', leagueId: 'superlig_tr', name: 'Ankaragücü', abbr: 'ANK', ovr: 72, pattern: 'stripes_v', c1: '#1e3a8a', c2: '#facc15', shorts: '#1e3a8a' },

  // ================= ESCÓCIA (20) =================
  { id: 'celtic', leagueId: 'scotland', name: 'Celtic', abbr: 'CEL', ovr: 79, pattern: 'hoops', c1: '#16a34a', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Schmeichel', 'Carter-V.', 'McGregor', 'Hatate', 'Furuhashi'] },
  { id: 'rangers', leagueId: 'scotland', name: 'Rangers', abbr: 'RAN', ovr: 78, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Butland', 'Tavernier', 'Raskin', 'Černý', 'Dessers'] },
  { id: 'aberdeen', leagueId: 'scotland', name: 'Aberdeen', abbr: 'ABE', ovr: 74, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'hearts', leagueId: 'scotland', name: 'Hearts', abbr: 'HEA', ovr: 74, pattern: 'solid_trim', c1: '#7c1d34', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'hibernian', leagueId: 'scotland', name: 'Hibernian', abbr: 'HIB', ovr: 73, pattern: 'solid_trim', c1: '#15803d', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'dundeeutd', leagueId: 'scotland', name: 'Dundee United', abbr: 'DUN', ovr: 72, pattern: 'solid_trim', c1: '#f97316', c2: '#111827', shorts: '#111827' },
  { id: 'motherwell', leagueId: 'scotland', name: 'Motherwell', abbr: 'MOT', ovr: 72, pattern: 'chest_band', c1: '#f59e0b', c2: '#7c1d34', shorts: '#7c1d34' },
  { id: 'stmirren', leagueId: 'scotland', name: 'St Mirren', abbr: 'STM', ovr: 72, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'kilmarnock', leagueId: 'scotland', name: 'Kilmarnock', abbr: 'KIL', ovr: 72, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'dundee', leagueId: 'scotland', name: 'Dundee FC', abbr: 'DFC', ovr: 71, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#f8fafc', shorts: '#1e3a8a' },
  { id: 'rosscounty', leagueId: 'scotland', name: 'Ross County', abbr: 'ROS', ovr: 70, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#dc2626', shorts: '#1e3a8a' },
  { id: 'stjohnstone', leagueId: 'scotland', name: 'St Johnstone', abbr: 'STJ', ovr: 70, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'livingston', leagueId: 'scotland', name: 'Livingston', abbr: 'LIV', ovr: 69, pattern: 'solid_trim', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'falkirk', leagueId: 'scotland', name: 'Falkirk', abbr: 'FAL', ovr: 69, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'partick', leagueId: 'scotland', name: 'Partick Thistle', abbr: 'PAR', ovr: 68, pattern: 'hoops', c1: '#facc15', c2: '#dc2626', shorts: '#111827' },
  { id: 'ayrunited', leagueId: 'scotland', name: 'Ayr United', abbr: 'AYR', ovr: 68, pattern: 'solid_trim', c1: '#f8fafc', c2: '#111827', shorts: '#111827' },
  { id: 'dunfermline', leagueId: 'scotland', name: 'Dunfermline', abbr: 'DNF', ovr: 68, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'raith', leagueId: 'scotland', name: 'Raith Rovers', abbr: 'RAI', ovr: 68, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#f8fafc', shorts: '#1e3a8a' },
  { id: 'morton', leagueId: 'scotland', name: 'Greenock Morton', abbr: 'MOR', ovr: 67, pattern: 'hoops', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'queenpark', leagueId: 'scotland', name: "Queen's Park", abbr: 'QPK', ovr: 67, pattern: 'hoops', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },

  // ================= GRÉCIA (20) =================
  { id: 'olympiacos', leagueId: 'greece', name: 'Olympiacos', abbr: 'OLY', ovr: 79, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626', stars: ['Tzolakis', 'Carmo', 'Hezze', 'Chiquinho', 'El Kaabi'] },
  { id: 'paok', leagueId: 'greece', name: 'PAOK', abbr: 'PAO', ovr: 78, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'aek', leagueId: 'greece', name: 'AEK Atenas', abbr: 'AEK', ovr: 78, pattern: 'stripes_v', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'panathinaikos', leagueId: 'greece', name: 'Panathinaikos', abbr: 'PAN', ovr: 78, pattern: 'solid_trim', c1: '#16a34a', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'aris', leagueId: 'greece', name: 'Aris Salônica', abbr: 'ARI', ovr: 75, pattern: 'stripes_v', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'ofi', leagueId: 'greece', name: 'OFI Creta', abbr: 'OFI', ovr: 73, pattern: 'solid_trim', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'asteras', leagueId: 'greece', name: 'Asteras Tripolis', abbr: 'AST', ovr: 73, pattern: 'solid_trim', c1: '#facc15', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'atromitos', leagueId: 'greece', name: 'Atromitos', abbr: 'ATR', ovr: 73, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'panetolikos', leagueId: 'greece', name: 'Panetolikos', abbr: 'PNE', ovr: 72, pattern: 'solid_trim', c1: '#facc15', c2: '#1e3a8a', shorts: '#1e3a8a' },
  { id: 'volos', leagueId: 'greece', name: 'Volos NFC', abbr: 'VOL', ovr: 71, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#dc2626', shorts: '#1e3a8a' },
  { id: 'panserraikos', leagueId: 'greece', name: 'Panserraikos', abbr: 'PSR', ovr: 71, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'levadiakos', leagueId: 'greece', name: 'Levadiakos', abbr: 'LEV', ovr: 70, pattern: 'solid_trim', c1: '#16a34a', c2: '#1d4ed8', shorts: '#16a34a' },
  { id: 'kallithea', leagueId: 'greece', name: 'Athens Kallithea', abbr: 'KAL', ovr: 70, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#f8fafc', shorts: '#1e3a8a' },
  { id: 'lamia', leagueId: 'greece', name: 'PAS Lamia', abbr: 'LAM', ovr: 70, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'larissa', leagueId: 'greece', name: 'AE Larissa', abbr: 'AEL', ovr: 70, pattern: 'solid_trim', c1: '#7c1d34', c2: '#f8fafc', shorts: '#7c1d34' },
  { id: 'iraklis', leagueId: 'greece', name: 'Iraklis', abbr: 'IRA', ovr: 70, pattern: 'solid_trim', c1: '#0284c7', c2: '#f8fafc', shorts: '#0284c7' },
  { id: 'pasgiannina', leagueId: 'greece', name: 'PAS Giannina', abbr: 'PAS', ovr: 70, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'kifisia', leagueId: 'greece', name: 'Kifisia', abbr: 'KIF', ovr: 69, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#f8fafc', shorts: '#1e3a8a' },
  { id: 'panionios', leagueId: 'greece', name: 'Panionios', abbr: 'PGSS', ovr: 69, pattern: 'stripes_v', c1: '#dc2626', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'kalamata', leagueId: 'greece', name: 'Kalamata', abbr: 'KALM', ovr: 68, pattern: 'solid_trim', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },

  // ================= SUÍÇA (20) =================
  { id: 'youngboys', leagueId: 'switzerland', name: 'Young Boys', abbr: 'YB', ovr: 77, pattern: 'solid_trim', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'basel', leagueId: 'switzerland', name: 'FC Basel', abbr: 'BAS', ovr: 77, pattern: 'stripes_v', c1: '#dc2626', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'lugano', leagueId: 'switzerland', name: 'FC Lugano', abbr: 'LUG', ovr: 76, pattern: 'sash', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'servette', leagueId: 'switzerland', name: 'Servette', abbr: 'SER', ovr: 76, pattern: 'solid_trim', c1: '#7c1d34', c2: '#f8fafc', shorts: '#7c1d34' },
  { id: 'zurich', leagueId: 'switzerland', name: 'FC Zürich', abbr: 'FCZ', ovr: 75, pattern: 'solid_trim', c1: '#f8fafc', c2: '#1d4ed8', shorts: '#f8fafc' },
  { id: 'stgallen', leagueId: 'switzerland', name: 'St. Gallen', abbr: 'STG', ovr: 75, pattern: 'solid_trim', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'luzern', leagueId: 'switzerland', name: 'FC Luzern', abbr: 'LUZ', ovr: 74, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'lausanne', leagueId: 'switzerland', name: 'Lausanne-Sport', abbr: 'LAU', ovr: 74, pattern: 'solid_trim', c1: '#f8fafc', c2: '#1d4ed8', shorts: '#f8fafc' },
  { id: 'sion', leagueId: 'switzerland', name: 'FC Sion', abbr: 'SIO', ovr: 73, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'grasshopper', leagueId: 'switzerland', name: 'Grasshopper', abbr: 'GCZ', ovr: 73, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'yverdon', leagueId: 'switzerland', name: 'Yverdon', abbr: 'YVE', ovr: 71, pattern: 'solid_trim', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'winterthur', leagueId: 'switzerland', name: 'Winterthur', abbr: 'WIN', ovr: 71, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'thun', leagueId: 'switzerland', name: 'FC Thun', abbr: 'THU', ovr: 71, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'aarau', leagueId: 'switzerland', name: 'FC Aarau', abbr: 'AAR', ovr: 70, pattern: 'solid_trim', c1: '#111827', c2: '#dc2626', shorts: '#111827' },
  { id: 'etoilecarouge', leagueId: 'switzerland', name: 'Étoile Carouge', abbr: 'ETC', ovr: 69, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'waduz', leagueId: 'switzerland', name: 'FC Vaduz', abbr: 'VAD', ovr: 70, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'bellinzona', leagueId: 'switzerland', name: 'Bellinzona', abbr: 'BEL', ovr: 69, pattern: 'solid_trim', c1: '#7c1d34', c2: '#f8fafc', shorts: '#7c1d34' },
  { id: 'wil', leagueId: 'switzerland', name: 'FC Wil', abbr: 'WIL', ovr: 69, pattern: 'solid_trim', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'xamax', leagueId: 'switzerland', name: 'Neuchâtel Xamax', abbr: 'XAM', ovr: 70, pattern: 'stripes_v', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'stadelausanne', leagueId: 'switzerland', name: 'Stade Lausanne', abbr: 'SLO', ovr: 69, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc' },

  // ================= ÁUSTRIA (20) =================
  { id: 'salzburg', leagueId: 'austria', name: 'RB Salzburg', abbr: 'RBS', ovr: 79, pattern: 'solid_trim', c1: '#f8fafc', c2: '#dc2626', shorts: '#dc2626' },
  { id: 'sturm', leagueId: 'austria', name: 'Sturm Graz', abbr: 'STU', ovr: 78, pattern: 'solid_trim', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'rapidwien', leagueId: 'austria', name: 'Rapid Viena', abbr: 'RAP', ovr: 76, pattern: 'stripes_v', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'austriawien', leagueId: 'austria', name: 'Áustria Viena', abbr: 'FAK', ovr: 76, pattern: 'solid_trim', c1: '#6b21a8', c2: '#f8fafc', shorts: '#6b21a8' },
  { id: 'lask', leagueId: 'austria', name: 'LASK', abbr: 'LAS', ovr: 75, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'wolfsberger', leagueId: 'austria', name: 'Wolfsberger AC', abbr: 'WAC', ovr: 74, pattern: 'solid_trim', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'blauweiss', leagueId: 'austria', name: 'Blau-Weiß Linz', abbr: 'BWL', ovr: 73, pattern: 'solid_trim', c1: '#0284c7', c2: '#f8fafc', shorts: '#0284c7' },
  { id: 'hartberg', leagueId: 'austria', name: 'TSV Hartberg', abbr: 'HAR', ovr: 72, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'klagenfurt', leagueId: 'austria', name: 'A. Klagenfurt', abbr: 'SKA', ovr: 72, pattern: 'solid_trim', c1: '#6b21a8', c2: '#f8fafc', shorts: '#6b21a8' },
  { id: 'tirol', leagueId: 'austria', name: 'WSG Tirol', abbr: 'WSG', ovr: 71, pattern: 'solid_trim', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'gak', leagueId: 'austria', name: 'Grazer AK', abbr: 'GAK', ovr: 71, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'altach', leagueId: 'austria', name: 'SCR Altach', abbr: 'ALT', ovr: 70, pattern: 'solid_trim', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'ried', leagueId: 'austria', name: 'SV Ried', abbr: 'RIE', ovr: 70, pattern: 'solid_trim', c1: '#16a34a', c2: '#111827', shorts: '#111827' },
  { id: 'admira', leagueId: 'austria', name: 'Admira Wacker', abbr: 'ADM', ovr: 70, pattern: 'solid_trim', c1: '#111827', c2: '#dc2626', shorts: '#111827' },
  { id: 'stpolten', leagueId: 'austria', name: 'SKN St. Pölten', abbr: 'STP', ovr: 69, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#facc15', shorts: '#1d4ed8' },
  { id: 'lustenau', leagueId: 'austria', name: 'A. Lustenau', abbr: 'ALU', ovr: 69, pattern: 'solid_trim', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'firstvienna', leagueId: 'austria', name: 'First Vienna', abbr: 'FVF', ovr: 69, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#facc15', shorts: '#1d4ed8' },
  { id: 'bregenz', leagueId: 'austria', name: 'SW Bregenz', abbr: 'SWB', ovr: 68, pattern: 'solid_trim', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'kapfenberg', leagueId: 'austria', name: 'Kapfenberg', abbr: 'KSV', ovr: 68, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'horn', leagueId: 'austria', name: 'SV Horn', abbr: 'HOR', ovr: 68, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#f8fafc', shorts: '#1e3a8a' },

  // ================= ARGENTINA PRIMERA DIVISIÓN (+16 para completar 20) =================
  { id: 'sanlorenzo', leagueId: 'argentina', name: 'San Lorenzo', abbr: 'SLO', ovr: 77, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#dc2626', shorts: '#1e3a8a' },
  { id: 'estudiantes', leagueId: 'argentina', name: 'Estudiantes', abbr: 'EST', ovr: 79, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#111827' },
  { id: 'velez', leagueId: 'argentina', name: 'Vélez Sarsfield', abbr: 'VEL', ovr: 79, pattern: 'tricolor_v', c1: '#f8fafc', c2: '#1d4ed8', shorts: '#f8fafc' },
  { id: 'talleres', leagueId: 'argentina', name: 'Talleres', abbr: 'TAL', ovr: 78, pattern: 'stripes_v', c1: '#1e3a8a', c2: '#f8fafc', shorts: '#1e3a8a' },
  { id: 'huracan', leagueId: 'argentina', name: 'Huracán', abbr: 'HUR', ovr: 77, pattern: 'solid_trim', c1: '#f8fafc', c2: '#dc2626', shorts: '#f8fafc' },
  { id: 'lanus', leagueId: 'argentina', name: 'Lanús', abbr: 'LAN', ovr: 77, pattern: 'solid_trim', c1: '#7c1d34', c2: '#f8fafc', shorts: '#7c1d34' },
  { id: 'rosario', leagueId: 'argentina', name: 'Rosario Central', abbr: 'ROS', ovr: 77, pattern: 'stripes_v', c1: '#1e3a8a', c2: '#facc15', shorts: '#1e3a8a' },
  { id: 'newells', leagueId: 'argentina', name: "Newell's Old Boys", abbr: 'NOB', ovr: 76, pattern: 'stripes_v', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'argentinos', leagueId: 'argentina', name: 'Argentinos Jrs', abbr: 'ARG', ovr: 76, pattern: 'sash', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'defensa', leagueId: 'argentina', name: 'Defensa y Justicia', abbr: 'DYJ', ovr: 75, pattern: 'solid_trim', c1: '#facc15', c2: '#16a34a', shorts: '#16a34a' },
  { id: 'godoycruz', leagueId: 'argentina', name: 'Godoy Cruz', abbr: 'GOD', ovr: 75, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'belgrano', leagueId: 'argentina', name: 'Belgrano', abbr: 'BEL', ovr: 75, pattern: 'solid_trim', c1: '#38bdf8', c2: '#111827', shorts: '#111827' },
  { id: 'banfield', leagueId: 'argentina', name: 'Banfield', abbr: 'BAN', ovr: 74, pattern: 'sash', c1: '#f8fafc', c2: '#16a34a', shorts: '#f8fafc' },
  { id: 'gimnasia', leagueId: 'argentina', name: 'Gimnasia LP', abbr: 'GEL', ovr: 74, pattern: 'chest_band', c1: '#f8fafc', c2: '#1e3a8a', shorts: '#f8fafc' },
  { id: 'platense', leagueId: 'argentina', name: 'Platense', abbr: 'PLA', ovr: 74, pattern: 'chest_band', c1: '#f8fafc', c2: '#5c3a21', shorts: '#5c3a21' },
  { id: 'tigre', leagueId: 'argentina', name: 'Tigre', abbr: 'TIG', ovr: 74, pattern: 'chest_band', c1: '#1d4ed8', c2: '#dc2626', shorts: '#1d4ed8' },

  // ================= COLÔMBIA PRIMERA A (+16 para completar 20) =================
  { id: 'santafe', leagueId: 'colombia', name: 'Ind. Santa Fe', abbr: 'SFE', ovr: 76, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'tolima', leagueId: 'colombia', name: 'Deportes Tolima', abbr: 'TOL', ovr: 75, pattern: 'sash', c1: '#7c1d34', c2: '#facc15', shorts: '#7c1d34' },
  { id: 'medellin', leagueId: 'colombia', name: 'Ind. Medellín', abbr: 'DIM', ovr: 75, pattern: 'solid_trim', c1: '#dc2626', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'deportivocali', leagueId: 'colombia', name: 'Deportivo Cali', abbr: 'CAL', ovr: 74, pattern: 'solid_trim', c1: '#16a34a', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'oncecaldas', leagueId: 'colombia', name: 'Once Caldas', abbr: 'ONC', ovr: 74, pattern: 'solid_trim', c1: '#f8fafc', c2: '#16a34a', shorts: '#f8fafc' },
  { id: 'bucaramanga', leagueId: 'colombia', name: 'Bucaramanga', abbr: 'BUC', ovr: 74, pattern: 'solid_trim', c1: '#facc15', c2: '#16a34a', shorts: '#16a34a' },
  { id: 'pereira', leagueId: 'colombia', name: 'Dep. Pereira', abbr: 'PER', ovr: 73, pattern: 'stripes_v', c1: '#facc15', c2: '#dc2626', shorts: '#dc2626' },
  { id: 'aguilas', leagueId: 'colombia', name: 'Águilas Doradas', abbr: 'AGU', ovr: 73, pattern: 'solid_trim', c1: '#eab308', c2: '#111827', shorts: '#111827' },
  { id: 'laequidad', leagueId: 'colombia', name: 'La Equidad', abbr: 'EQU', ovr: 72, pattern: 'solid_trim', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'pasto', leagueId: 'colombia', name: 'Deportivo Pasto', abbr: 'PAS', ovr: 72, pattern: 'solid_trim', c1: '#dc2626', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'fortalezaceif', leagueId: 'colombia', name: 'Fortaleza CEIF', abbr: 'FCE', ovr: 71, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#dc2626', shorts: '#1d4ed8' },
  { id: 'alianzafc', leagueId: 'colombia', name: 'Alianza FC', abbr: 'ALI', ovr: 71, pattern: 'stripes_v', c1: '#1e3a8a', c2: '#38bdf8', shorts: '#1e3a8a' },
  { id: 'patriotas', leagueId: 'colombia', name: 'Patriotas', abbr: 'PAT', ovr: 70, pattern: 'solid_trim', c1: '#dc2626', c2: '#16a34a', shorts: '#dc2626' },
  { id: 'envigado', leagueId: 'colombia', name: 'Envigado FC', abbr: 'ENV', ovr: 70, pattern: 'solid_trim', c1: '#f97316', c2: '#16a34a', shorts: '#16a34a' },
  { id: 'chicofc', leagueId: 'colombia', name: 'Boyacá Chicó', abbr: 'CHI', ovr: 70, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'unionmagdalena', leagueId: 'colombia', name: 'Unión Magdalena', abbr: 'UMA', ovr: 70, pattern: 'stripes_v', c1: '#dc2626', c2: '#1d4ed8', shorts: '#1d4ed8' },

  // ================= CHILE PRIMERA DIVISIÓN (20) =================
  { id: 'colocolo', leagueId: 'chile', name: 'Colo-Colo', abbr: 'COL', ovr: 77, pattern: 'solid_trim', c1: '#f8fafc', c2: '#111827', shorts: '#111827', stars: ['Cortés', 'Falcón', 'Vidal', 'Palacios', 'Correa'] },
  { id: 'uchile', leagueId: 'chile', name: 'Univ. de Chile', abbr: 'UCH', ovr: 76, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#dc2626', shorts: '#1d4ed8' },
  { id: 'ucatolica', leagueId: 'chile', name: 'U. Católica', abbr: 'UC', ovr: 75, pattern: 'chest_band', c1: '#f8fafc', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'palestino', leagueId: 'chile', name: 'Palestino', abbr: 'PAL', ovr: 74, pattern: 'tricolor_v', c1: '#16a34a', c2: '#dc2626', c3: '#f8fafc', shorts: '#111827' },
  { id: 'coquimbo', leagueId: 'chile', name: 'Coquimbo Unido', abbr: 'COQ', ovr: 73, pattern: 'solid_trim', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'evertoncl', leagueId: 'chile', name: 'Everton Viña', abbr: 'EVE', ovr: 73, pattern: 'chest_band', c1: '#1e3a8a', c2: '#facc15', shorts: '#1e3a8a' },
  { id: 'unionespanola', leagueId: 'chile', name: 'Unión Española', abbr: 'UE', ovr: 73, pattern: 'solid_trim', c1: '#dc2626', c2: '#facc15', shorts: '#1e3a8a' },
  { id: 'iquique', leagueId: 'chile', name: 'Dep. Iquique', abbr: 'IQU', ovr: 73, pattern: 'solid_trim', c1: '#38bdf8', c2: '#f8fafc', shorts: '#38bdf8' },
  { id: 'huachipato', leagueId: 'chile', name: 'Huachipato', abbr: 'HUA', ovr: 73, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#111827', shorts: '#111827' },
  { id: 'nublense', leagueId: 'chile', name: 'Ñublense', abbr: 'NUB', ovr: 72, pattern: 'solid_trim', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'cobresal', leagueId: 'chile', name: 'Cobresal', abbr: 'COB', ovr: 72, pattern: 'solid_trim', c1: '#f97316', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'audax', leagueId: 'chile', name: 'Audax Italiano', abbr: 'AUD', ovr: 72, pattern: 'solid_trim', c1: '#16a34a', c2: '#dc2626', shorts: '#f8fafc' },
  { id: 'ohiggins', leagueId: 'chile', name: "O'Higgins", abbr: 'OHI', ovr: 72, pattern: 'solid_trim', c1: '#0284c7', c2: '#f8fafc', shorts: '#0284c7' },
  { id: 'unioncalera', leagueId: 'chile', name: 'Unión La Calera', abbr: 'ULC', ovr: 71, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'cobreloa', leagueId: 'chile', name: 'Cobreloa', abbr: 'CBL', ovr: 71, pattern: 'solid_trim', c1: '#f97316', c2: '#f8fafc', shorts: '#f97316' },
  { id: 'laserena', leagueId: 'chile', name: 'La Serena', abbr: 'SER', ovr: 71, pattern: 'solid_trim', c1: '#7c1d34', c2: '#f8fafc', shorts: '#7c1d34' },
  { id: 'limache', leagueId: 'chile', name: 'Limache', abbr: 'LIM', ovr: 70, pattern: 'solid_trim', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'santiagow', leagueId: 'chile', name: 'S. Wanderers', abbr: 'SW', ovr: 70, pattern: 'solid_trim', c1: '#15803d', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'antofagasta', leagueId: 'chile', name: 'Antofagasta', abbr: 'ANT', ovr: 70, pattern: 'solid_trim', c1: '#0284c7', c2: '#f8fafc', shorts: '#0284c7' },
  { id: 'copiapo', leagueId: 'chile', name: 'Copiapó', abbr: 'COP', ovr: 70, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },

  // ================= URUGUAI PRIMERA DIVISIÓN (20) =================
  { id: 'penarol', leagueId: 'uruguay', name: 'Peñarol', abbr: 'PEN', ovr: 78, pattern: 'stripes_v', c1: '#facc15', c2: '#111827', shorts: '#111827', stars: ['Aguerre', 'G. Rodríguez', 'Darias', 'Leo Fernández', 'Silvera'] },
  { id: 'nacionaluy', leagueId: 'uruguay', name: 'Nacional', abbr: 'NAC', ovr: 78, pattern: 'solid_trim', c1: '#f8fafc', c2: '#1d4ed8', c3: '#dc2626', shorts: '#1d4ed8', stars: ['Mejía', 'Coates', 'Oliva', 'Recoba', 'Bentancourt'] },
  { id: 'defensor', leagueId: 'uruguay', name: 'Defensor Sporting', abbr: 'DEF', ovr: 74, pattern: 'solid_trim', c1: '#6b21a8', c2: '#f8fafc', shorts: '#6b21a8' },
  { id: 'liverpooluy', leagueId: 'uruguay', name: 'Liverpool (URU)', abbr: 'LIV', ovr: 74, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#111827', shorts: '#111827' },
  { id: 'bostonriver', leagueId: 'uruguay', name: 'Boston River', abbr: 'BOS', ovr: 73, pattern: 'stripes_v', c1: '#dc2626', c2: '#16a34a', shorts: '#111827' },
  { id: 'danubio', leagueId: 'uruguay', name: 'Danubio', abbr: 'DAN', ovr: 73, pattern: 'sash', c1: '#f8fafc', c2: '#111827', shorts: '#111827' },
  { id: 'cerrolargo', leagueId: 'uruguay', name: 'Cerro Largo', abbr: 'CLA', ovr: 72, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'montevideocity', leagueId: 'uruguay', name: 'M. City Torque', abbr: 'MCT', ovr: 72, pattern: 'solid_trim', c1: '#38bdf8', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'racinguy', leagueId: 'uruguay', name: 'Racing (URU)', abbr: 'RAC', ovr: 72, pattern: 'stripes_v', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'wanderersuy', leagueId: 'uruguay', name: 'M. Wanderers', abbr: 'WAN', ovr: 72, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'miramar', leagueId: 'uruguay', name: 'Miramar Misiones', abbr: 'MIR', ovr: 70, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'riveruy', leagueId: 'uruguay', name: 'River Plate (URU)', abbr: 'RIV', ovr: 72, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#111827' },
  { id: 'cerrouy', leagueId: 'uruguay', name: 'CA Cerro', abbr: 'CER', ovr: 71, pattern: 'stripes_v', c1: '#38bdf8', c2: '#f8fafc', shorts: '#38bdf8' },
  { id: 'progreso', leagueId: 'uruguay', name: 'Progreso', abbr: 'PRO', ovr: 71, pattern: 'stripes_v', c1: '#dc2626', c2: '#facc15', shorts: '#111827' },
  { id: 'rampla', leagueId: 'uruguay', name: 'Rampla Juniors', abbr: 'RAM', ovr: 70, pattern: 'stripes_v', c1: '#dc2626', c2: '#16a34a', shorts: '#16a34a' },
  { id: 'fenix', leagueId: 'uruguay', name: 'CA Fénix', abbr: 'FEN', ovr: 70, pattern: 'solid_trim', c1: '#6b21a8', c2: '#f8fafc', shorts: '#6b21a8' },
  { id: 'plazacolonia', leagueId: 'uruguay', name: 'Plaza Colonia', abbr: 'PLZ', ovr: 70, pattern: 'hoops', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'juventuduy', leagueId: 'uruguay', name: 'Juventud', abbr: 'JUV', ovr: 70, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'maldonado', leagueId: 'uruguay', name: 'Dep. Maldonado', abbr: 'MAL', ovr: 70, pattern: 'stripes_v', c1: '#dc2626', c2: '#16a34a', shorts: '#16a34a' },
  { id: 'rentistas', leagueId: 'uruguay', name: 'Rentistas', abbr: 'REN', ovr: 69, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },

  // ================= EQUADOR (20) =================
  { id: 'ldu', leagueId: 'ecuador', name: 'LDU Quito', abbr: 'LDU', ovr: 77, pattern: 'solid_trim', c1: '#f8fafc', c2: '#1d4ed8', shorts: '#f8fafc' },
  { id: 'indvalle', leagueId: 'ecuador', name: 'Ind. del Valle', abbr: 'IDV', ovr: 78, pattern: 'stripes_v', c1: '#1e3a8a', c2: '#111827', shorts: '#111827', stars: ['Ramírez', 'Schunke', 'Alcívar', 'Kendry Páez', 'Hoyos'] },
  { id: 'barcelonasc', leagueId: 'ecuador', name: 'Barcelona SC', abbr: 'BSC', ovr: 76, pattern: 'solid_trim', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'emelec', leagueId: 'ecuador', name: 'Emelec', abbr: 'EME', ovr: 75, pattern: 'sash', c1: '#1d4ed8', c2: '#cbd5e1', shorts: '#1d4ed8' },
  { id: 'ucatolicaec', leagueId: 'ecuador', name: 'U. Católica (ECU)', abbr: 'UCE', ovr: 74, pattern: 'solid_trim', c1: '#0284c7', c2: '#f8fafc', shorts: '#0284c7' },
  { id: 'aucas', leagueId: 'ecuador', name: 'SD Aucas', abbr: 'AUC', ovr: 73, pattern: 'solid_trim', c1: '#facc15', c2: '#dc2626', shorts: '#dc2626' },
  { id: 'elnacional', leagueId: 'ecuador', name: 'El Nacional', abbr: 'ELN', ovr: 73, pattern: 'solid_trim', c1: '#dc2626', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'orense', leagueId: 'ecuador', name: 'Orense SC', abbr: 'ORE', ovr: 72, pattern: 'solid_trim', c1: '#16a34a', c2: '#facc15', shorts: '#16a34a' },
  { id: 'mushucruna', leagueId: 'ecuador', name: 'Mushuc Runa', abbr: 'MUS', ovr: 72, pattern: 'solid_trim', c1: '#dc2626', c2: '#16a34a', shorts: '#16a34a' },
  { id: 'macara', leagueId: 'ecuador', name: 'Macará', abbr: 'MAC', ovr: 71, pattern: 'solid_trim', c1: '#0284c7', c2: '#f8fafc', shorts: '#0284c7' },
  { id: 'tecnico', leagueId: 'ecuador', name: 'Técnico Univ.', abbr: 'TEC', ovr: 71, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'delfin', leagueId: 'ecuador', name: 'Delfín SC', abbr: 'DEL', ovr: 71, pattern: 'solid_trim', c1: '#facc15', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'cuenca', leagueId: 'ecuador', name: 'Dep. Cuenca', abbr: 'CUE', ovr: 71, pattern: 'solid_trim', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'libertadec', leagueId: 'ecuador', name: 'Libertad FC', abbr: 'LIB', ovr: 70, pattern: 'solid_trim', c1: '#f97316', c2: '#111827', shorts: '#111827' },
  { id: 'vinotintoec', leagueId: 'ecuador', name: 'Vinotinto ECU', abbr: 'VIN', ovr: 70, pattern: 'solid_trim', c1: '#7c1d34', c2: '#f8fafc', shorts: '#7c1d34' },
  { id: 'manta', leagueId: 'ecuador', name: 'Manta FC', abbr: 'MAN', ovr: 70, pattern: 'solid_trim', c1: '#38bdf8', c2: '#1e3a8a', shorts: '#1e3a8a' },
  { id: 'imbabura', leagueId: 'ecuador', name: 'Imbabura', abbr: 'IMB', ovr: 69, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'cumbaya', leagueId: 'ecuador', name: 'Cumbayá', abbr: 'CUM', ovr: 69, pattern: 'solid_trim', c1: '#f8fafc', c2: '#111827', shorts: '#111827' },
  { id: 'guayaquilcity', leagueId: 'ecuador', name: 'Guayaquil City', abbr: 'GCY', ovr: 70, pattern: 'solid_trim', c1: '#38bdf8', c2: '#f8fafc', shorts: '#38bdf8' },
  { id: 'olmedo', leagueId: 'ecuador', name: 'CD Olmedo', abbr: 'OLM', ovr: 69, pattern: 'solid_trim', c1: '#dc2626', c2: '#1d4ed8', shorts: '#1d4ed8' },

  // ================= PERU (20) =================
  { id: 'universitario', leagueId: 'peru', name: 'Universitario', abbr: 'UNI', ovr: 76, pattern: 'solid_trim', c1: '#fef3c7', c2: '#7c1d34', shorts: '#7c1d34' },
  { id: 'alianzalima', leagueId: 'peru', name: 'Alianza Lima', abbr: 'ALI', ovr: 76, pattern: 'stripes_v', c1: '#1e3a8a', c2: '#f8fafc', shorts: '#1e3a8a' },
  { id: 'sportingcristal', leagueId: 'peru', name: 'Sporting Cristal', abbr: 'CRI', ovr: 76, pattern: 'solid_trim', c1: '#38bdf8', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'melgar', leagueId: 'peru', name: 'FBC Melgar', abbr: 'MEL', ovr: 74, pattern: 'solid_trim', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'cienciano', leagueId: 'peru', name: 'Cienciano', abbr: 'CIE', ovr: 73, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'cuscofc', leagueId: 'peru', name: 'Cusco FC', abbr: 'CUS', ovr: 72, pattern: 'solid_trim', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'atleticograu', leagueId: 'peru', name: 'Atlético Grau', abbr: 'GRA', ovr: 72, pattern: 'solid_trim', c1: '#f8fafc', c2: '#facc15', shorts: '#f8fafc' },
  { id: 'adt', leagueId: 'peru', name: 'ADT Tarma', abbr: 'ADT', ovr: 71, pattern: 'solid_trim', c1: '#38bdf8', c2: '#f8fafc', shorts: '#38bdf8' },
  { id: 'sporthuancayo', leagueId: 'peru', name: 'Sport Huancayo', abbr: 'SHU', ovr: 71, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'garcilaso', leagueId: 'peru', name: 'Dep. Garcilaso', abbr: 'GAR', ovr: 71, pattern: 'solid_trim', c1: '#38bdf8', c2: '#f8fafc', shorts: '#38bdf8' },
  { id: 'sportboys', leagueId: 'peru', name: 'Sport Boys', abbr: 'SBA', ovr: 70, pattern: 'solid_trim', c1: '#ec4899', c2: '#111827', shorts: '#111827' },
  { id: 'chankas', leagueId: 'peru', name: 'Los Chankas', abbr: 'CHK', ovr: 70, pattern: 'solid_trim', c1: '#7c1d34', c2: '#facc15', shorts: '#7c1d34' },
  { id: 'utccajamarca', leagueId: 'peru', name: 'UTC Cajamarca', abbr: 'UTC', ovr: 70, pattern: 'solid_trim', c1: '#fef3c7', c2: '#dc2626', shorts: '#111827' },
  { id: 'alianzaatl', leagueId: 'peru', name: 'Alianza Atlético', abbr: 'AAS', ovr: 70, pattern: 'solid_trim', c1: '#38bdf8', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'comerciantes', leagueId: 'peru', name: 'Comerciantes U.', abbr: 'COM', ovr: 69, pattern: 'solid_trim', c1: '#6b21a8', c2: '#f8fafc', shorts: '#6b21a8' },
  { id: 'alianzau', leagueId: 'peru', name: 'Alianza Univ.', abbr: 'AUH', ovr: 69, pattern: 'solid_trim', c1: '#dc2626', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'juanpabloii', leagueId: 'peru', name: 'Juan Pablo II', abbr: 'JP2', ovr: 69, pattern: 'solid_trim', c1: '#facc15', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'ayacucho', leagueId: 'peru', name: 'Ayacucho FC', abbr: 'AYA', ovr: 69, pattern: 'solid_trim', c1: '#f97316', c2: '#111827', shorts: '#111827' },
  { id: 'binacional', leagueId: 'peru', name: 'Binacional', abbr: 'BIN', ovr: 69, pattern: 'solid_trim', c1: '#0284c7', c2: '#f8fafc', shorts: '#0284c7' },
  { id: 'mannucci', leagueId: 'peru', name: 'Carlos Mannucci', abbr: 'MAN', ovr: 69, pattern: 'tricolor_v', c1: '#1d4ed8', c2: '#dc2626', c3: '#f8fafc', shorts: '#1d4ed8' },

  // ================= PARAGUAI (20) =================
  { id: 'olimpia', leagueId: 'paraguay', name: 'Olimpia', abbr: 'OLI', ovr: 77, pattern: 'chest_band', c1: '#f8fafc', c2: '#111827', shorts: '#f8fafc' },
  { id: 'cerroporteno', leagueId: 'paraguay', name: 'Cerro Porteño', abbr: 'CCP', ovr: 77, pattern: 'stripes_v', c1: '#dc2626', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'libertadpy', leagueId: 'paraguay', name: 'Libertad', abbr: 'LIB', ovr: 76, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'guarani_py', leagueId: 'paraguay', name: 'Guaraní (PAR)', abbr: 'GUA', ovr: 74, pattern: 'stripes_v', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'nacionalpy', leagueId: 'paraguay', name: 'Nacional (PAR)', abbr: 'NAC', ovr: 74, pattern: 'solid_trim', c1: '#f8fafc', c2: '#dc2626', shorts: '#1d4ed8' },
  { id: 'sp_luqueno', leagueId: 'paraguay', name: 'Sportivo Luqueño', abbr: 'SLU', ovr: 72, pattern: 'stripes_v', c1: '#1d4ed8', c2: '#facc15', shorts: '#1d4ed8' },
  { id: 'sp_ameliano', leagueId: 'paraguay', name: 'Sportivo Ameliano', abbr: 'AME', ovr: 72, pattern: 'solid_trim', c1: '#f8fafc', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: '2demayo', leagueId: 'paraguay', name: '2 de Mayo', abbr: '2DM', ovr: 72, pattern: 'solid_trim', c1: '#0284c7', c2: '#f8fafc', shorts: '#0284c7' },
  { id: 'trinidense', leagueId: 'paraguay', name: 'Sp. Trinidense', abbr: 'TRI', ovr: 71, pattern: 'solid_trim', c1: '#facc15', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'generalcab', leagueId: 'paraguay', name: 'Gral. Caballero', abbr: 'GCC', ovr: 71, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'recoleta', leagueId: 'paraguay', name: 'Dep. Recoleta', abbr: 'REC', ovr: 70, pattern: 'solid_trim', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'tembetary', leagueId: 'paraguay', name: 'Atl. Tembetary', abbr: 'TEM', ovr: 70, pattern: 'solid_trim', c1: '#16a34a', c2: '#dc2626', shorts: '#16a34a' },
  { id: 'soldeamerica', leagueId: 'paraguay', name: 'Sol de América', abbr: 'SOL', ovr: 70, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'tacuary', leagueId: 'paraguay', name: 'Tacuary', abbr: 'TAC', ovr: 69, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'guairena', leagueId: 'paraguay', name: 'Guaireña', abbr: 'GAI', ovr: 69, pattern: 'solid_trim', c1: '#38bdf8', c2: '#f8fafc', shorts: '#38bdf8' },
  { id: 'resistencia', leagueId: 'paraguay', name: 'Resistencia SC', abbr: 'RES', ovr: 69, pattern: 'solid_trim', c1: '#38bdf8', c2: '#dc2626', shorts: '#38bdf8' },
  { id: 'carapegua', leagueId: 'paraguay', name: 'Sp. Carapeguá', abbr: 'CAR', ovr: 68, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#dc2626', shorts: '#1d4ed8' },
  { id: '12deoctubre', leagueId: 'paraguay', name: '12 de Octubre', abbr: '12O', ovr: 68, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'rubionu', leagueId: 'paraguay', name: 'Rubio Ñu', abbr: 'RUB', ovr: 68, pattern: 'solid_trim', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'sanlorenzopy', leagueId: 'paraguay', name: 'Sp. San Lorenzo', abbr: 'SSL', ovr: 68, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },

  // ================= BOLÍVIA (20) =================
  { id: 'bolivar', leagueId: 'bolivia', name: 'Bolívar', abbr: 'BOL', ovr: 76, pattern: 'solid_trim', c1: '#38bdf8', c2: '#f8fafc', shorts: '#38bdf8' },
  { id: 'strongest', leagueId: 'bolivia', name: 'The Strongest', abbr: 'STR', ovr: 75, pattern: 'stripes_v', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'alwaysready', leagueId: 'bolivia', name: 'Always Ready', abbr: 'ALW', ovr: 73, pattern: 'sash', c1: '#f8fafc', c2: '#dc2626', shorts: '#f8fafc' },
  { id: 'blooming', leagueId: 'bolivia', name: 'Blooming', abbr: 'BLO', ovr: 72, pattern: 'solid_trim', c1: '#0284c7', c2: '#f8fafc', shorts: '#0284c7' },
  { id: 'oriente', leagueId: 'bolivia', name: 'Oriente Petrolero', abbr: 'ORI', ovr: 72, pattern: 'solid_trim', c1: '#16a34a', c2: '#f8fafc', shorts: '#f8fafc' },
  { id: 'aurora', leagueId: 'bolivia', name: 'Club Aurora', abbr: 'AUR', ovr: 72, pattern: 'solid_trim', c1: '#38bdf8', c2: '#f8fafc', shorts: '#38bdf8' },
  { id: 'wilstermann', leagueId: 'bolivia', name: 'J. Wilstermann', abbr: 'WIL', ovr: 72, pattern: 'solid_trim', c1: '#dc2626', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'nacionalpotosi', leagueId: 'bolivia', name: 'Nacional Potosí', abbr: 'NAP', ovr: 71, pattern: 'sash', c1: '#f8fafc', c2: '#dc2626', shorts: '#f8fafc' },
  { id: 'sanantonio_bo', leagueId: 'bolivia', name: 'San Antonio Bulo', abbr: 'SAB', ovr: 71, pattern: 'solid_trim', c1: '#38bdf8', c2: '#f8fafc', shorts: '#38bdf8' },
  { id: 'guabira', leagueId: 'bolivia', name: 'Guabirá', abbr: 'GUA', ovr: 70, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'gv_sanjose', leagueId: 'bolivia', name: 'GV San José', abbr: 'GVS', ovr: 70, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'ind_petrolero', leagueId: 'bolivia', name: 'Ind. Petrolero', abbr: 'IND', ovr: 70, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'universitariov', leagueId: 'bolivia', name: 'Univ. de Vinto', abbr: 'FCV', ovr: 70, pattern: 'solid_trim', c1: '#0284c7', c2: '#16a34a', shorts: '#0284c7' },
  { id: 'real_tomayapo', leagueId: 'bolivia', name: 'Real Tomayapo', abbr: 'TOM', ovr: 70, pattern: 'solid_trim', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'royalpari', leagueId: 'bolivia', name: 'Royal Pari', abbr: 'ROY', ovr: 69, pattern: 'solid_trim', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'realsantacruz', leagueId: 'bolivia', name: 'Real Santa Cruz', abbr: 'RSC', ovr: 69, pattern: 'solid_trim', c1: '#f8fafc', c2: '#dc2626', shorts: '#f8fafc' },
  { id: 'abb', leagueId: 'bolivia', name: 'ABB', abbr: 'ABB', ovr: 68, pattern: 'solid_trim', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'totora', leagueId: 'bolivia', name: 'Totora Real Oruro', abbr: 'TRO', ovr: 68, pattern: 'solid_trim', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'palmaflor', leagueId: 'bolivia', name: 'Palmaflor', abbr: 'PAL', ovr: 68, pattern: 'solid_trim', c1: '#facc15', c2: '#16a34a', shorts: '#16a34a' },
  { id: 'vaca_diez', leagueId: 'bolivia', name: 'Vaca Díez', abbr: 'VAC', ovr: 68, pattern: 'solid_trim', c1: '#38bdf8', c2: '#f8fafc', shorts: '#38bdf8' },

  // ================= VENEZUELA (20) =================
  { id: 'tachira', leagueId: 'venezuela', name: 'Dep. Táchira', abbr: 'TAC', ovr: 74, pattern: 'stripes_v', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'caracas', leagueId: 'venezuela', name: 'Caracas FC', abbr: 'CAR', ovr: 74, pattern: 'solid_trim', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'carabobo', leagueId: 'venezuela', name: 'Carabobo FC', abbr: 'CBB', ovr: 74, pattern: 'solid_trim', c1: '#7c1d34', c2: '#f8fafc', shorts: '#7c1d34' },
  { id: 'ucv', leagueId: 'venezuela', name: 'UCV FC', abbr: 'UCV', ovr: 73, pattern: 'tricolor_v', c1: '#1d4ed8', c2: '#facc15', c3: '#dc2626', shorts: '#1d4ed8' },
  { id: 'monagas', leagueId: 'venezuela', name: 'Monagas SC', abbr: 'MON', ovr: 72, pattern: 'solid_trim', c1: '#dc2626', c2: '#1d4ed8', shorts: '#1d4ed8' },
  { id: 'laguaira', leagueId: 'venezuela', name: 'Dep. La Guaira', abbr: 'DLG', ovr: 73, pattern: 'solid_trim', c1: '#f97316', c2: '#111827', shorts: '#111827' },
  { id: 'metropolitanos', leagueId: 'venezuela', name: 'Metropolitanos', abbr: 'MET', ovr: 72, pattern: 'solid_trim', c1: '#6b21a8', c2: '#f8fafc', shorts: '#6b21a8' },
  { id: 'portuguesa_ve', leagueId: 'venezuela', name: 'Portuguesa (VEN)', abbr: 'POR', ovr: 72, pattern: 'stripes_v', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'puertocabello', leagueId: 'venezuela', name: 'Acad. P. Cabello', abbr: 'APC', ovr: 72, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#f97316', shorts: '#1e3a8a' },
  { id: 'estudiantes_mer', leagueId: 'venezuela', name: 'Est. de Mérida', abbr: 'EDM', ovr: 71, pattern: 'stripes_v', c1: '#dc2626', c2: '#f8fafc', shorts: '#dc2626' },
  { id: 'zamora', leagueId: 'venezuela', name: 'Zamora FC', abbr: 'ZAM', ovr: 71, pattern: 'stripes_v', c1: '#111827', c2: '#f8fafc', shorts: '#111827' },
  { id: 'rayozuliano', leagueId: 'venezuela', name: 'Rayo Zuliano', abbr: 'RAY', ovr: 70, pattern: 'solid_trim', c1: '#0284c7', c2: '#facc15', shorts: '#0284c7' },
  { id: 'anzoategui', leagueId: 'venezuela', name: 'Anzoátegui FC', abbr: 'ANZ', ovr: 70, pattern: 'solid_trim', c1: '#dc2626', c2: '#facc15', shorts: '#111827' },
  { id: 'yaracuyanos', leagueId: 'venezuela', name: 'Yaracuyanos', abbr: 'YAR', ovr: 69, pattern: 'solid_trim', c1: '#16a34a', c2: '#f8fafc', shorts: '#16a34a' },
  { id: 'angostura', leagueId: 'venezuela', name: 'Angostura FC', abbr: 'ANG', ovr: 69, pattern: 'solid_trim', c1: '#facc15', c2: '#111827', shorts: '#111827' },
  { id: 'interbarinas', leagueId: 'venezuela', name: 'Inter de Barinas', abbr: 'IBR', ovr: 69, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#1d4ed8' },
  { id: 'mineros', leagueId: 'venezuela', name: 'Mineros Guayana', abbr: 'MIN', ovr: 69, pattern: 'solid_trim', c1: '#111827', c2: '#1d4ed8', shorts: '#111827' },
  { id: 'lara', leagueId: 'venezuela', name: 'Dep. Lara', abbr: 'LAR', ovr: 69, pattern: 'hoops', c1: '#dc2626', c2: '#111827', shorts: '#111827' },
  { id: 'aragua', leagueId: 'venezuela', name: 'Aragua FC', abbr: 'ARA', ovr: 68, pattern: 'solid_trim', c1: '#facc15', c2: '#dc2626', shorts: '#dc2626' },
  { id: 'trujillanos', leagueId: 'venezuela', name: 'Trujillanos', abbr: 'TRU', ovr: 68, pattern: 'solid_trim', c1: '#facc15', c2: '#5c3a21', shorts: '#5c3a21' },

  // ================= SELEÇÕES COPA DO MUNDO (+12 para completar 20) =================
  { id: 'sel_italia', leagueId: 'selecoes', name: 'Itália', abbr: 'ITA', ovr: 84, pattern: 'solid_trim', c1: '#1d4ed8', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Donnarumma', 'Bastoni', 'Barella', 'Tonali', 'Retegui'] },
  { id: 'sel_holanda', leagueId: 'selecoes', name: 'Países Baixos', abbr: 'HOL', ovr: 84, pattern: 'solid_trim', c1: '#f97316', c2: '#111827', shorts: '#f8fafc', stars: ['Verbruggen', 'Van Dijk', 'De Jong', 'Reijnders', 'Gakpo'] },
  { id: 'sel_uruguai', leagueId: 'selecoes', name: 'Uruguai', abbr: 'URU', ovr: 83, pattern: 'solid_trim', c1: '#38bdf8', c2: '#111827', shorts: '#111827', stars: ['Rochet', 'Araújo', 'Valverde', 'Arrascaeta', 'Núñez'] },
  { id: 'sel_belgica', leagueId: 'selecoes', name: 'Bélgica', abbr: 'BEL', ovr: 82, pattern: 'solid_trim', c1: '#b91c1c', c2: '#facc15', shorts: '#111827', stars: ['Casteels', 'Faes', 'Onana', 'De Bruyne', 'Lukaku'] },
  { id: 'sel_croacia', leagueId: 'selecoes', name: 'Croácia', abbr: 'CRO', ovr: 82, pattern: 'hoops', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Livaković', 'Gvardiol', 'Modrić', 'Kovačić', 'Kramarić'] },
  { id: 'sel_marrocos', leagueId: 'selecoes', name: 'Marrocos', abbr: 'MAR', ovr: 81, pattern: 'solid_trim', c1: '#dc2626', c2: '#15803d', shorts: '#15803d', stars: ['Bono', 'Hakimi', 'Amrabat', 'Brahim', 'En-Nesyri'] },
  { id: 'sel_japao', leagueId: 'selecoes', name: 'Japão', abbr: 'JAP', ovr: 80, pattern: 'solid_trim', c1: '#1e3a8a', c2: '#f8fafc', shorts: '#1e3a8a', stars: ['Suzuki', 'Tomiyasu', 'Endo', 'Kubo', 'Mitoma'] },
  { id: 'sel_eua', leagueId: 'selecoes', name: 'Estados Unidos', abbr: 'EUA', ovr: 79, pattern: 'solid_trim', c1: '#f8fafc', c2: '#1d4ed8', c3: '#dc2626', shorts: '#f8fafc', stars: ['Turner', 'Robinson', 'McKennie', 'Pulisic', 'Balogun'] },
  { id: 'sel_mexico', leagueId: 'selecoes', name: 'México', abbr: 'MEX', ovr: 79, pattern: 'solid_trim', c1: '#15803d', c2: '#dc2626', shorts: '#f8fafc', stars: ['Malagón', 'Vásquez', 'Álvarez', 'Vega', 'Giménez'] },
  { id: 'sel_equador', leagueId: 'selecoes', name: 'Equador', abbr: 'EQU', ovr: 80, pattern: 'solid_trim', c1: '#facc15', c2: '#1e3a8a', shorts: '#1e3a8a', stars: ['Galíndez', 'Hincapié', 'Caicedo', 'Páez', 'Valencia'] },
  { id: 'sel_chile', leagueId: 'selecoes', name: 'Chile', abbr: 'CHI', ovr: 77, pattern: 'solid_trim', c1: '#dc2626', c2: '#1d4ed8', shorts: '#1d4ed8', stars: ['Cortés', 'Maripán', 'Vidal', 'Valdés', 'Sánchez'] },
  { id: 'sel_suica', leagueId: 'selecoes', name: 'Suíça', abbr: 'SUI', ovr: 80, pattern: 'solid_trim', c1: '#dc2626', c2: '#f8fafc', shorts: '#f8fafc', stars: ['Kobel', 'Akanji', 'Xhaka', 'Ndoye', 'Embolo'] }
];

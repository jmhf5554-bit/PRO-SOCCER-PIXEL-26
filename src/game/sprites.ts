import { PlayerSpec, SkinToneId, TeamSpec } from '../types';

const SKIN_TONES: Record<SkinToneId, { base: string; shade: string; highlight: string }> = {
  fair:  { base: '#f5caa4', shade: '#d49a6a', highlight: '#ffe4cc' },
  olive: { base: '#e2b289', shade: '#b98357', highlight: '#f5cfa9' },
  tan:   { base: '#c48653', shade: '#955c31', highlight: '#da9f6d' },
  brown: { base: '#8d552c', shade: '#643718', highlight: '#aa6d40' },
  dark:  { base: '#593319', shade: '#3a1e0c', highlight: '#764829' }
};

export interface SpriteOpts {
  dirX: number;
  frame: number;
  action: 'idle' | 'run' | 'kick' | 'tackle' | 'dive' | 'celebrate' | 'volley';
  diveDir?: number;
  shadow?: boolean;
  isReferee?: boolean;
  animTime?: number;
}

class PixelGrid {
  readonly w: number;
  readonly h: number;
  readonly cells: (string | null)[];

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.cells = new Array(w * h).fill(null);
  }

  set(x: number, y: number, color: string) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return;
    this.cells[iy * this.w + ix] = color;
  }

  get(x: number, y: number): string | null {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.cells[y * this.w + x];
  }

  rect(x: number, y: number, w: number, h: number, color: string) {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.set(x0 + dx, y0 + dy, color);
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string, thickness = 1) {
    let ix0 = Math.round(x0);
    let iy0 = Math.round(y0);
    const ix1 = Math.round(x1);
    const iy1 = Math.round(y1);
    const dx = Math.abs(ix1 - ix0);
    const dy = Math.abs(iy1 - iy0);
    const sx = ix0 < ix1 ? 1 : -1;
    const sy = iy0 < iy1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (thickness <= 1) {
        this.set(ix0, iy0, color);
      } else {
        this.rect(ix0, iy0, thickness, thickness, color);
      }
      if (ix0 === ix1 && iy0 === iy1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        ix0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        iy0 += sy;
      }
    }
  }

  addOutline(outlineColor = '#111111') {
    const toOutline: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.cells[y * this.w + x] !== null) continue;
        if (
          this.get(x - 1, y) !== null ||
          this.get(x + 1, y) !== null ||
          this.get(x, y - 1) !== null ||
          this.get(x, y + 1) !== null
        ) {
          toOutline.push(y * this.w + x);
        }
      }
    }
    for (const idx of toOutline) {
      this.cells[idx] = outlineColor;
    }
  }

  renderToCanvas(target: HTMLCanvasElement) {
    target.width = this.w;
    target.height = this.h;
    const tctx = target.getContext('2d');
    if (!tctx) return;
    tctx.clearRect(0, 0, this.w, this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const col = this.cells[y * this.w + x];
        if (col) {
          tctx.fillStyle = col;
          tctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }
}

let sharedSpriteBuf: HTMLCanvasElement | null = null;
function getSpriteBuf(): HTMLCanvasElement {
  if (!sharedSpriteBuf) {
    sharedSpriteBuf = document.createElement('canvas');
  }
  return sharedSpriteBuf;
}

export function drawKitSwatch(canvas: HTMLCanvasElement, team: TeamSpec, useAway: boolean) {
  drawMiniJerseyIcon(canvas, team, useAway);
}

// Crisp Pixel-Art Club Crest & National Flag Renderer
export function drawClubCrest(canvas: HTMLCanvasElement, team: TeamSpec) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;

  const g = new PixelGrid(24, 24);
  const k = team.kit;
  const c1 = team.crest?.primary || k.c1;
  const c2 = team.crest?.secondary || k.c2;
  const c3 = team.crest?.accent || k.c3 || '#f8fafc';

  if (team.leagueId === 'selecoes') {
    // Crisp circular pixel flag badge
    for (let y = 2; y < 22; y++) {
      for (let x = 2; x < 22; x++) {
        const dx = x - 11.5;
        const dy = y - 11.5;
        if (dx * dx + dy * dy > 88) continue;
        let col = c1;
        if (team.id === 'sel_brasil') {
          col = '#15803d';
          if (Math.abs(dx) * 0.75 + Math.abs(dy) < 7.2) col = '#facc15';
          if (dx * dx + dy * dy < 15) col = '#1e3a8a';
          if (Math.abs(dy - dx * 0.15) < 0.8 && dx * dx + dy * dy < 13) col = '#f8fafc';
        } else if (team.id === 'sel_argentina') {
          col = y >= 9 && y <= 14 ? '#f8fafc' : '#38bdf8';
          if (dx * dx + dy * dy < 5) col = '#eab308';
        } else if (team.id === 'sel_franca') {
          col = x < 9 ? '#1d4ed8' : x < 15 ? '#f8fafc' : '#dc2626';
        } else if (team.id === 'sel_espanha') {
          col = y >= 8 && y <= 15 ? '#facc15' : '#dc2626';
          if (x >= 7 && x <= 9 && y >= 10 && y <= 13) col = '#991b1b';
        } else if (team.id === 'sel_inglaterra') {
          col = Math.abs(dx) < 1.8 || Math.abs(dy) < 1.8 ? '#dc2626' : '#f8fafc';
        } else if (team.id === 'sel_alemanha') {
          col = y < 9 ? '#111827' : y < 15 ? '#dc2626' : '#facc15';
        } else if (team.id === 'sel_portugal') {
          col = x < 10 ? '#15803d' : '#b91c1c';
          if ((x - 10) * (x - 10) + dy * dy < 7) col = '#facc15';
        } else {
          col = y < 12 ? '#facc15' : y < 17 ? '#1d4ed8' : '#dc2626';
        }
        g.set(x, y, col);
      }
    }
    g.addOutline('#e2e8f0');
    const buf = getSpriteBuf();
    g.renderToCanvas(buf);
    ctx.drawImage(buf, 0, 0, w, h);
    return;
  }

  // Pixel Shield Shape
  for (let y = 3; y < 21; y++) {
    const halfW = y < 13 ? 8 : Math.max(1, Math.round(8 - (y - 13) * 0.95));
    for (let x = 12 - halfW; x < 12 + halfW; x++) {
      let col = c1;
      if (team.id === 'flamengo') {
        col = y % 4 < 2 ? '#d91e2a' : '#141414';
        if (x < 12 && y < 11) col = '#141414';
        if (x >= 7 && x <= 10 && y >= 5 && y <= 8 && (x + y) % 2 === 0) col = '#f8fafc';
      } else if (team.id === 'palmeiras') {
        col = '#0e6b38';
        if (x === 12 - halfW || x === 12 + halfW - 1 || y === 3) col = '#f8fafc';
        if ((x - 11.5) * (x - 11.5) + (y - 11) * (y - 11) < 11) col = '#f8fafc';
        if (x >= 10 && x <= 12 && y >= 9 && y <= 13 && (x === 10 || y === 9 || y === 11)) col = '#0e6b38';
      } else if (team.id === 'botafogo') {
        col = x % 4 < 2 ? '#141414' : '#f8fafc';
        if ((x - 11.5) * (x - 11.5) + (y - 9.5) * (y - 9.5) < 9) col = '#111827';
        if (x === 11 && y >= 8 && y <= 11) col = '#ffffff';
        if (y === 9 && x >= 10 && x <= 13) col = '#ffffff';
      } else if (team.id === 'saopaulo') {
        col = '#f8fafc';
        if (y >= 4 && y <= 8) col = '#141414';
        if (y >= 10 && x < 11) col = '#dc2626';
        if (y >= 10 && x > 12) col = '#141414';
      } else if (team.id === 'fluminense') {
        col = y < 10 ? '#7c1d34' : y > 12 ? '#006847' : '#f8fafc';
      } else if (team.id === 'cruzeiro') {
        col = '#f8fafc';
        if ((x - 11.5) * (x - 11.5) + (y - 11) * (y - 11) < 22) col = '#1d4ed8';
        if ((x === 11 && y === 8) || (x === 9 && y === 11) || (x === 14 && y === 11) || (x === 11 && y === 14)) {
          col = '#ffffff';
        }
      } else if (team.id === 'atleticomg') {
        col = y < 8 ? '#111111' : x % 3 === 0 ? '#f8fafc' : '#111111';
      } else if (k.pattern === 'hoops' || team.crest?.pattern === 'shield_hoops') {
        col = y % 4 < 2 ? c1 : c2;
      } else if (k.pattern === 'stripes_v' || team.crest?.pattern === 'shield_stripes') {
        col = x % 4 < 2 ? c1 : c2;
      } else if (k.pattern === 'sash') {
        col = Math.abs((x - 11.5) - (y - 11)) <= 1.6 ? c2 : c1;
      } else if (k.pattern === 'chest_band') {
        col = y >= 9 && y <= 12 ? c2 : y === 13 ? c3 : c1;
      } else {
        if ((x - 11.5) * (x - 11.5) + (y - 11) * (y - 11) < 12) col = c2;
      }
      g.set(x, y, col);
    }
  }
  // Top championship star
  g.set(11, 1, '#facc15');
  g.set(12, 1, '#facc15');
  g.addOutline('#e2e8f0');

  const buf = getSpriteBuf();
  g.renderToCanvas(buf);
  ctx.drawImage(buf, 0, 0, w, h);
}

// Crisp Pixel-Art Mini Jersey & Shorts Icon (Pixel Cup Soccer HUD Style)
export function drawMiniJerseyIcon(canvas: HTMLCanvasElement, team: TeamSpec, useAway: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;

  const g = new PixelGrid(18, 18);
  const k = team.kit;
  const c1 = useAway ? k.awayC1 : k.c1;
  const c2 = useAway ? k.awayC2 : k.c2;
  const c3 = k.c3 || c2;
  const sh = useAway ? k.awayShorts : k.shorts;

  // Sleeves + Torso
  g.rect(2, 4, 3, 4, c1);
  g.rect(13, 4, 3, 4, c1);
  for (let y = 3; y <= 11; y++) {
    for (let x = 5; x <= 12; x++) {
      let col = c1;
      if (!useAway) {
        if (k.pattern === 'hoops') {
          if (y === 5 || y === 6 || y === 9 || y === 10) col = c2;
        } else if (k.pattern === 'stripes_v') {
          if (x === 6 || x === 7 || x === 10 || x === 11) col = c2;
        } else if (k.pattern === 'tricolor_v') {
          if (x === 6 || x === 11) col = c3;
          if (x === 8 || x === 9) col = c2;
        } else if (k.pattern === 'chest_band') {
          if (y === 6 || y === 7) col = c2;
          if (y === 8) col = c3;
        } else if (k.pattern === 'sash') {
          if (Math.abs((x - 5) - (y - 3)) <= 1) col = c2;
        } else if (y === 3) {
          col = c2;
        }
      } else if (y === 6 || y === 7) {
        col = c2;
      }
      g.set(x, y, col);
    }
  }
  // Collar
  g.rect(8, 3, 2, 1, c2);
  // Shorts
  g.rect(5, 12, 3, 4, sh);
  g.rect(10, 12, 3, 4, sh);
  g.rect(8, 12, 2, 2, sh);

  g.addOutline('#111111');
  const buf = getSpriteBuf();
  g.renderToCanvas(buf);
  ctx.drawImage(buf, 0, 0, w, h);
}

// Crisp Pixel-Art Soccer Ball with Rotating Patches
export function drawSoccerBallHD(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  radius: number,
  spin: number
) {
  const size = Math.max(8, Math.round(radius * 2));
  const g = new PixelGrid(12, 12);
  const cx = 5.5;
  const cy = 5.5;

  for (let y = 1; y < 11; y++) {
    for (let x = 1; x < 11; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= 21) {
        // 3D sphere pixel shading
        const lit = dx + dy < -1.5;
        const shaded = dx + dy > 3.2;
        g.set(x, y, lit ? '#ffffff' : shaded ? '#94a3b8' : '#e2e8f0');
      }
    }
  }

  // Rotating dark pentagon patches
  const p1x = Math.round(cx + Math.cos(spin) * 1.4);
  const p1y = Math.round(cy + Math.sin(spin) * 1.4);
  const p2x = Math.round(cx + Math.cos(spin + 2.2) * 3.1);
  const p2y = Math.round(cy + Math.sin(spin + 2.2) * 3.1);
  const p3x = Math.round(cx + Math.cos(spin + 4.3) * 3.1);
  const p3y = Math.round(cy + Math.sin(spin + 4.3) * 3.1);

  [
    [p1x, p1y],
    [p2x, p2y],
    [p3x, p3y]
  ].forEach(([px, py]) => {
    for (let oy = 0; oy <= 1; oy++) {
      for (let ox = 0; ox <= 1; ox++) {
        const tx = px + ox;
        const ty = py + oy;
        if (g.get(tx, ty) !== null) g.set(tx, ty, '#111827');
      }
    }
  });

  g.addOutline('#111111');
  const buf = getSpriteBuf();
  g.renderToCanvas(buf);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, Math.round(bx - size / 2), Math.round(by - size / 2), size, size);
  ctx.restore();
}

function paintPixelHair(
  g: PixelGrid,
  hx: number,
  hy: number,
  player: PlayerSpec,
  dir: number
) {
  const hc = player.hairColor;
  switch (player.hair) {
    case 'platinum_fade':
    case 'silver_fade': {
      g.rect(hx - 4, hy - 5, 8, 2, hc);
      g.rect(hx - 3, hy - 6, 6, 1, '#ffffff');
      g.set(hx - 4, hy - 3, hc);
      g.set(hx + 3, hy - 3, hc);
      break;
    }
    case 'platinum_curly':
    case 'curly_afro':
    case 'curly_tips': {
      g.rect(hx - 5, hy - 5, 10, 3, hc);
      g.rect(hx - 4, hy - 7, 8, 2, player.hair === 'curly_tips' ? '#facc15' : hc);
      g.set(hx - 5, hy - 2, hc);
      g.set(hx + 4, hy - 2, hc);
      break;
    }
    case 'dreads': {
      g.rect(hx - 5, hy - 5, 10, 2, hc);
      g.rect(hx - 5, hy - 3, 2, 5, hc);
      g.rect(hx + 3, hy - 3, 2, 5, hc);
      g.rect(hx - 3, hy - 6, 6, 1, hc);
      break;
    }
    case 'mohawk': {
      g.rect(hx - 1, hy - 8, 2, 4, hc);
      g.rect(hx - 2, hy - 5, 4, 1, hc);
      break;
    }
    case 'shaggy': {
      g.rect(hx - 5, hy - 5, 10, 3, hc);
      g.rect(hx - (dir > 0 ? 5 : 4), hy - 2, 2, 4, hc);
      g.rect(hx + (dir < 0 ? 3 : 2), hy - 2, 2, 4, hc);
      break;
    }
    case 'bald': {
      g.rect(hx - 2, hy - 4, 2, 1, '#fff7ed');
      break;
    }
    case 'silver_short':
    case 'short_parted':
    case 'short_fade':
    default: {
      g.rect(hx - 4, hy - 5, 8, 2, hc);
      g.rect(hx - 3, hy - 6, 6, 1, hc);
      if (dir > 0) g.rect(hx - 5, hy - 3, 2, 2, hc);
      else g.rect(hx + 3, hy - 3, 2, 2, hc);
      break;
    }
  }
}

function paintPixelHead(
  g: PixelGrid,
  hx: number,
  hy: number,
  player: PlayerSpec,
  skin: { base: string; shade: string; highlight: string },
  dir: number
) {
  // 10x9 rounded pixel face
  g.rect(hx - 4, hy - 3, 8, 7, skin.base);
  g.rect(hx - 5, hy - 2, 10, 5, skin.base);
  // Forehead highlight + chin shadow
  g.rect(hx - 2, hy - 3, 3, 1, skin.highlight);
  g.rect(hx - 3, hy + 3, 6, 1, skin.shade);

  // Beard
  if (player.beard) {
    g.rect(hx - 3, hy + 2, 6, 2, '#1f1612');
    g.set(hx - 4, hy + 1, '#1f1612');
    g.set(hx + 3, hy + 1, '#1f1612');
  }

  // Expressive pixel eyes shifted slightly by facing direction
  const ex = dir > 0 ? 1 : -1;
  g.rect(hx + ex - 2, hy - 1, 1, 2, '#0f172a');
  g.rect(hx + ex + 1, hy - 1, 1, 2, '#0f172a');

  // Hair
  paintPixelHair(g, hx, hy, player, dir);

  // Optional headband
  if (player.headband) {
    g.rect(hx - 4, hy - 3, 8, 1, player.headband);
  }
}

function paintPixelTorso(
  g: PixelGrid,
  tx: number,
  ty: number,
  w: number,
  h: number,
  shirtC1: string,
  shirtC2: string,
  shirtC3: string,
  team: TeamSpec,
  useAway: boolean,
  isGK: boolean,
  isRef: boolean
) {
  const k = team.kit;
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      let col = shirtC1;
      if (!isGK && !isRef && !useAway) {
        if (k.pattern === 'hoops') {
          if (dy === 2 || dy === 3 || dy === 6 || dy === 7) col = shirtC2;
        } else if (k.pattern === 'stripes_v') {
          if (dx === 2 || dx === 3 || dx === 6 || dx === 7) col = shirtC2;
        } else if (k.pattern === 'tricolor_v') {
          if (dx === 2 || dx === 7) col = shirtC3;
          if (dx === 4 || dx === 5) col = shirtC2;
        } else if (k.pattern === 'chest_band') {
          if (dy === 2 || dy === 3) col = shirtC2;
          if (dy === 4) col = '#ffffff';
          if (dy === 5) col = shirtC3;
        } else if (k.pattern === 'sash') {
          if (Math.abs(dx - dy) <= 1) col = shirtC2;
        } else if (dy === 0) {
          col = shirtC2;
        }
      } else if (!isGK && !isRef && useAway) {
        if (dy === 3 || dy === 4) col = shirtC2;
      } else {
        if (dy === 0 || dy === 1) col = shirtC2;
      }
      g.set(tx + dx, ty + dy, col);
    }
  }
  // Collar V pixel
  g.rect(tx + Math.floor(w / 2) - 1, ty, 2, 1, shirtC2);
}

// High-Craft Pixel Cup Soccer Inspired Athlete Sprite Renderer
export function drawHDPlayerSprite(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  scale: number,
  player: PlayerSpec,
  team: TeamSpec,
  useAway: boolean,
  opts: SpriteOpts
) {
  const s = scale || 1;
  const skin = SKIN_TONES[player.skin] || SKIN_TONES.olive;
  const isRef = Boolean(opts.isReferee);
  const isGK = player.role === 'GOL' && !isRef;
  const kit = team.kit;
  const dir = opts.dirX < 0 ? -1 : 1;
  const phase = opts.animTime !== undefined ? opts.animTime : opts.frame * (Math.PI * 0.5);
  const action = opts.action || 'idle';

  const shirtC1 = isRef ? '#ec4899' : isGK ? kit.gk : useAway ? kit.awayC1 : kit.c1;
  const shirtC2 = isRef ? '#111827' : isGK ? kit.gk2 : useAway ? kit.awayC2 : kit.c2;
  const shirtC3 = kit.c3 || shirtC2;
  const shortsC = isRef ? '#111827' : isGK ? '#111827' : useAway ? kit.awayShorts : kit.shorts;
  const socksC = isRef ? '#111827' : isGK ? kit.gk : useAway ? kit.awaySocks : kit.socks;
  const bootsC = isRef ? '#f8fafc' : player.boots;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Crisp Pixel Ground Shadow
  if (opts.shadow) {
    ctx.fillStyle = 'rgba(6, 22, 14, 0.42)';
    const sw = Math.round(18 * s);
    const sh = Math.round(5 * s);
    ctx.fillRect(Math.round(px - sw / 2 + 2 * s), Math.round(py - 1 * s), sw, sh);
    ctx.fillRect(Math.round(px - sw / 3 + 2 * s), Math.round(py - 2 * s), Math.round((sw * 2) / 3), sh + 2);
  }

  const gridW = 34;
  const gridH = 36;
  const g = new PixelGrid(gridW, gridH);

  const drawLegPix = (hipX: number, hipY: number, footX: number, footY: number, shade: boolean) => {
    const midX = Math.round((hipX + footX) / 2 + dir * 1);
    const midY = Math.round((hipY + footY) / 2);
    g.line(hipX, hipY, midX, midY, shade ? skin.shade : skin.base, 2);
    g.line(midX, midY, footX, footY - 1, socksC, 2);
    // Studded pixel boot
    g.rect(footX + (dir > 0 ? 0 : -2), footY, 4, 2, bootsC);
  };

  const drawArmPix = (sx: number, sy: number, hx: number, hy: number) => {
    const mx = Math.round(sx + (hx - sx) * 0.45);
    const my = Math.round(sy + (hy - sy) * 0.45);
    g.line(sx, sy, mx, my, shirtC1, 2);
    g.line(mx, my, hx, hy, skin.base, 2);
    if (isGK) {
      g.rect(hx - 1, hy - 1, 3, 3, '#f8fafc');
    }
  };

  if (action === 'dive') {
    const d = opts.diveDir || 1;
    // Horizontal flying GK save pose
    const bodyX = d > 0 ? 12 : 14;
    const bodyY = 17;
    if (d > 0) {
      drawLegPix(bodyX - 2, bodyY + 2, bodyX - 9, bodyY + 4, true);
      drawLegPix(bodyX - 2, bodyY + 4, bodyX - 8, bodyY + 6, false);
      g.rect(bodyX - 3, bodyY + 1, 5, 6, shortsC);
      paintPixelTorso(g, bodyX + 2, bodyY, 8, 7, shirtC1, shirtC2, shirtC3, team, useAway, isGK, isRef);
      drawArmPix(bodyX + 9, bodyY + 1, bodyX + 17, bodyY - 2);
      drawArmPix(bodyX + 9, bodyY + 5, bodyX + 17, bodyY + 4);
      paintPixelHead(g, bodyX + 11, bodyY - 2, player, skin, 1);
    } else {
      drawLegPix(bodyX + 8, bodyY + 2, bodyX + 16, bodyY + 4, true);
      drawLegPix(bodyX + 8, bodyY + 4, bodyX + 15, bodyY + 6, false);
      g.rect(bodyX + 5, bodyY + 1, 5, 6, shortsC);
      paintPixelTorso(g, bodyX - 3, bodyY, 8, 7, shirtC1, shirtC2, shirtC3, team, useAway, isGK, isRef);
      drawArmPix(bodyX - 4, bodyY + 1, bodyX - 11, bodyY - 2);
      drawArmPix(bodyX - 4, bodyY + 5, bodyX - 11, bodyY + 4);
      paintPixelHead(g, bodyX - 4, bodyY - 2, player, skin, -1);
    }
  } else if (action === 'tackle') {
    // Low sliding tackle pose
    const baseY = 25;
    const leadDir = dir;
    drawLegPix(16, baseY + 1, 16 - leadDir * 5, baseY + 5, true);
    drawLegPix(16 + leadDir * 2, baseY + 1, 16 + leadDir * 11, baseY + 4, false);
    g.rect(12, baseY, 8, 4, shortsC);
    paintPixelTorso(g, 13 - leadDir * 3, baseY - 6, 8, 7, shirtC1, shirtC2, shirtC3, team, useAway, isGK, isRef);
    drawArmPix(15 - leadDir * 3, baseY - 4, 15 - leadDir * 8, baseY);
    paintPixelHead(g, 16 - leadDir * 4, baseY - 10, player, skin, leadDir);
  } else if (action === 'volley') {
    // Acrobatic mid-air bicycle/overhead kick pose
    const cx = 17;
    const cy = 17;
    drawLegPix(cx, cy + 2, cx - dir * 5, cy + 9, true);
    drawLegPix(cx + dir * 2, cy, cx + dir * 10, cy - 8, false);
    g.rect(cx - 4, cy, 8, 4, shortsC);
    paintPixelTorso(g, cx - 5 - dir * 2, cy - 6, 9, 7, shirtC1, shirtC2, shirtC3, team, useAway, isGK, isRef);
    drawArmPix(cx - 4 - dir * 2, cy - 3, cx - 9 - dir * 2, cy + 2);
    drawArmPix(cx + 3 - dir * 2, cy - 3, cx + 6 - dir * 2, cy - 7);
    paintPixelHead(g, cx - dir * 6, cy - 9, player, skin, dir);
  } else {
    // Upright poses: idle, run, kick, celebrate
    const stride =
      action === 'run'
        ? Math.round(Math.sin(phase) * 4)
        : action === 'celebrate'
        ? Math.round(Math.sin(phase * 1.4) * 2)
        : 0;
    const bob =
      action === 'run'
        ? Math.round(Math.abs(Math.cos(phase)) * -1.4)
        : action === 'celebrate'
        ? Math.round(-Math.abs(Math.sin(phase)) * 2.5)
        : 0;
    const kickFwd = action === 'kick' ? dir * 6 : 0;
    const kickUp = action === 'kick' ? -3 : 0;

    const cx = 16;
    const footY = 31;
    const hipY = 24 + bob;
    const torsoY = 16 + bob;
    const headY = 10 + bob;

    // Back arm
    const backArmX = cx - dir * 5 - Math.round(stride * 0.8);
    const backArmY = action === 'celebrate' ? torsoY - 5 : torsoY + 6;
    drawArmPix(cx - dir * 4, torsoY + 1, backArmX, backArmY);

    // Legs
    drawLegPix(cx - 2, hipY + 1, cx - 2 - stride, footY, true);
    drawLegPix(cx + 1, hipY + 1, cx + 1 + stride + kickFwd, footY + kickUp, false);

    // Shorts
    g.rect(cx - 5, hipY - 1, 10, 4, shortsC);

    // Jersey Torso
    paintPixelTorso(g, cx - 5, torsoY, 10, 8, shirtC1, shirtC2, shirtC3, team, useAway, isGK, isRef);

    // Head
    paintPixelHead(g, cx, headY, player, skin, dir);

    // Front arm
    const frontArmX = cx + dir * 5 + Math.round(stride * 0.8);
    const frontArmY = action === 'celebrate' ? torsoY - 6 : torsoY + 6;
    drawArmPix(cx + dir * 4, torsoY + 1, frontArmX, frontArmY);
  }

  g.addOutline('#111111');
  const buf = getSpriteBuf();
  g.renderToCanvas(buf);

  const drawW = Math.round(gridW * s);
  const drawH = Math.round(gridH * s);
  ctx.drawImage(buf, Math.round(px - drawW * 0.5), Math.round(py - drawH * 0.9), drawW, drawH);
  ctx.restore();
}

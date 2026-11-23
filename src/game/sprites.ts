import { PlayerSpec, SkinToneId, TeamSpec } from '../types';

const SKIN_TONES: Record<SkinToneId, { base: string; shade: string }> = {
  fair:  { base: '#f5caa4', shade: '#d49a6a' },
  olive: { base: '#e2b289', shade: '#b98357' },
  tan:   { base: '#c48653', shade: '#955c31' },
  brown: { base: '#8d552c', shade: '#643718' },
  dark:  { base: '#593319', shade: '#3a1e0c' }
};

export function drawKitSwatch(canvas: HTMLCanvasElement, team: TeamSpec, useAway: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.imageSmoothingEnabled = false;
  const k = team.kit;
  const c1 = useAway ? k.awayC1 : k.c1;
  const c2 = useAway ? k.awayC2 : k.c2;

  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, w, h);

  if (!useAway) {
    if (k.pattern === 'hoops') {
      ctx.fillStyle = c2;
      for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);
    } else if (k.pattern === 'solid_trim') {
      ctx.fillStyle = c2;
      ctx.fillRect(0, 0, w, 3);
      ctx.fillRect(0, h - 3, w, 3);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(Math.floor(w / 2) - 2, 2, 4, 2);
    } else if (k.pattern === 'tricolor_v') {
      const stripe = Math.max(2, Math.floor(w / 5));
      ctx.fillStyle = k.c2;
      ctx.fillRect(stripe, 0, stripe, h);
      ctx.fillRect(stripe * 3, 0, stripe, h);
      ctx.fillStyle = k.c3 || '#f8fafc';
      ctx.fillRect(stripe - 1, 0, 1, h);
      ctx.fillRect(stripe * 2, 0, 1, h);
    } else if (k.pattern === 'chest_band') {
      ctx.fillStyle = k.c2;
      ctx.fillRect(0, Math.floor(h * 0.3), w, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, Math.floor(h * 0.3) + 3, w, 1);
      ctx.fillStyle = k.c3 || k.c2;
      ctx.fillRect(0, Math.floor(h * 0.3) + 4, w, 3);
    } else if (k.pattern === 'stripes_v') {
      ctx.fillStyle = c2;
      for (let x = 0; x < w; x += 4) ctx.fillRect(x, 0, 2, h);
    } else if (k.pattern === 'sash') {
      ctx.fillStyle = c2;
      for (let i = 0; i < w; i++) {
        ctx.fillRect(i, Math.floor((i / w) * h) - 1, 3, 3);
      }
    }
  } else {
    ctx.fillStyle = c2;
    ctx.fillRect(0, Math.floor(h * 0.38), w, 3);
  }
}

// Draw mini pixel-art jersey icon for the broadcast scoreboard (like reference screenshot)
export function drawMiniJerseyIcon(canvas: HTMLCanvasElement, team: TeamSpec, useAway: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  const k = team.kit;
  const c1 = useAway ? k.awayC1 : k.c1;
  const c2 = useAway ? k.awayC2 : k.c2;
  const sh = useAway ? k.awayShorts : k.shorts;

  // Outline
  ctx.fillStyle = '#0b0f17';
  ctx.fillRect(4, 1, 10, 10);
  ctx.fillRect(1, 2, 16, 4);
  ctx.fillRect(5, 11, 8, 5);

  // Shirt & sleeves
  ctx.fillStyle = c1;
  ctx.fillRect(5, 2, 8, 8);
  ctx.fillRect(2, 3, 3, 3);
  ctx.fillRect(13, 3, 3, 3);

  if (!useAway && (k.pattern === 'stripes_v' || k.pattern === 'tricolor_v')) {
    ctx.fillStyle = c2;
    ctx.fillRect(6, 2, 2, 8);
    ctx.fillRect(10, 2, 2, 8);
  } else if (!useAway && k.pattern === 'hoops') {
    ctx.fillStyle = c2;
    ctx.fillRect(5, 4, 8, 2);
    ctx.fillRect(5, 8, 8, 2);
  } else {
    ctx.fillStyle = c2;
    ctx.fillRect(5, 2, 8, 2);
  }

  // Shorts
  ctx.fillStyle = sh;
  ctx.fillRect(6, 11, 6, 4);
  ctx.fillStyle = '#0b0f17';
  ctx.fillRect(8, 13, 2, 2);
}

export interface SpriteOpts {
  dirX: number;
  frame: number;
  action: 'idle' | 'run' | 'kick' | 'tackle' | 'dive' | 'celebrate' | 'volley';
  diveDir?: number;
  shadow?: boolean;
  isReferee?: boolean;
}

// Chibi 16-bit Pixel Cup Soccer sprite with crisp black outline & diagonal turf shadow
export function drawPixelPlayerSprite(
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
  const p = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(px + x * s), Math.round(py + y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
  };

  const skin = SKIN_TONES[player.skin] || SKIN_TONES.olive;
  const isGK = player.role === 'GOL' && !opts.isReferee;
  const kit = team.kit;
  const dir = opts.dirX < 0 ? -1 : 1;
  const frame = opts.frame || 0;
  const action = opts.action || 'idle';

  const shirtC1 = opts.isReferee ? '#ec4899' : isGK ? kit.gk : useAway ? kit.awayC1 : kit.c1;
  const shirtC2 = opts.isReferee ? '#111827' : isGK ? kit.gk2 : useAway ? kit.awayC2 : kit.c2;
  const shirtC3 = kit.c3 || shirtC2;
  const shortsC = opts.isReferee ? '#111827' : isGK ? '#111827' : useAway ? kit.awayShorts : kit.shorts;
  const socksC = opts.isReferee ? '#111827' : isGK ? kit.gk : useAway ? kit.awaySocks : kit.socks;
  const bootsC = opts.isReferee ? '#f8fafc' : player.boots;

  // Long diagonal turf shadow matching Pixel Cup Soccer screenshot
  if (opts.shadow) {
    ctx.fillStyle = 'rgba(10, 34, 24, 0.28)';
    ctx.beginPath();
    ctx.ellipse(Math.round(px + 9 * s), Math.round(py + 3 * s), Math.round(13 * s), Math.round(3.2 * s), 0.32, 0, Math.PI * 2);
    ctx.fill();
  }

  // Diving GK
  if (action === 'dive') {
    const d = opts.diveDir || 1;
    p(-8, -9, 16, 6, '#0b0f17');
    p(-7, -8, 14, 4, shirtC1);
    p(-7 * d - 2, -11, 7, 7, '#0b0f17');
    p(-7 * d - 1, -10, 5, 5, skin.base);
    drawHairPixels(p, -7 * d - 1, -10, player, 1);
    p(5 * d - 1, -8, 4, 3, shortsC);
    p(8 * d - 1, -7, 3, 2, bootsC);
    return;
  }

  // Slide Tackle
  if (action === 'tackle') {
    const d = dir;
    p(-6 * d - 3, -11, 8, 7, '#0b0f17');
    p(-6 * d - 2, -10, 6, 5, shirtC1);
    p(-6 * d - 3, -17, 8, 7, '#0b0f17');
    p(-6 * d - 2, -16, 6, 5, skin.base);
    drawHairPixels(p, -6 * d - 2, -16, player, d);
    p(-1, -7, 6, 4, shortsC);
    p(3 * d, -5, 4, 3, socksC);
    p(6 * d, -5, 4, 3, '#0b0f17');
    p(6 * d, -4, 3, 2, bootsC);
    return;
  }

  // Airborne Bicycle / Volley Kick (matches screenshot pose!)
  if (action === 'volley') {
    const d = dir;
    p(-7 * d, -16, 14, 7, '#0b0f17');
    p(-6 * d, -15, 12, 5, shirtC1);
    p(-8 * d, -19, 8, 7, '#0b0f17');
    p(-7 * d, -18, 6, 5, skin.base);
    drawHairPixels(p, -7 * d, -18, player, -d);
    p(2 * d, -17, 5, 4, shortsC);
    p(4 * d, -21, 3, 4, socksC);
    p(5 * d, -23, 3, 2, bootsC);
    return;
  }

  const bob = action === 'run' && (frame === 1 || frame === 3) ? -1 : 0;
  const legSwing = action === 'run' ? (frame === 1 ? 2 : frame === 3 ? -2 : 0) : 0;
  const kickOff = action === 'kick' ? 3 * dir : 0;

  // Crisp 1px black outline around chibi head & body
  p(-5, -16 + bob, 10, 9, '#0b0f17');
  p(-5, -24 + bob, 10, 9, '#0b0f17');

  const leftLegX = -3 + legSwing;
  const rightLegX = 1 - legSwing + kickOff;

  // Legs, socks & highlighted boots
  p(leftLegX - 1, -6, 4, 6, '#0b0f17');
  p(leftLegX, -6, 2, 2, skin.shade);
  p(leftLegX, -4, 2, 2, socksC);
  p(leftLegX - (dir < 0 ? 1 : 0), -2, 3, 2, bootsC);
  p(leftLegX, -2, 1, 1, '#ffffff');

  p(rightLegX - 1, -6, 4, 6, '#0b0f17');
  p(rightLegX, -6, 2, 2, skin.base);
  p(rightLegX, -4, 2, 2, socksC);
  p(rightLegX - (dir < 0 ? 1 : 0), -2, 3, 2, bootsC);
  p(rightLegX + (dir > 0 ? 1 : 0), -2, 1, 1, '#ffffff');

  // Shorts
  p(-4, -9 + bob, 8, 3, shortsC);
  p(-1, -9 + bob, 1, 3, 'rgba(0,0,0,0.22)');

  // Jersey
  const ty = -15 + bob;
  p(-4, ty, 8, 6, shirtC1);
  if (!isGK && !opts.isReferee && !useAway) {
    if (kit.pattern === 'hoops') {
      p(-4, ty + 1, 8, 1, shirtC2);
      p(-4, ty + 3, 8, 1, shirtC2);
      p(-4, ty + 5, 8, 1, shirtC2);
    } else if (kit.pattern === 'solid_trim') {
      p(-4, ty, 8, 1, shirtC2);
      p(-1, ty, 2, 1, '#f8fafc');
      p(1, ty + 2, 1, 1, '#facc15');
    } else if (kit.pattern === 'tricolor_v') {
      p(-3, ty, 2, 6, shirtC3);
      p(-1, ty, 2, 6, shirtC2);
      p(1, ty, 2, 6, shirtC3);
      p(3, ty, 1, 6, shirtC1);
    } else if (kit.pattern === 'chest_band') {
      p(-4, ty + 2, 8, 1, shirtC2);
      p(-4, ty + 3, 8, 1, '#ffffff');
      p(-4, ty + 4, 8, 1, shirtC3);
    } else if (kit.pattern === 'stripes_v') {
      p(-3, ty, 2, 6, shirtC2);
      p(1, ty, 2, 6, shirtC2);
    } else if (kit.pattern === 'sash') {
      p(-3, ty, 2, 2, shirtC2);
      p(-1, ty + 2, 2, 2, shirtC2);
      p(1, ty + 4, 2, 2, shirtC2);
    }
  } else if (!isGK && !opts.isReferee && useAway) {
    p(-4, ty + 2, 8, 2, shirtC2);
  } else if (isGK || opts.isReferee) {
    p(-4, ty, 8, 1, shirtC2);
  }

  // Arms with crisp outline
  if (action === 'celebrate') {
    p(-7, ty - 4, 3, 5, '#0b0f17');
    p(4, ty - 4, 3, 5, '#0b0f17');
    p(-6, ty - 3, 2, 4, skin.base);
    p(4, ty - 3, 2, 4, skin.base);
    p(-5, ty, 2, 2, shirtC1);
    p(3, ty, 2, 2, shirtC1);
  } else {
    const armSwing = action === 'run' ? (frame === 1 ? -1 : frame === 3 ? 1 : 0) : 0;
    p(-6, ty + armSwing, 2, 5, '#0b0f17');
    p(-5, ty + 1 + armSwing, 1, 2, shirtC1);
    p(-5, ty + 3 + armSwing, 1, 2, skin.shade);
    p(4, ty - armSwing, 2, 5, '#0b0f17');
    p(4, ty + 1 - armSwing, 1, 2, shirtC1);
    p(4, ty + 3 - armSwing, 1, 2, skin.base);
  }

  // Larger Expressive Chibi Head (8x7 pixels)
  const hy = -23 + bob;
  p(-4, hy, 8, 7, skin.base);
  p(-4, hy + 6, 8, 1, skin.shade);

  // Expressive eyes
  if (dir >= 0) {
    p(-1, hy + 3, 1, 2, '#111827');
    p(2, hy + 3, 1, 2, '#111827');
  } else {
    p(-3, hy + 3, 1, 2, '#111827');
    p(0, hy + 3, 1, 2, '#111827');
  }

  if (player.beard) {
    p(-2, hy + 5, 5, 2, '#1f1612');
  }

  drawHairPixels(p, -4, hy, player, dir);

  if (player.headband) {
    p(-4, hy + 1, 8, 1, player.headband);
  }
}

function drawHairPixels(
  p: (x: number, y: number, w: number, h: number, color: string) => void,
  hx: number,
  hy: number,
  player: PlayerSpec,
  dir: number
) {
  const hc = player.hairColor;
  switch (player.hair) {
    case 'platinum_fade':
      p(hx, hy - 2, 8, 3, hc);
      p(hx + 1, hy - 2, 6, 1, '#ffffff');
      p(hx, hy + 1, 1, 2, '#1f1916');
      p(hx + 7, hy + 1, 1, 2, '#1f1916');
      break;
    case 'platinum_curly':
      p(hx - 1, hy - 3, 10, 4, hc);
      p(hx, hy - 4, 8, 1, '#ffffff');
      p(hx + 2, hy - 2, 2, 1, '#fde68a');
      break;
    case 'silver_short':
      p(hx, hy - 2, 8, 3, hc);
      p(hx, hy + 1, 1, 2, '#94a3b8');
      p(hx + 7, hy + 1, 1, 2, '#94a3b8');
      break;
    case 'silver_fade':
      p(hx + 1, hy - 2, 6, 2, hc);
      p(hx, hy, 1, 2, '#64748b');
      p(hx + 7, hy, 1, 2, '#64748b');
      break;
    case 'dreads':
      p(hx, hy - 2, 8, 3, hc);
      p(hx - 1, hy - 1, 2, 6, hc);
      p(hx + 7, hy - 1, 2, 6, hc);
      p(hx - 1, hy + 2, 1, 1, '#44403c');
      p(hx + 8, hy + 2, 1, 1, '#44403c');
      break;
    case 'curly_afro':
      p(hx - 1, hy - 3, 10, 4, hc);
      p(hx, hy - 4, 8, 1, hc);
      p(hx - 1, hy + 1, 1, 2, hc);
      p(hx + 8, hy + 1, 1, 2, hc);
      p(hx + 2, hy - 3, 2, 1, '#3f3f46');
      break;
    case 'curly_tips':
      p(hx - 1, hy - 3, 10, 4, hc);
      p(hx + 1, hy - 3, 2, 1, '#facc15');
      p(hx + 5, hy - 3, 2, 1, '#fde047');
      break;
    case 'mohawk':
      p(hx + 3, hy - 4, 2, 4, hc);
      p(hx + 3, hy - 4, 1, 1, '#52525b');
      break;
    case 'shaggy':
      p(hx - 1, hy - 2, 10, 3, hc);
      p(hx - 1, hy + 1, 2, 3, hc);
      p(hx + 7, hy + 1, 2, 3, hc);
      if (dir >= 0) p(hx - 1, hy + 4, 1, 1, hc);
      else p(hx + 8, hy + 4, 1, 1, hc);
      break;
    case 'bald':
      p(hx + 1, hy, 2, 1, '#fff7ed');
      break;
    case 'short_parted':
      p(hx, hy - 2, 8, 3, hc);
      p(hx + 3, hy - 2, 1, 1, '#6b4f3b');
      p(hx, hy + 1, 1, 1, hc);
      p(hx + 7, hy + 1, 1, 1, hc);
      break;
    case 'short_fade':
    default:
      p(hx + 1, hy - 2, 6, 2, hc);
      p(hx, hy - 1, 8, 2, hc);
      break;
  }
}

import type { ProtestRank } from "./ranks";

const BASE = import.meta.env.BASE_URL;
const DISPLAY_FONT = "Outfit, sans-serif";
const BODY_FONT = "'Plus Jakarta Sans', sans-serif";
const EMOJI_FONT = "'Segoe UI Emoji', 'Noto Color Emoji', 'Apple Color Emoji', sans-serif";

const CANVAS_W = 1080;
const CANVAS_H = 1920;

type ShareImageParams = {
  gameCanvas: HTMLCanvasElement;
  score: number;
  exposure: number;
  rank: ProtestRank;
  certCode: string;
  won: boolean;
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function withShadow(
  ctx: CanvasRenderingContext2D,
  shadow: { color: string; blur: number; offsetX?: number; offsetY?: number },
  draw: () => void,
) {
  ctx.save();
  ctx.shadowColor = shadow.color;
  ctx.shadowBlur = shadow.blur;
  ctx.shadowOffsetX = shadow.offsetX ?? 0;
  ctx.shadowOffsetY = shadow.offsetY ?? 0;
  draw();
  ctx.restore();
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  weight: number,
  family: string,
  maxSize: number,
  minSize = 26,
) {
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function fillTextSpaced(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

async function loadDisplayFonts() {
  const combos = [
    "900 32px Outfit",
    "800 32px Outfit",
    "600 32px Outfit",
    "700 32px 'Plus Jakarta Sans'",
    "800 32px 'Plus Jakarta Sans'",
  ];
  await Promise.all(combos.map((spec) => document.fonts.load(spec).catch(() => null)));
  await document.fonts.ready.catch(() => null);
}

function drawMascot(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, w: number) {
  const ratio = (img.naturalWidth || 46) / (img.naturalHeight || 66);
  const h = w / ratio;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  return h;
}

function drawHalftone(ctx: CanvasRenderingContext2D, color: string, alpha: number) {
  const tile = document.createElement("canvas");
  tile.width = 22;
  tile.height = 22;
  const tctx = tile.getContext("2d");
  if (!tctx) return;
  tctx.fillStyle = color;
  tctx.beginPath();
  tctx.arc(11, 11, 2.1, 0, Math.PI * 2);
  tctx.fill();
  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.restore();
}

function drawTearDivider(ctx: CanvasRenderingContext2D, y: number, left: number, right: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(left + 26, y);
  ctx.lineTo(right - 26, y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#1a1030";
  [left, right].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawConfetti(ctx: CanvasRenderingContext2D, cx: number, cy: number, spreadW: number, spreadH: number) {
  const colors = ["#ffe172", "#ff5f9f", "#06d6a0", "#8cd6ea", "#ff4f8b"];
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  ctx.save();
  for (let i = 0; i < 18; i += 1) {
    const angle = rand() * Math.PI * 2;
    const dist = rand() * spreadW * 0.5 + spreadW * 0.35;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * (spreadH / spreadW) * dist;
    const size = 5 + rand() * 8;
    ctx.fillStyle = colors[i % colors.length];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI);
    if (i % 3 === 0) {
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-size / 2, -size / 4, size, size / 2);
    }
    ctx.restore();
  }
  ctx.restore();
}

export async function renderShareImage({
  gameCanvas,
  score,
  exposure,
  rank,
  certCode,
  won,
}: ShareImageParams): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cx = CANVAS_W / 2;
  const { r, g, b } = hexToRgb(rank.color);

  const [mascotStand, mascotStride] = await Promise.all([
    loadImage(`${BASE}assets/characters/flamingo-a.svg`),
    loadImage(`${BASE}assets/characters/flamingo-b.svg`),
  ]);
  await loadDisplayFonts();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // --- Background, tinted by the rank the player earned ---
  const bg = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  bg.addColorStop(0, "#0b0f1d");
  bg.addColorStop(0.5, `rgb(${Math.round(r * 0.32)}, ${Math.round(g * 0.32)}, ${Math.round(b * 0.32)})`);
  bg.addColorStop(1, "#1a0a1f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  drawHalftone(ctx, rank.color, 0.05);

  const vignette = ctx.createRadialGradient(cx, CANVAS_H * 0.42, 200, cx, CANVAS_H * 0.42, CANVAS_H * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // --- Decorative watermark flamingos, marching in from the corners ---
  if (mascotStride) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.translate(-30, 140);
    ctx.rotate((-18 * Math.PI) / 180);
    drawMascot(ctx, mascotStride, 0, 0, 420);
    ctx.restore();
  }
  if (mascotStand) {
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.translate(CANVAS_W + 30, CANVAS_H - 460);
    ctx.rotate((14 * Math.PI) / 180);
    drawMascot(ctx, mascotStand, 0, 0, 380);
    ctx.restore();
  }

  // --- Header: mascot avatar ---
  const avatarCy = 190;
  const avatarR = 92;
  withShadow(ctx, { color: `rgba(${r},${g},${b},0.5)`, blur: 45 }, () => {
    ctx.fillStyle = "#10131d";
    ctx.beginPath();
    ctx.arc(cx, avatarCy, avatarR, 0, Math.PI * 2);
    ctx.fill();
  });
  if (mascotStand) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, avatarCy, avatarR - 6, 0, Math.PI * 2);
    ctx.clip();
    drawMascot(ctx, mascotStand, cx, avatarCy + 16, avatarR * 2.3);
    ctx.restore();
  }
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#ff4f8b";
  ctx.beginPath();
  ctx.arc(cx, avatarCy, avatarR - 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = `800 28px ${DISPLAY_FONT}`;
  fillTextSpaced(ctx, "FLOCK THE SYSTEM", cx, 322, 6);

  withShadow(ctx, { color: "rgba(255,95,159,0.5)", blur: 30 }, () => {
    ctx.fillStyle = "#ff5f9f";
    ctx.font = `900 76px ${DISPLAY_FONT}`;
    ctx.fillText("FLAMINGOJA E FUNDIT", cx, 400);
  });

  ctx.fillStyle = "#c7cdd9";
  ctx.font = `600 32px ${BODY_FONT}`;
  ctx.fillText("Rezultati im në betejën me sistemin", cx, 450);

  // --- Screenshot card ---
  const cardX = 90;
  const cardY = 500;
  const cardW = 900;
  const cardH = 500;
  const cardR = 32;

  withShadow(ctx, { color: "rgba(0,0,0,0.55)", blur: 50, offsetY: 20 }, () => {
    roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fillStyle = "#0d1117";
    ctx.fill();
  });

  ctx.save();
  roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.clip();
  const gScale = Math.max(cardW / gameCanvas.width, cardH / gameCanvas.height);
  const gW = gameCanvas.width * gScale;
  const gH = gameCanvas.height * gScale;
  ctx.drawImage(gameCanvas, cardX + (cardW - gW) / 2, cardY + (cardH - gH) / 2, gW, gH);

  const fade = ctx.createLinearGradient(0, cardY + cardH - 160, 0, cardY + cardH);
  fade.addColorStop(0, "rgba(13,17,23,0)");
  fade.addColorStop(1, "rgba(13,17,23,0.55)");
  ctx.fillStyle = fade;
  ctx.fillRect(cardX, cardY, cardW, cardH);
  ctx.restore();

  roundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.lineWidth = 4;
  ctx.strokeStyle = rank.color;
  ctx.stroke();

  // exposure badge, pinned to the top-right corner of the card like a stat pin
  withShadow(ctx, { color: "rgba(0,0,0,0.4)", blur: 14, offsetY: 4 }, () => {
    ctx.font = `800 26px ${DISPLAY_FONT}`;
    const label = `${exposure} ZBULIME`;
    const labelW = ctx.measureText(label).width;
    const pillW = labelW + 90;
    const pillH = 56;
    const pillX = cardX + cardW - pillW - 24;
    const pillY = cardY - pillH / 2;
    roundedRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fillStyle = "#10131d";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffe172";
    ctx.stroke();
    ctx.font = `36px ${EMOJI_FONT}`;
    ctx.textAlign = "left";
    ctx.fillText("🎯", pillX + 16, pillY + pillH / 2 + 13);
    ctx.fillStyle = "#ffe172";
    ctx.font = `800 26px ${DISPLAY_FONT}`;
    ctx.fillText(label, pillX + 60, pillY + pillH / 2 + 9);
    ctx.textAlign = "center";
  });

  if (mascotStride) {
    withShadow(ctx, { color: "rgba(0,0,0,0.5)", blur: 20, offsetY: 8 }, () => {
      ctx.save();
      ctx.translate(cardX + cardW - 105, cardY + cardH - 105);
      ctx.rotate((-9 * Math.PI) / 180);
      drawMascot(ctx, mascotStride, 0, 0, 190);
      ctx.restore();
    });
  }

  // --- Ticket-style tear divider between the screenshot and the stats ---
  const dividerY = cardY + cardH + 34;
  drawTearDivider(ctx, dividerY, cardX, cardX + cardW);

  // --- Score (cursor-based flow so longer rank text below never overflows) ---
  let cursor = dividerY + 40;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `800 32px ${DISPLAY_FONT}`;
  fillTextSpaced(ctx, "REZULTATI", cx, cursor + 26, 8);
  cursor += 60;

  const scoreBaseline = cursor + 158;
  withShadow(ctx, { color: "rgba(255,226,114,0.55)", blur: 45 }, () => {
    ctx.fillStyle = "#ffe172";
    ctx.font = `900 220px ${DISPLAY_FONT}`;
    ctx.fillText(score.toLocaleString("sq-AL"), cx, scoreBaseline);
  });
  cursor = scoreBaseline + 40;

  // --- Rank chip (height grows to fit the rank's flavor text) ---
  const chipW = 720;
  const chipX = cx - chipW / 2;
  const chipY = cursor;
  const chipPadTop = 172;
  const descLineHeight = 30;
  const descFont = `600 26px ${BODY_FONT}`;
  ctx.font = descFont;
  const descLines = wrapText(ctx, rank.description, chipW - 100).slice(0, 2);
  const chipH = chipPadTop + descLines.length * descLineHeight + 26;

  if (won) {
    drawConfetti(ctx, cx, chipY + chipH / 2, chipW + 140, chipH + 140);
  }

  withShadow(ctx, { color: "rgba(0,0,0,0.45)", blur: 30, offsetY: 10 }, () => {
    roundedRectPath(ctx, chipX, chipY, chipW, chipH, 36);
    ctx.fillStyle = "rgba(16,19,29,0.92)";
    ctx.fill();
  });
  roundedRectPath(ctx, chipX, chipY, chipW, chipH, 36);
  ctx.lineWidth = 3;
  ctx.strokeStyle = rank.color;
  ctx.stroke();

  ctx.fillStyle = rank.color;
  ctx.font = `800 28px ${DISPLAY_FONT}`;
  fillTextSpaced(ctx, `GRADA ${rank.rank}`, cx, chipY + 42, 5);

  ctx.font = `80px ${EMOJI_FONT}`;
  ctx.fillText(rank.badge, cx, chipY + 118);

  const titleText = rank.title.toUpperCase();
  const titleSize = fitFontSize(ctx, titleText, chipW - 60, 900, DISPLAY_FONT, 44);
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${titleSize}px ${DISPLAY_FONT}`;
  ctx.fillText(titleText, cx, chipY + 172);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = descFont;
  descLines.forEach((line, i) => {
    ctx.fillText(line, cx, chipY + chipPadTop + descLineHeight + i * descLineHeight);
  });

  cursor = chipY + chipH + 34;

  // --- Certificate stamp ---
  if (won) {
    const stampW = 620;
    const stampH = 110;
    ctx.save();
    ctx.translate(cx, cursor + stampH / 2);
    ctx.rotate((-3 * Math.PI) / 180);
    roundedRectPath(ctx, -stampW / 2, -stampH / 2, stampW, stampH, 20);
    ctx.fillStyle = "rgba(6,214,160,0.1)";
    ctx.fill();
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#06d6a0";
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#06d6a0";
    ctx.font = `800 32px ${DISPLAY_FONT}`;
    ctx.fillText("✅ SPAK VERIFIED · DOSJA U MBYLL", 0, -14);

    ctx.fillStyle = "#ffd23f";
    ctx.font = `700 30px ${BODY_FONT}`;
    fillTextSpaced(ctx, certCode, 0, 32, 3);
    ctx.restore();

    cursor += stampH + 30;
  }

  // --- Footer ---
  const footerH = 84;
  const footerY = Math.min(cursor, CANVAS_H - footerH - 24);
  roundedRectPath(ctx, 90, footerY, CANVAS_W - 180, footerH, footerH / 2);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.stroke();

  ctx.fillStyle = "#8cd6ea";
  ctx.font = `800 34px ${DISPLAY_FONT}`;
  ctx.fillText("#FlockTheSystem", cx, footerY + 40);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `600 26px ${BODY_FONT}`;
  ctx.fillText("flamingorevolution.eu/lojerat", cx, footerY + 74);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

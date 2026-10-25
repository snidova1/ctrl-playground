'use client';
import * as THREE from 'three';
import type {OutfitDef, Pattern} from '@/game/core/wardrobe';

/** Paints a repeating fabric pattern, then multiplies the garment's own folds/shading back in. */
export function paintFabric(shade: THREE.Texture, outfit: OutfitDef): THREE.Texture {
  const src = shade.image as CanvasImageSource & {width: number; height: number};
  const w = src.width, h = src.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const u = Math.max(w, h) / 32; // pattern cell size in texture pixels
  ctx.fillStyle = outfit.base;
  ctx.fillRect(0, 0, w, h);
  drawPattern(ctx, outfit.pattern, w, h, u, outfit.base, outfit.accent);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(src, 0, 0); // keep the original alpha (cut-outs, lace)
  ctx.globalCompositeOperation = 'source-over';
  const out = new THREE.CanvasTexture(canvas);
  out.colorSpace = THREE.SRGBColorSpace; out.flipY = shade.flipY; out.wrapS = shade.wrapS; out.wrapT = shade.wrapT;
  return out;
}

function drawPattern(ctx: CanvasRenderingContext2D, pattern: Pattern, w: number, h: number, u: number, base: string, accent: string) {
  ctx.fillStyle = accent; ctx.strokeStyle = accent;
  const grid = (step: number, fn: (x: number, y: number, i: number, j: number) => void) => {
    for (let j = 0, y = 0; y < h + step; y += step, j++) for (let i = 0, x = 0; x < w + step; x += step, i++) fn(x, y, i, j);
  };
  switch (pattern) {
    case 'plain': return;
    case 'stripes': for (let y = 0; y < h; y += u * 1.2) ctx.fillRect(0, y, w, u * 0.45); return;
    case 'wide-stripes': for (let y = 0; y < h; y += u * 2.4) ctx.fillRect(0, y, w, u * 1.2); return;
    case 'sailor': {
      ctx.fillRect(0, 0, w, h * 0.16);
      ctx.fillStyle = '#ffffff';
      for (const y of [h * 0.11, h * 0.13]) ctx.fillRect(0, y, w, u * 0.12);
      ctx.fillStyle = '#e8473d';
      ctx.beginPath(); ctx.moveTo(w * 0.47, h * 0.17); ctx.lineTo(w * 0.53, h * 0.17); ctx.lineTo(w * 0.5, h * 0.24); ctx.fill();
      return;
    }
    case 'polka': grid(u * 1.6, (x, y, i, j) => {ctx.beginPath(); ctx.arc(x + (j % 2) * u * 0.8, y, u * 0.33, 0, Math.PI * 2); ctx.fill();}); return;
    case 'plaid': {
      ctx.globalAlpha = 0.55;
      for (let x = 0; x < w; x += u * 2.2) ctx.fillRect(x, 0, u * 0.7, h);
      for (let y = 0; y < h; y += u * 2.2) ctx.fillRect(0, y, w, u * 0.7);
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffffff';
      for (let x = u; x < w; x += u * 2.2) ctx.fillRect(x, 0, u * 0.08, h);
      for (let y = u; y < h; y += u * 2.2) ctx.fillRect(0, y, w, u * 0.08);
      ctx.globalAlpha = 1; return;
    }
    case 'gingham': {
      ctx.globalAlpha = 0.5;
      for (let x = 0; x < w; x += u * 1.2) ctx.fillRect(x, 0, u * 0.6, h);
      for (let y = 0; y < h; y += u * 1.2) ctx.fillRect(0, y, w, u * 0.6);
      ctx.globalAlpha = 1; return;
    }
    case 'checker': grid(u, (x, y, i, j) => {if ((i + j) % 2) ctx.fillRect(x, y, u, u);}); return;
    case 'floral': grid(u * 2.2, (x, y, i, j) => {
      const cx = x + (j % 2) * u * 1.1, cy = y;
      for (let k = 0; k < 5; k++) {const a = (k / 5) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * u * 0.32, cy + Math.sin(a) * u * 0.32, u * 0.26, u * 0.18, a, 0, Math.PI * 2); ctx.fill();}
      ctx.fillStyle = '#fff3a8'; ctx.beginPath(); ctx.arc(cx, cy, u * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = accent;
    }); return;
    case 'stars': grid(u * 1.9, (x, y, i, j) => star(ctx, x + (j % 2) * u * 0.95, y, u * (0.25 + ((i * 7 + j * 3) % 3) * 0.08))); return;
    case 'hearts': grid(u * 1.9, (x, y, i, j) => heart(ctx, x + (j % 2) * u * 0.95, y, u * 0.34)); return;
    case 'cherry': grid(u * 2.2, (x, y, i, j) => {
      const cx = x + (j % 2) * u * 1.1;
      ctx.fillStyle = '#4f8a3c'; ctx.fillRect(cx - u * 0.05, y - u * 0.55, u * 0.1, u * 0.5);
      ctx.fillStyle = accent;
      for (const dx of [-0.22, 0.22]) {ctx.beginPath(); ctx.arc(cx + dx * u, y, u * 0.24, 0, Math.PI * 2); ctx.fill();}
    }); return;
    case 'denim': {
      ctx.globalAlpha = 0.25;
      for (let x = -h; x < w; x += u * 0.22) {ctx.fillRect(x, 0, 1.5, 1); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.lineWidth = u * 0.07; ctx.stroke();}
      ctx.globalAlpha = 0.6; ctx.strokeStyle = '#f2b45a'; ctx.setLineDash([u * 0.2, u * 0.15]); ctx.lineWidth = u * 0.06;
      for (let y = u * 3; y < h; y += u * 6) {ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();}
      ctx.setLineDash([]); ctx.globalAlpha = 1; return;
    }
    case 'knit': {
      ctx.lineWidth = u * 0.12; ctx.globalAlpha = 0.6;
      for (let y = 0; y < h; y += u * 0.5) {ctx.beginPath(); for (let x = 0; x <= w; x += u * 0.5) ctx.lineTo(x, y + ((x / (u * 0.5)) % 2 ? u * 0.25 : 0)); ctx.stroke();}
      ctx.globalAlpha = 1; return;
    }
    case 'camo': {
      let seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let k = 0; k < (w * h) / (u * u) * 0.5; k++) {
        ctx.fillStyle = [accent, '#a9b98a', '#5f4b36'][k % 3];
        ctx.beginPath(); ctx.ellipse(rnd() * w, rnd() * h, u * (0.4 + rnd() * 0.8), u * (0.25 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2); ctx.fill();
      }
      return;
    }
    case 'rainbow': {
      const colors = ['#ff8a8a', '#ffc27a', '#fff07a', '#9be58a', '#8ad0ff', '#b49cff'];
      for (let y = 0, k = 0; y < h; y += u * 1.1, k++) {ctx.fillStyle = colors[k % colors.length]; ctx.fillRect(0, y, w, u * 1.1);}
      return;
    }
  }
  void base;
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);}
  ctx.fill();
}
function heart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.35);
  ctx.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
  ctx.fill();
}

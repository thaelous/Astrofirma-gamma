import { LetterPoint, MathMode } from '../types';
import { evaluateLagrange, evaluateFourier, computeFourierCoefficients } from './math';

export function exportSignaturePoster(
  word: string,
  points: LetterPoint[],
  mode: MathMode = 'lagrange'
): void {
  const canvas = document.createElement('canvas');
  const W = 1200;
  const H = 1480;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const phrase = (word && word.trim().length > 0 ? word.trim() : 'ALTAIR').toUpperCase();

  // 1. Fondo Estelar Profundo (#040510)
  ctx.fillStyle = '#040510';
  ctx.fillRect(0, 0, W, H);

  // Gradientes Cósmicos de Fondo
  const grad1 = ctx.createRadialGradient(W / 2, 280, 50, W / 2, 280, 750);
  grad1.addColorStop(0, 'rgba(99, 102, 241, 0.18)');
  grad1.addColorStop(0.6, 'rgba(49, 46, 129, 0.08)');
  grad1.addColorStop(1, 'rgba(4, 5, 16, 0)');
  ctx.fillStyle = grad1;
  ctx.fillRect(0, 0, W, H);

  const grad2 = ctx.createRadialGradient(W / 2, 950, 40, W / 2, 950, 600);
  grad2.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
  grad2.addColorStop(0.7, 'rgba(14, 116, 144, 0.05)');
  grad2.addColorStop(1, 'rgba(4, 5, 16, 0)');
  ctx.fillStyle = grad2;
  ctx.fillRect(0, 0, W, H);

  // Polvo Estelar (Micro-estrellas deterministas)
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 90; i++) {
    const sx = (Math.sin(i * 193.3 + 12.5) * 0.5 + 0.5) * W;
    const sy = (Math.cos(i * 317.7 + 73.1) * 0.5 + 0.5) * H;
    const radius = 0.6 + (Math.sin(i * 57.1) * 0.5 + 0.5) * 1.5;
    const alpha = 0.2 + (Math.cos(i * 89.3) * 0.5 + 0.5) * 0.6;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. Marco Exterior con Borde Suave
  const m = 32;
  const mw = W - m * 2;
  const mh = H - m * 2;
  const r = 24;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
  ctx.shadowColor = '#6366f1';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.roundRect(m, m, mw, mh, r);
  ctx.stroke();
  ctx.restore();

  // Encabezado del Póster
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.fillStyle = '#c7d2fe';
  ctx.shadowColor = '#818cf8';
  ctx.shadowBlur = 10;
  ctx.fillText('A S T R O F I R M A   S O N O R A', W / 2, 78);

  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#64748b';
  ctx.shadowBlur = 0;
  ctx.fillText('FIRMA ACÚSTICA Y MATEMÁTICA • ANÁLISIS ESPECTRAL Y POLINÓMICO', W / 2, 102);
  ctx.restore();

  // ==========================================
  // PARTE SUPERIOR: Gráfica Cartesiana (Curva)
  // ==========================================
  const cartX = 54;
  const cartY = 126;
  const cartW = W - cartX * 2;
  const cartH = 500;

  // Caja de la Gráfica Cartesiana
  ctx.save();
  ctx.fillStyle = '#06091f';
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(cartX, cartY, cartW, cartH, 16);
  ctx.fill();
  ctx.stroke();

  // Etiqueta superior de la sección
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'left';
  ctx.fillText('📈 GRÁFICA CARTESIANA • CURVA DE LAGRANGE / NODOS ESTELARES', cartX + 20, cartY + 28);
  ctx.restore();

  // Intentar copiar el canvas cartesiano existente si está disponible
  const liveCartCanvas = document.getElementById('cartesian-canvas') as HTMLCanvasElement | null;
  let drawnFromLiveCart = false;
  if (liveCartCanvas && liveCartCanvas.width > 0 && liveCartCanvas.height > 0) {
    try {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cartX + 10, cartY + 40, cartW - 20, cartH - 50, 10);
      ctx.clip();
      ctx.drawImage(liveCartCanvas, cartX + 10, cartY + 40, cartW - 20, cartH - 50);
      ctx.restore();
      drawnFromLiveCart = true;
    } catch {
      drawnFromLiveCart = false;
    }
  }

  // Si no se pudo copiar del DOM en vivo, dibujar la curva analítica directamente
  if (!drawnFromLiveCart && points.length > 0) {
    drawStandaloneCartesianPlot(ctx, points, mode, cartX + 15, cartY + 45, cartW - 30, cartH - 58);
  }

  // ==========================================
  // PARTE MEDIA: Osciloscopio en Tiempo Real
  // ==========================================
  const oscX = 54;
  const oscY = 650;
  const oscW = W - oscX * 2;
  const oscH = 430;

  // Caja del Osciloscopio
  ctx.save();
  ctx.fillStyle = '#050718';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(oscX, oscY, oscW, oscH, 16);
  ctx.fill();
  ctx.stroke();

  // Etiqueta superior del osciloscopio
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'left';
  ctx.fillText('〰️ OSCILOSCOPIO EN TIEMPO REAL • DOMINIO TEMPORAL (CAPTURADO)', oscX + 20, oscY + 28);

  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'right';
  ctx.fillText('WEB AUDIO API • TIME-DOMAIN RESOLUTION', oscX + oscW - 20, oscY + 28);
  ctx.restore();

  // Intentar copiar el osciloscopio en vivo
  const liveOscCanvas = document.getElementById('oscilloscope-canvas') as HTMLCanvasElement | null;
  let drawnFromLiveOsc = false;
  if (liveOscCanvas && liveOscCanvas.width > 0 && liveOscCanvas.height > 0) {
    try {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(oscX + 12, oscY + 42, oscW - 24, oscH - 54, 10);
      ctx.clip();
      ctx.drawImage(liveOscCanvas, oscX + 12, oscY + 42, oscW - 24, oscH - 54);
      ctx.restore();
      drawnFromLiveOsc = true;
    } catch {
      drawnFromLiveOsc = false;
    }
  }

  // Fallback si el osciloscopio no estaba disponible
  if (!drawnFromLiveOsc) {
    drawSyntheticWaveform(ctx, oscX + 12, oscY + 42, oscW - 24, oscH - 54, points);
  }

  // ==========================================
  // PARTE INFERIOR: Enmarcado Elegante con la Frase
  // ==========================================
  const footX = 54;
  const footY = 1104;
  const footW = W - footX * 2;
  const footH = 300;

  // Marco elegante
  ctx.save();
  ctx.fillStyle = 'rgba(7, 12, 38, 0.92)';
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = 'rgba(99, 102, 241, 0.3)';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.roundRect(footX, footY, footW, footH, 18);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Contenido de la ficha inferior
  ctx.save();
  ctx.textAlign = 'center';

  // Frase entre comillas destacada
  const displayPhrase = `“${phrase}”`;
  ctx.font = phrase.length > 25 ? 'bold 36px "Plus Jakarta Sans", sans-serif' : 'bold 46px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 20;
  ctx.fillText(displayPhrase, W / 2, footY + 84);

  // Subtítulo pequeño: "AstroFirma Sonora • Firma Acústica y Matemática"
  ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#93c5fd';
  ctx.shadowColor = '#6366f1';
  ctx.shadowBlur = 8;
  ctx.fillText('AstroFirma Sonora • Firma Acústica y Matemática', W / 2, footY + 124);

  // Divisor sutil
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 240, footY + 148);
  ctx.lineTo(W / 2 + 240, footY + 148);
  ctx.stroke();

  // Badges / Metadata técnica
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#94a3b8';
  const pointsCount = points.length;
  const minFreq = points.length > 0 ? Math.round(Math.min(...points.map((p) => p.frequency))) : 0;
  const maxFreq = points.length > 0 ? Math.round(Math.max(...points.map((p) => p.frequency))) : 0;
  ctx.fillText(
    `${pointsCount} Caracteres • Rango: ${minFreq} Hz - ${maxFreq} Hz • Cuantización MIDI Estricta • Protocolo 180ms/100ms`,
    W / 2,
    footY + 184
  );

  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#475569';
  const dateStr = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  ctx.fillText(`Generado con AstroFirma Sonora Gamma • ${dateStr}`, W / 2, footY + 215);

  ctx.restore();

  // 3. Disparar Descarga Automática con el nombre astrofirma_[frase_sin_espacios].png
  const safeName = phrase.toLowerCase().replace(/[^a-z0-9ñ]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'firma';
  const fileName = `astrofirma_${safeName}.png`;

  try {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Error al descargar la postal:', err);
  }
}

/**
 * Renderizado analítico nítido de la gráfica cartesiana cuando no se extrae del DOM
 */
function drawStandaloneCartesianPlot(
  ctx: CanvasRenderingContext2D,
  points: LetterPoint[],
  mode: MathMode,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  ctx.fillStyle = '#03040e';
  ctx.fillRect(x, y, w, h);

  const pad = 40;
  const plotW = w - pad * 2;
  const plotH = h - pad * 2;

  const N = points.length;
  if (N === 0) {
    ctx.restore();
    return;
  }

  let minY = Infinity;
  let maxY = -Infinity;
  points.forEach((p) => {
    if (p.ascii < minY) minY = p.ascii;
    if (p.ascii > maxY) maxY = p.ascii;
  });

  const yRange = Math.max(12, maxY - minY);
  const domainMin = minY - yRange * 0.15;
  const domainMax = maxY + yRange * 0.15;

  const toScreenX = (px: number) => (N === 1 ? x + w / 2 : x + pad + (px / (N - 1)) * plotW);
  const toScreenY = (py: number) => y + h - pad - ((py - domainMin) / (domainMax - domainMin)) * plotH;

  // Cuadrícula sutil
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const gy = y + pad + (i / 5) * plotH;
    ctx.beginPath();
    ctx.moveTo(x + pad, gy);
    ctx.lineTo(x + w - pad, gy);
    ctx.stroke();
  }

  // Curva de interpolación
  const fourierCoeffs = mode === 'fourier' ? computeFourierCoefficients(points) : null;
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 14;
  ctx.beginPath();

  const samples = Math.max(200, N * 25);
  for (let s = 0; s <= samples; s++) {
    const t = (s / samples) * (N - 1);
    let valY = 0;
    if (mode === 'fourier' && fourierCoeffs) {
      valY = evaluateFourier(fourierCoeffs, N, t);
    } else {
      valY = evaluateLagrange(points, t);
    }
    const sx = toScreenX(t);
    const sy = toScreenY(valY);

    if (s === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();
  ctx.restore();

  // Puntos estelares (nodos)
  points.forEach((p) => {
    const sx = toScreenX(p.index);
    const sy = toScreenY(p.ascii);

    // Halo estelar
    ctx.save();
    ctx.fillStyle = '#6366f1';
    ctx.shadowColor = '#818cf8';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fill();

    // Centro brillante
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Etiqueta del carácter
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText(p.char === ' ' ? '␣' : p.char, sx, sy - 12);
    ctx.restore();
  });

  ctx.restore();
}

/**
 * Forma de onda sintética luminosa para el osciloscopio en caso de render offline
 */
function drawSyntheticWaveform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  points: LetterPoint[]
) {
  ctx.save();
  ctx.fillStyle = '#03040e';
  ctx.fillRect(x, y, w, h);

  // Línea central
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();

  // Trazado de onda osciloscópica
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 12;
  ctx.beginPath();

  const primaryFreq = points.length > 0 ? points[0].frequency : 440;
  const cycles = Math.max(3, Math.min(18, Math.round(primaryFreq / 60)));

  for (let px = 0; px < w; px++) {
    const t = px / w;
    const wave = Math.sin(t * Math.PI * 2 * cycles) * 0.65 + Math.sin(t * Math.PI * 2 * cycles * 2) * 0.15;
    const py = y + h / 2 + wave * (h * 0.35);

    if (px === 0) ctx.moveTo(x + px, py);
    else ctx.lineTo(x + px, py);
  }
  ctx.stroke();

  // Núcleo blanco
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#ffffff';
  ctx.shadowBlur = 0;
  ctx.stroke();

  ctx.restore();
}

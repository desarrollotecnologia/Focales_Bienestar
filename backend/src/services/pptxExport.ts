import PptxGenJS from 'pptxgenjs';
import { mesLabel } from './scoring';
import type { DashboardFilters } from './dashboard';

type DashboardPayload = Awaited<ReturnType<typeof import('./dashboard').getDashboardData>>;

const C = {
  green: '14532D',
  greenMid: '166534',
  greenDeep: '052E16',
  greenSoft: 'F0FDF4',
  white: 'FFFFFF',
  stone: '57534E',
  stoneLight: 'F5F5F4',
  border: 'E7E5E4',
  crit: 'E11D48',
  critBg: 'FFF1F4',
  critBorder: 'FECDD3',
  mid: 'EA580C',
  midBg: 'FFF7ED',
  midBorder: 'FED7AA',
  pos: '059669',
  posBg: 'ECFDF5',
  sky: '0EA5E9',
  skyBg: 'F0F9FF',
  violet: '7C3AED',
  ink: '1C1917',
};

function filtrosTexto(f: DashboardFilters): string {
  const parts: string[] = [];
  if (f.anios?.length === 1 && f.meses?.length === 1) {
    parts.push(`Mes: ${mesLabel(f.anios[0], f.meses[0])}`);
  } else {
    if (f.anios?.length) parts.push(`Años: ${f.anios.join(', ')}`);
    if (f.meses?.length) parts.push(`Meses: ${f.meses.join(', ')}`);
  }
  if (f.fechaDesde || f.fechaHasta) {
    parts.push(`Rango: ${f.fechaDesde || '…'} → ${f.fechaHasta || '…'}`);
  }
  if (f.cicloIds?.length) parts.push(`Ciclos: ${f.cicloIds.length}`);
  if (f.areaIds?.length) parts.push(`Áreas: ${f.areaIds.length}`);
  if (f.categoriaIds?.length) parts.push(`Categorías: ${f.categoriaIds.length}`);
  if (f.termometros?.length) parts.push(`Termómetro: ${f.termometros.join(', ')}`);
  if (f.estados?.length) parts.push(`Estado: ${f.estados.join(', ')}`);
  return parts.length ? parts.join('  ·  ') : 'Sin filtros (todos los registros)';
}

/** Misma paleta/rangos que Escala: Crítico / Riesgo / Aceptable / Bueno / Excelente */
function scoreColor(score: number): string {
  if (score < 50) return C.crit; // E11D48
  if (score < 70) return C.mid; // EA580C
  if (score < 80) return 'CA8A04'; // Aceptable
  if (score < 90) return '0284C7'; // Bueno
  return C.pos; // 059669 Excelente
}

function scoreBg(score: number): string {
  if (score < 50) return C.critBg;
  if (score < 70) return C.midBg;
  if (score < 80) return 'FEF9C3';
  if (score < 90) return 'E0F2FE';
  return C.posBg;
}

function addHero(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  title: string,
  subtitle: string,
) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.333, h: 1.15,
    fill: { color: C.greenDeep },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0.95, w: 13.333, h: 0.2,
    fill: { color: C.greenMid },
  });
  slide.addText('COLBEEF  ·  GRUPOS FOCALES', {
    x: 0.4, y: 0.18, w: 12.5, h: 0.28,
    color: '86EFAC', fontSize: 11, bold: true, fontFace: 'Arial',
    charSpacing: 4,
  });
  slide.addText(title, {
    x: 0.4, y: 0.45, w: 12.5, h: 0.42,
    color: C.white, fontSize: 26, bold: true, fontFace: 'Arial',
  });
  slide.addText(subtitle, {
    x: 0.4, y: 1.25, w: 12.5, h: 0.32,
    color: C.stone, fontSize: 12, fontFace: 'Arial',
  });
}

function addKpiCard(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  x: number,
  y: number,
  w: number,
  label: string,
  value: number | string,
  accent: string,
  accentBg: string,
  ratio = 0,
) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 1.35,
    fill: { color: C.white },
    shadow: { type: 'outer', color: '000000', blur: 6, opacity: 0.08, offset: 2 },
    rectRadius: 0.1,
    line: { color: C.border, width: 1 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w, h: 0.08,
    fill: { color: accent },
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: x + w - 0.55, y: y + 0.2, w: 0.38, h: 0.38,
    fill: { color: accentBg },
    rectRadius: 0.06,
  });
  slide.addText(label.toUpperCase(), {
    x: x + 0.18, y: y + 0.2, w: w - 0.85, h: 0.28,
    color: C.stone, fontSize: 10, bold: true, fontFace: 'Arial',
  });
  slide.addText(String(value), {
    x: x + 0.18, y: y + 0.48, w: w - 0.4, h: 0.45,
    color: C.ink, fontSize: 32, bold: true, fontFace: 'Arial',
  });
  // proportion bar track
  slide.addShape(pptx.ShapeType.roundRect, {
    x: x + 0.18, y: y + 1.08, w: w - 0.36, h: 0.1,
    fill: { color: C.stoneLight },
    rectRadius: 0.05,
  });
  const barW = Math.max(0.12, (w - 0.36) * Math.min(1, Math.max(0.04, ratio)));
  slide.addShape(pptx.ShapeType.roundRect, {
    x: x + 0.18, y: y + 1.08, w: barW, h: 0.1,
    fill: { color: accent },
    rectRadius: 0.05,
  });
}

function addBarRow(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  x: number,
  y: number,
  w: number,
  label: string,
  count: number,
  total: number,
  color: string,
) {
  const pct = total ? count / total : 0;
  slide.addText(label, {
    x, y, w: w * 0.62, h: 0.22,
    color: C.ink, fontSize: 11, fontFace: 'Arial',
  });
  slide.addText(String(count), {
    x: x + w * 0.62, y, w: w * 0.38, h: 0.22,
    color: C.ink, fontSize: 11, bold: true, fontFace: 'Arial', align: 'right',
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y: y + 0.24, w, h: 0.1,
    fill: { color: C.stoneLight },
    rectRadius: 0.05,
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y: y + 0.24, w: Math.max(0.08, w * pct), h: 0.1,
    fill: { color },
    rectRadius: 0.05,
  });
}

export async function buildDashboardPptx(data: DashboardPayload): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
  pptx.layout = 'WIDE';
  pptx.author = 'Focales Bienestar - Colbeef';
  pptx.title = 'Reporte Grupos Focales';

  const filtros = filtrosTexto(data.filtrosAplicados);
  const total = Math.max(data.total, 1);

  // ═══════════════════════════════════════════
  // SLIDE 1 — Resumen general (como dashboard)
  // ═══════════════════════════════════════════
  {
    const s = pptx.addSlide();
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.333, h: 7.5,
      fill: { color: 'FAFAF9' },
    });
    addHero(pptx, s, 'Resumen general', filtros);

    const kpiY = 1.7;
    addKpiCard(pptx, s, 0.35, kpiY, 3.0, 'Total hallazgos', data.total, C.greenMid, C.greenSoft, 1);
    addKpiCard(
      pptx, s, 3.55, kpiY, 3.0, 'Críticos', data.termometro.CRITICO, C.crit, C.critBg,
      data.termometro.CRITICO / total,
    );
    addKpiCard(
      pptx, s, 6.75, kpiY, 3.0, 'Medios', data.termometro.MEDIO, C.mid, C.midBg,
      data.termometro.MEDIO / total,
    );
    addKpiCard(
      pptx, s, 9.95, kpiY, 3.0, 'Positivos', data.termometro.POSITIVO, C.pos, C.posBg,
      data.termometro.POSITIVO / total,
    );

    // Categorías panel
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.35, y: 3.25, w: 4.1, h: 3.95,
      fill: { color: C.white },
      line: { color: C.border, width: 1 },
      rectRadius: 0.1,
    });
    s.addText('CATEGORÍAS', {
      x: 0.55, y: 3.4, w: 3.7, h: 0.3,
      color: C.green, fontSize: 13, bold: true, fontFace: 'Arial',
    });
    data.categorias.slice(0, 7).forEach((c, i) => {
      addBarRow(pptx, s, 0.55, 3.8 + i * 0.4, 3.7, c.name.slice(0, 28), c.count, data.total, C.greenMid);
    });

    // Subcategorías panel
    s.addShape(pptx.ShapeType.roundRect, {
      x: 4.65, y: 3.25, w: 4.1, h: 3.95,
      fill: { color: C.white },
      line: { color: C.border, width: 1 },
      rectRadius: 0.1,
    });
    s.addText('SUBCATEGORÍAS', {
      x: 4.85, y: 3.4, w: 3.7, h: 0.3,
      color: C.green, fontSize: 13, bold: true, fontFace: 'Arial',
    });
    data.subcategorias.slice(0, 7).forEach((c, i) => {
      addBarRow(pptx, s, 4.85, 3.8 + i * 0.4, 3.7, c.name.slice(0, 28), c.count, data.total, '0D9488');
    });

    // Seguimiento panel
    s.addShape(pptx.ShapeType.roundRect, {
      x: 8.95, y: 3.25, w: 4.0, h: 3.95,
      fill: { color: C.white },
      line: { color: C.border, width: 1 },
      rectRadius: 0.1,
    });
    s.addText('ESTADO DE SEGUIMIENTO', {
      x: 9.15, y: 3.4, w: 3.6, h: 0.3,
      color: C.green, fontSize: 13, bold: true, fontFace: 'Arial',
    });
    addBarRow(pptx, s, 9.15, 3.85, 3.6, 'Abierto', data.estados.ABIERTO, data.total, C.sky);
    addBarRow(pptx, s, 9.15, 4.35, 3.6, 'En proceso', data.estados.EN_PROCESO, data.total, C.violet);
    addBarRow(pptx, s, 9.15, 4.85, 3.6, 'Cerrado', data.estados.CERRADO, data.total, '78716C');

    if (data.comparativoPrevio) {
      s.addShape(pptx.ShapeType.roundRect, {
        x: 9.15, y: 5.5, w: 3.6, h: 1.45,
        fill: { color: C.stoneLight },
        rectRadius: 0.08,
      });
      s.addText(data.comparativoPrevio.label.toUpperCase(), {
        x: 9.3, y: 5.6, w: 3.3, h: 0.25,
        color: C.stone, fontSize: 9, bold: true, fontFace: 'Arial',
      });
      s.addText(
        [
          { text: `Abierto  ${data.comparativoPrevio.abierto}`, options: { breakLine: true } },
          { text: `En proceso  ${data.comparativoPrevio.enProceso}`, options: { breakLine: true } },
          { text: `Cerrado  ${data.comparativoPrevio.cerrado}`, options: { breakLine: true } },
          { text: `Total  ${data.comparativoPrevio.total}`, options: { bold: true } },
        ],
        { x: 9.3, y: 5.9, w: 3.3, h: 0.95, color: C.ink, fontSize: 12, fontFace: 'Arial' },
      );
    }
  }

  // ═══════════════════════════════════════════
  // SLIDE 2 — Termómetro por área
  // ═══════════════════════════════════════════
  {
    const s = pptx.addSlide();
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.333, h: 7.5,
      fill: { color: 'FAFAF9' },
    });
    addHero(
      pptx, s, 'Estado termómetro por área',
      `Promedio ${data.promedioGeneral}  ·  ${data.estadoPromedio}  ·  ${filtros}`,
    );

    // Average badge
    s.addShape(pptx.ShapeType.roundRect, {
      x: 9.4, y: 1.7, w: 3.55, h: 0.85,
      fill: { color: scoreBg(data.promedioGeneral) },
      line: { color: scoreColor(data.promedioGeneral), width: 1.5 },
      rectRadius: 0.1,
    });
    s.addText('PROMEDIO GENERAL', {
      x: 9.55, y: 1.78, w: 3.25, h: 0.22,
      color: C.stone, fontSize: 9, bold: true, fontFace: 'Arial',
    });
    s.addText(`${data.promedioGeneral}`, {
      x: 9.55, y: 1.98, w: 1.4, h: 0.45,
      color: scoreColor(data.promedioGeneral), fontSize: 26, bold: true, fontFace: 'Arial',
    });
    s.addText(data.estadoPromedio, {
      x: 10.9, y: 2.1, w: 1.9, h: 0.35,
      color: C.ink, fontSize: 11, bold: true, fontFace: 'Arial', valign: 'middle',
    });

    const areas = data.termometroAreas.slice(0, 9);
    areas.forEach((a, i) => {
      const y = 2.75 + i * 0.48;
      const color = scoreColor(a.calificacion);
      s.addText(a.area, {
        x: 0.45, y, w: 2.2, h: 0.35,
        color: C.ink, fontSize: 12, bold: true, fontFace: 'Arial', valign: 'middle',
      });
      // track
      s.addShape(pptx.ShapeType.roundRect, {
        x: 2.75, y: y + 0.1, w: 6.4, h: 0.18,
        fill: { color: C.stoneLight },
        rectRadius: 0.08,
      });
      s.addShape(pptx.ShapeType.roundRect, {
        x: 2.75, y: y + 0.1, w: Math.max(0.15, 6.4 * (Math.min(100, a.calificacion) / 100)), h: 0.18,
        fill: { color },
        rectRadius: 0.08,
      });
      s.addText(String(a.calificacion), {
        x: 9.3, y, w: 0.8, h: 0.35,
        color: C.ink, fontSize: 14, bold: true, fontFace: 'Arial', valign: 'middle',
      });
      s.addShape(pptx.ShapeType.roundRect, {
        x: 10.2, y: y + 0.02, w: 2.7, h: 0.32,
        fill: { color: scoreBg(a.calificacion) },
        rectRadius: 0.06,
      });
      s.addText(a.estado, {
        x: 10.25, y: y + 0.02, w: 2.6, h: 0.32,
        color, fontSize: 10, bold: true, fontFace: 'Arial', valign: 'middle', align: 'center',
      });
    });
  }

  // ═══════════════════════════════════════════
  // SLIDE 3 — Criticidad (clara + color, sin ruido)
  // ═══════════════════════════════════════════
  {
    const s = pptx.addSlide();
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.333, h: 7.5,
      fill: { color: 'FAFAF9' },
    });
    addHero(
      pptx,
      s,
      'Hallazgos por criticidad',
      `${filtros}  ·  ${data.total} hallazgos clasificados por nivel de riesgo`,
    );

    const critN = data.termometro.CRITICO;
    const midN = data.termometro.MEDIO;
    const posN = data.termometro.POSITIVO;
    const totN = Math.max(data.total, 1);
    const pct = (n: number) => `${Math.round((n / totN) * 100)}%`;
    const chartValues = [critN, midN, posN];
    const hasChartData = chartValues.some((v) => v > 0);

    // Tres niveles: color + significado + cifra (una sola vez)
    const niveles = [
      {
        label: 'Crítico',
        meaning: 'Alto riesgo — requiere decisión y acción inmediata',
        value: critN,
        color: C.crit,
        bg: C.critBg,
      },
      {
        label: 'Medio',
        meaning: 'Riesgo moderado — seguimiento y plan de mejora',
        value: midN,
        color: C.mid,
        bg: C.midBg,
      },
      {
        label: 'Positivo',
        meaning: 'Buena práctica — fortalecer y replicar',
        value: posN,
        color: C.pos,
        bg: C.posBg,
      },
    ];
    niveles.forEach((n, i) => {
      const x = 0.35 + i * 4.25;
      s.addShape(pptx.ShapeType.roundRect, {
        x, y: 1.7, w: 4.05, h: 1.7,
        fill: { color: n.bg },
        line: { color: n.color, width: 1.5 },
        rectRadius: 0.1,
      });
      s.addShape(pptx.ShapeType.rect, {
        x, y: 1.7, w: 0.14, h: 1.7,
        fill: { color: n.color },
      });
      s.addText(n.label.toUpperCase(), {
        x: x + 0.3, y: 1.85, w: 2.4, h: 0.28,
        color: n.color, fontSize: 13, bold: true, fontFace: 'Arial',
      });
      s.addText(pct(n.value), {
        x: x + 2.7, y: 1.85, w: 1.15, h: 0.28,
        color: n.color, fontSize: 13, bold: true, fontFace: 'Arial', align: 'right',
      });
      s.addText(String(n.value), {
        x: x + 0.3, y: 2.2, w: 3.5, h: 0.55,
        color: C.ink, fontSize: 36, bold: true, fontFace: 'Arial',
      });
      s.addText(n.meaning, {
        x: x + 0.3, y: 2.8, w: 3.5, h: 0.4,
        color: C.stone, fontSize: 11, fontFace: 'Arial',
      });
    });

    // Una sola gráfica: qué peso tiene cada nivel
    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.35, y: 3.6, w: 5.4, h: 3.55,
      fill: { color: C.white },
      line: { color: C.border, width: 1 },
      rectRadius: 0.1,
    });
    s.addText('¿CÓMO SE REPARTE EL TOTAL?', {
      x: 0.55, y: 3.75, w: 5.0, h: 0.28,
      color: C.stone, fontSize: 11, bold: true, fontFace: 'Arial',
    });
    s.addText(`De ${data.total} hallazgos del periodo`, {
      x: 0.55, y: 4.05, w: 5.0, h: 0.25,
      color: C.ink, fontSize: 13, bold: true, fontFace: 'Arial',
    });

    if (hasChartData) {
      s.addChart(
        pptx.ChartType.doughnut,
        [
          {
            name: 'Hallazgos',
            labels: ['Crítico', 'Medio', 'Positivo'],
            values: chartValues,
          },
        ],
        {
          x: 0.7,
          y: 4.35,
          w: 2.55,
          h: 2.55,
          chartColors: [C.crit, C.mid, C.pos],
          showTitle: false,
          showPercent: true,
          showLegend: false,
          showValue: false,
          holeSize: 58,
          dataNoEffects: true,
          dataBorder: { pt: 2, color: C.white },
        },
      );
      niveles.forEach((n, i) => {
        const y = 4.55 + i * 0.7;
        s.addShape(pptx.ShapeType.ellipse, {
          x: 3.45, y: y + 0.08, w: 0.22, h: 0.22,
          fill: { color: n.color },
        });
        s.addText(n.label, {
          x: 3.8, y, w: 1.7, h: 0.22,
          color: C.stone, fontSize: 11, fontFace: 'Arial',
        });
        s.addText(`${n.value}  (${pct(n.value)})`, {
          x: 3.8, y: y + 0.22, w: 1.7, h: 0.28,
          color: C.ink, fontSize: 14, bold: true, fontFace: 'Arial',
        });
      });
    }

    // Lista de críticos: a qué se refiere la cifra roja
    s.addShape(pptx.ShapeType.roundRect, {
      x: 5.95, y: 3.6, w: 7.0, h: 3.55,
      fill: { color: C.white },
      line: { color: C.critBorder, width: 1.5 },
      rectRadius: 0.1,
    });
    s.addShape(pptx.ShapeType.rect, {
      x: 5.95, y: 3.6, w: 0.12, h: 3.55,
      fill: { color: C.crit },
    });
    s.addText('¿A QUÉ SE REFIEREN LOS CRÍTICOS?', {
      x: 6.25, y: 3.75, w: 6.5, h: 0.28,
      color: C.crit, fontSize: 11, bold: true, fontFace: 'Arial',
    });
    s.addText('Casos prioritarios para decidir en junta', {
      x: 6.25, y: 4.05, w: 6.5, h: 0.28,
      color: C.ink, fontSize: 14, bold: true, fontFace: 'Arial',
    });

    if (data.criticos.length) {
      data.criticos.slice(0, 4).forEach((c, i) => {
        const y = 4.45 + i * 0.6;
        s.addText(String(i + 1), {
          x: 6.25, y, w: 0.35, h: 0.5,
          color: C.crit, fontSize: 16, bold: true, fontFace: 'Arial', valign: 'middle',
        });
        s.addText(
          [
            {
              text: `${c.area}  ·  ${c.categoria}`,
              options: { bold: true, breakLine: true, fontSize: 12, color: C.ink },
            },
            {
              text: c.observacion.slice(0, 85) + (c.observacion.length > 85 ? '…' : ''),
              options: { fontSize: 11, color: C.stone },
            },
          ],
          { x: 6.7, y, w: 6.0, h: 0.55, fontFace: 'Arial', valign: 'middle' },
        );
      });
    } else {
      s.addText('No hay hallazgos críticos en este filtro.', {
        x: 6.25, y: 5.2, w: 6.4, h: 0.4,
        color: C.stone, fontSize: 13, fontFace: 'Arial',
      });
    }
  }

  // ═══════════════════════════════════════════
  // SLIDE 4 — Filtros de la consulta
  // ═══════════════════════════════════════════
  {
    const s = pptx.addSlide();
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 13.333, h: 7.5,
      fill: { color: 'FAFAF9' },
    });
    addHero(pptx, s, 'Filtros de la consulta', 'La presentación refleja exactamente lo filtrado en el dashboard');

    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 2.0, w: 11.7, h: 4.6,
      fill: { color: C.white },
      line: { color: C.border, width: 1 },
      rectRadius: 0.12,
    });

    s.addText('CONSULTA APLICADA', {
      x: 1.1, y: 2.25, w: 11, h: 0.3,
      color: C.stone, fontSize: 11, bold: true, fontFace: 'Arial',
    });
    s.addText(filtros, {
      x: 1.1, y: 2.65, w: 11, h: 0.7,
      color: C.green, fontSize: 20, bold: true, fontFace: 'Arial',
    });

    const chips = [
      { label: 'Hallazgos', value: String(data.total), color: C.greenMid, bg: C.greenSoft },
      { label: 'Críticos', value: String(data.termometro.CRITICO), color: C.crit, bg: C.critBg },
      { label: 'Medios', value: String(data.termometro.MEDIO), color: C.mid, bg: C.midBg },
      { label: 'Positivos', value: String(data.termometro.POSITIVO), color: C.pos, bg: C.posBg },
      { label: 'Promedio', value: String(data.promedioGeneral), color: scoreColor(data.promedioGeneral), bg: scoreBg(data.promedioGeneral) },
    ];
    chips.forEach((chip, i) => {
      const x = 1.1 + i * 2.25;
      s.addShape(pptx.ShapeType.roundRect, {
        x, y: 3.7, w: 2.1, h: 1.35,
        fill: { color: chip.bg },
        rectRadius: 0.1,
      });
      s.addText(chip.label.toUpperCase(), {
        x: x + 0.12, y: 3.85, w: 1.86, h: 0.28,
        color: chip.color, fontSize: 10, bold: true, fontFace: 'Arial',
      });
      s.addText(chip.value, {
        x: x + 0.12, y: 4.25, w: 1.86, h: 0.55,
        color: C.ink, fontSize: 28, bold: true, fontFace: 'Arial',
      });
    });

    s.addText(`Generado: ${new Date().toLocaleString('es-CO')}  ·  Focales Bienestar`, {
      x: 1.1, y: 5.9, w: 11, h: 0.35,
      color: C.stone, fontSize: 12, fontFace: 'Arial',
    });
  }

  const out = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
  return out;
}

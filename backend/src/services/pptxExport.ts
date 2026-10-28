import PptxGenJS from 'pptxgenjs';
import { mesLabel } from './scoring';
import type { DashboardFilters } from './dashboard';

type DashboardPayload = Awaited<ReturnType<typeof import('./dashboard').getDashboardData>>;

function filtrosTexto(f: DashboardFilters): string {
  const parts: string[] = [];
  if (f.anio && f.mes) parts.push(`Mes: ${mesLabel(f.anio, f.mes)}`);
  if (f.fechaDesde || f.fechaHasta) {
    parts.push(`Rango: ${f.fechaDesde || '…'} → ${f.fechaHasta || '…'}`);
  }
  if (f.cicloId) parts.push('Ciclo filtrado');
  if (f.areaId) parts.push('Área filtrada');
  if (f.categoriaId) parts.push('Categoría filtrada');
  if (f.termometro) parts.push(`Termómetro: ${f.termometro}`);
  if (f.estado) parts.push(`Estado: ${f.estado}`);
  return parts.length ? parts.join('  |  ') : 'Sin filtros (todos los registros)';
}

export async function buildDashboardPptx(data: DashboardPayload): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
  pptx.layout = 'WIDE';
  pptx.author = 'Focales Bienestar - Colbeef';
  pptx.title = 'Reporte Grupos Focales';

  const green = '14532D';
  const greenSoft = '166534';
  const crit = 'B91C1C';
  const mid = 'CA8A04';
  const pos = '15803D';

  // ── Slide 1: Resumen general ──
  {
    const s = pptx.addSlide();
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.7, fill: { color: green } });
    s.addText('Colbeef · RESUMEN GENERAL — GRUPOS FOCALES', {
      x: 0.3, y: 0.15, w: 10, h: 0.4,
      color: 'FFFFFF', fontSize: 18, bold: true, fontFace: 'Calibri',
    });
    s.addText(filtrosTexto(data.filtrosAplicados), {
      x: 0.3, y: 0.85, w: 12.7, h: 0.35,
      color: '334155', fontSize: 11, fontFace: 'Calibri',
    });

    // Categorías
    s.addText('CATEGORÍAS', { x: 0.3, y: 1.3, w: 3.2, h: 0.3, bold: true, color: green, fontSize: 12 });
    const catRows = [
      [
        { text: 'Categoría', options: { bold: true, color: 'FFFFFF', fill: { color: greenSoft } } },
        { text: 'No.', options: { bold: true, color: 'FFFFFF', fill: { color: greenSoft } } },
      ],
      ...data.categorias.slice(0, 10).map((c) => [{ text: c.name }, { text: String(c.count) }]),
      [{ text: 'TOTAL', options: { bold: true } }, { text: String(data.total), options: { bold: true } }],
    ];
    s.addTable(catRows as PptxGenJS.TableRow[], {
      x: 0.3, y: 1.65, w: 3.2, colW: [2.4, 0.8],
      border: { type: 'solid', pt: 0.5, color: 'CBD5E1' },
      fontFace: 'Calibri', fontSize: 10, color: '1E293B',
    });

    // Subcategorías
    s.addText('SUBCATEGORÍAS', { x: 3.7, y: 1.3, w: 3.5, h: 0.3, bold: true, color: green, fontSize: 12 });
    const subRows = [
      [
        { text: 'Subcategoría', options: { bold: true, color: 'FFFFFF', fill: { color: greenSoft } } },
        { text: 'No.', options: { bold: true, color: 'FFFFFF', fill: { color: greenSoft } } },
      ],
      ...data.subcategorias.slice(0, 12).map((c) => [{ text: c.name.slice(0, 36) }, { text: String(c.count) }]),
      [{ text: 'TOTAL', options: { bold: true } }, { text: String(data.total), options: { bold: true } }],
    ];
    s.addTable(subRows as PptxGenJS.TableRow[], {
      x: 3.7, y: 1.65, w: 3.5, colW: [2.7, 0.8],
      border: { type: 'solid', pt: 0.5, color: 'CBD5E1' },
      fontFace: 'Calibri', fontSize: 10, color: '1E293B',
    });

    // Hallazgos termómetro
    s.addText('HALLAZGOS', { x: 7.5, y: 1.3, w: 2.6, h: 0.3, bold: true, color: green, fontSize: 12 });
    const hallRows = [
      [
        { text: 'Termómetro', options: { bold: true, color: 'FFFFFF', fill: { color: greenSoft } } },
        { text: 'No.', options: { bold: true, color: 'FFFFFF', fill: { color: greenSoft } } },
      ],
      [
        { text: 'Crítico', options: { color: crit, bold: true } },
        { text: String(data.termometro.CRITICO) },
      ],
      [
        { text: 'Medio', options: { color: mid, bold: true } },
        { text: String(data.termometro.MEDIO) },
      ],
      [
        { text: 'Positivo', options: { color: pos, bold: true } },
        { text: String(data.termometro.POSITIVO) },
      ],
      [{ text: 'TOTAL', options: { bold: true } }, { text: String(data.total), options: { bold: true } }],
    ];
    s.addTable(hallRows as PptxGenJS.TableRow[], {
      x: 7.5, y: 1.65, w: 2.6, colW: [1.7, 0.9],
      border: { type: 'solid', pt: 0.5, color: 'CBD5E1' },
      fontFace: 'Calibri', fontSize: 10, color: '1E293B',
    });

    // Estados
    s.addText('ESTADO DE SEGUIMIENTO', { x: 10.3, y: 1.3, w: 2.8, h: 0.3, bold: true, color: green, fontSize: 12 });
    const estRows = [
      [
        { text: 'Estado', options: { bold: true, color: 'FFFFFF', fill: { color: greenSoft } } },
        { text: 'No.', options: { bold: true, color: 'FFFFFF', fill: { color: greenSoft } } },
      ],
      [{ text: 'Abierto' }, { text: String(data.estados.ABIERTO) }],
      [{ text: 'En proceso' }, { text: String(data.estados.EN_PROCESO) }],
      [{ text: 'Cerrado' }, { text: String(data.estados.CERRADO) }],
      [{ text: 'TOTAL', options: { bold: true } }, { text: String(data.total), options: { bold: true } }],
    ];
    s.addTable(estRows as PptxGenJS.TableRow[], {
      x: 10.3, y: 1.65, w: 2.7, colW: [1.8, 0.9],
      border: { type: 'solid', pt: 0.5, color: 'CBD5E1' },
      fontFace: 'Calibri', fontSize: 10, color: '1E293B',
    });

    if (data.comparativoPrevio) {
      s.addText(`Comparativo — ${data.comparativoPrevio.label}`, {
        x: 10.3, y: 3.6, w: 2.7, h: 0.3, bold: true, color: green, fontSize: 11,
      });
      s.addText(
        `Abierto: ${data.comparativoPrevio.abierto}\nEn proceso: ${data.comparativoPrevio.enProceso}\nCerrado: ${data.comparativoPrevio.cerrado}\nTotal: ${data.comparativoPrevio.total}`,
        { x: 10.3, y: 3.95, w: 2.7, h: 1.2, fontSize: 11, color: '334155' },
      );
    }

    // Termómetro áreas
    s.addText('ESTADO TERMÓMETRO', { x: 7.5, y: 3.6, w: 2.6, h: 0.3, bold: true, color: green, fontSize: 12 });
    const areaRows = [
      [
        { text: 'Área', options: { bold: true, color: 'FFFFFF', fill: { color: greenSoft } } },
        { text: 'Calif.', options: { bold: true, color: 'FFFFFF', fill: { color: greenSoft } } },
        { text: 'Estado', options: { bold: true, color: 'FFFFFF', fill: { color: greenSoft } } },
      ],
      ...data.termometroAreas.slice(0, 8).map((a) => [
        { text: a.area },
        { text: String(a.calificacion) },
        { text: a.estado },
      ]),
      [
        { text: 'PROMEDIO', options: { bold: true } },
        { text: String(data.promedioGeneral), options: { bold: true } },
        { text: data.estadoPromedio, options: { bold: true } },
      ],
    ];
    s.addTable(areaRows as PptxGenJS.TableRow[], {
      x: 7.5, y: 3.95, w: 5.5, colW: [1.8, 0.9, 2.8],
      border: { type: 'solid', pt: 0.5, color: 'CBD5E1' },
      fontFace: 'Calibri', fontSize: 10, color: '1E293B',
    });
  }

  // ── Slide 2: Hallazgos por criticidad ──
  {
    const s = pptx.addSlide();
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.7, fill: { color: green } });
    s.addText('Colbeef · RESUMEN DE HALLAZGOS POR CRITICIDAD', {
      x: 0.3, y: 0.15, w: 12, h: 0.4,
      color: 'FFFFFF', fontSize: 18, bold: true, fontFace: 'Calibri',
    });
    s.addText(filtrosTexto(data.filtrosAplicados), {
      x: 0.3, y: 0.85, w: 12.7, h: 0.3,
      color: '334155', fontSize: 11,
    });

    s.addShape(pptx.ShapeType.roundRect, {
      x: 0.3, y: 1.25, w: 2.4, h: 2.4, fill: { color: 'FEF2F2' }, rectRadius: 0.1,
    });
    s.addText('TOTAL', { x: 0.4, y: 1.4, w: 2.2, h: 0.3, fontSize: 11, color: '64748B' });
    s.addText(String(data.total), { x: 0.4, y: 1.7, w: 2.2, h: 0.5, fontSize: 28, bold: true, color: green });
    s.addText(`Crítico: ${data.termometro.CRITICO}`, { x: 0.4, y: 2.3, w: 2.2, h: 0.25, fontSize: 12, color: crit, bold: true });
    s.addText(`Medio: ${data.termometro.MEDIO}`, { x: 0.4, y: 2.6, w: 2.2, h: 0.25, fontSize: 12, color: mid, bold: true });
    s.addText(`Positivo: ${data.termometro.POSITIVO}`, { x: 0.4, y: 2.9, w: 2.2, h: 0.25, fontSize: 12, color: pos, bold: true });

    s.addText('HALLAZGOS CRÍTICOS', {
      x: 2.9, y: 1.25, w: 10, h: 0.3, bold: true, color: crit, fontSize: 13,
    });

    const critText = data.criticos.length
      ? data.criticos.slice(0, 6).map((c, i) => ({
          text: `${i + 1}. [${c.area} / ${c.categoria}${c.subcategoria ? ' / ' + c.subcategoria : ''}] ${c.observacion.slice(0, 220)}`,
          options: { breakLine: true, fontSize: 11, color: '1E293B', paraSpaceAfter: 6 },
        }))
      : [{ text: 'Sin hallazgos críticos en el filtro actual.', options: { fontSize: 12, color: '64748B' } }];

    s.addText(critText as PptxGenJS.TextProps[], { x: 2.9, y: 1.6, w: 10, h: 2.6 });

    s.addText('HALLAZGOS MEDIOS (agrupados)', {
      x: 0.3, y: 4.4, w: 12, h: 0.3, bold: true, color: mid, fontSize: 13,
    });

    const medText = data.mediosAgrupados.slice(0, 8).map((g) => ({
      text: `• ${g.tema} (${g.count})`,
      options: { breakLine: true, fontSize: 12, bold: true, color: '1E293B', paraSpaceAfter: 2 },
    }));

    s.addText(
      medText.length
        ? (medText as PptxGenJS.TextProps[])
        : [{ text: 'Sin hallazgos medios.', options: { fontSize: 12, color: '64748B' } }],
      { x: 0.3, y: 4.75, w: 12.7, h: 2.4 },
    );
  }

  // ── Slide 3: Filtros / metadatos ──
  {
    const s = pptx.addSlide();
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.7, fill: { color: green } });
    s.addText('Colbeef · FILTROS DE LA CONSULTA', {
      x: 0.3, y: 0.15, w: 12, h: 0.4,
      color: 'FFFFFF', fontSize: 18, bold: true, fontFace: 'Calibri',
    });
    s.addText('Esta presentación refleja exactamente los filtros aplicados en el dashboard.', {
      x: 0.5, y: 1.2, w: 12, h: 0.4, fontSize: 14, color: '334155',
    });
    s.addText(filtrosTexto(data.filtrosAplicados), {
      x: 0.5, y: 1.8, w: 12, h: 0.6, fontSize: 16, bold: true, color: green,
    });
    s.addText(
      `Total de hallazgos consultados: ${data.total}\nPromedio termómetro: ${data.promedioGeneral} — ${data.estadoPromedio}\nGenerado: ${new Date().toLocaleString('es-CO')}`,
      { x: 0.5, y: 2.7, w: 12, h: 1.5, fontSize: 14, color: '1E293B' },
    );
  }

  const out = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
  return out;
}

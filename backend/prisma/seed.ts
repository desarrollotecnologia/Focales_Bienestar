import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { PrismaClient, Termometro, EstadoSeguimiento } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedData {
  areas: string[];
  categorias: string[];
  subcategorias: { categoria: string; nombre: string }[];
  responsables: string[];
  escala: {
    termometro: Record<string, number>;
    estados_area: { min: number; max: number; estado: string }[];
  };
  hallazgos: {
    ciclo: string;
    fecha: string;
    area: string;
    categoria: string;
    subcategoria: string | null;
    termometro: Termometro;
    observacion: string;
    compromiso: string;
    responsables: string[];
    estado: EstadoSeguimiento;
    avances: string;
    calificacion: number;
  }[];
}

async function main() {
  const seedPath = path.join(__dirname, '../../data/excel-seed.json');
  if (!fs.existsSync(seedPath)) {
    throw new Error(`No se encontró ${seedPath}. Genere el JSON desde el Excel primero.`);
  }
  const data = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as SeedData;

  console.log('→ Escala termómetro / estado área');
  const termDesc: Record<string, string> = {
    POSITIVO: 'Aspectos valorados positivamente (Fortalezas / Satisfacción)',
    MEDIO: 'Novedades / Oportunidades de mejora moderadas',
    CRITICO: 'Puntos críticos / Riesgos altos que afectan el clima y la operación',
  };
  const estadoColor: Record<string, string> = {
    Excelente: '059669',
    Bueno: '0284C7',
    'Aceptable / Estable': 'CA8A04',
    'En Riesgo / Alerta': 'EA580C',
    'Crítico / Vulnerable': 'E11D48',
  };
  for (const [term, pts] of Object.entries(data.escala.termometro)) {
    await prisma.escalaTermometro.upsert({
      where: { termometro: term as Termometro },
      update: { puntos: pts, descripcion: termDesc[term] || null },
      create: {
        termometro: term as Termometro,
        puntos: pts,
        descripcion: termDesc[term] || null,
      },
    });
  }
  await prisma.escalaEstadoArea.deleteMany();
  await prisma.escalaEstadoArea.createMany({
    data: data.escala.estados_area.map((e) => ({
      minPts: e.min,
      maxPts: e.max,
      estado: e.estado,
      color: estadoColor[e.estado] || null,
    })),
  });

  console.log('→ Usuario Coordinación Gestión Humana');
  const passwordHash = await bcrypt.hash('Colbeef2026*', 10);
  const loginUser = 'coordinacion.gestionhumana@colbeef.com';
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ username: 'admin' }, { username: loginUser }, { email: loginUser }],
    },
  });
  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        username: loginUser,
        email: loginUser,
        fullName: 'Coordinación Gestión Humana',
        passwordHash,
        role: 'ADMIN',
        active: true,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        username: loginUser,
        email: loginUser,
        fullName: 'Coordinación Gestión Humana',
        passwordHash,
        role: 'ADMIN',
      },
    });
  }

  console.log('→ Usuario de prueba local');
  const demoUser = 'prueba.local';
  const demoHash = await bcrypt.hash('PruebaLocal2026*', 10);
  await prisma.user.upsert({
    where: { username: demoUser },
    update: {
      passwordHash: demoHash,
      fullName: 'Usuario de Prueba Local',
      email: 'prueba.local@focales.demo',
      role: 'ADMIN',
      active: true,
    },
    create: {
      username: demoUser,
      email: 'prueba.local@focales.demo',
      fullName: 'Usuario de Prueba Local',
      passwordHash: demoHash,
      role: 'ADMIN',
      active: true,
    },
  });

  console.log('→ Áreas');
  const areaMap = new Map<string, string>();
  let order = 1;
  for (const name of data.areas) {
    const a = await prisma.area.upsert({
      where: { name },
      update: { active: true, sortOrder: order },
      create: { name, sortOrder: order },
    });
    areaMap.set(name, a.id);
    order += 1;
  }

  console.log('→ Categorías / subcategorías');
  const catMap = new Map<string, string>();
  for (const name of data.categorias) {
    const c = await prisma.categoria.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    catMap.set(name, c.id);
  }

  const subMap = new Map<string, string>();
  for (const s of data.subcategorias) {
    const categoriaId = catMap.get(s.categoria);
    if (!categoriaId) continue;
    const existing = await prisma.subcategoria.findFirst({
      where: { categoriaId, name: s.nombre },
    });
    const sub =
      existing ||
      (await prisma.subcategoria.create({
        data: { categoriaId, name: s.nombre },
      }));
    subMap.set(`${s.categoria}||${s.nombre}`, sub.id);
  }

  console.log('→ Responsables');
  const respMap = new Map<string, string>();
  for (const name of data.responsables) {
    const r = await prisma.responsable.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    respMap.set(name, r.id);
  }

  console.log('→ Ciclos');
  const cicloNames = [...new Set(data.hallazgos.map((h) => h.ciclo))];
  const cicloMap = new Map<string, string>();
  for (const nombre of cicloNames) {
    const fechas = data.hallazgos.filter((h) => h.ciclo === nombre).map((h) => h.fecha).sort();
    const anio = Number(fechas[0]?.slice(0, 4) || 2026);
    const ciclo = await prisma.ciclo.upsert({
      where: { nombre_anio: { nombre, anio } },
      update: {},
      create: {
        nombre,
        anio,
        estado: 'ABIERTO',
        fechaInicio: fechas[0] ? new Date(fechas[0]) : null,
      },
    });
    cicloMap.set(nombre, ciclo.id);
  }

  // Evitar duplicar hallazgos si se re-ejecuta seed (FORCE_REIMPORT_HALLAZGOS=1 para regenerar desde Excel)
  const forceReimport = process.env.FORCE_REIMPORT_HALLAZGOS === '1';
  const existingCount = await prisma.hallazgo.count();
  if (existingCount > 0 && !forceReimport) {
    console.log(`→ Ya hay ${existingCount} hallazgos. No se reimportan (evita duplicados).`);
    console.log('  Para reimportar: FORCE_REIMPORT_HALLAZGOS=1 npx prisma db seed');
  } else {
    if (forceReimport && existingCount > 0) {
      console.log(`→ Reimportando: se eliminan ${existingCount} hallazgos y sesiones previas`);
      await prisma.hallazgo.deleteMany();
      await prisma.sesionGrupoFocal.deleteMany();
    }
    console.log(`→ Importando ${data.hallazgos.length} hallazgos + sesiones por área/fecha`);
    const sesionCache = new Map<string, string>();

    for (const h of data.hallazgos) {
      const cicloId = cicloMap.get(h.ciclo)!;
      const areaId = areaMap.get(h.area)!;
      const categoriaId = catMap.get(h.categoria)!;
      const subcategoriaId = h.subcategoria
        ? subMap.get(`${h.categoria}||${h.subcategoria}`) || null
        : null;

      const sesKey = `${cicloId}|${areaId}|${h.fecha}`;
      let sesionId = sesionCache.get(sesKey);
      if (!sesionId) {
        const sesion = await prisma.sesionGrupoFocal.create({
          data: {
            cicloId,
            areaId,
            fecha: new Date(h.fecha),
          },
        });
        sesionId = sesion.id;
        sesionCache.set(sesKey, sesionId);
      }

      const hallazgo = await prisma.hallazgo.create({
        data: {
          cicloId,
          sesionId,
          areaId,
          categoriaId,
          subcategoriaId,
          fecha: new Date(h.fecha),
          termometro: h.termometro,
          observacion: h.observacion,
          compromiso: h.compromiso || null,
          estadoSeguimiento: h.estado,
          avances: h.avances || null,
          calificacion: h.calificacion,
        },
      });

      const respIds = h.responsables
        .map((n) => respMap.get(n))
        .filter((id): id is string => Boolean(id));
      if (respIds.length) {
        await prisma.hallazgoResponsable.createMany({
          data: respIds.map((responsableId) => ({
            hallazgoId: hallazgo.id,
            responsableId,
          })),
          skipDuplicates: true,
        });
      }
    }
    console.log(`→ Sesiones creadas: ${sesionCache.size}`);
  }

  console.log('✓ Seed completado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

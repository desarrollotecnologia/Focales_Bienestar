# Focales Bienestar — Colbeef

Sistema web para reemplazar el seguimiento de **Grupos Focales** que hoy se lleva en Excel + PowerPoint.

## Stack

- **Frontend:** React + Vite + Tailwind
- **Backend:** Node.js + Express + Prisma
- **BD:** MySQL (`focales_bienestar`)

## Puertos locales

| Servicio | Puerto |
|----------|--------|
| API / producción | `3020` |
| Frontend dev | `5175` |

## Arranque local

1. MySQL corriendo (Laragon u otro).
2. Ejecutar `scripts\crear-db.sql` (o `scripts\setup-database.bat` asumiendo BD creada).
3. `scripts\install.bat`
4. `scripts\setup-database.bat` — migra e importa el Excel (`data/excel-seed.json`)
5. `scripts\dev.bat` — desarrollo  
   o `scripts\start.bat` — producción local

Login: **coordinacion.gestionhumana@colbeef.com** / **Colbeef2026***

## Vistas

- **Dashboard** — filtros + botón *Descargar PowerPoint* (respeta filtros)
- **Hallazgos** — tabla maestra (campos del Excel por ciclo)
- **Ciclos** — progreso por áreas; cerrar cuando todas las áreas activas tuvieron reunión
- **Resumen mensual** — tablas tipo RESUM. del Excel (calculadas)
- **Catálogos** — áreas (crear cuenta para el ciclo), categorías, responsables

## Scripts servidor (205)

| Bat | Uso |
|-----|-----|
| `install.bat` | Dependencias + build |
| `setup-database.bat` | Prisma + seed |
| `start.bat` / `stop.bat` / `restart.bat` | Servicio |
| `update.bat` | git pull + install + migrate + build + restart |
| `setup-autostart.bat` | Tarea al iniciar sesión |

## Reimportar Excel

Si actualizan el Excel:

```bash
python scripts/export_excel_seed.py
# luego vaciar hallazgos si hace falta y:
cd backend && npx tsx prisma/seed.ts
```

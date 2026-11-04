"""Compara Excel viejo vs nuevo vs seed actual."""
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
OLD = Path(r"c:\Users\CAMPUSLANDS\Downloads\SEGUIMIENTO GRUPOS FOCALES.xlsx")
NEW = Path(r"c:\Users\CAMPUSLANDS\Downloads\SEGUIMIENTO GRUPOS FOCALES (1).xlsx")
SEED = ROOT / "data" / "excel-seed.json"


def norm(s):
    if s is None:
        return None
    s = re.sub(r"\s+", " ", str(s).strip())
    return s or None


def split_resp(s):
    if not s:
        return []
    return [p for p in (norm(x) for x in re.split(r"[\n/]+", str(s))) if p]


def term_pts(t):
    t = (t or "").strip().lower()
    if "cr" in t:
        return 20, "CRITICO"
    if "pos" in t:
        return 100, "POSITIVO"
    return 60, "MEDIO"


def estado_norm(e):
    e = (e or "").strip().lower()
    if "cerr" in e:
        return "CERRADO"
    if "proceso" in e:
        return "EN_PROCESO"
    return "ABIERTO"


def sheet_overview(path: Path):
    wb = openpyxl.load_workbook(path, data_only=True)
    info = {"sheets": wb.sheetnames, "detail": {}}
    for name in wb.sheetnames:
        ws = wb[name]
        headers = []
        for c in range(1, min(ws.max_column, 25) + 1):
            v = ws.cell(1, c).value
            headers.append(str(v).strip() if v is not None else None)
        nonempty = 0
        for r in range(2, ws.max_row + 1):
            if any(
                ws.cell(r, c).value not in (None, "")
                for c in range(1, min(ws.max_column, 12) + 1)
            ):
                nonempty += 1
        row2 = [ws.cell(2, c).value for c in range(1, min(ws.max_column, 15) + 1)]
        info["detail"][name] = {
            "max_row": ws.max_row,
            "max_col": ws.max_column,
            "headers": headers,
            "data_rows_approx": nonempty,
            "row2_sample": [str(x)[:80] if x is not None else None for x in row2],
        }
    return info


def parse_ciclos(path: Path, cycle_sheets=None):
    wb = openpyxl.load_workbook(path, data_only=True)
    if cycle_sheets is None:
        cycle_sheets = [
            (n, n.replace("CICLO", "Ciclo").title() if n.upper().startswith("CICLO") else n)
            for n in wb.sheetnames
            if "CICLO" in n.upper()
        ]
    hallazgos = []
    areas, cats, subs, resps = set(), set(), set(), set()
    term_raw_vals = Counter()
    estado_raw = Counter()
    calif_vs_term = Counter()
    extra_cols = defaultdict(int)
    dates = []

    for sheet_name, ciclo_nombre in cycle_sheets:
        if sheet_name not in wb.sheetnames:
            continue
        ws = wb[sheet_name]
        headers = [norm(ws.cell(1, c).value) for c in range(1, ws.max_column + 1)]
        for r in range(2, ws.max_row + 1):
            fecha = ws.cell(r, 2).value
            if fecha is None:
                continue
            area = norm(ws.cell(r, 3).value)
            cat = norm(ws.cell(r, 4).value)
            sub = norm(ws.cell(r, 5).value)
            term_raw = norm(ws.cell(r, 6).value)
            obs = ws.cell(r, 7).value
            comp = ws.cell(r, 8).value
            resp_raw = ws.cell(r, 9).value
            estado_cell = ws.cell(r, 10).value
            avances = ws.cell(r, 11).value
            calif = ws.cell(r, 12).value
            term_raw_vals[term_raw or "(vacío)"] += 1
            estado_raw[norm(estado_cell) or "(vacío)"] += 1
            pts, term = term_pts(term_raw)
            mapped_pts = pts
            if calif is not None:
                try:
                    pts = int(float(calif))
                except Exception:
                    pass
            if pts != mapped_pts:
                calif_vs_term[f"{term}:{mapped_pts}->{pts}"] += 1
            # extra columns beyond L
            for c in range(13, ws.max_column + 1):
                if ws.cell(r, c).value not in (None, ""):
                    h = headers[c - 1] if c - 1 < len(headers) else f"COL{c}"
                    extra_cols[h or f"COL{c}"] += 1
            if isinstance(fecha, datetime):
                fecha_s = fecha.date().isoformat()
            elif isinstance(fecha, date):
                fecha_s = fecha.isoformat()
            else:
                fecha_s = str(fecha)[:10]
            dates.append(fecha_s)
            responsables = split_resp(resp_raw)
            areas.add(area)
            cats.add(cat)
            if sub:
                subs.add((cat, sub))
            for rr in responsables:
                resps.add(rr)
            hallazgos.append(
                {
                    "ciclo": ciclo_nombre,
                    "fecha": fecha_s,
                    "area": area,
                    "categoria": cat,
                    "subcategoria": sub,
                    "termometro": term,
                    "observacion": str(obs).strip() if obs else "",
                    "compromiso": str(comp).strip() if comp else "",
                    "responsables": responsables,
                    "estado": estado_norm(estado_cell),
                    "avances": str(avances).strip() if avances else "",
                    "calificacion": pts,
                }
            )
        # store headers of first cycle for report
        if sheet_name == cycle_sheets[0][0]:
            parse_ciclos.last_headers = headers  # type: ignore

    return {
        "hallazgos": hallazgos,
        "areas": sorted(a for a in areas if a),
        "categorias": sorted(c for c in cats if c),
        "subcategorias": sorted(subs),
        "responsables": sorted(resps),
        "term_raw": term_raw_vals,
        "estado_raw": estado_raw,
        "calif_mismatch": calif_vs_term,
        "extra_cols": dict(extra_cols),
        "date_min": min(dates) if dates else None,
        "date_max": max(dates) if dates else None,
        "by_ciclo": Counter(h["ciclo"] for h in hallazgos),
        "by_term": Counter(h["termometro"] for h in hallazgos),
        "by_estado": Counter(h["estado"] for h in hallazgos),
        "by_area": Counter(h["area"] for h in hallazgos),
    }


def fingerprint(h):
    return "|".join(
        [
            h["ciclo"],
            h["fecha"],
            h["area"] or "",
            h["categoria"] or "",
            h["subcategoria"] or "",
            h["termometro"],
            h["observacion"][:120],
            str(h["calificacion"]),
            h["estado"],
        ]
    )


def main():
    old_xlsx = Path(sys.argv[1]) if len(sys.argv) > 1 else OLD
    new_xlsx = Path(sys.argv[2]) if len(sys.argv) > 2 else NEW

    print("OLD:", old_xlsx.name, old_xlsx.stat().st_mtime)
    print("NEW:", new_xlsx.name, new_xlsx.stat().st_mtime)

    o = sheet_overview(old_xlsx)
    n = sheet_overview(new_xlsx)
    print("\n=== HOJAS ===")
    print("OLD:", o["sheets"])
    print("NEW:", n["sheets"])
    print("Nuevas hojas:", [s for s in n["sheets"] if s not in o["sheets"]])
    print("Eliminadas:", [s for s in o["sheets"] if s not in n["sheets"]])

    for name in n["sheets"]:
        nd = n["detail"][name]
        od = o["detail"].get(name)
        print(f"\n--- {name} ---")
        print(f"NEW {nd['max_row']}x{nd['max_col']} rows~{nd['data_rows_approx']}")
        print("headers NEW:", nd["headers"])
        if od:
            print(f"OLD {od['max_row']}x{od['max_col']} rows~{od['data_rows_approx']}")
            if od["headers"] != nd["headers"]:
                print("** CAMBIO DE ENCABEZADOS **")
                maxlen = max(len(od["headers"]), len(nd["headers"]))
                for i in range(maxlen):
                    a = od["headers"][i] if i < len(od["headers"]) else None
                    b = nd["headers"][i] if i < len(nd["headers"]) else None
                    if a != b:
                        print(f"  col {i+1}: {a!r} -> {b!r}")
            if od["data_rows_approx"] != nd["data_rows_approx"]:
                print(f"** filas {od['data_rows_approx']} -> {nd['data_rows_approx']}")
        else:
            print("** HOJA NUEVA ** sample:", nd["row2_sample"])

    # Detect cycle sheets dynamically
    def cycle_map(sheets):
        out = []
        for s in sheets:
            m = re.search(r"CICLO\s*(\d+)", s, re.I)
            if m:
                out.append((s, f"Ciclo {m.group(1)}"))
        return out

    old_p = parse_ciclos(old_xlsx, cycle_map(o["sheets"]))
    new_p = parse_ciclos(new_xlsx, cycle_map(n["sheets"]))

    print("\n=== DATOS CICLOS ===")
    print(f"OLD hallazgos={len(old_p['hallazgos'])} ciclos={dict(old_p['by_ciclo'])}")
    print(f"NEW hallazgos={len(new_p['hallazgos'])} ciclos={dict(new_p['by_ciclo'])}")
    print(f"OLD fechas {old_p['date_min']} .. {old_p['date_max']}")
    print(f"NEW fechas {new_p['date_min']} .. {new_p['date_max']}")
    print("OLD term:", dict(old_p["by_term"]))
    print("NEW term:", dict(new_p["by_term"]))
    print("OLD estado:", dict(old_p["by_estado"]))
    print("NEW estado:", dict(new_p["by_estado"]))
    print("NEW term_raw valores:", dict(new_p["term_raw"]))
    print("NEW estado_raw valores:", dict(new_p["estado_raw"]))
    print("NEW calif mismatches:", dict(new_p["calif_mismatch"]))
    print("NEW extra cols con datos:", new_p["extra_cols"])

    old_areas, new_areas = set(old_p["areas"]), set(new_p["areas"])
    old_cats, new_cats = set(old_p["categorias"]), set(new_p["categorias"])
    old_subs, new_subs = set(old_p["subcategorias"]), set(new_p["subcategorias"])
    old_resps, new_resps = set(old_p["responsables"]), set(new_p["responsables"])

    print("\n=== CATÁLOGOS DELTA (new vs old excel) ===")
    print("Áreas +", sorted(new_areas - old_areas))
    print("Áreas -", sorted(old_areas - new_areas))
    print("Categorías +", sorted(new_cats - old_cats))
    print("Categorías -", sorted(old_cats - new_cats))
    print("Subcategorías +", sorted(new_subs - old_subs)[:40], "… total", len(new_subs - old_subs))
    print("Subcategorías -", sorted(old_subs - new_subs)[:20], "… total", len(old_subs - new_subs))
    print("Responsables +", sorted(new_resps - old_resps)[:30], "… total", len(new_resps - old_resps))
    print("Responsables -", sorted(old_resps - new_resps)[:20], "… total", len(old_resps - new_resps))

    old_fp = {fingerprint(h) for h in old_p["hallazgos"]}
    new_fp = {fingerprint(h) for h in new_p["hallazgos"]}
    added = new_fp - old_fp
    removed = old_fp - new_fp
    print("\n=== HALLAZGOS DELTA ===")
    print(f"iguales={len(old_fp & new_fp)} añadidos={len(added)} quitados={len(removed)}")

    # show a few added
    added_rows = [h for h in new_p["hallazgos"] if fingerprint(h) in added]
    added_rows.sort(key=lambda h: (h["fecha"], h["area"] or ""))
    print("Ejemplos añadidos (hasta 12):")
    for h in added_rows[:12]:
        print(
            f"  {h['fecha']} | {h['ciclo']} | {h['area']} | {h['termometro']} | {h['categoria']} | {h['observacion'][:70]}"
        )

    # compare to seed
    if SEED.exists():
        seed = json.loads(SEED.read_text(encoding="utf-8"))
        seed_n = len(seed.get("hallazgos", []))
        print(f"\n=== vs SEED actual ({seed_n} hallazgos) ===")
        seed_fp = {fingerprint(h) for h in seed["hallazgos"]}
        print(
            f"new vs seed: iguales={len(seed_fp & new_fp)} añadidos_en_excel={len(new_fp - seed_fp)} solo_en_seed={len(seed_fp - new_fp)}"
        )
        print("áreas seed vs new +", sorted(set(new_p["areas"]) - set(seed.get("areas", []))))
        print("áreas seed vs new -", sorted(set(seed.get("areas", [])) - set(new_p["areas"])))

    # Peek non-cycle sheets for logic hints (escala, resumen)
    print("\n=== HOJAS NO-CICLO (posible lógica) ===")
    for name in n["sheets"]:
        if "CICLO" in name.upper():
            continue
        ws = openpyxl.load_workbook(new_xlsx, data_only=True)[name]
        print(f"\n[{name}] {ws.max_row}x{ws.max_column}")
        for r in range(1, min(25, ws.max_row + 1)):
            vals = []
            for c in range(1, min(10, ws.max_column + 1)):
                v = ws.cell(r, c).value
                if v is not None and str(v).strip() != "":
                    vals.append(f"{c}:{str(v)[:50]}")
            if vals:
                print(f"  r{r}: {vals}")


if __name__ == "__main__":
    main()

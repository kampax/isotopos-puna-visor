import pandas as pd
import json
import re
import os
import sys
import hashlib

# Rutas relativas al directorio del script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(BASE_DIR, 'Isotopos completo2026.csv')
out_path = os.path.join(BASE_DIR, 'visor_html', 'data.js')

print(f"Leyendo: {csv_path}")
try:
    try:
        df = pd.read_csv(csv_path, sep=';', encoding='utf-8-sig')
    except UnicodeDecodeError:
        df = pd.read_csv(csv_path, sep=';', encoding='latin1')
    required = {'ID', 'O18', 'D', 'tipo', 'dato', 'xcoord', 'ycoord'}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f'Faltan columnas requeridas: {sorted(missing)}')
    df = df.dropna(how='all')
    ids = pd.to_numeric(df['ID'], errors='coerce')
    if df.empty or ids.isna().any() or (ids % 1 != 0).any() or ids.duplicated().any():
        raise ValueError('El CSV debe tener registros e IDs enteros, completos y únicos.')
except Exception as e:
    print(f"Error al leer CSV: {e}")
    sys.exit(1)

tipo_labels = {
    'river': 'Río',
    'groundwater': 'Agua subterránea',
    'water channel': 'Cauce / Canal',
    'spring of water': 'Vertiente / Manantial',
    'lagoon': 'Laguna',
    'snow': 'Nieve',
    'water pools': 'Pozas de agua',
    'fog': 'Niebla',
    'rainwater': 'Precipitación'
}

records = []
for idx, r in df.iterrows():
    if pd.isna(r.get('ID')):
        continue
    try:
        _id = int(r['ID'])
    except:
        continue

    etiqueta = str(r['etiqueta']).strip() if pd.notna(r.get('etiqueta')) else ''
    vega = str(r['vega']).strip() if pd.notna(r.get('vega')) else ''

    try:
        ele = float(str(r['ele']).replace(',', '.')) if pd.notna(r.get('ele')) else None
    except:
        ele = None

    time_str = str(r['time']).strip() if pd.notna(r.get('time')) else ''

    try:
        lat = float(str(r.get('ycoord')).replace(',', '.')) if pd.notna(r.get('ycoord')) else None
    except:
        lat = None

    try:
        lon = float(str(r.get('xcoord')).replace(',', '.')) if pd.notna(r.get('xcoord')) else None
    except:
        lon = None

    # Cond
    try:
        cond = float(str(r.get('Conductividad')).replace(',', '.')) if pd.notna(r.get('Conductividad')) and str(r.get('Conductividad')).strip() != '' else None
    except:
        cond = None

    # CE
    ce_raw = str(r.get('C,Electrica (uS/cm)', '')).strip() if pd.notna(r.get('C,Electrica (uS/cm)')) else ''
    try:
        ce = float(ce_raw.replace(',', '.')) if ce_raw else None
    except:
        ce = None

    # Cl
    cl_raw = str(r.get('ppm cl', '')).strip() if pd.notna(r.get('ppm cl')) else ''
    try:
        ppm_cl = float(cl_raw.replace(',', '.')) if cl_raw else None
    except:
        ppm_cl = None

    # Isótopos
    try:
        o18 = float(str(r.get('O18')).replace(',', '.')) if pd.notna(r.get('O18')) else None
    except:
        o18 = None

    try:
        d = float(str(r.get('D')).replace(',', '.')) if pd.notna(r.get('D')) else None
    except:
        d = None

    try:
        dex = float(str(r.get('Exceso de deuterio')).replace(',', '.')) if pd.notna(r.get('Exceso de deuterio')) else (round(d - 8*o18, 2) if (d is not None and o18 is not None) else None)
    except:
        dex = round(d - 8*o18, 2) if (d is not None and o18 is not None) else None

    # pH & Caudal
    try:
        ph = float(str(r.get('pH')).replace(',', '.')) if pd.notna(r.get('pH')) and str(r.get('pH')).strip() != '' else None
    except:
        ph = None

    caudal = str(r.get('Caudal')).strip() if pd.notna(r.get('Caudal')) else ''

    # Tipos
    tipo = str(r.get('tipo', '')).strip().lower() if pd.notna(r.get('tipo')) else ''
    tipo_lbl = tipo_labels.get(tipo, tipo.capitalize() if tipo else 'No definido')
    tipo_orig = str(r.get('tipo_original', '')).strip() if pd.notna(r.get('tipo_original')) else ''

    # Origen & Procedencia
    origen = str(r.get('origen', '')).strip() if pd.notna(r.get('origen')) else ''
    dato = str(r.get('dato', '')).strip().lower() if pd.notna(r.get('dato')) else 'propio'
    frequencia = str(r.get('frequencia', '')).strip() if pd.notna(r.get('frequencia')) else 'unique'

    # Notas, fotos & DOI
    nota = str(r.get('nota', '')).strip() if pd.notna(r.get('nota')) else ''
    foto = str(r.get('foto', '')).strip() if pd.notna(r.get('foto')) else ''

    doi = None
    if nota:
        m = re.search(r'(?:DOI:?\s*|https?:\/\/doi\.org\/)(10\.\d{4,9}\/[^\s;,]+)', nota, re.I)
        if m:
            doi = m.group(1).rstrip('.')

    has_coords = (lat is not None and lon is not None and abs(lat) <= 90 and abs(lon) <= 180)
    has_isotopes = (o18 is not None and d is not None)

    rec = {
        'id': _id,
        'etiqueta': etiqueta,
        'vega': vega,
        'ele': ele,
        'time': time_str,
        'latitud': lat,
        'longitud': lon,
        'conductividad': cond,
        'ce_us_cm': ce,
        'ce_raw': ce_raw if ce is None and ce_raw not in ['', 'nan', '-'] else '',
        'ppm_cl': ppm_cl,
        'ppm_cl_raw': cl_raw if ppm_cl is None and cl_raw not in ['', 'nan', '-'] else '',
        'd18O': o18,
        'd2H': d,
        'd_exceso': dex,
        'ph': ph,
        'caudal': caudal,
        'tipo': tipo,
        'tipo_label': tipo_lbl,
        'tipo_original': tipo_orig,
        'origen': origen,
        'dato': dato,
        'frequencia': frequencia,
        'nota': nota,
        'foto': foto,
        'doi': doi,
        'has_coords': has_coords,
        'has_isotopes': has_isotopes
    }
    records.append(rec)

os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path + '.tmp', 'w', encoding='utf-8') as f:
    f.write('window.DATA = ')
    json.dump(records, f, ensure_ascii=False, indent=2, allow_nan=False)
    f.write(';\n')

os.replace(out_path + ".tmp", out_path)

# Cambiar la URL de los datos cuando cambia su contenido evita copias antiguas
# en la caché del navegador, tanto en local como al publicar.
with open(out_path, 'rb') as f:
    data_version = hashlib.sha256(f.read()).hexdigest()[:12]
index_path = os.path.join(BASE_DIR, 'visor_html', 'index.html')
with open(index_path, encoding='utf-8') as f:
    html = f.read()
html, replacements = re.subn(r'src="data\.js(?:\?[^"\s]*)?"',
                             f'src="data.js?v={data_version}"', html)
if replacements != 1:
    raise ValueError('No se encontró una única referencia a data.js en index.html.')
with open(index_path + '.tmp', 'w', encoding='utf-8') as f:
    f.write(html)
os.replace(index_path + '.tmp', index_path)

print(f"¡Éxito! Se generó {out_path} con {len(records)} muestras sincronizadas.")

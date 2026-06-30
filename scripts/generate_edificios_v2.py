import pandas as pd
import re
import os

# Load new data
path_total = '/home/jdiaz/.hermes-alex/cache/documents/doc_e6770ad94801_edificios_daño_total.ods'
path_severo = '/home/jdiaz/.hermes-alex/cache/documents/doc_c4c7a3944168_edificios_daño_severo.ods'

df_total = pd.read_excel(path_total, engine='odf')
df_severo = pd.read_excel(path_severo, engine='odf')

df_total['tipo'] = 'total'
df_severo['tipo'] = 'severo'
df_all = pd.concat([df_total, df_severo], ignore_index=True)

def clean(val):
    if pd.isna(val):
        return ''
    return str(val).replace("'", "\\'").strip()

def extract_uuid(url):
    if pd.isna(url):
        return None
    m = re.search(r'edificio/([a-f0-9-]+)', str(url))
    return m.group(1) if m else None

df_all['uuid'] = df_all['Enlace'].apply(extract_uuid)

# Normalize column names (one file may have 'observacion' without accent)
df_all.columns = [c.replace('ó', 'o') for c in df_all.columns]

# Duplicates
dups = df_all[df_all.duplicated(subset='uuid', keep=False)]
if len(dups) > 0:
    print(f"⚠️  {len(dups)} registros con UUID duplicado (se eliminan)")
df_all = df_all.drop_duplicates(subset='uuid', keep='first')

print(f"Total único: {len(df_all)}")
print(f"  Daño Total:  {len(df_all[df_all['tipo']=='total'])}")
print(f"  Daño Severo: {len(df_all[df_all['tipo']=='severo'])}")

# Read existing
with open('/home/jdiaz/dev/cuidartevzla/sql/edificios.sql', 'r') as f:
    existing_sql = f.read()
existing_uuids = set(re.findall(r'edificio/([a-f0-9-]+)', existing_sql))

df_all['is_new'] = ~df_all['uuid'].isin(existing_uuids)
new_count = df_all['is_new'].sum()

print(f"\nYa en BD: {len(df_all) - new_count}")
print(f"NUEVOS:   {new_count}")

if new_count > 0:
    print("\n=== NUEVOS EDIFICIOS ===")
    new_df = df_all[df_all['is_new']].sort_values('tipo')
    for _, row in new_df.iterrows():
        icon = 'TOTAL' if row['tipo'] == 'total' else 'SEVERO'
        print(f"[{icon}] {row['Nombre'][:70]}")

# Generate SQL
out_path = '/home/jdiaz/dev/cuidartevzla/sql/edificios_v2.sql'
with open(out_path, 'w') as f:
    f.write(f"""-- Edificios afectados por el sismo Jun 2026
-- DATOS ACTUALIZADOS — ODS Juan Carlos (29 Jun 2026)
-- {len(df_all)} edificios (reemplaza version anterior de 530)
--
-- EJECUTAR: Copiar y pegar en SQL de phpMyAdmin, o:
--   mysql -u USER -p DB_NAME < edificios_v2.sql
--
DELETE FROM edificios;

""")
    for _, row in df_all.iterrows():
        nombre = clean(row['Nombre'])
        obs = clean(row['observacion'])
        enlace = clean(row['Enlace'])
        tipo = row['tipo']
        f.write(f"INSERT INTO edificios (nombre, tipo_dano, observacion, enlace) VALUES ('{nombre}','{tipo}','{obs}','{enlace}');\n")

size = os.path.getsize(out_path)
print(f"\n✅ SQL: sql/edificios_v2.sql ({size:,} bytes, {len(df_all)} INSERTs)")

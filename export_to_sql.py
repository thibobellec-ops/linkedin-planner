"""
Exporte tous les posts de la BDD SQLite locale vers un fichier SQL
à exécuter dans Supabase pour migrer les données.
"""
import sqlite3, sys, re

sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect(r'backend\linkedin_posts.db')
conn.row_factory = sqlite3.Row
rows = conn.execute("SELECT * FROM posts ORDER BY id").fetchall()
conn.close()

def esc(v):
    if v is None:
        return 'NULL'
    if isinstance(v, int):
        return str(v)
    # Escape single quotes
    return "'" + str(v).replace("'", "''") + "'"

lines = ["-- Migration des données SQLite → Supabase"]
lines.append("-- À coller dans Supabase > SQL Editor après avoir créé le schéma\n")

for r in rows:
    cols = ', '.join(r.keys())
    vals = ', '.join(esc(r[k]) for k in r.keys())
    lines.append(f"INSERT INTO posts ({cols}) VALUES ({vals});")

out = '\n'.join(lines)
with open('migration_data.sql', 'w', encoding='utf-8') as f:
    f.write(out)

print(f"✅ {len(rows)} posts exportés dans migration_data.sql")
print("   → Colle ce fichier dans Supabase > SQL Editor")

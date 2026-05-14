import sys
import os

# Ajoute le répertoire parent au path pour importer main, models, database, parser
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: F401 — Vercel cherche la variable `app`

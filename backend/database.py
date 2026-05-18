import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool, StaticPool

# ─── URL de connexion ──────────────────────────────────────────────────────────
# En local : SQLite  |  En prod (Supabase) : DATABASE_URL dans les env vars Vercel

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./linkedin_posts.db")

# Supabase (et Heroku) exposent postgres:// — SQLAlchemy veut postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

is_sqlite = DATABASE_URL.startswith("sqlite")

if is_sqlite:
    # SQLite local : StaticPool pour les tests, check_same_thread pour Flask-like usage
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    # PostgreSQL serverless (Vercel) : NullPool = 1 connexion par requête, pas de pool
    # Évite les connexions orphelines et les erreurs "SSL connection has been closed"
    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

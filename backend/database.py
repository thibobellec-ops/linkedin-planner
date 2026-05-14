import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# ─── URL de connexion ──────────────────────────────────────────────────────────
# En local : SQLite  |  En prod (Supabase) : DATABASE_URL dans les env vars Vercel

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./linkedin_posts.db")

# Supabase (et Heroku) exposent postgres:// — SQLAlchemy veut postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite a besoin de check_same_thread, pas PostgreSQL
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

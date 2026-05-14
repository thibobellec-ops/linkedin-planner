from sqlalchemy import Column, Integer, String, Text
from database import Base


class Post(Base):
    """Modèle SQLAlchemy représentant un post LinkedIn dans le pipeline"""
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    content = Column(Text, default="")
    status = Column(String(50), default="idea")
    planned_date = Column(String(20), nullable=True)
    created_at = Column(String(30), nullable=True)
    updated_at = Column(String(30), nullable=True)

    # Stats LinkedIn (remplies par le scraper ou l'import texte)
    likes       = Column(Integer, default=0, nullable=True)
    comments    = Column(Integer, default=0, nullable=True)
    reposts     = Column(Integer, default=0, nullable=True)
    impressions = Column(Integer, default=0, nullable=True)
    linkedin_date_raw = Column(String(50), nullable=True)

    # Métadonnées éditoriales
    funnel_type  = Column(String(20),  nullable=True)   # TOFU / MOFU / BOFU
    visual_done  = Column(Integer,     default=0)        # 0 ou 1
    visual_url   = Column(String(500), nullable=True)    # URL du visuel
    linkedin_url = Column(String(500), nullable=True)    # Lien vers le post LinkedIn

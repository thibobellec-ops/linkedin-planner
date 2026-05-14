from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from concurrent.futures import ThreadPoolExecutor
import asyncio
import os
import re
import models
import database

app = FastAPI(title="LinkedIn Post Manager API", version="1.0.0")

# ─── CORS — permissif en prod (même domaine Vercel) ──────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Création des tables + migration SQLite ───────────────────────────────────

database.Base.metadata.create_all(bind=database.engine)

# Migration incrémentale (SQLite local uniquement)
if database.DATABASE_URL.startswith("sqlite"):
    def _migrate():
        with database.engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(posts)"))
            existing = {row[1] for row in result}
            new_cols = {
                "reposts":      "INTEGER DEFAULT 0",
                "impressions":  "INTEGER DEFAULT 0",
                "funnel_type":  "TEXT",
                "visual_done":  "INTEGER DEFAULT 0",
                "visual_url":   "TEXT",
                "linkedin_url": "TEXT",
            }
            for col, definition in new_cols.items():
                if col not in existing:
                    conn.execute(text(f"ALTER TABLE posts ADD COLUMN {col} {definition}"))
                    print(f"[migration] colonne '{col}' ajoutee")
            conn.commit()
    _migrate()

_executor    = ThreadPoolExecutor(max_workers=1)
_scrape_state = {"running": False, "last_result": None}


# ─── Schémas Pydantic ────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    title:        str
    content:      Optional[str] = ""
    status:       str = "idea"
    planned_date: Optional[str] = None
    funnel_type:  Optional[str] = None
    visual_done:  Optional[int] = 0
    visual_url:   Optional[str] = None
    linkedin_url: Optional[str] = None

class PostUpdate(BaseModel):
    title:             Optional[str] = None
    content:           Optional[str] = None
    status:            Optional[str] = None
    planned_date:      Optional[str] = None
    likes:             Optional[int] = None
    comments:          Optional[int] = None
    reposts:           Optional[int] = None
    impressions:       Optional[int] = None
    linkedin_date_raw: Optional[str] = None
    funnel_type:       Optional[str] = None
    visual_done:       Optional[int] = None
    visual_url:        Optional[str] = None
    linkedin_url:      Optional[str] = None

class PostResponse(BaseModel):
    id:                int
    title:             str
    content:           Optional[str]
    status:            str
    planned_date:      Optional[str]
    created_at:        Optional[str]
    updated_at:        Optional[str]
    likes:             Optional[int] = 0
    comments:          Optional[int] = 0
    reposts:           Optional[int] = 0
    impressions:       Optional[int] = 0
    linkedin_date_raw: Optional[str] = None
    funnel_type:       Optional[str] = None
    visual_done:       Optional[int] = 0
    visual_url:        Optional[str] = None
    linkedin_url:      Optional[str] = None

    class Config:
        from_attributes = True


class TextImportRequest(BaseModel):
    text: str


# ─── Utilitaire — date relative LinkedIn → ISO ───────────────────────────────

def _estimate_date(raw: str) -> Optional[str]:
    if not raw:
        return None
    now  = datetime.utcnow()
    t    = raw.lower().strip()
    rules = [
        (r"(\d+)\s*h",    lambda n: now - timedelta(hours=n)),
        (r"(\d+)\s*j",    lambda n: now - timedelta(days=n)),
        (r"(\d+)\s*sem",  lambda n: now - timedelta(weeks=n)),
        (r"(\d+)\s*mois", lambda n: now - timedelta(days=n * 30)),
        (r"(\d+)\s*an",   lambda n: now - timedelta(days=n * 365)),
    ]
    for pattern, calc in rules:
        m = re.search(pattern, t)
        if m:
            return calc(int(m.group(1))).strftime("%Y-%m-%d")
    return None


# ─── CRUD Posts ───────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/posts", response_model=List[PostResponse])
def get_posts(db: Session = Depends(database.get_db)):
    return db.query(models.Post).order_by(models.Post.created_at.desc()).all()

@app.post("/posts", response_model=PostResponse, status_code=201)
def create_post(post: PostCreate, db: Session = Depends(database.get_db)):
    now     = datetime.utcnow().isoformat()
    db_post = models.Post(**post.model_dump(), created_at=now, updated_at=now)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

@app.put("/posts/{post_id}", response_model=PostResponse)
def update_post(post_id: int, post: PostUpdate, db: Session = Depends(database.get_db)):
    db_post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post non trouvé")
    for k, v in post.model_dump(exclude_unset=True).items():
        setattr(db_post, k, v)
    db_post.updated_at = datetime.utcnow().isoformat()
    db.commit()
    db.refresh(db_post)
    return db_post

@app.delete("/posts/{post_id}")
def delete_post(post_id: int, db: Session = Depends(database.get_db)):
    db_post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post non trouvé")
    db.delete(db_post)
    db.commit()
    return {"message": "Post supprimé"}


# ─── Analytics ────────────────────────────────────────────────────────────────

@app.get("/analytics")
def get_analytics(db: Session = Depends(database.get_db)):
    all_posts  = db.query(models.Post).all()
    published  = [p for p in all_posts if p.status == "published"]

    total_likes       = sum(p.likes        or 0 for p in published)
    total_comments    = sum(p.comments     or 0 for p in published)
    total_reposts     = sum(p.reposts      or 0 for p in published)
    total_impressions = sum(p.impressions  or 0 for p in published)
    total_engagement  = total_likes + total_comments + total_reposts
    avg_engagement    = round(total_engagement / len(published), 1) if published else 0
    avg_impressions   = round(total_impressions / len(published), 0) if published else 0

    posts_data = sorted(
        [
            {
                "id":               p.id,
                "title":            p.title,
                "likes":            p.likes       or 0,
                "comments":         p.comments    or 0,
                "reposts":          p.reposts     or 0,
                "impressions":      p.impressions or 0,
                "engagement":       (p.likes or 0) + (p.comments or 0) + (p.reposts or 0),
                "linkedin_date_raw": p.linkedin_date_raw or "",
                "estimated_date":   _estimate_date(p.linkedin_date_raw),
                "funnel_type":      p.funnel_type or "",
                "linkedin_url":     p.linkedin_url or "",
            }
            for p in published
        ],
        key=lambda x: x["engagement"],
        reverse=True,
    )

    # Timeline par date estimée
    timeline: dict = {}
    for p in posts_data:
        d = p["estimated_date"]
        if d:
            if d not in timeline:
                timeline[d] = {"date": d, "likes": 0, "comments": 0, "reposts": 0, "impressions": 0, "posts": 0}
            timeline[d]["likes"]       += p["likes"]
            timeline[d]["comments"]    += p["comments"]
            timeline[d]["reposts"]     += p["reposts"]
            timeline[d]["impressions"] += p["impressions"]
            timeline[d]["posts"]       += 1

    return {
        "summary": {
            "total_posts":       len(all_posts),
            "published_posts":   len(published),
            "total_likes":       total_likes,
            "total_comments":    total_comments,
            "total_reposts":     total_reposts,
            "total_impressions": total_impressions,
            "total_engagement":  total_engagement,
            "avg_engagement":    avg_engagement,
            "avg_impressions":   int(avg_impressions),
        },
        "posts":    posts_data,
        "timeline": sorted(timeline.values(), key=lambda x: x["date"]),
    }


# ─── Import texte LinkedIn ────────────────────────────────────────────────────

@app.post("/import/text")
def import_from_text(body: TextImportRequest, db: Session = Depends(database.get_db)):
    from parser import parse_linkedin_page_text

    try:
        parsed = parse_linkedin_page_text(body.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de parsing : {e}")

    now       = datetime.utcnow().isoformat()
    all_db    = db.query(models.Post).all()
    db_by_key = {p.title[:80].lower(): p for p in all_db}

    imported = updated = skipped = 0

    try:
        for d in parsed:
            key      = d["title"][:80].lower()
            existing = db_by_key.get(key)

            if existing:
                existing.likes             = d.get("likes", 0)
                existing.comments          = d.get("comments", 0)
                existing.reposts           = d.get("reposts", 0)
                existing.impressions       = d.get("impressions", 0)
                existing.linkedin_date_raw = d.get("linkedin_date_raw", "")
                existing.updated_at        = now
                updated += 1
            else:
                new_post = models.Post(
                    title             = d["title"],
                    content           = d.get("content", ""),
                    status            = "published",
                    likes             = d.get("likes", 0),
                    comments          = d.get("comments", 0),
                    reposts           = d.get("reposts", 0),
                    impressions       = d.get("impressions", 0),
                    linkedin_date_raw = d.get("linkedin_date_raw", ""),
                    created_at        = now,
                    updated_at        = now,
                )
                db.add(new_post)
                db_by_key[key] = new_post
                imported += 1

        db.commit()
        return {
            "imported":      imported,
            "updated":       updated,
            "skipped":       skipped,
            "total_parsed":  len(parsed),
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Scraping ─────────────────────────────────────────────────────────────────

def _run_scrape_and_save(db_session_factory):
    from scraper import scrape_linkedin_posts

    _scrape_state["running"]     = True
    _scrape_state["last_result"] = None

    try:
        scraped = scrape_linkedin_posts()
    except Exception as e:
        _scrape_state.update({"running": False, "last_result": {"error": str(e)}})
        return

    db       = db_session_factory()
    imported = updated = 0

    try:
        now        = datetime.utcnow().isoformat()
        all_db     = db.query(models.Post).all()
        db_by_key  = {p.title[:80].lower(): p for p in all_db}

        for d in scraped:
            key = d["title"][:80].lower()
            existing = db_by_key.get(key)

            if existing:
                existing.likes            = d.get("likes", 0)
                existing.comments         = d.get("comments", 0)
                existing.reposts          = d.get("reposts", 0)
                existing.impressions      = d.get("impressions", 0)
                existing.linkedin_date_raw = d.get("linkedin_date_raw", "")
                existing.updated_at       = now
                updated += 1
            else:
                new = models.Post(
                    title            = d["title"],
                    content          = d.get("content", ""),
                    status           = "published",
                    likes            = d.get("likes", 0),
                    comments         = d.get("comments", 0),
                    reposts          = d.get("reposts", 0),
                    impressions      = d.get("impressions", 0),
                    linkedin_date_raw = d.get("linkedin_date_raw", ""),
                    created_at       = now,
                    updated_at       = now,
                )
                db.add(new)
                db_by_key[key] = new
                imported += 1

        db.commit()
        _scrape_state["last_result"] = {
            "imported":      imported,
            "updated":       updated,
            "total_scraped": len(scraped),
        }
    except Exception as e:
        db.rollback()
        _scrape_state["last_result"] = {"error": str(e)}
    finally:
        db.close()
        _scrape_state["running"] = False


@app.post("/scrape")
async def trigger_scrape():
    if _scrape_state["running"]:
        raise HTTPException(status_code=409, detail="Scraping déjà en cours.")
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(_executor, _run_scrape_and_save, database.SessionLocal)
    result = _scrape_state["last_result"] or {}
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@app.get("/scrape/status")
def scrape_status():
    return _scrape_state

-- Schéma à exécuter dans Supabase > SQL Editor
-- LinkedIn Post Manager — table principale

CREATE TABLE IF NOT EXISTS posts (
    id                SERIAL PRIMARY KEY,
    title             VARCHAR(500)  NOT NULL,
    content           TEXT          DEFAULT '',
    status            VARCHAR(50)   DEFAULT 'idea',
    planned_date      VARCHAR(20),
    created_at        VARCHAR(30),
    updated_at        VARCHAR(30),

    -- Stats LinkedIn
    likes             INTEGER       DEFAULT 0,
    comments          INTEGER       DEFAULT 0,
    reposts           INTEGER       DEFAULT 0,
    impressions       INTEGER       DEFAULT 0,
    linkedin_date_raw VARCHAR(50),

    -- Métadonnées éditoriales
    funnel_type       VARCHAR(50),
    visual_done       INTEGER       DEFAULT 0,
    visual_url        VARCHAR(500),
    linkedin_url      VARCHAR(500)
);

-- Index pour accélérer les requêtes par statut et date
CREATE INDEX IF NOT EXISTS idx_posts_status     ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);

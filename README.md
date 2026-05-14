# LinkedIn Post Manager

Outil local de pilotage et d'analyse de posts LinkedIn — 100% gratuit, 0 API officielle.

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Tailwind CSS |
| Backend | Python FastAPI |
| Base de données | SQLite |
| Scraping (V3) | Playwright |

---

## Installation

### Prérequis

- **Node.js** 18+
- **Python** 3.10+
- **pip** (inclus avec Python)

---

### 1 — Backend (FastAPI + SQLite)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

L'API est accessible sur **http://localhost:8000**
Documentation interactive : **http://localhost:8000/docs**

---

### 2 — Frontend (React)

Dans un second terminal :

```bash
cd frontend
npm install
npm start
```

L'application est accessible sur **http://localhost:3000**

---

## Fonctionnalités

### ✅ V1 — Kanban Pipeline
- 4 colonnes : **Idée → Brouillon → Planifié → Publié**
- Créer, éditer, supprimer des posts via une modal
- Glisser-déposer entre colonnes avec persistance SQLite
- Compteur de caractères (limite LinkedIn : 3000)

### 🔜 V2 — Calendrier
- Vue semaine / mois synchronisée avec le Kanban
- Slots lun → ven mis en avant
- Clic sur créneau vide → création rapide

### 🔜 V3 — Analytics
- Scraping du profil `https://www.linkedin.com/in/thibault-bellec/`
- Likes, commentaires, vues par post
- Dashboard KPI + graphiques d'engagement
- Matching automatique posts scrapés ↔ pipeline

---

## Structure du projet

```
linkedin-tool/
├── backend/
│   ├── main.py          # API FastAPI (CRUD posts)
│   ├── database.py      # Connexion SQLite + session
│   ├── models.py        # Modèle Post (SQLAlchemy)
│   ├── requirements.txt
│   └── linkedin_posts.db  # Créée automatiquement au premier lancement
│
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── index.js
│   │   ├── index.css
│   │   ├── api/
│   │   │   └── posts.js        # Appels API (axios)
│   │   └── components/
│   │       ├── Header.jsx
│   │       ├── KanbanBoard.jsx
│   │       ├── KanbanColumn.jsx
│   │       ├── PostCard.jsx
│   │       └── PostModal.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── public/index.html
│
└── README.md
```

---

## Design System

| Token | Valeur |
|-------|--------|
| Accent | `#B45309` (ambre) |
| Texte principal | `#1C1917` |
| Texte secondaire | `#57534E` |
| Texte muted | `#A8A29E` |
| Bordure | `#E5E2DC` |
| Surface | `#F5F2EE` |
| Police titres | Fraunces (italic bold) |
| Police UI | Space Grotesk |

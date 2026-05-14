import React, { useState, useEffect } from "react";
import { getPosts } from "../api/posts";
import CalendarWeekView, { formatDateKey, getWeekDays } from "./CalendarWeekView";
import CalendarMonthView from "./CalendarMonthView";
import PostModal from "./PostModal";

// ─── Navigation title ────────────────────────────────────────────────────────

const getNavTitle = (view, date) => {
  if (view === "week") {
    const days = getWeekDays(date);
    const start = days[0].toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    const end   = days[6].toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
    return `${start} — ${end}`;
  }
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

// ─── Composant principal ──────────────────────────────────────────────────────

const CalendarView = () => {
  const [view, setView]               = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts]             = useState([]);
  const [loading, setLoading]         = useState(true);

  // Modal
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [defaultDate, setDefaultDate] = useState("");

  useEffect(() => {
    getPosts()
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Navigation temporelle ─────────────────────────────────────────────────

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // ── Interactions ──────────────────────────────────────────────────────────

  const handleSlotClick = (date) => {
    setEditingPost(null);
    setDefaultDate(formatDateKey(date));
    setModalOpen(true);
  };

  const handlePostClick = (post) => {
    setEditingPost(post);
    setDefaultDate(post.planned_date || "");
    setModalOpen(true);
  };

  const handleSave = (savedPost) => {
    if (editingPost) {
      setPosts((prev) => prev.map((p) => (p.id === savedPost.id ? savedPost : p)));
    } else {
      setPosts((prev) => [savedPost, ...prev]);
    }
    setModalOpen(false);
  };

  // ── Posts par date ────────────────────────────────────────────────────────

  const getPostsForDate = (date) => {
    const key = formatDateKey(date);
    return posts.filter((p) => p.planned_date === key);
  };

  // ── Indicateurs globaux ───────────────────────────────────────────────────

  const plannedCount    = posts.filter((p) => p.planned_date).length;
  const thisWeekCount   = (() => {
    const days = getWeekDays(new Date());
    const keys = new Set(days.map(formatDateKey));
    return posts.filter((p) => keys.has(p.planned_date)).length;
  })();

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-60px)]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* ── Barre d'outils ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-white/80 backdrop-blur-sm sticky top-[60px] z-40">

        {/* Gauche : titre + navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border-[1.5px] border-edge hover:border-accent hover:text-accent text-ink-muted transition-colors"
            aria-label="Précédent"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-medium font-grotesk border-[1.5px] border-edge rounded-lg hover:border-accent hover:text-accent text-ink-light transition-colors"
          >
            Aujourd'hui
          </button>

          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border-[1.5px] border-edge hover:border-accent hover:text-accent text-ink-muted transition-colors"
            aria-label="Suivant"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <h1 className="font-fraunces text-lg font-bold text-ink ml-2 capitalize">
            {getNavTitle(view, currentDate)}
          </h1>
        </div>

        {/* Droite : stats + toggle vue */}
        <div className="flex items-center gap-4">
          {/* Mini stats */}
          <div className="hidden sm:flex items-center gap-3 text-xs font-grotesk text-ink-muted">
            <span>
              <span className="font-semibold text-ink">{thisWeekCount}</span> cette semaine
            </span>
            <span className="w-px h-3 bg-edge" />
            <span>
              <span className="font-semibold text-ink">{plannedCount}</span> planifiés
            </span>
          </div>

          {/* Toggle semaine / mois */}
          <div className="flex items-center bg-paper border-[1.5px] border-edge rounded-xl p-0.5">
            {[
              { id: "week",  label: "Semaine" },
              { id: "month", label: "Mois"    },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`px-3 py-1.5 text-xs font-semibold font-grotesk rounded-lg transition-colors ${
                  view === v.id
                    ? "bg-white text-accent border-[1.5px] border-edge shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Bouton nouveau post */}
          <button
            onClick={() => handleSlotClick(new Date())}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-semibold font-grotesk transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Nouveau post
          </button>
        </div>
      </div>

      {/* ── Grille calendrier ────────────────────────────────────────────── */}
      {view === "week" ? (
        <CalendarWeekView
          currentDate={currentDate}
          getPostsForDate={getPostsForDate}
          onSlotClick={handleSlotClick}
          onPostClick={handlePostClick}
        />
      ) : (
        <CalendarMonthView
          currentDate={currentDate}
          getPostsForDate={getPostsForDate}
          onSlotClick={handleSlotClick}
          onPostClick={handlePostClick}
        />
      )}

      {/* ── Modal création / édition ─────────────────────────────────────── */}
      <PostModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        post={editingPost}
        defaultStatus="planned"
        defaultDate={defaultDate}
        onSave={handleSave}
      />
    </>
  );
};

export default CalendarView;

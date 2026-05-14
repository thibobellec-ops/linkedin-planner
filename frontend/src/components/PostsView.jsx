import React, { useState, useEffect, useCallback } from "react";
import { getPosts } from "../api/posts";
import PostModal, { FUNNEL_STYLES, FunnelBadge } from "./PostModal";

// ─── Constantes de style ──────────────────────────────────────────────────────

const STATUS_CONFIG = {
  idea:      { label: "Idée",      dot: "bg-stone-400",  badge: "bg-stone-100 text-stone-600 border-stone-200"  },
  draft:     { label: "Brouillon", dot: "bg-blue-400",   badge: "bg-blue-50 text-blue-700 border-blue-200"       },
  planned:   { label: "Planifié",  dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 border-blue-200"       },
  published: { label: "Publié",    dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200"    },
};

const STATUS_FILTERS = [
  { id: "all",       label: "Tous"      },
  { id: "published", label: "Publiés"   },
  { id: "planned",   label: "Planifiés" },
  { id: "draft",     label: "Brouillons"},
  { id: "idea",      label: "Idées"     },
];

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
};

// ─── Carte post individuelle ──────────────────────────────────────────────────

const PostCard = ({ post, onEdit, onDeleted }) => {
  const [expanded, setExpanded]   = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.idea;
  const hasStats = (post.likes || 0) + (post.comments || 0) + (post.reposts || 0) + (post.impressions || 0) > 0;

  const lines = (post.content || "").split("\n").filter(Boolean);
  const preview = lines.slice(0, 4).join("\n");
  const hasMore = lines.length > 4;

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Supprimer "${post.title}" ?`)) return;
    setDeleting(true);
    try {
      const API = process.env.REACT_APP_API_URL || "http://localhost:8000";
      await fetch(`${API}/posts/${post.id}`, { method: "DELETE" });
      onDeleted(post.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <article
      className={`bg-white border-[1.5px] border-edge rounded-2xl p-5 transition-all duration-150 ${deleting ? "opacity-40 pointer-events-none" : "hover:border-stone-300"}`}
    >
      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold font-grotesk ${cfg.badge}`}>
            {cfg.label}
          </span>
          <FunnelBadge type={post.funnel_type} />
          {post.visual_done ? (
            <span title="Visuel fait" className="text-sm">✅</span>
          ) : null}
          {post.linkedin_date_raw && (
            <span className="text-[11px] text-ink-muted font-grotesk">{post.linkedin_date_raw}</span>
          )}
          {post.planned_date && (
            <span className="text-[11px] text-ink-muted font-grotesk flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M1 7h14M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {formatDate(post.planned_date)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 flex-shrink-0">
          {post.linkedin_url && (
            <a
              href={post.linkedin_url}
              target="_blank"
              rel="noreferrer"
              title="Voir sur LinkedIn"
              onClick={(e) => e.stopPropagation()}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border-[1.5px] border-edge hover:border-accent hover:text-accent text-ink-muted transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(post); }}
            title="Modifier"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border-[1.5px] border-edge hover:border-accent hover:text-accent text-ink-muted transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={handleDelete}
            title="Supprimer"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border-[1.5px] border-edge hover:border-red-300 hover:text-red-500 text-ink-muted transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M6 4V2h4v2M5 4l1 9h4l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Hook / titre ────────────────────────────────────────────────────── */}
      <h3 className="font-fraunces text-base font-bold text-ink leading-snug mb-3">
        {post.title}
      </h3>

      {/* ── Contenu ─────────────────────────────────────────────────────────── */}
      {lines.length > 0 && (
        <div className="font-grotesk text-sm text-ink-light leading-relaxed whitespace-pre-line mb-3">
          {expanded ? post.content : preview}
          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="ml-1.5 text-accent hover:underline font-medium text-xs"
            >
              {expanded ? "Voir moins ↑" : "… voir plus ↓"}
            </button>
          )}
        </div>
      )}

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      {hasStats && (
        <div className="flex items-center gap-4 pt-3 border-t border-edge/60 mt-2">
          {post.likes > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-grotesk text-ink-muted">
              <span className="text-sm">👍</span>
              <span className="font-semibold text-ink">{post.likes.toLocaleString("fr-FR")}</span>
            </div>
          )}
          {post.comments > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-grotesk text-ink-muted">
              <span className="text-sm">💬</span>
              <span className="font-semibold text-ink">{post.comments.toLocaleString("fr-FR")}</span>
            </div>
          )}
          {post.reposts > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-grotesk text-ink-muted">
              <span className="text-sm">🔁</span>
              <span className="font-semibold text-ink">{post.reposts}</span>
            </div>
          )}
          {post.impressions > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-grotesk text-ink-muted ml-auto">
              <span className="text-sm">👁</span>
              <span className="font-semibold text-ink">{post.impressions.toLocaleString("fr-FR")}</span>
              <span>impressions</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

// ─── Vue principale ───────────────────────────────────────────────────────────

const PostsView = () => {
  const [posts, setPosts]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingPost, setEditingPost]   = useState(null);
  const [modalOpen, setModalOpen]       = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await getPosts();
      setPosts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleEdit = (post) => {
    setEditingPost(post);
    setModalOpen(true);
  };

  const handleSaved = (savedPost) => {
    setPosts((prev) => prev.map((p) => (p.id === savedPost.id ? savedPost : p)));
    setModalOpen(false);
    setEditingPost(null);
  };

  const handleDeleted = (id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  // Filtrage
  const filtered = posts.filter((p) => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchSearch = !search.trim() ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.content || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Tri : publiés d'abord (par engagement desc), puis les autres (par date desc)
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === "published" && b.status !== "published") return -1;
    if (b.status === "published" && a.status !== "published") return 1;
    const engA = (a.likes || 0) + (a.comments || 0) + (a.reposts || 0);
    const engB = (b.likes || 0) + (b.comments || 0) + (b.reposts || 0);
    return engB - engA;
  });

  const counts = {
    all:       posts.length,
    published: posts.filter((p) => p.status === "published").length,
    planned:   posts.filter((p) => p.status === "planned").length,
    draft:     posts.filter((p) => p.status === "draft").length,
    idea:      posts.filter((p) => p.status === "idea").length,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6">

      {/* ── Barre d'outils sticky ────────────────────────────────────────── */}
      <div className="sticky top-[60px] z-40 bg-white/90 backdrop-blur-sm border-b border-edge -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="font-fraunces text-lg font-bold text-ink">Tous les posts</h1>
            <p className="text-xs font-grotesk text-ink-muted mt-0.5">
              {sorted.length} post{sorted.length !== 1 ? "s" : ""}
              {search || statusFilter !== "all" ? " filtrés" : " au total"}
            </p>
          </div>
          <button
            onClick={() => { setEditingPost(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-semibold font-grotesk transition-colors flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="hidden sm:inline">Nouveau post</span>
          </button>
        </div>

        {/* Filtres statut */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold font-grotesk border-[1.5px] transition-colors ${
                statusFilter === f.id
                  ? "bg-accent text-white border-accent"
                  : "bg-white text-ink-muted border-edge hover:border-stone-300 hover:text-ink"
              }`}
            >
              {f.label}
              <span className={`ml-1.5 text-[10px] ${statusFilter === f.id ? "opacity-75" : "opacity-50"}`}>
                {counts[f.id]}
              </span>
            </button>
          ))}

          {/* Recherche */}
          <div className="ml-auto flex-shrink-0 relative">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="pl-8 pr-3 py-1.5 border-[1.5px] border-edge rounded-xl text-xs font-grotesk text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors w-36 sm:w-48"
            />
          </div>
        </div>
      </div>

      {/* ── États de chargement / vide ───────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <p className="font-fraunces text-lg font-bold text-ink mb-1">Aucun post trouvé</p>
          <p className="text-sm font-grotesk text-ink-muted">
            {search ? "Essayez un autre terme de recherche." : "Créez votre premier post !"}
          </p>
        </div>
      ) : (
        /* ── Liste des posts ──────────────────────────────────────────────── */
        <div className="flex flex-col gap-4 pb-10">
          {sorted.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onEdit={handleEdit}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {/* ── Modal édition ─────────────────────────────────────────────────── */}
      <PostModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingPost(null); }}
        post={editingPost}
        onSave={handleSaved}
      />
    </div>
  );
};

export default PostsView;

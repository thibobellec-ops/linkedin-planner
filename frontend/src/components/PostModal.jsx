import React, { useState, useEffect, useCallback } from "react";
import { createPost, updatePost } from "../api/posts";

// ─── Options statut ───────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "idea",      label: "💡 Idée"      },
  { value: "draft",     label: "✏️ Brouillon"  },
  { value: "planned",   label: "📅 Planifié"   },
  { value: "published", label: "✅ Publié"     },
];

// ─── Catégories funnel ────────────────────────────────────────────────────────

export const FUNNEL_OPTIONS = [
  { value: "",                  label: "— Aucune —",         color: null },
  { value: "Personal branding", label: "Personal branding",  color: "violet" },
  { value: "Lead magnet #1",    label: "Lead magnet #1",     color: "sky"    },
  { value: "Lead magnet #2",    label: "Lead magnet #2",     color: "amber"  },
  { value: "Étude de cas",      label: "Étude de cas",       color: "indigo" },
  { value: "Opinion",           label: "Opinion",            color: "rose"   },
  { value: "Contenu léger",     label: "Contenu léger",      color: "stone"  },
  // Rétrocompat TOFU/MOFU/BOFU (posts importés)
  { value: "TOFU",              label: "TOFU",               color: "green"  },
  { value: "MOFU",              label: "MOFU",               color: "blue"   },
  { value: "BOFU",              label: "BOFU",               color: "orange" },
];

export const FUNNEL_STYLES = {
  "Personal branding": { badge: "bg-violet-50 text-violet-700 border-violet-200",   btn: "border-violet-400 bg-violet-50 text-violet-700"   },
  "Lead magnet #1":    { badge: "bg-sky-50 text-sky-700 border-sky-200",            btn: "border-sky-400 bg-sky-50 text-sky-700"            },
  "Lead magnet #2":    { badge: "bg-amber-50 text-amber-700 border-amber-200",      btn: "border-amber-400 bg-amber-50 text-amber-700"      },
  "Étude de cas":      { badge: "bg-indigo-50 text-indigo-700 border-indigo-200",   btn: "border-indigo-400 bg-indigo-50 text-indigo-700"   },
  "Opinion":           { badge: "bg-rose-50 text-rose-700 border-rose-200",         btn: "border-rose-400 bg-rose-50 text-rose-700"         },
  "Contenu léger":     { badge: "bg-stone-100 text-stone-600 border-stone-200",     btn: "border-stone-400 bg-stone-100 text-stone-600"     },
  "TOFU":              { badge: "bg-green-50 text-green-700 border-green-200",      btn: "border-green-400 bg-green-50 text-green-700"      },
  "MOFU":              { badge: "bg-blue-50 text-blue-700 border-blue-200",         btn: "border-blue-400 bg-blue-50 text-blue-700"         },
  "BOFU":              { badge: "bg-orange-50 text-orange-700 border-orange-200",   btn: "border-orange-400 bg-orange-50 text-orange-700"   },
};

const FUNNEL_IDLE = "border-edge text-ink-muted hover:border-stone-300 hover:text-ink";

// ─── Composant badge funnel réutilisable ──────────────────────────────────────

export const FunnelBadge = ({ type, className = "" }) => {
  if (!type) return null;
  const style = FUNNEL_STYLES[type];
  if (!style) return null;
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold font-grotesk ${style.badge} ${className}`}>
      {type}
    </span>
  );
};

// ─── Modal principal ──────────────────────────────────────────────────────────

const PostModal = ({ isOpen, onClose, post, defaultStatus = "idea", defaultDate = "", onSave }) => {
  const [title,       setTitle]      = useState("");
  const [content,     setContent]    = useState("");
  const [status,      setStatus]     = useState(defaultStatus);
  const [plannedDate, setPlannedDate]= useState("");
  const [funnelType,  setFunnelType] = useState("");
  const [visualDone,  setVisualDone] = useState(false);
  const [visualUrl,   setVisualUrl]  = useState("");
  const [linkedinUrl, setLinkedinUrl]= useState("");
  const [showStats,   setShowStats]  = useState(false);
  const [likes,       setLikes]      = useState("");
  const [comments,    setComments]   = useState("");
  const [reposts,     setReposts]    = useState("");
  const [impressions, setImpressions]= useState("");
  const [saving,      setSaving]     = useState(false);
  const [error,       setError]      = useState("");

  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setContent(post.content || "");
      setStatus(post.status || "idea");
      setPlannedDate(post.planned_date || "");
      setFunnelType(post.funnel_type || "");
      setVisualDone(Boolean(post.visual_done));
      setVisualUrl(post.visual_url || "");
      setLinkedinUrl(post.linkedin_url || "");
      setLikes(post.likes != null ? String(post.likes) : "");
      setComments(post.comments != null ? String(post.comments) : "");
      setReposts(post.reposts != null ? String(post.reposts) : "");
      setImpressions(post.impressions != null ? String(post.impressions) : "");
    } else {
      setTitle(""); setContent(""); setStatus(defaultStatus);
      setPlannedDate(defaultDate || ""); setFunnelType("");
      setVisualDone(false); setVisualUrl(""); setLinkedinUrl("");
      setLikes(""); setComments(""); setReposts(""); setImpressions("");
    }
    setShowStats(false);
    setError("");
  }, [post, defaultStatus, defaultDate, isOpen]);

  const handleKeyDown = useCallback(
    (e) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );
  useEffect(() => {
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError("Le hook / titre est obligatoire."); return; }
    setSaving(true); setError("");
    const payload = {
      title: title.trim(), content: content.trim(), status,
      planned_date: plannedDate || null,
      funnel_type:  funnelType  || null,
      visual_done:  visualDone ? 1 : 0,
      visual_url:   visualUrl  || null,
      linkedin_url: linkedinUrl || null,
    };
    if (likes       !== "") payload.likes       = parseInt(likes,       10) || 0;
    if (comments    !== "") payload.comments    = parseInt(comments,    10) || 0;
    if (reposts     !== "") payload.reposts     = parseInt(reposts,     10) || 0;
    if (impressions !== "") payload.impressions = parseInt(impressions, 10) || 0;

    try {
      const saved = post ? await updatePost(post.id, payload) : await createPost(payload);
      onSave(saved);
    } catch {
      setError("Erreur lors de la sauvegarde. Vérifiez que le backend est lancé.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panneau — max-w-3xl, 2 colonnes sur desktop */}
      <div className="relative z-10 bg-white w-full sm:max-w-3xl sm:rounded-2xl rounded-t-2xl border-[1.5px] border-edge shadow-2xl max-h-[94vh] flex flex-col fade-up">

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-4 border-b border-edge flex-shrink-0">
          <h2 className="font-fraunces text-xl font-bold text-ink">
            {post ? "Modifier le post" : "Nouveau post"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-paper transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        {/* ── Corps ───────────────────────────────────────────────────────── */}
        <form id="post-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="flex flex-col sm:flex-row h-full">

            {/* ─── Colonne gauche : métadonnées ────────────────────────────── */}
            <div className="sm:w-64 flex-shrink-0 px-5 sm:px-6 py-4 sm:border-r border-edge flex flex-col gap-4 sm:overflow-y-auto">

              {/* Statut — horizontal scrollable sur mobile, vertical sur desktop */}
              <div>
                <label className="block text-xs font-semibold font-grotesk text-ink-muted uppercase tracking-wide mb-2">Statut</label>
                <div className="flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 -mx-1 px-1">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={`flex-shrink-0 text-left px-3 py-2 rounded-xl text-sm font-medium font-grotesk border-[1.5px] transition-colors ${
                        status === opt.value
                          ? "border-accent bg-accent/5 text-accent"
                          : "border-edge text-ink-muted hover:border-stone-300 hover:text-ink"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date planifiée */}
              <div>
                <label className="block text-xs font-semibold font-grotesk text-ink-muted uppercase tracking-wide mb-2">Date prévue</label>
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  className="w-full px-3 py-2 border-[1.5px] border-edge rounded-xl text-sm font-grotesk text-ink focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Catégorie funnel — horizontal scrollable sur mobile, vertical sur desktop */}
              <div>
                <label className="block text-xs font-semibold font-grotesk text-ink-muted uppercase tracking-wide mb-2">Catégorie</label>
                <div className="flex sm:flex-col gap-1.5 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 -mx-1 px-1">
                  {FUNNEL_OPTIONS.map((opt) => {
                    const style = FUNNEL_STYLES[opt.value];
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFunnelType(opt.value)}
                        className={`flex-shrink-0 text-left px-3 py-2 rounded-xl text-xs font-semibold font-grotesk border-[1.5px] transition-colors ${
                          funnelType === opt.value
                            ? style ? style.btn : "border-stone-300 bg-stone-100 text-stone-600"
                            : FUNNEL_IDLE
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visuel */}
              <div>
                <label className="block text-xs font-semibold font-grotesk text-ink-muted uppercase tracking-wide mb-2">Visuel</label>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={visualDone}
                    onChange={(e) => setVisualDone(e.target.checked)}
                    className="w-4 h-4 rounded border-edge accent-accent"
                  />
                  <span className="text-sm font-medium font-grotesk text-ink">Visuel fait ✅</span>
                </label>
                {visualDone && (
                  <input
                    type="url"
                    value={visualUrl}
                    onChange={(e) => setVisualUrl(e.target.value)}
                    placeholder="https://… lien du visuel"
                    className="w-full px-3 py-2 border-[1.5px] border-edge rounded-xl text-xs font-grotesk text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors"
                  />
                )}
              </div>

              {/* Lien LinkedIn */}
              <div>
                <label className="block text-xs font-semibold font-grotesk text-ink-muted uppercase tracking-wide mb-2">Lien LinkedIn</label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/…"
                  className="w-full px-3 py-2 border-[1.5px] border-edge rounded-xl text-xs font-grotesk text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Stats (collapsible) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowStats((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold font-grotesk text-ink-muted hover:text-ink transition-colors uppercase tracking-wide"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className={`transition-transform ${showStats ? "rotate-90" : ""}`}>
                    <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Stats LinkedIn
                </button>
                {showStats && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      { label: "👍 Likes",        value: likes,       set: setLikes      },
                      { label: "💬 Commentaires",  value: comments,    set: setComments   },
                      { label: "🔁 Reposts",       value: reposts,     set: setReposts    },
                      { label: "👁 Impressions",   value: impressions, set: setImpressions},
                    ].map(({ label, value, set }) => (
                      <div key={label}>
                        <label className="block text-[10px] font-medium font-grotesk text-ink-muted mb-1">{label}</label>
                        <input
                          type="number" min="0"
                          value={value}
                          onChange={(e) => set(e.target.value)}
                          className="w-full px-2 py-1.5 border-[1.5px] border-edge rounded-xl text-sm font-grotesk text-ink focus:outline-none focus:border-accent transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ─── Colonne droite : contenu ────────────────────────────────── */}
            <div className="flex-1 min-w-0 px-5 sm:px-6 py-4 flex flex-col gap-4">

              {/* Hook / titre */}
              <div>
                <label className="block text-xs font-semibold font-grotesk text-ink-muted uppercase tracking-wide mb-2">
                  Hook / Titre <span className="text-red-400 normal-case font-normal tracking-normal">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Ce que personne ne vous dit sur le personal branding…"
                  className="w-full px-3 py-2.5 border-[1.5px] border-edge rounded-xl text-sm font-grotesk text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors"
                  autoFocus
                />
              </div>

              {/* Contenu — textarea grande */}
              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-semibold font-grotesk text-ink-muted uppercase tracking-wide mb-2">Contenu du post</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Rédigez votre post LinkedIn ici…"
                  className="flex-1 w-full px-3 py-3 border-[1.5px] border-edge rounded-xl text-sm font-grotesk text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors resize-none leading-relaxed min-h-[280px] sm:min-h-[0]"
                />
                <p className="text-xs text-ink-muted font-grotesk text-right mt-1.5">
                  {content.length} / 3 000 caractères
                </p>
              </div>

              {/* Message d'erreur */}
              {error && (
                <p className="text-sm text-red-500 font-grotesk bg-red-50 px-3 py-2 rounded-xl border border-red-200">
                  {error}
                </p>
              )}
            </div>
          </div>
        </form>

        {/* ── Pied fixe ───────────────────────────────────────────────────── */}
        <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-edge flex gap-3 flex-shrink-0">
          <button
            type="button" onClick={onClose}
            className="flex-1 py-2.5 border-[1.5px] border-edge rounded-xl text-sm font-medium font-grotesk text-ink-muted hover:text-ink hover:border-stone-300 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit" form="post-form" disabled={saving}
            className="flex-1 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-semibold font-grotesk transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Sauvegarde…" : post ? "Enregistrer" : "Créer le post"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostModal;

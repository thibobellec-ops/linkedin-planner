import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import KpiCard from "./KpiCard";
import PostModal, { FunnelBadge } from "./PostModal";

const API = process.env.REACT_APP_API_URL
  || (process.env.NODE_ENV === "production" ? "/_/backend" : "http://localhost:8000");

// ─── Filtre temporel ─────────────────────────────────────────────────────────

const FILTERS = [
  { id: "all",   label: "Tout"       },
  { id: "month", label: "Ce mois"    },
  { id: "week",  label: "Cette semaine" },
];

const isWithin = (dateStr, days) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff;
};

// ─── Tooltip recharts custom ─────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border-[1.5px] border-edge rounded-xl px-3 py-2 shadow-lg text-xs font-grotesk">
      <p className="font-semibold text-ink mb-1 max-w-[200px] line-clamp-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name} : <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────

const AnalyticsView = () => {
  const [data, setData]             = useState(null);
  const [allPosts, setAllPosts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting]   = useState(false);
  const [importMsg, setImportMsg]   = useState(null);
  const [filter, setFilter]         = useState("all");
  const [error, setError]           = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [postModalOpen, setPostModalOpen] = useState(false);

  // ── Chargement des analytics ──────────────────────────────────────────────

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, postsRes] = await Promise.all([
        axios.get(`${API}/analytics`),
        axios.get(`${API}/posts`),
      ]);
      setData(analyticsRes.data);
      setAllPosts(Array.isArray(postsRes.data) ? postsRes.data : []);
    } catch (e) {
      setError("Impossible de charger les analytics. Backend en ligne ?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // ── Import texte ──────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const res = await axios.post(`${API}/import/text`, { text: importText });
      const { imported, updated, total_parsed } = res.data;
      setImportMsg(`${total_parsed} posts détectés — ${updated} mis à jour, ${imported} nouveaux.`);
      setImportText("");
      setImportOpen(false);
      await fetchAnalytics();
    } catch (e) {
      setImportMsg("Erreur lors de l'import. Vérifiez que le backend est lancé.");
    } finally {
      setImporting(false);
    }
  };

  // ── Edition d'un post depuis Analytics ────────────────────────────────────

  const handleEditPost = (postId) => {
    const post = allPosts.find((p) => p.id === postId);
    if (post) {
      setEditingPost(post);
      setPostModalOpen(true);
    }
  };

  const handlePostSaved = async () => {
    setPostModalOpen(false);
    setEditingPost(null);
    await fetchAnalytics();
  };

  // ── Filtrage des posts ────────────────────────────────────────────────────

  const filteredPosts = !data ? [] : data.posts.filter((p) => {
    if (filter === "week")  return isWithin(p.estimated_date, 7);
    if (filter === "month") return isWithin(p.estimated_date, 30);
    return true;
  });

  // Données pour le graphique horizontal (top 15 max)
  const chartData = filteredPosts.slice(0, 15).map((p) => ({
    name:     p.title.length > 40 ? p.title.slice(0, 40) + "…" : p.title,
    fullTitle: p.title,
    likes:    p.likes,
    comments: p.comments,
    reposts:  p.reposts,
  }));

  // ── États de chargement / erreur ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-60px)]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-60px)] p-6">
        <div className="text-center max-w-sm">
          <p className="font-fraunces text-xl font-bold text-ink mb-2">Erreur</p>
          <p className="text-sm font-grotesk text-ink-light">{error}</p>
          <button onClick={fetchAnalytics} className="mt-4 px-4 py-2 bg-accent text-white rounded-xl text-sm font-grotesk font-semibold hover:bg-accent-dark transition-colors">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const { summary } = data;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="px-6 py-4 max-w-7xl mx-auto">

      {/* ── Barre d'outils ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 sticky top-[60px] py-4 bg-white/80 backdrop-blur-sm z-40 -mx-6 px-6 border-b border-edge">
        <div>
          <h1 className="font-fraunces text-lg font-bold text-ink">Analytics</h1>
          <p className="text-xs font-grotesk text-ink-muted mt-0.5">
            {summary.published_posts} posts publiés · données LinkedIn scrapées
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filtre temporel */}
          <div className="flex items-center bg-paper border-[1.5px] border-edge rounded-xl p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-semibold font-grotesk rounded-lg transition-colors ${
                  filter === f.id
                    ? "bg-white text-accent border-[1.5px] border-edge shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Bouton import texte */}
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-semibold font-grotesk transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="hidden sm:inline">Importer du texte</span>
            <span className="sm:hidden">Importer</span>
          </button>
        </div>
      </div>

      {/* Message post-import */}
      {importMsg && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm font-grotesk text-green-700 flex items-center justify-between">
          <span>{importMsg}</span>
          <button onClick={() => setImportMsg(null)} className="text-green-500 hover:text-green-700 ml-4 text-lg leading-none">×</button>
        </div>
      )}

      {/* ── KPI cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard
          label="Posts publiés"
          value={summary.published_posts}
          sub={`sur ${summary.total_posts} dans le pipeline`}
          icon="📄"
        />
        <KpiCard
          label="Total likes"
          value={summary.total_likes.toLocaleString("fr-FR")}
          sub="cumulés sur tous les posts"
          icon="👍"
          accent
        />
        <KpiCard
          label="Total commentaires"
          value={summary.total_comments.toLocaleString("fr-FR")}
          sub="cumulés sur tous les posts"
          icon="💬"
        />
        <KpiCard
          label="Impressions totales"
          value={summary.total_impressions.toLocaleString("fr-FR")}
          sub={`moy. ${summary.avg_impressions.toLocaleString("fr-FR")} / post`}
          icon="👁"
          accent
        />
        <KpiCard
          label="Engagement moyen"
          value={summary.avg_engagement}
          sub="likes + commentaires + reposts"
          icon="📊"
        />
      </div>

      {/* ── Zone principale : graphique + tableau ───────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Graphique d'engagement */}
        <div className="xl:col-span-3 bg-white border-[1.5px] border-edge rounded-xl p-5">
          <h2 className="font-fraunces text-base font-bold text-ink mb-4">
            Engagement par post
            <span className="font-grotesk text-xs font-normal text-ink-muted ml-2">
              (top {Math.min(chartData.length, 15)} — likes + commentaires)
            </span>
          </h2>

          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-ink-muted font-grotesk text-sm">
              Aucun post sur cette période
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 36)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E2DC" />
                <XAxis type="number" tick={{ fontSize: 11, fontFamily: "Space Grotesk", fill: "#A8A29E" }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={180}
                  tick={{ fontSize: 11, fontFamily: "Space Grotesk", fill: "#57534E" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F5F2EE" }} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, fontFamily: "Space Grotesk", paddingTop: 12 }}
                />
                <Bar dataKey="likes" name="Likes" fill="#2563EB" radius={[0, 4, 4, 0]} />
                <Bar dataKey="comments" name="Commentaires" fill="#60A5FA" radius={[0, 4, 4, 0]} />
                <Bar dataKey="reposts" name="Reposts" fill="#1D4ED8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tableau top contenus */}
        <div className="xl:col-span-2 bg-white border-[1.5px] border-edge rounded-xl p-5 flex flex-col">
          <h2 className="font-fraunces text-base font-bold text-ink mb-4">
            Top contenus
          </h2>

          {filteredPosts.length === 0 ? (
            <div className="flex items-center justify-center flex-1 text-ink-muted font-grotesk text-sm">
              Aucun post sur cette période
            </div>
          ) : (
            <div className="overflow-x-auto flex-1 -mx-1">
              <table className="w-full min-w-[480px] text-xs font-grotesk border-collapse">
                <thead>
                  <tr className="border-b border-edge text-[10px] text-ink-muted uppercase tracking-wide">
                    <th className="text-left px-2 pb-2 w-6">#</th>
                    <th className="text-left px-2 pb-2">Post</th>
                    <th className="text-center px-1 pb-2 w-14">Funnel</th>
                    <th className="text-right px-1 pb-2 w-10">👍</th>
                    <th className="text-right px-1 pb-2 w-10">💬</th>
                    <th className="text-right px-1 pb-2 w-10">🔁</th>
                    <th className="text-right px-1 pb-2 w-14">👁</th>
                    <th className="text-right px-1 pb-2 w-7"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPosts.map((post, i) => (
                    <tr key={post.id} className="border-b border-edge/60 last:border-0 hover:bg-paper/60 transition-colors">
                      <td className="px-2 py-2.5 font-bold text-ink-muted">{i + 1}</td>
                      <td className="px-2 py-2.5 min-w-0">
                        {post.linkedin_url ? (
                          <a href={post.linkedin_url} target="_blank" rel="noreferrer"
                            className="font-medium text-accent hover:underline line-clamp-2 leading-snug block">
                            {post.title}
                          </a>
                        ) : (
                          <p className="font-medium text-ink line-clamp-2 leading-snug">{post.title}</p>
                        )}
                        {post.linkedin_date_raw && (
                          <p className="text-[10px] text-ink-muted mt-0.5">{post.linkedin_date_raw}</p>
                        )}
                      </td>
                      <td className="px-1 py-2.5 text-center">
                        <FunnelBadge type={post.funnel_type} />
                      </td>
                      <td className="px-1 py-2.5 text-right font-semibold text-ink">{post.likes || "—"}</td>
                      <td className="px-1 py-2.5 text-right font-semibold text-ink-light">{post.comments || "—"}</td>
                      <td className="px-1 py-2.5 text-right font-semibold text-ink-light">{post.reposts || "—"}</td>
                      <td className="px-1 py-2.5 text-right font-semibold text-ink-light">
                        {post.impressions ? post.impressions.toLocaleString("fr-FR") : "—"}
                      </td>
                      <td className="px-1 py-2.5 text-right">
                        <button
                          onClick={() => handleEditPost(post.id)}
                          title="Modifier"
                          className="w-6 h-6 flex items-center justify-center rounded-lg border border-edge hover:border-accent hover:text-accent text-ink-muted transition-colors ml-auto"
                        >
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                            <path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Note de bas de page ──────────────────────────────────────────── */}
      <p className="text-center text-xs font-grotesk text-ink-muted mt-6 pb-4">
        Les dates sont estimées à partir des dates relatives LinkedIn (ex : "2 sem.").
        Utilisez "Importer du texte" pour coller votre page LinkedIn et mettre à jour les chiffres.
      </p>

      {/* ── Modal Import texte ────────────────────────────────────────────── */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={() => setImportOpen(false)} />
          <div className="relative z-10 bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl border-[1.5px] border-edge shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-edge flex-shrink-0">
              <div>
                <h2 className="font-fraunces text-lg font-bold text-ink">Importer depuis LinkedIn</h2>
                <p className="text-xs font-grotesk text-ink-muted mt-0.5">Colle le texte de ta page LinkedIn (Ctrl+A → Ctrl+C depuis le navigateur)</p>
              </div>
              <button onClick={() => setImportOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink hover:bg-paper transition-colors text-lg">×</button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Colle ici le texte complet de ta page d'activité LinkedIn…"
                className="w-full h-64 px-3 py-2.5 border-[1.5px] border-edge rounded-xl text-sm font-grotesk text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors resize-none"
              />
              {importMsg && (
                <p className="mt-3 text-sm font-grotesk text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">{importMsg}</p>
              )}
            </div>
            <div className="px-6 pb-5 flex gap-3 flex-shrink-0">
              <button onClick={() => setImportOpen(false)} className="flex-1 py-2.5 border-[1.5px] border-edge rounded-xl text-sm font-medium font-grotesk text-ink-light hover:border-stone-300 transition-colors">
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !importText.trim()}
                className="flex-1 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-semibold font-grotesk transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {importing ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyse en cours…</>
                ) : "Importer et mettre à jour"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PostModal pour édition depuis Analytics ───────────────────────── */}
      <PostModal
        isOpen={postModalOpen}
        onClose={() => { setPostModalOpen(false); setEditingPost(null); }}
        post={editingPost}
        onSave={handlePostSaved}
      />
    </div>
  );
};

export default AnalyticsView;

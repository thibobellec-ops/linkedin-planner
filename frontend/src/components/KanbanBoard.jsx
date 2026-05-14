import React, { useState, useEffect } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import KanbanColumn from "./KanbanColumn";
import PostModal from "./PostModal";
import { getPosts, updatePost } from "../api/posts";

// Définition des colonnes du pipeline
const COLUMNS = [
  { id: "idea",      label: "Idée",      stagger: 1 },
  { id: "draft",     label: "Brouillon", stagger: 2 },
  { id: "planned",   label: "Planifié",  stagger: 3 },
  { id: "published", label: "Publié",    stagger: 4 },
];

/**
 * Tableau Kanban principal — gère les posts, le drag & drop et les modals
 */
const KanbanBoard = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  // État du modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [defaultStatus, setDefaultStatus] = useState("idea");

  // Chargement initial des posts
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const data = await getPosts();
      setPosts(Array.isArray(data) ? data : []);
      setApiError(false);
    } catch (err) {
      console.error("Erreur API :", err);
      setApiError(true);
    } finally {
      setLoading(false);
    }
  };

  // Fin d'un drag & drop — met à jour le statut du post
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const postId = parseInt(draggableId, 10);
    const newStatus = destination.droppableId;

    // Mise à jour optimiste de l'UI
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: newStatus } : p))
    );

    try {
      await updatePost(postId, { status: newStatus });
    } catch (err) {
      console.error("Erreur mise à jour statut :", err);
      fetchPosts(); // Resynchronisation en cas d'erreur
    }
  };

  // Ouvrir le modal en mode création (depuis une colonne)
  const handleOpenCreate = (status) => {
    setEditingPost(null);
    setDefaultStatus(status);
    setModalOpen(true);
  };

  // Ouvrir le modal en mode édition
  const handleOpenEdit = (post) => {
    setEditingPost(post);
    setModalOpen(true);
  };

  // Callback après sauvegarde (création ou édition)
  const handleSave = (savedPost) => {
    if (editingPost) {
      setPosts((prev) => prev.map((p) => (p.id === savedPost.id ? savedPost : p)));
    } else {
      setPosts((prev) => [savedPost, ...prev]);
    }
    setModalOpen(false);
  };

  // Suppression locale après confirmation dans PostCard
  const handleDelete = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  // Filtrer les posts par statut pour une colonne
  const getPostsByStatus = (status) =>
    (Array.isArray(posts) ? posts : []).filter((p) => p.status === status);

  // ─── États de chargement / erreur ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-60px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-grotesk text-ink-muted">Chargement du pipeline…</p>
        </div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-60px)] p-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-500">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 7v5M12 16v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className="font-fraunces text-lg font-bold text-ink mb-2">Backend non accessible</h3>
          <p className="text-sm font-grotesk text-ink-light mb-4">
            Assurez-vous que le serveur FastAPI est lancé sur le port 8000.
          </p>
          <code className="block text-xs font-mono bg-paper border border-edge rounded-lg px-3 py-2 text-ink-light mb-4">
            cd backend && uvicorn main:app --reload
          </code>
          <button
            onClick={fetchPosts}
            className="px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium font-grotesk hover:bg-accent-dark transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ─── Vue principale ─────────────────────────────────────────────────────────

  return (
    <>
      {/* Barre d'actions globale */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-edge bg-white/80 backdrop-blur-sm sticky top-[60px] z-40">
        <div>
          <h1 className="font-fraunces text-lg font-bold text-ink">Pipeline</h1>
          <p className="text-xs font-grotesk text-ink-muted mt-0.5">
            {posts.length} post{posts.length !== 1 ? "s" : ""} dans le pipeline
          </p>
        </div>
        <button
          onClick={() => handleOpenCreate("idea")}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-semibold font-grotesk transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Nouveau post
        </button>
      </div>

      {/* Tableau Kanban */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 p-4 sm:p-6 overflow-x-auto min-h-[calc(100vh-60px-65px)] items-start snap-x snap-mandatory sm:snap-none pb-6">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              posts={getPostsByStatus(col.id)}
              onAddPost={() => handleOpenCreate(col.id)}
              onEditPost={handleOpenEdit}
              onDeletePost={handleDelete}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Modal création / édition */}
      <PostModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        post={editingPost}
        defaultStatus={defaultStatus}
        onSave={handleSave}
      />
    </>
  );
};

export default KanbanBoard;

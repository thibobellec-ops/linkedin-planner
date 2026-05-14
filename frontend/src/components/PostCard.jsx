import React, { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { deletePost } from "../api/posts";
import { FUNNEL_STYLES } from "./PostModal";

const STATUS_BADGE = {
  idea:      "bg-stone-100 text-stone-600 border-stone-200",
  draft:     "bg-blue-50 text-blue-700 border-blue-200",
  planned:   "bg-blue-50 text-blue-700 border-blue-200",
  published: "bg-green-50 text-green-700 border-green-200",
};

const STATUS_LABEL = {
  idea: "Idée", draft: "Brouillon", planned: "Planifié", published: "Publié",
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-");
  return new Date(+year, +month - 1, +day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

const PostCard = ({ post, index, onEdit, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [hovered, setHovered]       = useState(false);

  const funnelStyle = post.funnel_type ? FUNNEL_STYLES[post.funnel_type] : null;

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Supprimer le post "${post.title}" ?`)) return;
    setIsDeleting(true);
    try {
      await deletePost(post.id);
      onDelete();
    } catch (err) {
      console.error("Erreur suppression :", err);
      setIsDeleting(false);
    }
  };

  return (
    <Draggable draggableId={String(post.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`
            relative bg-white rounded-xl border-[1.5px] p-3 select-none
            transition-all duration-150
            ${snapshot.isDragging
              ? "border-accent shadow-lg shadow-accent/10 rotate-[1deg] scale-[1.02]"
              : "border-edge hover:border-stone-300"
            }
            ${isDeleting ? "opacity-40 pointer-events-none" : ""}
          `}
          style={provided.draggableProps.style}
        >
          {/* Titre */}
          <p className="font-grotesk text-sm font-medium text-ink leading-snug line-clamp-2 pr-12 mb-2.5">
            {post.title}
          </p>

          {/* Pied de carte */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium font-grotesk ${STATUS_BADGE[post.status]}`}>
              {STATUS_LABEL[post.status]}
            </span>

            {post.funnel_type && funnelStyle && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold font-grotesk ${funnelStyle.badge}`}>
                {post.funnel_type}
              </span>
            )}

            {post.visual_done ? (
              <span title="Visuel fait" className="text-[13px] leading-none">✅</span>
            ) : null}

            {post.planned_date && (
              <span className="text-[11px] text-ink-muted font-grotesk flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3" width="14" height="12" rx="2" stroke="#A8A29E" strokeWidth="1.5"/>
                  <path d="M1 7h14" stroke="#A8A29E" strokeWidth="1.5"/>
                  <path d="M5 1v3M11 1v3" stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {formatDate(post.planned_date)}
              </span>
            )}
          </div>

          {/* Actions au survol */}
          {hovered && !snapshot.isDragging && (
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                title="Modifier"
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border-[1.5px] border-edge hover:border-accent hover:text-accent text-ink-muted transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={handleDelete}
                title="Supprimer"
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border-[1.5px] border-edge hover:border-red-300 hover:text-red-500 text-ink-muted transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M6 4V2h4v2M5 4l1 9h4l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default PostCard;

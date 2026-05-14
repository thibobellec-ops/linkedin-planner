import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import PostCard from "./PostCard";

// Configuration visuelle par statut de colonne
const COLUMN_CONFIG = {
  idea: {
    dot: "bg-stone-400",
    label: "text-stone-600",
    count: "bg-stone-100 text-stone-500",
    addHover: "hover:border-stone-400 hover:text-stone-500",
    dropBg: "bg-stone-50",
  },
  draft: {
    dot: "bg-blue-400",
    label: "text-blue-700",
    count: "bg-blue-50 text-blue-600",
    addHover: "hover:border-blue-300 hover:text-blue-500",
    dropBg: "bg-blue-50/50",
  },
  planned: {
    dot: "bg-blue-500",
    label: "text-blue-700",
    count: "bg-blue-50 text-blue-600",
    addHover: "hover:border-accent hover:text-accent",
    dropBg: "bg-blue-50/50",
  },
  published: {
    dot: "bg-green-500",
    label: "text-green-700",
    count: "bg-green-50 text-green-600",
    addHover: "hover:border-green-400 hover:text-green-600",
    dropBg: "bg-green-50/50",
  },
};

/**
 * Colonne Kanban avec zone de dépôt et liste de cartes
 */
const KanbanColumn = ({ column, posts, onAddPost, onEditPost, onDeletePost }) => {
  const cfg = COLUMN_CONFIG[column.id];

  return (
    <div className={`flex flex-col w-[272px] flex-shrink-0 snap-start fade-up stagger-${column.stagger}`}>
      {/* En-tête de colonne */}
      <div className="flex items-center gap-2 px-1 mb-3">
        <span className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
        <h3 className={`font-grotesk text-sm font-semibold ${cfg.label}`}>
          {column.label}
        </h3>
        <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.count}`}>
          {posts.length}
        </span>
      </div>

      {/* Zone droppable */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              flex-1 flex flex-col gap-2 min-h-[120px] rounded-xl p-1.5 transition-colors duration-150
              ${snapshot.isDraggingOver ? cfg.dropBg : "bg-transparent"}
            `}
          >
            {posts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                index={index}
                onEdit={() => onEditPost(post)}
                onDelete={() => onDeletePost(post.id)}
              />
            ))}
            {provided.placeholder}

            {/* État vide */}
            {posts.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-20 rounded-xl border-[1.5px] border-dashed border-edge">
                <p className="text-xs text-ink-muted font-grotesk">Déposer ici</p>
              </div>
            )}
          </div>
        )}
      </Droppable>

      {/* Bouton "Nouveau post" */}
      <button
        onClick={onAddPost}
        className={`
          mt-2 w-full py-2 border-[1.5px] border-dashed border-edge rounded-xl
          text-sm font-medium font-grotesk text-ink-muted
          transition-colors duration-150 ${cfg.addHover}
        `}
      >
        + Nouveau post
      </button>
    </div>
  );
};

export default KanbanColumn;

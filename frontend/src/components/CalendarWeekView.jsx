import React from "react";

// ─── Utilitaires date ────────────────────────────────────────────────────────

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const getWeekDays = (date) => {
  const d = new Date(date);
  const dow = d.getDay(); // 0=dim, 1=lun…
  const diff = dow === 0 ? -6 : 1 - dow; // ramener au lundi
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
};

const isToday = (date) =>
  date.toDateString() === new Date().toDateString();

const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

// ─── Badge statut ────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  idea:      "bg-stone-100 text-stone-600 border-stone-200",
  draft:     "bg-blue-50 text-blue-700 border-blue-200",
  planned:   "bg-blue-50 text-blue-700 border-blue-200",
  published: "bg-green-50 text-green-700 border-green-200",
};
const STATUS_LABELS = {
  idea: "Idée", draft: "Brouillon", planned: "Planifié", published: "Publié",
};

// ─── Carte post dans le calendrier ───────────────────────────────────────────

const CalendarPostCard = ({ post, onClick }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(post); }}
    className={`
      w-full text-left px-2.5 py-2 rounded-lg border-[1.5px] bg-white
      hover:border-accent transition-colors group
      ${STATUS_STYLES[post.status]}
    `}
  >
    <p className="text-xs font-medium font-grotesk text-ink leading-snug line-clamp-2 group-hover:text-accent transition-colors">
      {post.title}
    </p>
    <span className={`mt-1 inline-block text-[10px] px-1.5 py-px rounded-full border font-medium ${STATUS_STYLES[post.status]}`}>
      {STATUS_LABELS[post.status]}
    </span>
  </button>
);

// ─── Colonne d'un jour ────────────────────────────────────────────────────────

const DayColumn = ({ date, posts, onSlotClick, onPostClick }) => {
  const today = isToday(date);
  const weekend = isWeekend(date);
  const dayIndex = (date.getDay() + 6) % 7; // 0=lun … 6=dim

  return (
    <div
      className={`flex flex-col flex-1 min-w-0 border-r border-edge last:border-r-0 ${weekend ? "bg-paper/60" : "bg-white"}`}
    >
      {/* En-tête du jour */}
      <div className={`px-3 py-2.5 border-b border-edge text-center ${weekend ? "opacity-60" : ""}`}>
        <p className="text-[11px] font-grotesk font-medium text-ink-muted uppercase tracking-wide">
          {DAY_LABELS[dayIndex]}
        </p>
        <p className={`text-xl font-fraunces font-bold mt-0.5 leading-none ${
          today
            ? "w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center mx-auto"
            : "text-ink"
        }`}>
          {date.getDate()}
        </p>
      </div>

      {/* Contenu — posts + zone cliquable */}
      <div
        className="flex-1 p-2 flex flex-col gap-1.5 cursor-pointer min-h-[120px]"
        onClick={() => onSlotClick(date)}
      >
        {posts.map((post) => (
          <CalendarPostCard key={post.id} post={post} onClick={onPostClick} />
        ))}

        {/* Indicateur d'ajout au hover */}
        {!weekend && (
          <div className="mt-auto pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-[11px] text-ink-muted font-grotesk text-center py-1 border border-dashed border-edge rounded-lg">
              + Ajouter
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Vue Semaine ─────────────────────────────────────────────────────────────

const CalendarWeekView = ({ currentDate, getPostsForDate, onSlotClick, onPostClick }) => {
  const days = getWeekDays(currentDate);

  return (
    /* Wrapper scrollable horizontalement sur mobile */
    <div className="overflow-x-auto mx-4 sm:mx-6 my-4">
      <div
        className="flex border border-edge rounded-xl overflow-hidden bg-white"
        style={{ minHeight: "calc(100vh - 180px)", minWidth: "560px" }}
      >
        {days.map((day) => (
          <DayColumn
            key={formatDateKey(day)}
            date={day}
            posts={getPostsForDate(day)}
            onSlotClick={onSlotClick}
            onPostClick={onPostClick}
          />
        ))}
      </div>
    </div>
  );
};

export default CalendarWeekView;

import React from "react";
import { formatDateKey } from "./CalendarWeekView";

// ─── Config ───────────────────────────────────────────────────────────────────

const DAY_HEADERS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const STATUS_DOT = {
  idea:      "bg-stone-400",
  draft:     "bg-blue-400",
  planned:   "bg-blue-500",
  published: "bg-green-500",
};

const STATUS_LABEL = {
  idea: "Idée", draft: "Brouillon", planned: "Planifié", published: "Publié",
};

const STATUS_PILL = {
  idea:      "bg-stone-100 text-stone-600",
  draft:     "bg-blue-50 text-blue-700",
  planned:   "bg-blue-50 text-blue-700",
  published: "bg-green-50 text-green-700",
};

// ─── Grille mensuelle ────────────────────────────────────────────────────────

const getMonthGrid = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);

  // Ramener au lundi précédant le 1er du mois
  const startDow = firstDay.getDay();
  const startOffset = startDow === 0 ? -6 : 1 - startDow;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() + startOffset);

  const days = [];
  const cursor = new Date(start);

  // Remplir jusqu'à la fin du mois et compléter la dernière semaine
  while (cursor <= lastDay || days.length % 7 !== 0) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
    if (days.length > 42) break; // max 6 semaines
  }

  return days;
};

const isToday = (date) => date.toDateString() === new Date().toDateString();
const isCurrentMonth = (date, ref) => date.getMonth() === ref.getMonth();
const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

// ─── Cellule d'un jour ───────────────────────────────────────────────────────

const DayCell = ({ date, posts, currentDate, onSlotClick, onPostClick }) => {
  const today       = isToday(date);
  const inMonth     = isCurrentMonth(date, currentDate);
  const weekend     = isWeekend(date);
  const MAX_VISIBLE = 3;

  return (
    <div
      className={`
        border-b border-r border-edge p-1.5 flex flex-col cursor-pointer
        transition-colors hover:bg-blue-50/30 group
        ${weekend ? "bg-paper/50" : ""}
        ${!inMonth ? "opacity-35" : ""}
      `}
      style={{ minHeight: 100 }}
      onClick={() => onSlotClick(date)}
    >
      {/* Numéro du jour */}
      <div className="flex justify-end mb-1">
        <span className={`
          text-xs font-grotesk font-semibold w-6 h-6 flex items-center justify-center rounded-full leading-none
          ${today ? "bg-accent text-white" : inMonth ? "text-ink" : "text-ink-muted"}
        `}>
          {date.getDate()}
        </span>
      </div>

      {/* Posts du jour */}
      <div className="flex flex-col gap-0.5 flex-1">
        {posts.slice(0, MAX_VISIBLE).map((post) => (
          <button
            key={post.id}
            onClick={(e) => { e.stopPropagation(); onPostClick(post); }}
            className={`
              w-full text-left px-1.5 py-0.5 rounded text-[11px] font-grotesk font-medium
              truncate transition-colors hover:opacity-80
              ${STATUS_PILL[post.status]}
            `}
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${STATUS_DOT[post.status]}`} />
            {post.title}
          </button>
        ))}

        {/* Indicateur "+N" si plus de posts */}
        {posts.length > MAX_VISIBLE && (
          <span className="text-[10px] font-grotesk text-ink-muted px-1">
            +{posts.length - MAX_VISIBLE} autres
          </span>
        )}

        {/* Indicateur d'ajout au hover */}
        {posts.length === 0 && inMonth && !weekend && (
          <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-accent font-grotesk">+ Ajouter</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Vue Mois ─────────────────────────────────────────────────────────────────

const CalendarMonthView = ({ currentDate, getPostsForDate, onSlotClick, onPostClick }) => {
  const days = getMonthGrid(currentDate);
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="mx-6 my-4 border border-edge rounded-xl overflow-hidden bg-white">
      {/* En-têtes des jours */}
      <div className="grid grid-cols-7 border-b border-edge bg-paper">
        {DAY_HEADERS.map((d, i) => (
          <div
            key={d}
            className={`py-2 text-center text-[11px] font-grotesk font-semibold uppercase tracking-wide ${
              i >= 5 ? "text-ink-muted" : "text-ink-light"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grille des semaines */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day) => (
            <DayCell
              key={formatDateKey(day)}
              date={day}
              posts={getPostsForDate(day)}
              currentDate={currentDate}
              onSlotClick={onSlotClick}
              onPostClick={onPostClick}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default CalendarMonthView;

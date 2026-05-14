import React from "react";

/**
 * Carte KPI — nombre en Fraunces bold + label + variation optionnelle
 */
const KpiCard = ({ label, value, sub, icon, accent = false }) => (
  <div className={`
    bg-white border-[1.5px] rounded-xl p-5 flex flex-col gap-1 fade-up
    ${accent ? "border-accent/40 bg-blue-50/30" : "border-edge"}
  `}>
    <div className="flex items-start justify-between">
      <p className="text-xs font-grotesk font-medium text-ink-muted uppercase tracking-wide">
        {label}
      </p>
      {icon && (
        <span className={`text-lg leading-none ${accent ? "text-accent" : "text-ink-muted"}`}>
          {icon}
        </span>
      )}
    </div>
    <p className={`font-fraunces text-3xl font-bold leading-none mt-1 ${accent ? "text-accent" : "text-ink"}`}>
      {value ?? "—"}
    </p>
    {sub && (
      <p className="text-xs font-grotesk text-ink-muted mt-0.5">{sub}</p>
    )}
  </div>
);

export default KpiCard;

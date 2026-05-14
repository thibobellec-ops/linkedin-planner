import React from "react";

const TABS = [
  { id: "pipeline",   label: "Pipeline"   },
  { id: "calendrier", label: "Calendrier" },
  { id: "posts",      label: "Posts"      },
  { id: "analytics",  label: "Analytics"  },
];

/**
 * Header fixe — logo + navigation par onglets
 */
const Header = ({ activeTab, onTabChange }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[60px] bg-white border-b border-1.5 border-edge flex items-center justify-between px-3 sm:px-6 gap-2">
      {/* Logo */}
      <div className="font-fraunces italic font-bold text-ink leading-none select-none flex-shrink-0">
        <span className="hidden sm:inline text-[22px]">LinkedIn Post Manager</span>
        <span className="sm:hidden text-[18px]">LI Manager</span>
      </div>

      {/* Navigation par onglets — scrollable sur mobile */}
      <nav className="flex items-stretch h-full gap-0.5 sm:gap-1 overflow-x-auto flex-shrink min-w-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative h-full px-3 sm:px-5 text-sm font-medium font-grotesk transition-colors flex-shrink-0 whitespace-nowrap
              ${
                activeTab === tab.id
                  ? "text-accent border-b-2 border-accent"
                  : "text-ink-light hover:text-ink"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
};

export default Header;

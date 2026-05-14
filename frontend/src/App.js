import React, { useState } from "react";
import Header from "./components/Header";
import KanbanBoard from "./components/KanbanBoard";
import CalendarView from "./components/CalendarView";
import AnalyticsView from "./components/AnalyticsView";
import PostsView from "./components/PostsView";

const App = () => {
  const [activeTab, setActiveTab] = useState("pipeline");

  return (
    <div className="min-h-screen font-grotesk">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="pt-[60px]">
        {activeTab === "pipeline"   && <KanbanBoard />}
        {activeTab === "calendrier" && <CalendarView />}
        {activeTab === "analytics"  && <AnalyticsView />}
        {activeTab === "posts"      && <PostsView />}
      </main>
    </div>
  );
};

export default App;

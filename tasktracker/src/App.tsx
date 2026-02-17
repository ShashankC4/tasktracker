import { useState, useEffect } from "react";
import "./App.css";
import { initDatabase } from "./db";
import ProjectsSidebar from "./components/ProjectsSidebar";
import KanbanBoard from "./components/KanbanBoard";

function App() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [scrollToTaskId, setScrollToTaskId] = useState<number | null>(null);

  useEffect(() => {
    initDatabase().then(() => {
      console.log("Database initialized");
    });
  }, []);

  function handleSelectProject(id: number | null) {
    setSelectedProjectId(id);
    setScrollToTaskId(null); // Reset scroll when switching projects
  }

  function handleSearchResultClick(projectId: number, taskId: number) {
    setSelectedProjectId(projectId);
    setScrollToTaskId(taskId);
  }

  return (
    <div className="app-container">
      <ProjectsSidebar
        selectedProjectId={selectedProjectId}
        onSelectProject={handleSelectProject}
        onSearchResultClick={handleSearchResultClick}
      />
      
      <div className="main-content">
        <KanbanBoard
          projectId={selectedProjectId}
          scrollToTaskId={scrollToTaskId}
        />
      </div>
      
      <div className="sidebar-right">
        <h2>WorkBuddy</h2>
        <p>AI chat coming soon...</p>
      </div>
    </div>
  );
}

export default App;
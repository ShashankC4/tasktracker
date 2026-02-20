import { useState, useEffect } from "react";
import "./App.css";
import { initDatabase } from "./db";
import ProjectsSidebar from "./components/ProjectsSidebar";
import KanbanBoard from "./components/KanbanBoard";
import WorkBuddy from "./components/WorkBuddy";

function App() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [scrollToTaskId, setScrollToTaskId] = useState<number | null>(null);
  
  // New State: Tracks if the AI Assistant is visible
  const [showWorkBuddy, setShowWorkBuddy] = useState(false);

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
        showWorkBuddy={showWorkBuddy} // Pass state
        onToggleWorkBuddy={() => setShowWorkBuddy(!showWorkBuddy)} // Pass toggle function
      />
      
      <div className="main-content">
        <KanbanBoard
          projectId={selectedProjectId}
          scrollToTaskId={scrollToTaskId}
        />
      </div>
      
      {/* Only show WorkBuddy if showWorkBuddy is true */}
      {showWorkBuddy && <WorkBuddy onClose={() => setShowWorkBuddy(false)} />}
    </div>
  );
}

export default App;
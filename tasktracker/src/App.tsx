import { useState, useEffect, useRef } from "react";
import "./App.css";
import { initDatabase } from "./db";
import ProjectsSidebar from "./components/ProjectsSidebar";
import KanbanBoard from "./components/KanbanBoard";
import WorkBuddy from "./components/WorkBuddy";

function App() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [scrollToTaskId, setScrollToTaskId] = useState<number | null>(null);
  const [showWorkBuddy, setShowWorkBuddy] = useState(false);
  const [workbuddyWidth, setWorkbuddyWidth] = useState(
    parseInt(localStorage.getItem("workbuddyWidth") || "300")
  );
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    initDatabase().then(() => {
      console.log("Database initialized");
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("workbuddyWidth", String(workbuddyWidth));
  }, [workbuddyWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 250;
      const maxWidth = window.innerWidth * 0.4; // 40% max
      setWorkbuddyWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  function handleSelectProject(id: number | null) {
    setSelectedProjectId(id);
    setScrollToTaskId(null);
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
        showWorkBuddy={showWorkBuddy}
        onToggleWorkBuddy={() => setShowWorkBuddy(!showWorkBuddy)}
      />
      
      <div className="main-content">
        <KanbanBoard
          projectId={selectedProjectId}
          scrollToTaskId={scrollToTaskId}
        />
      </div>
      
      {showWorkBuddy && (
        <>
          <div
            className="resize-handle"
            onMouseDown={() => setIsResizing(true)}
          />
          <div style={{ width: `${workbuddyWidth}px` }}>
            <WorkBuddy onClose={() => setShowWorkBuddy(false)} />
          </div>
        </>
      )}
    </div>
  );
}

export default App;
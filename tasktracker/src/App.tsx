import { useState, useEffect } from "react";
import "./App.css";
import { initDatabase } from "./db";
import ProjectsSidebar from "./components/ProjectsSidebar";
import KanbanBoard from "./components/KanbanBoard";

function App() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  useEffect(() => {
    initDatabase().then(() => {
      console.log("Database initialized");
    });
  }, []);

  return (
    <div className="app-container">
      <ProjectsSidebar 
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
      />
      
      <div className="main-content">
        <KanbanBoard projectId={selectedProjectId} />
      </div>
      
      <div className="sidebar-right">
        <h2>WorkBuddy</h2>
        <p>AI chat coming soon...</p>
      </div>
    </div>
  );
}

export default App;
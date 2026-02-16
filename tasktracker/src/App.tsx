import { useEffect } from "react";
import "./App.css";
import { initDatabase } from "./db";
import ProjectsSidebar from "./components/ProjectsSidebar";

function App() {
  useEffect(() => {
    initDatabase().then(() => {
      console.log("Database initialized");
    });
  }, []);

  return (
    <div className="app-container">
      <ProjectsSidebar />
      
      <div className="main-content">
        <h2>Kanban Board</h2>
        <p>Select a project to see tasks</p>
      </div>
      
      <div className="sidebar-right">
        <h2>WorkBuddy</h2>
        <p>AI chat coming soon...</p>
      </div>
    </div>
  );
}

export default App;
import { useEffect } from "react";
import "./App.css";
import { initDatabase } from "./db";

function App() {
  useEffect(() => {
    // Initialize database when app starts
    initDatabase().then(() => {
      console.log("Database initialized");
    });
  }, []);

  return (
    <div className="app-container">
      <div className="sidebar-left">
        <h2>Projects</h2>
      </div>
      
      <div className="main-content">
        <h2>Kanban Board</h2>
      </div>
      
      <div className="sidebar-right">
        <h2>WorkBuddy</h2>
      </div>
    </div>
  );
}

export default App;
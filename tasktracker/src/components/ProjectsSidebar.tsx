import { useState, useEffect } from "react";
import { getDatabase } from "../db";

interface Project {
  id: number;
  name: string;
  created_at: string;
}

export default function ProjectsSidebar() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // Load projects
  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const db = await getDatabase();
    const result = await db.select<Project[]>("SELECT * FROM projects ORDER BY created_at DESC");
    setProjects(result);
    
    // Auto-select first project if none selected
    if (result.length > 0 && !selectedProjectId) {
      setSelectedProjectId(result[0].id);
    }
  }

  async function createProject() {
    if (!newProjectName.trim()) return;
    
    const db = await getDatabase();
    await db.execute("INSERT INTO projects (name) VALUES (?)", [newProjectName]);
    
    setNewProjectName("");
    setIsCreating(false);
    loadProjects();
  }

  async function deleteProject(id: number) {
    if (!confirm("Delete this project? All tasks will be deleted.")) return;
    
    const db = await getDatabase();
    await db.execute("DELETE FROM projects WHERE id = ?", [id]);
    
    if (selectedProjectId === id) {
      setSelectedProjectId(null);
    }
    loadProjects();
  }

  return (
    <div className="projects-sidebar">
      <h2>Projects</h2>
      
      <div className="projects-list">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`project-item ${selectedProjectId === project.id ? "active" : ""}`}
            onClick={() => setSelectedProjectId(project.id)}
          >
            <span>{project.name}</span>
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                deleteProject(project.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {isCreating ? (
        <div className="create-project">
          <input
            type="text"
            placeholder="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && createProject()}
            autoFocus
          />
          <button onClick={createProject}>Create</button>
          <button onClick={() => setIsCreating(false)}>Cancel</button>
        </div>
      ) : (
        <button className="new-project-btn" onClick={() => setIsCreating(true)}>
          + New Project
        </button>
      )}
    </div>
  );
}
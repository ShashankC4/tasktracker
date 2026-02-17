import { useState, useEffect, useRef } from "react";
import { getDatabase } from "../db";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Project {
  id: number;
  name: string;
  order_index: number;
  created_at: string;
}

interface TaskSearchResult {
  id: number;
  title: string;
  project_id: number;
  project_name: string;
  status: string;
  priority: string;
}

interface ProjectsSidebarProps {
  selectedProjectId: number | null;
  onSelectProject: (id: number | null) => void;
  onSearchResultClick: (projectId: number, taskId: number) => void;
}

export default function ProjectsSidebar({ selectedProjectId, onSelectProject, onSearchResultClick }: ProjectsSidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TaskSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      searchTasks(searchQuery);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  async function loadProjects() {
    const db = await getDatabase();
    const result = await db.select<Project[]>(
      "SELECT * FROM projects ORDER BY order_index ASC, created_at ASC"
    );
    setProjects(result);

    if (result.length > 0 && !selectedProjectId) {
      onSelectProject(result[0].id);
    }
  }

  async function searchTasks(query: string) {
    setIsSearching(true);
    const db = await getDatabase();
    const results = await db.select<TaskSearchResult[]>(
      `SELECT t.id, t.title, t.project_id, t.status, t.priority, p.name as project_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE t.title LIKE ?
       ORDER BY t.created_at DESC
       LIMIT 20`,
      [`%${query}%`]
    );
    setSearchResults(results);
  }

  function handleSearchResultClick(result: TaskSearchResult) {
    onSelectProject(result.project_id);
    onSearchResultClick(result.project_id, result.id);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  }

  async function createProject() {
    if (!newProjectName.trim()) return;

    const db = await getDatabase();
    const maxOrder = projects.length > 0
      ? Math.max(...projects.map(p => p.order_index)) + 1
      : 0;

    await db.execute(
      "INSERT INTO projects (name, order_index) VALUES (?, ?)",
      [newProjectName, maxOrder]
    );

    setNewProjectName("");
    setIsCreating(false);
    loadProjects();
  }

  async function deleteProject(id: number) {
    if (!confirm("Delete this project? All tasks will be deleted.")) return;

    const db = await getDatabase();
    await db.execute("DELETE FROM projects WHERE id = ?", [id]);

    if (selectedProjectId === id) {
      const remaining = projects.filter(p => p.id !== id);
      onSelectProject(remaining[0]?.id || null);
    }
    loadProjects();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = projects.findIndex(p => p.id === Number(active.id));
    const newIndex = projects.findIndex(p => p.id === Number(over.id));

    const reordered = arrayMove(projects, oldIndex, newIndex);
    setProjects(reordered);

    const db = await getDatabase();
    for (let i = 0; i < reordered.length; i++) {
      await db.execute(
        "UPDATE projects SET order_index = ? WHERE id = ?",
        [i, reordered[i].id]
      );
    }
  }

  return (
    <div className="projects-sidebar">

      {/* Search Bar */}
      <div className="search-container" ref={searchRef}>
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Search Results Dropdown */}
        {searchQuery.length > 1 && (
          <div className="search-results">
            {searchResults.length === 0 ? (
              <div className="search-no-results">No tasks found</div>
            ) : (
              searchResults.map((result) => (
                <div
                  key={result.id}
                  className="search-result-item"
                  onClick={() => handleSearchResultClick(result)}
                >
                  <div className="search-result-title">{result.title}</div>
                  <div className="search-result-meta">
                    <span className="search-result-project">{result.project_name}</span>
                    <span className={`search-result-priority priority-${result.priority.toLowerCase()}`}>
                      {result.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Projects List */}
      <h2>Projects</h2>

      <div className="projects-list">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={projects.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {projects.map((project) => (
              <SortableProject
                key={project.id}
                project={project}
                isActive={selectedProjectId === project.id}
                onSelect={() => onSelectProject(project.id)}
                onDelete={() => deleteProject(project.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
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

// Sortable Project Item
function SortableProject({
  project,
  isActive,
  onSelect,
  onDelete,
}: {
  project: Project;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`project-item ${isActive ? "active" : ""}`}
      onClick={onSelect}
    >
      <span
        className="drag-handle"
        {...listeners}
        {...attributes}
        onClick={(e) => e.stopPropagation()}
      >
        ⠿
      </span>
      <span className="project-name">{project.name}</span>
      <button
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        ×
      </button>
    </div>
  );
}
import { useState, useEffect } from "react";
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
  sortableKeyboardCoordinates,
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

interface ProjectsSidebarProps {
  selectedProjectId: number | null;
  onSelectProject: (id: number | null) => void;
}

export default function ProjectsSidebar({ selectedProjectId, onSelectProject }: ProjectsSidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

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

  async function createProject() {
    if (!newProjectName.trim()) return;

    const db = await getDatabase();

    // Set order_index to last position
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

    // Reorder array
    const reordered = arrayMove(projects, oldIndex, newIndex);
    setProjects(reordered); // Optimistic update

    // Save new order to DB
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
      {/* Drag handle */}
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
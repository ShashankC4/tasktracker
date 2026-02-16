import { useState, useEffect } from "react";
import { getDatabase } from "../db";
import TaskModal from "./TaskModal";

interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: string;
  blocker: string | null;
  priority: string;
  assigned_date: string;
  start_date: string | null;
  end_date: string | null;
}

interface KanbanBoardProps {
  projectId: number | null;
}

const STATUSES = [
  "Not Started",
  "Started",
  "Code Changed",
  "Local Tested",
  "Beta Testing",
  "PR Raised",
  "Prod Deployed"
];

export default function KanbanBoard({ projectId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadTasks();
    }
  }, [projectId]);

  async function loadTasks() {
    if (!projectId) return;
    
    const db = await getDatabase();
    const result = await db.select<Task[]>(
      "SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC",
      [projectId]
    );
    setTasks(result);
  }

  function getTasksByStatus(status: string) {
    return tasks.filter(task => task.status === status);
  }

  function openCreateModal(status: string) {
    setNewTaskStatus(status);
    setEditingTaskId(null);
    setIsModalOpen(true);
  }

  function openEditModal(taskId: number) {
    setEditingTaskId(taskId);
    setNewTaskStatus(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingTaskId(null);
    setNewTaskStatus(null);
  }

  function handleSave() {
    loadTasks();
  }

  if (!projectId) {
    return (
      <div className="kanban-board">
        <p>Select a project to view tasks</p>
      </div>
    );
  }

  return (
    <div className="kanban-board">
      <div className="kanban-columns">
        {STATUSES.map((status) => {
          const statusTasks = getTasksByStatus(status);
          
          return (
            <div key={status} className="kanban-column">
              <div className="column-header">
                <h3>{status}</h3>
                <span className="task-count">{statusTasks.length}</span>
              </div>
              
              <div className="column-tasks">
                {statusTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="task-card"
                    onClick={() => openEditModal(task.id)}
                  >
                    <div className="task-header">
                      <span className={`priority-indicator ${task.priority.toLowerCase()}`}></span>
                      <h4>{task.title}</h4>
                    </div>
                    {task.blocker && (
                      <div className="task-blocker">
                        🚫 {task.blocker}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <button 
                className="add-task-btn"
                onClick={() => openCreateModal(status)}
              >
                + Add Task
              </button>
            </div>
          );
        })}
      </div>

      {isModalOpen && projectId && (
        <TaskModal
          projectId={projectId}
          taskId={editingTaskId}
          defaultStatus={newTaskStatus || undefined}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { getDatabase } from "../db";
import TaskModal from "./TaskModal";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";

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
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

  function handleDragStart(event: any) {
    const task = tasks.find(t => t.id === Number(event.active.id));
    setActiveTask(task || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = Number(active.id);
    const newStatus = String(over.id);

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const db = await getDatabase();
    
    let updateQuery = "UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP";
    let params: any[] = [newStatus];

    if (newStatus === "Started" && !task.start_date) {
      updateQuery += ", start_date = CURRENT_TIMESTAMP";
    }

    if (newStatus === "Prod Deployed" && !task.end_date) {
      updateQuery += ", end_date = CURRENT_TIMESTAMP";
    }

    updateQuery += " WHERE id = ?";
    params.push(taskId);

    await db.execute(updateQuery, params);
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
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        <div className="kanban-columns">
          {STATUSES.map((status) => {
            const statusTasks = getTasksByStatus(status);
            
            return (
              <DroppableColumn key={status} id={status}>
                <div className="column-header">
                  <h3>{status}</h3>
                  <span className="task-count">{statusTasks.length}</span>
                </div>
                
                <div className="column-tasks">
                  {statusTasks.map((task) => (
                    <DraggableTask
                      key={task.id}
                      task={task}
                      onEdit={() => openEditModal(task.id)}
                    />
                  ))}
                </div>
                
                <button 
                  className="add-task-btn"
                  onClick={() => openCreateModal(status)}
                >
                  + Add Task
                </button>
              </DroppableColumn>
            );
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="task-card task-card-dragging">
            <div className="task-header">
              <span className={`priority-indicator ${activeTask.priority.toLowerCase()}`}></span>
              <h4>{activeTask.title}</h4>
            </div>
            {activeTask.blocker && (
              <div className="task-blocker">
                🚫 {activeTask.blocker}
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>

      {isModalOpen && projectId && (
        <TaskModal
          projectId={projectId}
          taskId={editingTaskId}
          defaultStatus={newTaskStatus || undefined}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </DndContext>
  );
}

// Droppable Column
function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  
  return (
    <div ref={setNodeRef} className="kanban-column">
      {children}
    </div>
  );
}

// Draggable Task
function DraggableTask({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="task-card"
      onClick={onEdit}
      style={{ 
        opacity: isDragging ? 0.3 : 1,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
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
  );
}
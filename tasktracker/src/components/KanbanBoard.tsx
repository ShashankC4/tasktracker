import { useState, useEffect, useRef } from "react";
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
  DragStartEvent,
  useDroppable,  // Add this
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  order_index: number;
}

interface KanbanBoardProps {
  projectId: number | null;
  scrollToTaskId: number | null;
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

const STARTED_STATUSES = [
  "Started",
  "Code Changed",
  "Local Tested",
  "Beta Testing",
  "PR Raised",
  "Prod Deployed"
];

export default function KanbanBoard({ projectId, scrollToTaskId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [scrollPositions, setScrollPositions] = useState<Record<number, number>>({});
  const kanbanRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    return () => {
      if (projectId && kanbanRef.current) {
        setScrollPositions(prev => ({
          ...prev,
          [projectId]: kanbanRef.current!.scrollLeft
        }));
      }
    };
  }, [projectId]);

  useEffect(() => {
    if (projectId && kanbanRef.current) {
      const savedPosition = scrollPositions[projectId] || 0;
      kanbanRef.current.scrollLeft = savedPosition;
    }
  }, [projectId]);

  useEffect(() => {
    if (!scrollToTaskId) return;

    const taskElement = document.getElementById(`task-${scrollToTaskId}`);
    if (taskElement) {
      taskElement.scrollIntoView({ behavior: "smooth", block: "center" });
      taskElement.classList.add("task-highlight");
      setTimeout(() => {
        taskElement.classList.remove("task-highlight");
      }, 2000);
    }
  }, [scrollToTaskId, tasks]);

  async function loadTasks() {
    if (!projectId) return;

    const db = await getDatabase();
    const result = await db.select<Task[]>(
      `SELECT * FROM tasks 
       WHERE project_id = ? 
       AND (
         status != 'Prod Deployed' 
         OR (
           status = 'Prod Deployed' 
           AND (
             end_date IS NULL
             OR end_date >= datetime('now', '-7 days')
           )
         )
       )
       ORDER BY order_index ASC, created_at DESC`,
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

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find(t => t.id === Number(event.active.id));
    setActiveTask(task || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = Number(active.id);
    const overId = String(over.id);
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;

    // Check if dropped on a status column (moving between columns)
    if (STATUSES.includes(overId)) {
      const newStatus = overId;
      if (task.status !== newStatus) {
        await moveTaskToColumn(taskId, task, newStatus);
      }
      return;
    }

    // Check if dropped on another task
    const overTask = tasks.find(t => t.id === Number(overId));
    
    if (overTask) {
      // If same status, reorder within column
      if (task.status === overTask.status) {
        const statusTasks = getTasksByStatus(task.status);
        const oldIndex = statusTasks.findIndex(t => t.id === taskId);
        const newIndex = statusTasks.findIndex(t => t.id === Number(overId));

        if (oldIndex !== newIndex) {
          const reordered = arrayMove(statusTasks, oldIndex, newIndex);
          
          const db = await getDatabase();
          for (let i = 0; i < reordered.length; i++) {
            await db.execute(
              "UPDATE tasks SET order_index = ? WHERE id = ?",
              [i, reordered[i].id]
            );
          }
          loadTasks();
        }
      } else {
        // Different status, move to that column
        await moveTaskToColumn(taskId, task, overTask.status);
      }
    }
  }

  async function moveTaskToColumn(taskId: number, task: Task, newStatus: string) {
    const db = await getDatabase();

    let updateQuery = "UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP";
    let params: any[] = [newStatus];

    if (STARTED_STATUSES.includes(newStatus) && !task.start_date) {
      updateQuery += ", start_date = CURRENT_TIMESTAMP";
    }

    if (newStatus === "Prod Deployed" && !task.end_date) {
      updateQuery += ", end_date = CURRENT_TIMESTAMP";
    }

    // Reset order_index when moving to new column
    const targetTasks = getTasksByStatus(newStatus);
    const maxOrder = targetTasks.length > 0 
      ? Math.max(...targetTasks.map(t => t.order_index)) + 1 
      : 0;
    
    updateQuery += ", order_index = ?";
    params.push(maxOrder);

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
      <div className="kanban-board" ref={kanbanRef}>
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
                  <SortableContext
                    items={statusTasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {statusTasks.map((task) => (
                      <SortableTask
                        key={task.id}
                        task={task}
                        onEdit={() => openEditModal(task.id)}
                      />
                    ))}
                  </SortableContext>
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

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="kanban-column">
      {children}
    </div>
  );
}

function SortableTask({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      id={`task-${task.id}`}
      {...listeners}
      {...attributes}
      className={`task-card priority-${task.priority.toLowerCase()}`}
      onClick={onEdit}
      style={style}
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
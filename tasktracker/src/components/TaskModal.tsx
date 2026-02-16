import { useState, useEffect } from "react";
import { getDatabase } from "../db";

interface TaskModalProps {
  projectId: number;
  taskId?: number | null;
  onClose: () => void;
  onSave: () => void;
}

export default function TaskModal({ projectId, taskId, onClose, onSave }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Not Started");
  const [priority, setPriority] = useState("Medium");
  const [blocker, setBlocker] = useState("");

  const STATUSES = [
    "Not Started",
    "Started",
    "Code Changed",
    "Local Tested",
    "Beta Testing",
    "PR Raised",
    "Prod Deployed"
  ];

  const PRIORITIES = ["High", "Medium", "Low"];

  useEffect(() => {
    if (taskId) {
      loadTask();
    }
  }, [taskId]);

  async function loadTask() {
    if (!taskId) return;
    
    const db = await getDatabase();
    const result = await db.select(
      "SELECT * FROM tasks WHERE id = ?",
      [taskId]
    );
    
    if (result.length > 0) {
      const task = result[0];
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      setPriority(task.priority);
      setBlocker(task.blocker || "");
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    const db = await getDatabase();

    if (taskId) {
      // Update existing task
      await db.execute(
        `UPDATE tasks SET 
          title = ?, 
          description = ?, 
          status = ?, 
          priority = ?, 
          blocker = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [title, description, status, priority, blocker, taskId]
      );
    } else {
      // Create new task
      await db.execute(
        `INSERT INTO tasks (project_id, title, description, status, priority, blocker) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [projectId, title, description, status, priority, blocker]
      );
    }

    onSave();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{taskId ? "Edit Task" : "New Task"}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description (optional)"
              rows={4}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Blocker</label>
            <input
              type="text"
              value={blocker}
              onChange={(e) => setBlocker(e.target.value)}
              placeholder="What's blocking this task? (optional)"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Task</button>
        </div>
      </div>
    </div>
  );
}
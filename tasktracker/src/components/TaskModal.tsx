import { useState, useEffect } from "react";
import { getDatabase } from "../db";

interface TaskModalProps {
  projectId: number;
  taskId?: number | null;
  defaultStatus?: string;
  onClose: () => void;
  onSave: () => void;
}

export default function TaskModal({ projectId, taskId, defaultStatus, onClose, onSave }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(defaultStatus || "Not Started");
  const [priority, setPriority] = useState("Medium");
  const [blocker, setBlocker] = useState("");
  const [assignedDate, setAssignedDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

  const STARTED_STATUSES = [
    "Started",
    "Code Changed",
    "Local Tested",
    "Beta Testing",
    "PR Raised",
    "Prod Deployed"
  ];

  useEffect(() => {
    if (taskId) {
      loadTask();
    }
  }, [taskId]);

  function formatDateForInput(dateStr: string | null): string {
    if (!dateStr) return "";
    // Handle both ISO format and SQLite format
    return dateStr.split('T')[0].split(' ')[0];
  }

  async function loadTask() {
    if (!taskId) return;

    const db = await getDatabase();
    const result = await db.select<any[]>(
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
      setAssignedDate(formatDateForInput(task.assigned_date));
      setStartDate(formatDateForInput(task.start_date));
      setEndDate(formatDateForInput(task.end_date));
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    const db = await getDatabase();
    const now = new Date().toISOString();

    if (taskId) {
      // Update existing task
      await db.execute(
        `UPDATE tasks SET 
          title = ?, 
          description = ?, 
          status = ?, 
          priority = ?, 
          blocker = ?,
          assigned_date = ?,
          start_date = ?,
          end_date = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          title,
          description,
          status,
          priority,
          blocker || null,
          assignedDate || null,
          startDate || null,
          endDate || null,
          taskId
        ]
      );
    } else {
      // Auto-set dates based on status when creating
      const autoStartDate = STARTED_STATUSES.includes(status) ? now : null;
      const autoEndDate = status === "Prod Deployed" ? now : null;

      await db.execute(
        `INSERT INTO tasks (project_id, title, description, status, priority, blocker, start_date, end_date) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          title,
          description,
          status,
          priority,
          blocker || null,
          autoStartDate,
          autoEndDate
        ]
      );
    }

    onSave();
    onClose();
  }

  async function handleDelete() {
    if (!taskId) return;
    if (!confirm("Delete this task?")) return;

    const db = await getDatabase();
    await db.execute("DELETE FROM tasks WHERE id = ?", [taskId]);

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
              rows={3}
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

          {/* Dates */}
          <div className="form-row">
            <div className="form-group">
              <label>Assigned Date</label>
              <input
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={status !== "Prod Deployed"}
              style={{
                opacity: status !== "Prod Deployed" ? 0.5 : 1,
                cursor: status !== "Prod Deployed" ? 'not-allowed' : 'pointer'
              }}
            />
            {status !== "Prod Deployed" && (
              <small style={{ color: '#7d8590', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                Only editable when status is Prod Deployed
              </small>
            )}
          </div>
        </div>

        <div className="modal-footer">
          {taskId && (
            <button className="btn-delete" onClick={handleDelete}>Delete</button>
          )}
          <div style={{ flex: 1 }}></div>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Task</button>
        </div>
      </div>
    </div>
  );
}
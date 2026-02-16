import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function initDatabase() {
  if (db) return db;

  // Create/open database
  db = await Database.load("sqlite:tasktracker.db");

  // Create projects table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create tasks table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'Not Started',
      blocker TEXT,
      priority TEXT DEFAULT 'Medium',
      assigned_date TEXT DEFAULT CURRENT_TIMESTAMP,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  return db;
}

export async function getDatabase() {
  if (!db) {
    await initDatabase();
  }
  return db!;
}
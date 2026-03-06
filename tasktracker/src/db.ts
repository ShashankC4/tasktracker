import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function initDatabase() {
  if (db) return db;

  db = await Database.load("sqlite:tasktracker.db");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'Not Started',
      blocker TEXT,
      priority TEXT DEFAULT 'Low',
      assigned_date TEXT DEFAULT CURRENT_TIMESTAMP,
      start_date TEXT,
      end_date TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Migration: Add order_index to existing tasks if it doesn't exist
  try {
    await db.execute(`
      ALTER TABLE tasks ADD COLUMN order_index INTEGER DEFAULT 0
    `);
  } catch (e) {
    // Column already exists, ignore
  }

  return db;
}

export async function getDatabase() {
  if (!db) {
    await initDatabase();
  }
  return db!;
}
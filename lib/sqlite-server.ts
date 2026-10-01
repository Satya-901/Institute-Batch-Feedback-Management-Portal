import { createRequire } from 'module';
import type { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const initSqlJs = require('sql.js');

let dbInstance: Database | null = null;
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'edupulse.sqlite');

export async function getSqliteDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs({
    // If wasm location needed in node:
    locateFile: (file: string) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
  });

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Error loading existing sqlite file, creating new:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  const db: Database = dbInstance as Database;
  // Initialize SQLite schema
  initSchema(db);
  saveDatabase(db);

  return db;
}

export function saveDatabase(db: Database) {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to save sqlite database to disk:', err);
  }
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      department TEXT,
      academicYear TEXT,
      description TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      classId TEXT NOT NULL,
      name TEXT NOT NULL,
      timing TEXT,
      roomNumber TEXT,
      maxCapacity INTEGER,
      academicYear TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      subjectSpecialization TEXT,
      assignedBatchIds TEXT,
      status TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      studentId TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      dob TEXT NOT NULL,
      password TEXT,
      hasChangedPassword INTEGER DEFAULT 0,
      batchId TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedback_forms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      batchId TEXT NOT NULL,
      teacherId TEXT,
      questions TEXT NOT NULL,
      status TEXT NOT NULL,
      expiresAt TEXT,
      shareableCode TEXT UNIQUE NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedback_responses (
      id TEXT PRIMARY KEY,
      formId TEXT NOT NULL,
      batchId TEXT NOT NULL,
      studentId TEXT NOT NULL,
      studentName TEXT NOT NULL,
      teacherId TEXT,
      answers TEXT NOT NULL,
      submittedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_user (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL
    );
  `);

  try {
    db.run("ALTER TABLE feedback_responses ADD COLUMN teacherId TEXT");
  } catch {
    // Column already exists
  }

  // Default admin login if not exists (username: admin, password: admin)
  const res = db.exec("SELECT username FROM admin_user WHERE username = 'admin'");
  if (!res.length || !res[0].values.length) {
    db.run("INSERT INTO admin_user (username, password) VALUES ('admin', 'admin123')");
  }
}

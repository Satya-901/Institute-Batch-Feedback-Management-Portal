import { Pool, PoolConfig } from 'pg';
import { getSqliteDb, saveDatabase } from './sqlite-server';

let pgPool: Pool | null = null;
let pgConnected: boolean = false;
let connectionAttempted: boolean = false;

// Check if PostgreSQL is available and configured
export async function getPostgresPool(): Promise<Pool | null> {
  if (connectionAttempted) {
    return pgConnected ? pgPool : null;
  }

  connectionAttempted = true;
  const dbUrl = process.env.DATABASE_URL;

  // If no Postgres URL or explicitly configured as sqlite, return null
  if (!dbUrl || (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://'))) {
    return null;
  }

  try {
    const config: PoolConfig = {
      connectionString: dbUrl,
      connectionTimeoutMillis: 3000,
      query_timeout: 5000,
      ssl:
        process.env.DATABASE_SSL === 'true' ||
        dbUrl.includes('sslmode=require') ||
        dbUrl.includes('neon.tech') ||
        dbUrl.includes('supabase.co')
          ? { rejectUnauthorized: false }
          : false,
    };

    const pool = new Pool(config);

    // Test connection with short timeout
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    pgPool = pool;
    pgConnected = true;

    // Initialize Postgres tables
    await initPostgresSchema(pool);
    console.log('[Database] Successfully connected to PostgreSQL SQL Database');
    return pgPool;
  } catch (err: any) {
    console.warn(
      '[Database] PostgreSQL connection failed, gracefully falling back to local SQLite engine:',
      err.message
    );
    pgConnected = false;
    if (pgPool) {
      try {
        await pgPool.end();
      } catch {
        // Ignore cleanup error
      }
      pgPool = null;
    }
    return null;
  }
}

async function initPostgresSchema(pool: Pool) {
  const schemaQuery = `
    CREATE TABLE IF NOT EXISTS classes (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) NOT NULL,
      department VARCHAR(255),
      academic_year VARCHAR(100),
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS batches (
      id VARCHAR(255) PRIMARY KEY,
      class_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      timing VARCHAR(255),
      room_number VARCHAR(100),
      max_capacity INTEGER DEFAULT 40,
      academic_year VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id VARCHAR(255) PRIMARY KEY,
      employee_id VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(100),
      subject_specialization JSONB DEFAULT '[]'::jsonb,
      assigned_batch_ids JSONB DEFAULT '[]'::jsonb,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id VARCHAR(255) PRIMARY KEY,
      student_id VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      dob VARCHAR(50) NOT NULL,
      password VARCHAR(255),
      has_changed_password BOOLEAN DEFAULT FALSE,
      batch_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS feedback_forms (
      id VARCHAR(255) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      class_id VARCHAR(255),
      batch_id VARCHAR(255) NOT NULL,
      teacher_id VARCHAR(255),
      questions JSONB NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      expires_at TIMESTAMP WITH TIME ZONE,
      shareable_code VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS feedback_responses (
      id VARCHAR(255) PRIMARY KEY,
      form_id VARCHAR(255) NOT NULL,
      class_id VARCHAR(255),
      batch_id VARCHAR(255) NOT NULL,
      student_id VARCHAR(100) NOT NULL,
      student_name VARCHAR(255) NOT NULL,
      teacher_id VARCHAR(255),
      answers JSONB NOT NULL,
      total_score NUMERIC(10, 2) DEFAULT 0,
      max_possible_score NUMERIC(10, 2) DEFAULT 0,
      score_percentage NUMERIC(5, 2) DEFAULT 0,
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_user (
      username VARCHAR(100) PRIMARY KEY,
      password VARCHAR(255) NOT NULL
    );

    INSERT INTO admin_user (username, password)
    VALUES ('admin', 'adminpassword123')
    ON CONFLICT (username) DO NOTHING;
  `;

  await pool.query(schemaQuery);
}

export async function getActiveDatabaseInfo() {
  const pool = await getPostgresPool();
  if (pool && pgConnected) {
    return {
      type: 'PostgreSQL',
      status: 'Connected',
      host: process.env.DATABASE_HOST || 'configured-in-DATABASE_URL',
      database: process.env.DATABASE_NAME || 'configured-in-DATABASE_URL',
    };
  }

  return {
    type: 'SQLite',
    status: 'Active (Local SQL Database)',
    filePath: process.env.SQLITE_DB_PATH || './data/edupulse.sqlite',
  };
}

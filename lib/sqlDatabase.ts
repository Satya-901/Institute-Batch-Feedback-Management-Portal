/**
 * Obsolete SQL database wrapper - preserved as a clean shim for builds.
 * Application storage is now powered by lib/server-file-db.ts.
 */
import { getSqliteDb, saveDatabase } from './sqlite-server';
import { getServerDatabase } from './server-file-db';

export { getSqliteDb, saveDatabase };

export async function query(_sql: string, _params?: any[]): Promise<any> {
  const db = await getServerDatabase();
  return { rows: [], db };
}

export async function getDatabase(): Promise<any> {
  return await getServerDatabase();
}

export async function getActiveDatabaseInfo(): Promise<{
  type: string;
  status: string;
  classesCount: number;
  batchesCount: number;
  teachersCount: number;
  studentsCount: number;
  formsCount: number;
  responsesCount: number;
  lastUpdated: string;
}> {
  const db = await getServerDatabase();
  return {
    type: 'server-file-db',
    status: 'connected',
    classesCount: db.classes?.length || 0,
    batchesCount: db.batches?.length || 0,
    teachersCount: db.teachers?.length || 0,
    studentsCount: db.students?.length || 0,
    formsCount: db.forms?.length || 0,
    responsesCount: db.responses?.length || 0,
    lastUpdated: db.lastUpdated || new Date().toISOString(),
  };
}

const sqlDatabase = {
  query,
  getDatabase,
  getSqliteDb,
  saveDatabase,
  getActiveDatabaseInfo,
};

export default sqlDatabase;

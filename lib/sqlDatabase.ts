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

const sqlDatabase = {
  query,
  getDatabase,
  getSqliteDb,
  saveDatabase,
};

export default sqlDatabase;

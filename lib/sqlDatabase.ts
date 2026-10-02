/**
 * SQLite Database Module
 * Server-side SQLite persistence powered by lib/sqlite-server.ts
 */
import {
  getSqliteDb,
  saveDatabase,
  getAllData,
  getActiveDatabaseInfo,
} from './sqlite-server';

export { getSqliteDb, saveDatabase, getAllData, getActiveDatabaseInfo };

export async function getDatabase(): Promise<any> {
  return await getAllData();
}

const sqlDatabase = {
  getSqliteDb,
  saveDatabase,
  getAllData,
  getActiveDatabaseInfo,
  getDatabase,
};

export default sqlDatabase;

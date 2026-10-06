/**
 * Unified SQL Database Module
 * Primary: MySQL / phpMyAdmin localhost
 * Hot Standby / Fallback: Server SQLite
 */
import {
  getAllData,
  getActiveDatabaseInfo,
  isMysqlConnected,
} from './db-manager';

import {
  getSqliteDb,
  saveDatabase,
} from './sqlite-server';

export {
  getAllData,
  getActiveDatabaseInfo,
  isMysqlConnected,
  getSqliteDb,
  saveDatabase,
};

export async function getDatabase(): Promise<any> {
  return await getAllData();
}

const sqlDatabase = {
  getAllData,
  getActiveDatabaseInfo,
  isMysqlConnected,
  getSqliteDb,
  saveDatabase,
  getDatabase,
};

export default sqlDatabase;

/**
 * Compatibility shim for legacy sqlite-server imports.
 * The application has migrated from SQLite to server-side JSON file persistence (lib/server-file-db.ts).
 */
import { getServerDatabase, writeServerDatabase } from './server-file-db';

export async function getSqliteDb(): Promise<any> {
  // Returns safe dummy db interface or server database
  const serverDb = await getServerDatabase();
  return {
    exec: () => [],
    run: () => {},
    export: () => new Uint8Array(),
    serverDb,
  };
}

export function saveDatabase(_db?: any): void {
  // Persistence is handled automatically by lib/server-file-db.ts
}

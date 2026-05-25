import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function initDatabase(): void {
  const sqlPath = join(__dirname, 'migrations/001_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  db.exec(sql);
}

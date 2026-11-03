import {DatabaseSync} from 'node:sqlite';
import {readFileSync, readdirSync, mkdirSync} from 'node:fs';
import path from 'node:path';
const target = process.env.CTRL_LOCAL_DB ?? path.resolve('.sites-runtime/ctrl.sqlite');
mkdirSync(path.dirname(target), {recursive: true});
const db = new DatabaseSync(target);
try {
  db.exec('PRAGMA foreign_keys=ON;CREATE TABLE IF NOT EXISTS ctrl_migrations(name TEXT PRIMARY KEY)');
  for (const name of readdirSync('drizzle').filter(n => n.endsWith('.sql')).sort()) {
    if (db.prepare('SELECT name FROM ctrl_migrations WHERE name=?').get(name)) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(readFileSync(path.join('drizzle', name), 'utf8'));
      if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('FOREIGN_KEY_VALIDATION_FAILED');
      const integrity = db.prepare('PRAGMA integrity_check').all();
      if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') throw new Error('DATABASE_INTEGRITY_FAILED');
      db.prepare('INSERT INTO ctrl_migrations(name) VALUES(?)').run(name);
      db.exec('COMMIT');
      console.log(`Applied ${name}`);
    } catch (error) {db.exec('ROLLBACK'); throw error;}
  }
} finally {db.close();}

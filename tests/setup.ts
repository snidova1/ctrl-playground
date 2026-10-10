import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Setup runs before each isolated test file imports the local database adapter.
const directory = mkdtempSync(path.join(process.env.CTRL_TEST_DB_ROOT ?? tmpdir(), "ctrl-suite-"));
const target = path.join(directory, "test.sqlite");
process.env.CTRL_LOCAL_DB = target;
// Do not unlink databases in teardown: adapter connections may still be open.
const db = new DatabaseSync(target);
try {
  db.exec("PRAGMA foreign_keys=ON;CREATE TABLE ctrl_migrations(name TEXT PRIMARY KEY)");
  for (const file of readdirSync("drizzle").filter(name => name.endsWith(".sql")).sort()) {
    db.exec("BEGIN");
    try {
      db.exec(readFileSync(path.join("drizzle", file), "utf8"));
      db.prepare("INSERT INTO ctrl_migrations(name) VALUES(?)").run(file);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
} finally {
  db.close();
}

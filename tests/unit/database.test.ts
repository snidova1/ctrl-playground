import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import path from "node:path";
import { batch, exec, query, statement } from "@/db";

beforeAll(async () => {
  await exec("CREATE TEMP TABLE local_batch_test (id TEXT PRIMARY KEY, value INTEGER NOT NULL CHECK(value >= 0))");
});

beforeEach(async () => {
  await exec("DELETE FROM local_batch_test");
});

afterAll(async () => {
  await exec("DROP TABLE local_batch_test");
});

function rows() {
  return query<{ id: string; value: number }>("SELECT id,value FROM local_batch_test ORDER BY id");
}

describe("local SQLite D1 batches", () => {
  it("uses a migrated per-file database inside this run's temporary directory", async () => {
    const databases = await query<{ name: string; file: string }>("PRAGMA database_list");
    const main = databases.find(database => database.name === "main")!;
    expect(main.file).toBe(process.env.CTRL_LOCAL_DB);
    expect(path.dirname(path.dirname(main.file))).toBe(process.env.CTRL_TEST_DB_ROOT);
    expect(path.basename(path.dirname(main.file))).toMatch(/^ctrl-suite-/);
    expect(await query("PRAGMA quick_check")).toEqual([{ quick_check: "ok" }]);
    expect((await query("SELECT name FROM ctrl_migrations")).length).toBeGreaterThan(0);
    expect(await query("SELECT id FROM users")).toEqual([]);
    expect(await query("SELECT id FROM rate_limits")).toEqual([]);
  });

  it("commits two concurrent batches without nesting transactions and returns ordered results", async () => {
    const first = batch([
      statement("INSERT INTO local_batch_test(id,value) VALUES(?,?)", "first", 1),
      statement("UPDATE local_batch_test SET value=value+? WHERE id=?", 2, "first"),
    ]);
    const second = batch([
      statement("INSERT INTO local_batch_test(id,value) VALUES(?,?)", "second", 4),
      statement("UPDATE local_batch_test SET value=value+? WHERE id=?", 5, "second"),
      statement("UPDATE local_batch_test SET value=? WHERE id=?", 10, "missing"),
    ]);
    expect(first).toBeInstanceOf(Promise);
    expect(second).toBeInstanceOf(Promise);
    const results = await Promise.allSettled([first, second]);
    expect(results).toMatchObject([
      { status: "fulfilled", value: [
        { success: true, results: [], meta: { changes: 1 } },
        { success: true, results: [], meta: { changes: 1 } },
      ] },
      { status: "fulfilled", value: [
        { success: true, results: [], meta: { changes: 1 } },
        { success: true, results: [], meta: { changes: 1 } },
        { success: true, results: [], meta: { changes: 0 } },
      ] },
    ]);
    expect(await rows()).toEqual([{ id: "first", value: 3 }, { id: "second", value: 9 }]);
  });

  it("rolls back every earlier write, skips later writes, and accepts another batch after rejection", async () => {
    await exec("INSERT INTO local_batch_test(id,value) VALUES(?,?)", "existing", 7);
    const failed = batch([
      statement("UPDATE local_batch_test SET value=? WHERE id=?", 99, "existing"),
      statement("INSERT INTO local_batch_test(id,value) VALUES(?,?)", "rolled-back", 1),
      statement("INSERT INTO local_batch_test(id,value) VALUES(?,?)", "invalid", -1),
      statement("INSERT INTO local_batch_test(id,value) VALUES(?,?)", "skipped", 2),
    ]);
    expect(failed).toBeInstanceOf(Promise);
    await expect(failed).rejects.toThrow(/CHECK constraint failed/);
    expect(await rows()).toEqual([{ id: "existing", value: 7 }]);

    await expect(batch([
      statement("UPDATE local_batch_test SET value=value+? WHERE id=?", 1, "existing"),
    ])).resolves.toMatchObject([{ success: true, meta: { changes: 1 } }]);
    expect(await rows()).toEqual([{ id: "existing", value: 8 }]);
  });

  it("isolates a concurrent successful batch from a failing batch's rollback", async () => {
    const results = await Promise.allSettled([
      batch([
        statement("INSERT INTO local_batch_test(id,value) VALUES(?,?)", "rolled-back", 1),
        statement("INSERT INTO local_batch_test(id,value) VALUES(?,?)", "rolled-back", 2),
      ]),
      batch([
        statement("INSERT INTO local_batch_test(id,value) VALUES(?,?)", "committed", 3),
        statement("UPDATE local_batch_test SET value=value+? WHERE id=?", 4, "committed"),
      ]),
    ]);
    expect(results.map(result => result.status)).toEqual(["rejected", "fulfilled"]);
    if (results[0].status === "rejected") {
      expect(results[0].reason).toBeInstanceOf(Error);
      expect(results[0].reason.message).toMatch(/UNIQUE constraint failed/);
    }
    expect(await rows()).toEqual([{ id: "committed", value: 7 }]);
  });
});

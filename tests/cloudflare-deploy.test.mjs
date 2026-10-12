import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { deployStaging } from "../scripts/cloudflare-staging.mjs";

const accountId = "11111111-1111-4111-8111-111111111111";
const databaseId = "22222222-2222-4222-8222-222222222222";

function stagingEnv(overrides = {}) {
  return {
    CLOUDFLARE_API_TOKEN: "test-token",
    CLOUDFLARE_ACCOUNT_ID: accountId,
    CTRL_STAGING_D1_ID: databaseId,
    CTRL_STAGING_ORIGIN: "https://ctrl-staging.example.workers.dev",
    ...overrides,
  };
}

async function makeRepo() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "ctrl-cloudflare-staging-"));
  await mkdir(path.join(cwd, "dist", "server"), { recursive: true });
  await mkdir(path.join(cwd, "drizzle"), { recursive: true });
  await writeFile(path.join(cwd, "drizzle", "0000_initial.sql"), "CREATE TABLE example(id TEXT PRIMARY KEY);\n");
  await writeFile(path.join(cwd, "dist", "server", "wrangler.json"), JSON.stringify({
    name: "ctrl-staging",
    main: "./index.js",
    compatibility_date: "2026-05-15",
    compatibility_flags: ["nodejs_compat"],
    vars: { EXISTING: "kept" },
    d1_databases: [{ binding: "DB", database_name: "site-creator-d1", database_id: "00000000-0000-4000-8000-000000000000" }],
    r2_buckets: [{ binding: "BUCKET", bucket_name: "site-creator-r2" }],
  }, null, 2));
  return cwd;
}

function commandSummary(call) {
  const wrangler = call.args.indexOf("wrangler");
  return wrangler === -1 ? [call.command, ...call.args].join(" ") : call.args.slice(wrangler + 1).join(" ");
}

test("staging deploy backs up before tracked migrations and deploy", async () => {
  const cwd = await makeRepo();
  const calls = [];
  const runner = async (command, args, options) => {
    calls.push({ command, args, options });
    if (args.includes("export")) await writeFile(args[args.indexOf("--output") + 1], "-- simulated test backup\nCREATE TABLE example(id TEXT);\n");
  };

  try {
    const result = await deployStaging({
      cwd,
      env: stagingEnv(),
      runner,
      now: () => new Date("2026-10-12T00:00:00.000Z"),
    });

    assert.equal(result.deployed, true);
    assert.equal(result.migrated, true);
    assert.deepEqual(calls.map(commandSummary), [
      "d1 export ctrl-staging-d1 --remote --config .cloudflare-staging/generated/wrangler.staging.d1.json --output " + path.join(cwd, ".cloudflare-staging", "backups", "ctrl-staging-d1-2026-10-12T00-00-00-000Z.sql"),
      "d1 migrations list ctrl-staging-d1 --remote --config .cloudflare-staging/generated/wrangler.staging.d1.json",
      "d1 migrations apply ctrl-staging-d1 --remote --config .cloudflare-staging/generated/wrangler.staging.d1.json",
      "deploy --config dist/server/wrangler.json",
    ]);

    const wrangler = JSON.parse(await readFile(path.join(cwd, "dist", "server", "wrangler.json"), "utf8"));
    assert.equal(wrangler.name, "ctrl-staging");
    assert.equal(wrangler.account_id, accountId);
    assert.equal(wrangler.workers_dev, true);
    assert.equal(wrangler.vars.APP_ORIGIN, "https://ctrl-staging.example.workers.dev");
    assert.deepEqual(wrangler.d1_databases, [{
      binding: "DB",
      database_name: "ctrl-staging-d1",
      database_id: databaseId,
      migrations_dir: "drizzle",
    }]);
    assert.deepEqual(wrangler.r2_buckets, [{ binding: "BUCKET", bucket_name: "ctrl-staging-r2" }]);

    const d1Config = JSON.parse(await readFile(path.join(cwd, ".cloudflare-staging", "generated", "wrangler.staging.d1.json"), "utf8"));
    assert.equal(d1Config.account_id, accountId);
    assert.equal(d1Config.d1_databases[0].migrations_dir, path.join("..", "..", "drizzle"));
    assert.equal(calls[0].options.env.CTRL_HOSTING_TARGET, "cloudflare-staging");
    assert.equal(calls[0].options.env.CTRL_DEPLOY_ENV, "staging");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("production targets are rejected before any subprocess runs", async () => {
  const cwd = await makeRepo();
  const calls = [];
  const runner = async (command, args) => calls.push({ command, args });

  try {
    await assert.rejects(
      deployStaging({ cwd, env: stagingEnv(), argv: ["deploy", "--env", "production"], runner }),
      /Refusing non-staging Cloudflare deployment target: production/,
    );
    assert.equal(calls.length, 0);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("backup failure stops migrations and deployment", async () => {
  const cwd = await makeRepo();
  const calls = [];
  const runner = async (command, args) => {
    calls.push({ command, args });
    if (args.includes("export")) throw new Error("simulated backup failure");
  };

  try {
    await assert.rejects(
      deployStaging({ cwd, env: stagingEnv(), runner, now: () => new Date("2026-10-12T00:00:00.000Z") }),
      /simulated backup failure/,
    );
    assert.deepEqual(calls.map(commandSummary), [
      "d1 export ctrl-staging-d1 --remote --config .cloudflare-staging/generated/wrangler.staging.d1.json --output " + path.join(cwd, ".cloudflare-staging", "backups", "ctrl-staging-d1-2026-10-12T00-00-00-000Z.sql"),
    ]);
    const manifest = JSON.parse(await readFile(path.join(cwd, ".cloudflare-staging", "backups", "latest-backup.json"), "utf8"));
    assert.equal(manifest.status, "started");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("staging config requires real UUIDs and staging-only names", async () => {
  const cwd = await makeRepo();
  const calls = [];
  const runner = async (command, args) => calls.push({ command, args });

  try {
    await assert.rejects(
      deployStaging({
        cwd,
        env: stagingEnv({
          CTRL_STAGING_D1_ID: "00000000-0000-0000-0000-000000000000",
        }),
        argv: ["validate"],
        runner,
      }),
      /CTRL_STAGING_D1_ID must be a real UUID/,
    );
    await assert.rejects(
      deployStaging({
        cwd,
        env: stagingEnv({ CTRL_STAGING_R2_BUCKET: "ctrl-production-bucket" }),
        argv: ["validate"],
        runner,
      }),
      /CTRL_STAGING_R2_BUCKET must be staging-only/,
    );
    assert.equal(calls.length, 0);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLOUDFLARE_ACCOUNT_ID_RE = /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const SAFE_STAGING_NAME_RE = /^ctrl-staging(?:[-_a-z0-9]*)?$/;
const FORBIDDEN_ENV_RE = /(^|[-_/\s])(prod|production)([-_/\s]|$)/i;

export const stagingDefaults = Object.freeze({
  environment: "staging",
  workerName: "ctrl-staging",
  d1Binding: "DB",
  d1DatabaseName: "ctrl-staging-d1",
  r2Binding: "BUCKET",
  r2BucketName: "ctrl-staging-r2",
  generatedWranglerPath: path.join("dist", "server", "wrangler.json"),
  generatedD1WranglerPath: path.join(".cloudflare-staging", "generated", "wrangler.staging.d1.json"),
  backupDirectory: path.join(".cloudflare-staging", "backups"),
  migrationsDirectory: "drizzle",
});

export function createSpawnRunner({ spawnImpl = spawn, stdio = "inherit" } = {}) {
  return async function run(command, args, options = {}) {
    return await new Promise((resolve, reject) => {
      const child = spawnImpl(command, args, { stdio, ...options });
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (code === 0) {
          resolve({ command, args, code, signal });
          return;
        }
        const rendered = renderCommand(command, args);
        reject(new Error(`${rendered} failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 1}`}`));
      });
    });
  };
}

export function assertStagingOnly({ argv = [], env = process.env } = {}) {
  const suspects = [
    env.CTRL_DEPLOY_ENV,
    env.CF_ENV,
    env.CLOUDFLARE_ENV,
    env.WRANGLER_ENV,
    env.NODE_ENV === "production" ? undefined : env.NODE_ENV,
    ...argv,
  ].filter(Boolean).map(String);

  for (let index = 0; index < suspects.length; index += 1) {
    const value = suspects[index];
    const lower = value.toLowerCase();
    if (lower === "prod" || lower === "production" || FORBIDDEN_ENV_RE.test(value)) {
      throw new Error(`Refusing non-staging Cloudflare deployment target: ${value}`);
    }
  }

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (["--env", "-e", "--environment"].includes(flag) && argv[index + 1] !== "staging") {
      throw new Error(`Refusing Cloudflare environment ${argv[index + 1] ?? "<missing>"}; only staging is allowed.`);
    }
  }
}

export function getStagingConfig(env = process.env) {
  const workerName = env.CTRL_STAGING_WORKER_NAME || stagingDefaults.workerName;
  const d1DatabaseName = env.CTRL_STAGING_D1_DATABASE_NAME || stagingDefaults.d1DatabaseName;
  const r2BucketName = env.CTRL_STAGING_R2_BUCKET || stagingDefaults.r2BucketName;
  const accountId = env.CTRL_STAGING_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID;
  const d1DatabaseId = env.CTRL_STAGING_D1_ID;
  const appOrigin = env.CTRL_STAGING_ORIGIN || env.APP_ORIGIN;

  if (!SAFE_STAGING_NAME_RE.test(workerName)) {
    throw new Error(`CTRL_STAGING_WORKER_NAME must be staging-only and start with ctrl-staging; received ${workerName}`);
  }
  if (!SAFE_STAGING_NAME_RE.test(d1DatabaseName)) {
    throw new Error(`CTRL_STAGING_D1_DATABASE_NAME must be staging-only and start with ctrl-staging; received ${d1DatabaseName}`);
  }
  if (!SAFE_STAGING_NAME_RE.test(r2BucketName)) {
    throw new Error(`CTRL_STAGING_R2_BUCKET must be staging-only and start with ctrl-staging; received ${r2BucketName}`);
  }
  requireCloudflareAccountId("CLOUDFLARE_ACCOUNT_ID or CTRL_STAGING_ACCOUNT_ID", accountId);
  requireUuid("CTRL_STAGING_D1_ID", d1DatabaseId);
  if (!env.CLOUDFLARE_API_TOKEN) {
    throw new Error("CLOUDFLARE_API_TOKEN is required for remote staging backup, migrations, and deploy.");
  }
  validateStagingOrigin(appOrigin);

  return Object.freeze({
    accountId,
    appOrigin,
    workerName,
    d1Binding: stagingDefaults.d1Binding,
    d1DatabaseName,
    d1DatabaseId,
    r2Binding: stagingDefaults.r2Binding,
    r2BucketName,
  });
}

export async function writeStagingWranglerConfigs({
  cwd = process.cwd(),
  env = process.env,
  fs = { readFile, writeFile, mkdir },
} = {}) {
  const config = getStagingConfig(env);
  const wranglerPath = path.join(cwd, stagingDefaults.generatedWranglerPath);
  const d1ConfigPath = path.join(cwd, stagingDefaults.generatedD1WranglerPath);
  const base = JSON.parse(await fs.readFile(wranglerPath, "utf8"));

  if (base.name !== "ctrl-staging" || base.services?.length) {
    throw new Error("Refusing Sites/non-staging artifact; rebuild with CTRL_HOSTING_TARGET=cloudflare-staging.");
  }
  const stagingWrangler = makeWorkerWrangler(base, config);
  validateWorkerWrangler(stagingWrangler, config);
  await fs.mkdir(path.dirname(wranglerPath), { recursive: true });
  await fs.writeFile(wranglerPath, `${JSON.stringify(stagingWrangler, null, 2)}\n`);

  const stagingD1Wrangler = makeD1Wrangler(config);
  validateD1Wrangler(stagingD1Wrangler, config);
  await fs.mkdir(path.dirname(d1ConfigPath), { recursive: true });
  await fs.writeFile(d1ConfigPath, `${JSON.stringify(stagingD1Wrangler, null, 2)}\n`);

  return { config, wranglerPath, d1ConfigPath, stagingWrangler, stagingD1Wrangler };
}

export async function deployStaging({
  argv = [],
  env = process.env,
  cwd = process.cwd(),
  runner = createSpawnRunner(),
  fs = { readFile, writeFile, mkdir },
  now = () => new Date(),
} = {}) {
  assertStagingOnly({ argv, env });
  const command = argv[0] || "deploy";
  if (!["deploy", "validate", "backup", "migrate"].includes(command)) {
    throw new Error(`Unknown staging command ${command}. Expected deploy, validate, backup, or migrate.`);
  }

  const { config, wranglerPath, d1ConfigPath } = await writeStagingWranglerConfigs({ cwd, env, fs });
  if (command === "validate") {
    return { config, wranglerPath, d1ConfigPath, backupPath: null, migrated: false, deployed: false };
  }

  const backupPath = await backupD1({ cwd, env, config, d1ConfigPath, runner, fs, now });
  if (command === "backup") {
    return { config, wranglerPath, d1ConfigPath, backupPath, migrated: false, deployed: false };
  }

  await runMigrations({ cwd, env, config, d1ConfigPath, runner });
  if (command === "migrate") {
    return { config, wranglerPath, d1ConfigPath, backupPath, migrated: true, deployed: false };
  }

  await runner("pnpm", ["exec", "wrangler", "deploy", "--config", stagingDefaults.generatedWranglerPath], {
    cwd,
    env: makeSubprocessEnv(env, config),
  });

  return { config, wranglerPath, d1ConfigPath, backupPath, migrated: true, deployed: true };
}

export async function backupD1({ cwd, env, config, d1ConfigPath, runner, fs = { writeFile, mkdir, readFile }, now = () => new Date() }) {
  const stamp = now().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(cwd, stagingDefaults.backupDirectory);
  const backupPath = path.join(backupDir, `${config.d1DatabaseName}-${stamp}.sql`);
  const manifestPath = path.join(backupDir, "latest-backup.json");
  await fs.mkdir(backupDir, { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify({
    status: "started",
    environment: stagingDefaults.environment,
    database_name: config.d1DatabaseName,
    database_id: config.d1DatabaseId,
    output: backupPath,
    started_at: now().toISOString(),
  }, null, 2)}\n`);

  await runner("pnpm", [
    "exec",
    "wrangler",
    "d1",
    "export",
    config.d1DatabaseName,
    "--remote",
    "--config",
    path.relative(cwd, d1ConfigPath),
    "--output",
    backupPath,
  ], {
    cwd,
    env: makeSubprocessEnv(env, config),
  });

  const backup = await fs.readFile(backupPath, "utf8");
  if (!backup.trim()) throw new Error("D1 backup output is empty; refusing migrations/deploy.");
  await fs.writeFile(manifestPath, `${JSON.stringify({
    status: "completed",
    environment: stagingDefaults.environment,
    database_name: config.d1DatabaseName,
    database_id: config.d1DatabaseId,
    output: backupPath,
    completed_at: now().toISOString(),
  }, null, 2)}\n`);
  return backupPath;
}

export async function runMigrations({ cwd, env, config, d1ConfigPath, runner }) {
  const relativeConfig = path.relative(cwd, d1ConfigPath);
  const common = [config.d1DatabaseName, "--remote", "--config", relativeConfig];
  await runner("pnpm", ["exec", "wrangler", "d1", "migrations", "list", ...common], {
    cwd,
    env: makeSubprocessEnv(env, config),
  });
  await runner("pnpm", ["exec", "wrangler", "d1", "migrations", "apply", ...common], {
    cwd,
    env: makeSubprocessEnv(env, config),
  });
}

function makeWorkerWrangler(base, config) {
  const next = { ...base };
  next.name = config.workerName;
  next.account_id = config.accountId;
  next.workers_dev = true;
  delete next.routes;
  delete next.route;
  delete next.custom_domain;
  delete next.custom_domains;
  next.vars = {
    ...(isRecord(base.vars) ? base.vars : {}),
    CTRL_MODE: "production",
    DEMO_AUTH_ENABLED: "false",
    CTRL_PUBLIC_RELEASE: "false",
    CTRL_DEPLOY_ENV: "staging",
    APP_ORIGIN: config.appOrigin,
  };
  next.d1_databases = [{
    binding: config.d1Binding,
    database_name: config.d1DatabaseName,
    database_id: config.d1DatabaseId,
    migrations_dir: stagingDefaults.migrationsDirectory,
  }];
  next.r2_buckets = [{
    binding: config.r2Binding,
    bucket_name: config.r2BucketName,
  }];
  return next;
}

function makeD1Wrangler(config) {
  return {
    name: `${config.workerName}-d1-migrations`,
    account_id: config.accountId,
    compatibility_date: "2026-05-15",
    d1_databases: [{
      binding: config.d1Binding,
      database_name: config.d1DatabaseName,
      database_id: config.d1DatabaseId,
      migrations_dir: path.join("..", "..", stagingDefaults.migrationsDirectory),
    }],
  };
}

export function validateWorkerWrangler(wrangler, config) {
  if (!isRecord(wrangler)) throw new Error("Generated Wrangler config must be an object.");
  assertEqual("worker name", wrangler.name, config.workerName);
  assertEqual("worker account_id", wrangler.account_id, config.accountId);
  if (wrangler.workers_dev !== true) throw new Error("Staging worker must deploy to workers.dev only.");
  if ("route" in wrangler || "routes" in wrangler || "custom_domain" in wrangler || "custom_domains" in wrangler) {
    throw new Error("Staging config must not contain production routes or custom domains.");
  }
  validateBindings(wrangler, config);
  validateStagingOrigin(wrangler.vars?.APP_ORIGIN);
}

export function validateD1Wrangler(wrangler, config) {
  if (!isRecord(wrangler)) throw new Error("Generated D1 Wrangler config must be an object.");
  assertEqual("D1 config account_id", wrangler.account_id, config.accountId);
  validateBindings(wrangler, config, { requireR2: false });
}

function validateBindings(wrangler, config, { requireR2 = true } = {}) {
  const d1 = wrangler.d1_databases;
  if (!Array.isArray(d1) || d1.length !== 1) throw new Error("Staging config must contain exactly one D1 binding.");
  assertEqual("D1 binding", d1[0].binding, config.d1Binding);
  assertEqual("D1 database_name", d1[0].database_name, config.d1DatabaseName);
  assertEqual("D1 database_id", d1[0].database_id, config.d1DatabaseId);
  requireUuid("D1 database_id", d1[0].database_id);

  const r2 = wrangler.r2_buckets;
  if (requireR2) {
    if (!Array.isArray(r2) || r2.length !== 1) throw new Error("Staging config must contain exactly one R2 bucket binding.");
    assertEqual("R2 binding", r2[0].binding, config.r2Binding);
    assertEqual("R2 bucket_name", r2[0].bucket_name, config.r2BucketName);
  }
}

function validateStagingOrigin(appOrigin) {
  if (!appOrigin) throw new Error("CTRL_STAGING_ORIGIN or APP_ORIGIN is required for staging deploys.");
  let parsed;
  try {
    parsed = new URL(appOrigin);
  } catch {
    throw new Error(`Invalid staging APP_ORIGIN: ${appOrigin}`);
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") throw new Error("Staging APP_ORIGIN must be a bare https origin.");
  if (!parsed.hostname.includes("ctrl-staging") || FORBIDDEN_ENV_RE.test(parsed.hostname)) {
    throw new Error(`APP_ORIGIN must be staging-only for ctrl-staging; received ${appOrigin}`);
  }
}

function makeSubprocessEnv(env, config) {
  return {
    ...env,
    WRANGLER_SEND_METRICS: "false",
    CTRL_DEPLOY_ENV: "staging",
    CTRL_MODE: "production",
    CTRL_HOSTING_TARGET: "cloudflare-staging",
    APP_ORIGIN: config.appOrigin,
    CLOUDFLARE_ACCOUNT_ID: config.accountId,
    CTRL_STAGING_ACCOUNT_ID: config.accountId,
    CTRL_STAGING_WORKER_NAME: config.workerName,
    CTRL_STAGING_D1_DATABASE_NAME: config.d1DatabaseName,
    CTRL_STAGING_D1_ID: config.d1DatabaseId,
    CTRL_STAGING_R2_BUCKET: config.r2BucketName,
  };
}

function requireUuid(name, value) {
  if (!value || !UUID_RE.test(value) || value === "00000000-0000-4000-8000-000000000000") throw new Error(`${name} must be a real UUID; received ${value || "<missing>"}`);
}

function requireCloudflareAccountId(name, value) {
  if (!value || !CLOUDFLARE_ACCOUNT_ID_RE.test(value)) {
    throw new Error(`${name} must be a real Cloudflare account ID; received ${value || "<missing>"}`);
  }
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) throw new Error(`Invalid ${label}: expected ${expected}, received ${actual}`);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function renderCommand(command, args) {
  return [command, ...args].map((part) => /\s/.test(part) ? JSON.stringify(part) : part).join(" ");
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  deployStaging({ argv: process.argv.slice(2) }).then((result) => {
    console.log(JSON.stringify({
      environment: stagingDefaults.environment,
      worker: result.config.workerName,
      database: result.config.d1DatabaseName,
      bucket: result.config.r2BucketName,
      backup: result.backupPath,
      migrated: result.migrated,
      deployed: result.deployed,
    }, null, 2));
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

import assert from "node:assert/strict";
import test from "node:test";
import {
  CLOUDFLARE_STAGING_TARGET,
  SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
  createCloudflareBuildConfig,
} from "../build/cloudflare-config.mjs";
import {
  isSitesAuthPath,
  stripOpenAiAuthenticatedUserHeaders,
} from "../build/cloudflare-headers.mjs";

const hostingConfig = { d1: "DB", r2: "BUCKET" };

function stagingEnv(overrides = {}) {
  return {
    CTRL_HOSTING_TARGET: CLOUDFLARE_STAGING_TARGET,
    CTRL_STAGING_D1_ID: "11111111-2222-4333-8444-555555555555",
    CTRL_STAGING_R2_BUCKET: "ctrl-staging-assets",
    CTRL_STAGING_ORIGIN: "https://ctrl-staging.example.com",
    ...overrides,
  };
}

test("default hosting target preserves Sites compatibility", () => {
  const config = createCloudflareBuildConfig({ command: "build", env: {}, hostingConfig });

  assert.equal(config.target, "sites");
  assert.equal(config.useSitesPlugin, true);
  assert.equal(config.sitesMockAuth, true);
  assert.equal(config.useConnectorPreviewPlugin, true);
  assert.equal(config.cloudflareConfig.main, "./build/sites-worker.ts");
  assert.deepEqual(config.cloudflareConfig.d1_databases, [
    {
      binding: "DB",
      database_name: "site-creator-d1",
      database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
    },
  ]);
  assert.deepEqual(config.cloudflareConfig.r2_buckets, [
    { binding: "BUCKET", bucket_name: "site-creator-r2" },
  ]);
  assert.equal(config.cloudflareConfig.services, undefined);
  assert.equal(config.auxiliaryWorkers, undefined);
});

test("Sites dev target keeps connector preview service and worker", () => {
  const config = createCloudflareBuildConfig({ command: "serve", env: {}, hostingConfig });

  assert.equal(config.useSitesPlugin, true);
  assert.equal(config.useConnectorPreviewPlugin, true);
  assert.deepEqual(config.cloudflareConfig.services, [
    {
      binding: "CONNECTORS",
      service: "sites-connector-preview",
      entrypoint: "ConnectorPreview",
    },
  ]);
  assert.equal(config.auxiliaryWorkers[0].config.name, "sites-connector-preview");
});

test("cloudflare-staging uses standalone worker and real staging bindings only", () => {
  const config = createCloudflareBuildConfig({
    command: "serve",
    env: stagingEnv({ CTRL_STAGING_ACCOUNT_ID: "0123456789abcdef" }),
    hostingConfig,
    managedLinux: true,
  });

  assert.equal(config.target, CLOUDFLARE_STAGING_TARGET);
  assert.equal(config.useSitesPlugin, false);
  assert.equal(config.sitesMockAuth, false);
  assert.equal(config.useConnectorPreviewPlugin, false);
  assert.equal(config.cloudflareConfig.main, "./build/cloudflare-worker.ts");
  assert.equal(config.cloudflareConfig.name, "ctrl-staging");
  assert.equal(config.cloudflareConfig.account_id, "0123456789abcdef");
  assert.equal(config.cloudflareConfig.vars.APP_ORIGIN, "https://ctrl-staging.example.com");
  assert.deepEqual(config.cloudflareConfig.d1_databases, [
    {
      binding: "DB",
      database_name: "ctrl-staging-d1",
      database_id: "11111111-2222-4333-8444-555555555555",
    },
  ]);
  assert.deepEqual(config.cloudflareConfig.r2_buckets, [
    { binding: "BUCKET", bucket_name: "ctrl-staging-assets" },
  ]);
  assert.equal(config.cloudflareConfig.services, undefined);
  assert.equal(config.auxiliaryWorkers, undefined);
});

test("cloudflare-staging rejects missing, placeholder, and production values", () => {
  const cases = [
    ["missing D1", { CTRL_STAGING_D1_ID: "" }],
    ["placeholder D1", { CTRL_STAGING_D1_ID: SITE_CREATOR_PLACEHOLDER_DATABASE_ID }],
    ["production D1 label", { CTRL_STAGING_D1_ID: "ctrl-prod-d1" }],
    ["missing R2", { CTRL_STAGING_R2_BUCKET: "" }],
    ["non-staging R2", { CTRL_STAGING_R2_BUCKET: "ctrl-assets" }],
    ["production R2", { CTRL_STAGING_R2_BUCKET: "ctrl-prod-assets" }],
    ["missing origin", { CTRL_STAGING_ORIGIN: "" }],
    ["non-https origin", { CTRL_STAGING_ORIGIN: "http://ctrl-staging.example.com" }],
    ["production origin", { CTRL_STAGING_ORIGIN: "https://ctrl-prod.example.com" }],
    ["non-staging origin", { CTRL_STAGING_ORIGIN: "https://ctrl.example.com" }],
  ];

  for (const [name, overrides] of cases) {
    assert.throws(
      () => createCloudflareBuildConfig({ env: stagingEnv(overrides), hostingConfig }),
      /staging|placeholder|production|required|https/i,
      name,
    );
  }
});

test("unknown hosting targets fail closed", () => {
  assert.throws(
    () => createCloudflareBuildConfig({ env: { CTRL_HOSTING_TARGET: "cloudflare-prod" }, hostingConfig }),
    /Unsupported CTRL_HOSTING_TARGET/,
  );
});

test("standalone header boundary strips spoofed Sites auth but keeps wallet cookies", () => {
  const headers = stripOpenAiAuthenticatedUserHeaders(
    new Headers({
      "oai-authenticated-user-id": "spoofed",
      "oai-authenticated-user-email": "spoofed@example.com",
      cookie: "ctrl_session=wallet-session; other=value",
    }),
  );

  assert.equal(headers.get("oai-authenticated-user-id"), null);
  assert.equal(headers.get("oai-authenticated-user-email"), null);
  assert.equal(headers.get("cookie"), "ctrl_session=wallet-session; other=value");
  assert.equal(isSitesAuthPath("/signin-with-chatgpt"), true);
  assert.equal(isSitesAuthPath("/auth/verify"), false);
});

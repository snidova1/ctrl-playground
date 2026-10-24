export const SITES_TARGET = "sites";
export const CLOUDFLARE_STAGING_TARGET = "cloudflare-staging";
export const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const STAGING_WORKER_NAME = "ctrl-staging";
const STAGING_D1_NAME = "ctrl-staging-d1";

export function createCloudflareBuildConfig({
  command = "build",
  env = process.env,
  hostingConfig = {},
  managedLinux = false,
} = {}) {
  const target = resolveHostingTarget(env.CTRL_HOSTING_TARGET);
  const bindingNames = readBindingNames(hostingConfig);

  if (target === SITES_TARGET) {
    const cloudflareConfig = sitesCloudflareConfig(bindingNames);
    if (command === "serve") {
      cloudflareConfig.services = [
        {
          binding: "CONNECTORS",
          service: "sites-connector-preview",
          entrypoint: "ConnectorPreview",
        },
      ];
    }

    return {
      target,
      useSitesPlugin: true,
      sitesMockAuth: !managedLinux,
      useConnectorPreviewPlugin: true,
      cloudflareConfig,
      auxiliaryWorkers:
        command === "serve"
          ? [
              {
                config: {
                  name: "sites-connector-preview",
                  main: "./build/connector-preview-worker.mjs",
                  compatibility_date: "2026-05-15",
                },
              },
            ]
          : undefined,
    };
  }

  return {
    target,
    useSitesPlugin: false,
    sitesMockAuth: false,
    useConnectorPreviewPlugin: false,
    cloudflareConfig: stagingCloudflareConfig(bindingNames, env),
    auxiliaryWorkers: undefined,
  };
}

export function resolveHostingTarget(value) {
  if (value === undefined || value === "" || value === SITES_TARGET) {
    return SITES_TARGET;
  }
  if (value === CLOUDFLARE_STAGING_TARGET) return CLOUDFLARE_STAGING_TARGET;
  throw new Error(
    `Unsupported CTRL_HOSTING_TARGET ${JSON.stringify(
      value,
    )}. Expected unset, "${SITES_TARGET}", or "${CLOUDFLARE_STAGING_TARGET}".`,
  );
}

function readBindingNames(hostingConfig) {
  return {
    d1: hostingConfig?.d1 || "DB",
    r2: hostingConfig?.r2 || "BUCKET",
  };
}

function sitesCloudflareConfig({ d1, r2 }) {
  return {
    main: "./build/sites-worker.ts",
    compatibility_flags: ["nodejs_compat"],
    d1_databases: d1
      ? [
          {
            binding: d1,
            database_name: "site-creator-d1",
            database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
          },
        ]
      : [],
    r2_buckets: r2
      ? [
          {
            binding: r2,
            bucket_name: "site-creator-r2",
          },
        ]
      : [],
  };
}

function stagingCloudflareConfig({ d1, r2 }, env) {
  const databaseId = requireStagingValue(
    env.CTRL_STAGING_D1_ID,
    "CTRL_STAGING_D1_ID",
    { requireStagingName: false },
  );
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(databaseId)) {
    throw new Error("CTRL_STAGING_D1_ID must be a real UUID.");
  }
  const bucketName = requireStagingValue(
    env.CTRL_STAGING_R2_BUCKET,
    "CTRL_STAGING_R2_BUCKET",
  );
  const origin = requireStagingOrigin(env.CTRL_STAGING_ORIGIN);
  const accountId = optionalStagingValue(
    env.CTRL_STAGING_ACCOUNT_ID ?? env.CLOUDFLARE_ACCOUNT_ID,
    "CTRL_STAGING_ACCOUNT_ID/CLOUDFLARE_ACCOUNT_ID",
    { requireStagingName: false },
  );

  return {
    name: STAGING_WORKER_NAME,
    main: "./build/cloudflare-worker.ts",
    compatibility_date: "2026-05-15",
    compatibility_flags: ["nodejs_compat"],
    ...(accountId ? { account_id: accountId } : {}),
    vars: {
      APP_ORIGIN: origin,
      CTRL_MODE: "production",
      DEMO_AUTH_ENABLED: "false",
      CTRL_PUBLIC_RELEASE: "false",
      ...(env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ? { NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.trim() } : {}),
    },
    d1_databases: d1
      ? [
          {
            binding: d1,
            database_name: STAGING_D1_NAME,
            database_id: databaseId,
          },
        ]
      : [],
    r2_buckets: r2
      ? [
          {
            binding: r2,
            bucket_name: bucketName,
          },
        ]
      : [],
  };
}

function requireStagingOrigin(value) {
  const origin = requireStagingValue(value, "CTRL_STAGING_ORIGIN");
  let url;
  try {
    url = new URL(origin);
  } catch {
    throw new Error("CTRL_STAGING_ORIGIN must be a valid https:// staging origin.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("CTRL_STAGING_ORIGIN must be a bare https:// staging origin.");
  }
  if (isRejectedStagingToken(url.hostname)) {
    throw new Error("CTRL_STAGING_ORIGIN must not point at production or placeholder infrastructure.");
  }
  if (!hasStagingMarker(url.hostname)) {
    throw new Error("CTRL_STAGING_ORIGIN hostname must include a staging marker.");
  }
  return url.origin;
}

function requireStagingValue(value, name, options = {}) {
  const normalized = optionalStagingValue(value, name, options);
  if (!normalized) throw new Error(`${name} is required for ${CLOUDFLARE_STAGING_TARGET}.`);
  return normalized;
}

function optionalStagingValue(value, name, { requireStagingName = true } = {}) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  const lower = normalized.toLowerCase();
  if (
    lower === SITE_CREATOR_PLACEHOLDER_DATABASE_ID ||
    /^0+$/.test(lower.replaceAll("-", "")) ||
    lower.includes("placeholder") ||
    lower.includes("site-creator") ||
    lower.includes("openai-sites") ||
    hasProductionMarker(lower)
  ) {
    throw new Error(`${name} must be an isolated staging value, not production or a placeholder.`);
  }
  if (requireStagingName && !hasStagingMarker(lower)) {
    throw new Error(`${name} must include a staging marker.`);
  }
  return normalized;
}

function isRejectedStagingToken(value) {
  return (
    value.includes("placeholder") ||
    value.includes("site-creator") ||
    value.includes("openai-sites") ||
    hasProductionMarker(value)
  );
}

function hasStagingMarker(value) {
  return /(^|[-_.])stag(e|ing)?($|[-_.])/.test(value) || /(^|[-_.])staging($|[-_.])/.test(value);
}

function hasProductionMarker(value) {
  return /(^|[-_.])prod(uction)?($|[-_.])/.test(value);
}

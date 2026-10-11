import vinext from "vinext";
import { defineConfig, loadEnv } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { createCloudflareBuildConfig } from "./build/cloudflare-config.mjs";
import { readExecutionProfile } from "./scripts/execution-profile.mjs";
import { sites } from "./build/sites-vite-plugin";
import { connectorPreview } from "./build/connector-preview-plugin.mjs";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const managedLinux = readExecutionProfile() === "managed-linux";

export default defineConfig(async ({ command, mode }) => {
  // Load only the public wallet setting; never serialize server secrets.
  const publicWalletEnv = loadEnv(mode, process.cwd(), "NEXT_PUBLIC_WALLETCONNECT_");
  // Use Miniflare's local Request.cf placeholder unless fetching is requested.
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.WRANGLER_REGISTRY_PATH ??= ".wrangler/dev-registry";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const cloudflareBuild = createCloudflareBuildConfig({
    command,
    env: process.env,
    hostingConfig,
    managedLinux,
  });

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  const plugins = [vinext()];
  if (cloudflareBuild.useSitesPlugin) {
    plugins.push(sites({ mockAuth: cloudflareBuild.sitesMockAuth }));
  }
  if (cloudflareBuild.useConnectorPreviewPlugin) {
    plugins.push(connectorPreview());
  }
  plugins.push(
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      inspectorPort: false,
      config: cloudflareBuild.cloudflareConfig,
      ...(cloudflareBuild.auxiliaryWorkers
        ? { auxiliaryWorkers: cloudflareBuild.auxiliaryWorkers }
        : {}),
    }),
  );

  return {
    define: {
      "process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID": JSON.stringify(
        publicWalletEnv.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
      ),
    },
    server: {
      ...(managedLinux
        ? { host: "0.0.0.0", allowedHosts: ["terminal.local"] }
        : {}),
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins,
  };
});

import {existsSync} from "node:fs";
import { spawn,spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readExecutionProfile } from "./execution-profile.mjs";

const [command, ...args] = process.argv.slice(2);
if (!["dev", "build"].includes(command)) throw new Error("Expected dev or build.");
if(command === "dev" && existsSync(new URL("../.sites-runtime/preview-built-worker", import.meta.url))) {
  // QA the exact compiled Worker through the normal supervised preview.
  await import("./sites-env.mjs");
  const wrangler = new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url);
  const portIndex = args.indexOf("--port");
  const port = portIndex < 0 ? "4173" : args[portIndex + 1];
  process.argv = [process.execPath,fileURLToPath(wrangler),"dev","--config","dist/server/wrangler.json","--local","--ip","0.0.0.0","--port",port,"--persist-to",".wrangler/state","--inspector-port","0"];
  const child = spawn(process.execPath,process.argv.slice(1),{stdio:"inherit"});
  for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>child.kill(signal));
  process.exitCode = await new Promise((resolve,reject)=>{child.once("error",reject);child.once("exit",code=>resolve(code??1));});
} else {
const managedLinux = readExecutionProfile() === "managed-linux";

if (managedLinux && command === "build") {
  const result = spawnSync("bash", [
    fileURLToPath(new URL("./build-verified.sh", import.meta.url)), ...args,
  ], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

// Import in this process so the preview owner retains its PID and signals.
const cli = new URL(managedLinux
  ? "../node_modules/vite/bin/vite.js"
  : "../node_modules/vinext/dist/cli.js", import.meta.url);
process.argv = [process.execPath, fileURLToPath(cli), command,
  ...(!managedLinux && command === "dev" ? ["--port", "5173"] : []), ...args];
await import(cli.href);

}

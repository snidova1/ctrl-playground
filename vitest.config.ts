import {defineConfig}from"vitest/config";
import path from"node:path";
export default defineConfig({resolve:{alias:{"@/lib/platform":path.resolve(process.cwd(),"lib/platform-node.ts"),"@":path.resolve(process.cwd())}},test:{include:["tests/unit/**/*.test.ts"],environment:"node",fileParallelism:false,maxWorkers:1,env:{CTRL_LOCAL_DB:path.resolve(".sites-runtime/test.sqlite"),CTRL_MODE:"mock",CTRL_CHAIN_ID:"4663",APP_ORIGIN:"http://localhost:3000"},setupFiles:["tests/setup.ts"],testTimeout:20000}});

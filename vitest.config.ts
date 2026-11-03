import {defineConfig}from"vitest/config";
import {mkdtempSync}from"node:fs";
import {tmpdir}from"node:os";
import path from"node:path";
const databaseRoot=mkdtempSync(path.join(tmpdir(),"ctrl-tests-"));
export default defineConfig({resolve:{alias:{"@/lib/platform":path.resolve(process.cwd(),"lib/platform-node.ts"),"@":path.resolve(process.cwd())}},test:{include:["tests/unit/**/*.test.ts"],environment:"node",isolate:true,fileParallelism:false,maxWorkers:1,env:{CTRL_TEST_DB_ROOT:databaseRoot,CTRL_MODE:"mock",CTRL_CHAIN_ID:"4663",APP_ORIGIN:"http://localhost:3000"},setupFiles:["tests/setup.ts"],testTimeout:20000}});

import {defineConfig} from 'vitest/config';
import path from 'node:path';
export default defineConfig({resolve:{alias:{'@/lib/platform':path.resolve('lib/platform-node.ts'),'@':process.cwd()}},test:{include:['tests/live/wallet.test.ts'],environment:'node',fileParallelism:false,maxWorkers:1,env:{CTRL_LOCAL_DB:path.resolve('.sites-runtime/live-test.sqlite'),CTRL_MODE:'mock',CTRL_CHAIN_ID:'46630',CTRL_RPC_URL:'https://robinhood-sepolia-rpc.publicnode.com',APP_ORIGIN:'http://localhost:3000'},setupFiles:['tests/setup.ts'],testTimeout:120000}});

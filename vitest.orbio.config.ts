import {defineConfig} from 'vitest/config';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const file=process.env.CTRL_ORBIO_SECRET_FILE;
if(!file)throw new Error('CTRL_ORBIO_SECRET_FILE is required for the explicitly paid integration test');
const secret=JSON.parse(readFileSync(file,'utf8')) as {key:string};
export default defineConfig({resolve:{alias:{'@/lib/platform':path.resolve('lib/platform-node.ts'),'@':process.cwd()}},test:{include:['tests/live/orbio.test.ts'],environment:'node',fileParallelism:false,maxWorkers:1,env:{CTRL_LOCAL_DB:path.resolve('.sites-runtime/orbio-test.sqlite'),CTRL_MODE:'production',ORBIO_API_KEY:secret.key,ORBIO_MODEL:'openai/gpt-6-luna',ORBIO_BASE_URL:'https://api.orbio.so/api/v1',APP_ORIGIN:'http://localhost:3000'},setupFiles:['tests/setup.ts'],testTimeout:120000}});

import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const result = spawnSync(process.execPath, ['--import', 'tsx', 'tests/keys/service-checks.ts'], {cwd: root, stdio: 'inherit'});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

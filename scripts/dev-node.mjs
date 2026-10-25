// Cross-platform `next dev` with the local SQLite adapter (Windows has no inline env vars).
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
process.env.CTRL_BUILD_TARGET = 'node';
process.env.CTRL_MODE ??= 'mock';
process.env.NEXT_TELEMETRY_DISABLED = '1';
const next = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const port = process.argv[2] ?? '3000';
const child = spawn(process.execPath, [next, 'dev', '--webpack', '--port', port], {stdio: 'inherit', env: process.env});
child.on('exit', code => process.exit(code ?? 0));

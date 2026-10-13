#!/usr/bin/env node
/**
 * Read-only preflight for docs/REA_PUBLIC_WORLD_EXECUTION.md.
 * No network, secrets, REA setup, downloads, or filesystem mutations.
 */
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
let failures=0;
const ok=(message)=>console.log('PASS '+message);
const fail=(message)=>{console.error('FAIL '+message);failures++;};
const note=(message)=>console.log('INFO '+message);
function git(args) {
 try {return execFileSync('git',args,{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}
 catch {return null;}
}

const version=process.versions.node;
const [major,minor]=version.split('.').map(Number);
const nodeOK=(major===22&&minor>=19)||(major===24&&minor>=11)||major>=26;
if(nodeOK) ok('REA-compatible Node.js '+version);
else fail('Node '+version+' is not compatible with the current REA requirement (22.19+, 24.11+, or 26+).');

const branch=git(['branch','--show-current']);
if(!branch)fail('Cannot detect current Git branch; execute from a checked-out CTRL working tree.');
else if(['main','work/master-integration','work/integration','deploy/staging'].includes(branch))
 fail('Do not implement this task directly on protected/shared branch '+branch);
else ok('Work branch: '+branch);

const dirty=git(['status','--porcelain']);
if(dirty===null)fail('git worktree status unavailable');
else if(dirty.length)note('Worktree has existing uncommitted changes: inspect before any update.');
else ok('Clean worktree');

let pkg=null;
try {pkg=JSON.parse(readFileSync(resolve(repo,'package.json'),'utf8'));}
catch{fail('Missing/malformed package.json');}
if(pkg?.packageManager==='pnpm@11.25.0')ok('CTRL uses pinned pnpm 11.25.0');
else if(pkg)note('Project packageManager: '+String(pkg.packageManager));

const essential=[
 'docs/REA_PUBLIC_WORLD_EXECUTION.md',
 'features/habitat/public-world-geography.ts',
 'features/habitat/town-scenery.tsx',
 'features/habitat/stage.tsx',
 'features/habitat/app.tsx',
 'features/habitat/types.ts',
 'features/habitat/use-presence.ts',
 'features/plaza/scene.tsx',
 'features/plaza/characters/vrm-avatar.tsx',
 'domain/habitat.ts',
 'server/habitat/service.ts',
 'tests/unit/public-world.test.ts',
 'tests/browser/public-world-visual.spec.ts',
 'playwright.public-world.config.ts'
];
const missing=essential.filter(path=>!existsSync(resolve(repo,path)));
if(missing.length)fail('Expected Public World source missing: '+missing.join(', '));
else ok('Public World source and real-WebGL QA files exist');

const candidates=['.next/static/chunks','dist/client','dist/server','build'];
const built=candidates.filter(path=>existsSync(resolve(repo,path)));
note('Existing build paths: '+(built.join(', ')||'none (build before REA JS inspection)'));
note('REA MCP is OPTIONAL for the work; do not auto-install in CI.');
note('No external game binaries or proprietary assets are authorized by this task.');
if(failures){console.error('\nPreflight failed: '+failures+' problem(s)');process.exitCode=1;}
else console.log('\nReady to execute docs/REA_PUBLIC_WORLD_EXECUTION.md on this branch.');

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createCloudflareBuildConfig} from '../build/cloudflare-config.mjs';
import {deployStaging, getStagingConfig} from '../scripts/cloudflare-staging.mjs';
const env = {
  CTRL_HOSTING_TARGET: 'cloudflare-staging',
  CLOUDFLARE_API_TOKEN: 'unit-test-only',
  CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
  CTRL_STAGING_D1_ID: '22222222-2222-4222-8222-222222222222',
  CTRL_STAGING_R2_BUCKET: 'ctrl-staging-r2',
  CTRL_STAGING_ORIGIN: 'https://ctrl-staging.test.workers.dev',
};
test('build and deploy share exact staging names, IDs, origin and runtime mode', () => {
  const {cloudflareConfig:c} = createCloudflareBuildConfig({env});
  const d = getStagingConfig(env);
  assert.equal(c.name, d.workerName);
  assert.equal(c.d1_databases[0].database_name, d.d1DatabaseName);
  assert.equal(c.d1_databases[0].database_id, d.d1DatabaseId);
  assert.equal(c.r2_buckets[0].bucket_name, d.r2BucketName);
  assert.equal(c.vars.APP_ORIGIN, d.appOrigin);
  assert.equal(c.vars.CTRL_MODE, 'production');
  assert.equal(c.vars.DEMO_AUTH_ENABLED, 'false');
});
async function fixture(name = 'ctrl-staging') {
  const cwd=await mkdtemp(path.join(os.tmpdir(),'ctrl-safety-'));
  await mkdir(path.join(cwd,'dist/server'),{recursive:true});
  await writeFile(path.join(cwd,'dist/server/wrangler.json'),JSON.stringify({name,main:'./index.js'}));
  return cwd;
}
test('Sites artifact cannot be rewritten and deployed as standalone', async () => {
  const cwd=await fixture('site-creator-local'); const calls=[];
  try {
    await assert.rejects(deployStaging({cwd,env,runner:async(...c)=>calls.push(c)}),/Refusing Sites/);
    assert.equal(calls.length,0);
  } finally {await rm(cwd,{recursive:true,force:true});}
});
test('successful export subprocess without a backup file still blocks migration', async () => {
  const cwd=await fixture(); const calls=[];
  try {
    await assert.rejects(deployStaging({cwd,env,runner:async(...c)=>calls.push(c)}),/ENOENT/);
    assert.equal(calls.length,1);
  } finally {await rm(cwd,{recursive:true,force:true});}
});
test('migration failure blocks Worker deployment after successful backup', async () => {
  const cwd=await fixture(); const calls=[];
  try {
    await assert.rejects(deployStaging({cwd,env,runner:async(cmd,args)=>{
      calls.push(args);
      if(args.includes('export')) await writeFile(args[args.indexOf('--output')+1],'-- unit test SQL backup\n');
      if(args.includes('apply')) throw new Error('test migration failure');
    }}),/test migration failure/);
    assert.equal(calls.length,3);
    assert.equal(calls.some(a=>a.includes('deploy')),false);
  } finally {await rm(cwd,{recursive:true,force:true});}
});
test('Sites UUID placeholder is refused by remote orchestration', () => {
  assert.throws(()=>getStagingConfig({...env,CTRL_STAGING_D1_ID:'00000000-0000-4000-8000-000000000000'}),/real UUID/);
});

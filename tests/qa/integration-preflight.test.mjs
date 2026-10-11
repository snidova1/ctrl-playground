import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyze, formatMarkdown, latestHeadChecks } from '../../scripts/qa/integration-preflight.mjs';

function pr(number, head, base, files, runs=[],extra={}) {
  return {
    number, title:'Test PR #'+number, head:{ref:head,sha:'sha-'+number},
    base:{ref:base,sha:'base-'+number},draft:true,
    files: files.map(filename=>({filename})),
    runs: runs.map(({name='CI',conclusion='success',status='completed',head_sha='sha-'+number,created_at='2026-10-10T10:00:00Z',id=number})=>({
      name,conclusion,status,head_sha,created_at,id,html_url:'https://github.com/example/repo/actions/runs/'+id
    })),...extra
  };
}

const success=(name='CI',other={})=>({name,conclusion:'success',...other});
const failure=(name='CI',other={})=>({name,conclusion:'failure',...other});
function fixture() {
  return {repo:'example/repo',mainSha:'main123',inspectedAt:'2026-10-10T10:00:00Z',pulls:[
    pr(1,'work/integration','main',['domain/habitat.ts'],[success()]),
    pr(2,'gpt6/world-builder','main',['features/habitat/app.tsx','features/habitat/stage.tsx'],[failure('World Builder')]),
    pr(3,'qa/asset-integrity-budget','main',['public/plaza/build-kit/furniture-kit/thumbs/preview.webp'],[success('Asset CI')]),
    pr(5,'fix/habitat-react-hooks','main',['features/habitat/app.tsx'],[success('ESLint')]),
    pr(6,'feat/habitat-asset-resolver','work/integration',['server/habitat/service.ts'],[success('API')]),
    pr(8,'fix/habitat-wallet-boundary','work/integration',['server/habitat/service.ts'],[success('Security')]),
    pr(9,'fix/habitat-body-budget','work/integration',['server/habitat/service.ts'],[success('Security')]),
    pr(11,'feat/habitat-backend-complete','work/integration',['server/habitat/service.ts','features/habitat/app.tsx'],[success('API')]),
  ]};
}

test('correctly marks current-head failed CI and ignores stale green runs',()=>{
  const item=pr(2,'branch','main',[],[
    success('build',{id:1,head_sha:'old-sha',created_at:'2026-10-10T12:00:00Z'}),
    failure('build',{id:2,created_at:'2026-10-10T11:00:00Z'}),
  ]);
  const result=latestHeadChecks(item);
  assert.equal(result.status,'failure');
  assert.equal(result.ignoredStaleRuns,1);
  assert.equal(result.checks.length,1);
});

test('requires every current-head workflow to pass, including pending checks',()=>{
  const item=pr(2,'branch','main',[],[
    success('lint'),
    {name:'browser',status:'in_progress',conclusion:null},
  ]);
  assert.equal(latestHeadChecks(item).status,'pending');
  assert.equal(latestHeadChecks(pr(3,'b','main',[],[])).status,'unverified');
  assert.equal(latestHeadChecks(pr(3,'b','main',[],[{name:'ci',status:'completed',conclusion:'cancelled'}])).status,'review');
});

test('marks integrated PR slices and base dependency instead of treating them as distinct deployments',()=>{
  const report=analyze(fixture());
  const backend=report.pulls.find(p=>p.number===11);
  assert.deepEqual(backend.dependentOn,[1]);
  for(const number of [6,8,9]){
    const fragment=report.pulls.find(p=>p.number===number);
    assert.deepEqual(fragment.consolidatedBy,[11]);
    assert(report.overlaps.some(o=>[o.first,o.second].includes(number)&&[o.first,o.second].includes(11)&&o.category==='superseded-slice'));
  }
  assert(report.overlaps.some(o=>o.first===2&&o.second===5&&o.category==='runtime-overlap-review'));
});

test('report exposes nonpassing PRs but never equates green isolated CI with full release readiness',()=>{
  const report=analyze(fixture());
  assert.equal(report.totalPRs,8);
  assert.equal(report.passingPRs,7);
  assert.deepEqual(report.nonPassingPRs.map(p=>p.number),[2]);
  assert(report.reviewGates.some(g=>g.includes('NOT deployment authorization')));
  assert.match(formatMarkdown(report), /does not merge, deploy, edit/);
  assert.match(formatMarkdown(report), /Shared-file integration review/);
  assert.match(formatMarkdown(report), /runtime-overlap-review/);
  assert.match(formatMarkdown(report), /included by #11/);
});

test('rejects duplicate PRs or incomplete PR metadata',()=>{
  let input=fixture();
  input.pulls.push(input.pulls[0]);
  assert.throws(()=>analyze(input),/Repeated PR number/);
  input=fixture();
  delete input.pulls[0].head.sha;
  assert.throws(()=>analyze(input),/Incomplete PR record/);
});

test('offline CLI generates both artifacts from a deterministic JSON snapshot, without GitHub access',()=>{
  const directory=mkdtempSync(path.join(tmpdir(),'ctrl-preflight-'));
  try{
    const snapshot=path.join(directory,'snapshot.json'), out=path.join(directory,'review.md'), json=path.join(directory,'review.json');
    writeFileSync(snapshot,JSON.stringify(fixture()));
    const cli=fileURLToPath(new URL('../../scripts/qa/integration-preflight.mjs',import.meta.url));
    const stdout=execFileSync(process.execPath,[cli,'--fixture',snapshot,'--repo','example/repo','--out',out,'--json-out',json],{
      encoding:'utf8',env:{...process.env,GITHUB_TOKEN:'DO_NOT_PRINT_THIS'}
    });
    assert.match(stdout,/CTRL cross-branch integration preflight/);
    assert(!stdout.includes('DO_NOT_PRINT_THIS'));
    assert.equal(JSON.parse(readFileSync(json,'utf8')).mainSha,'main123');
    assert.match(readFileSync(out,'utf8'),/World Builder/);
  }finally{rmSync(directory,{recursive:true,force:true});}
});

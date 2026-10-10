/**
 * CTRL read-only integration preflight.
 * Creates a deterministic PR/CI/overlap report; never merges, pushes or edits runtime code.
 * Node 22+, GITHUB_TOKEN with contents/pull-requests/actions read scope.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const KNOWN_CONSOLIDATION = Object.freeze({
  11: [6, 8, 9],
});
const IMPORTANT_PATH = /^(app|components|contracts|domain|drizzle|features|lib|server|three|worker)\//;

function unique(values) { return [...new Set(values)]; }
function fileName(entry) { return typeof entry === 'string' ? entry : entry.filename; }
function runTime(run) { return Date.parse(run.created_at || run.run_started_at || run.updated_at || 0) || 0; }

export function latestHeadChecks(pull) {
  const matching = (pull.runs || []).filter(run => run.head_sha === pull.head.sha);
  const byWorkflow = new Map();
  for (const run of matching) {
    const old = byWorkflow.get(run.name);
    if (!old || runTime(run) > runTime(old) || (runTime(run) === runTime(old) && run.id > old.id)) {
      byWorkflow.set(run.name, run);
    }
  }
  const checks = [...byWorkflow.values()].sort((a, b) => a.name.localeCompare(b.name)).map(run => ({
    workflow: run.name,
    conclusion: run.status !== 'completed' ? 'pending' : (run.conclusion || 'unknown'),
    url: run.html_url || null,
    id: run.id,
  }));
  let status = 'unverified';
  if (checks.length) {
    if (checks.some(c => c.conclusion === 'failure' || c.conclusion === 'timed_out' || c.conclusion === 'startup_failure')) status = 'failure';
    else if (checks.some(c => c.conclusion === 'pending' || c.conclusion === 'unknown' || c.conclusion === 'action_required')) status = 'pending';
    else if (checks.every(c => c.conclusion === 'success')) status = 'success';
    else status = 'review'; // cancelled, skipped and neutral are not treated as success
  }
  return { status, checks, ignoredStaleRuns: (pull.runs || []).length - matching.length };
}

export function analyze(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.pulls) || !snapshot.repo) throw new Error('Invalid integration snapshot');
  const pullMap = new Map();
  const pulls = [...snapshot.pulls].map(p => {
    if (!Number.isInteger(p.number) || !p.head?.ref || !p.head?.sha || !p.base?.ref) throw new Error('Incomplete PR record');
    if (pullMap.has(p.number)) throw new Error('Repeated PR number: ' + p.number);
    const files = unique((p.files || []).map(fileName)).filter(Boolean).sort();
    const checks = latestHeadChecks(p);
    const record = {
      number: p.number,
      title: p.title,
      head: p.head.ref,
      headSha: p.head.sha,
      base: p.base.ref,
      draft: Boolean(p.draft),
      url: p.html_url || null,
      files,
      checks,
      dependentOn: [],
      consolidatedBy: [],
    };
    pullMap.set(p.number, record);
    return record;
  }).sort((a,b) => a.number-b.number);

  for (const p of pulls) {
    p.dependentOn = pulls.filter(q => q.head === p.base && q.number !== p.number).map(q => q.number);
    p.consolidatedBy = Object.keys(KNOWN_CONSOLIDATION).map(Number).filter(n => KNOWN_CONSOLIDATION[n].includes(p.number) && pullMap.has(n));
  }
  const overlapping = [];
  for (let i = 0; i < pulls.length; i++) for (let j = i + 1; j < pulls.length; j++) {
    const a = pulls[i], b = pulls[j];
    const bSet = new Set(b.files);
    const shared = a.files.filter(f => bSet.has(f));
    if (!shared.length) continue;
    const runtime = shared.filter(f => IMPORTANT_PATH.test(f));
    const consolidated = a.consolidatedBy.includes(b.number) || b.consolidatedBy.includes(a.number);
    const inherited = a.dependentOn.includes(b.number) || b.dependentOn.includes(a.number);
    overlapping.push({
      first: a.number,
      second: b.number,
      shared,
      runtime,
      category: consolidated ? 'superseded-slice' : inherited ? 'dependency' : runtime.length ? 'runtime-overlap-review' : 'non-runtime-overlap',
      note: consolidated ? 'Consolidated into the higher PR; do not merge the slice independently without review.' :
            inherited ? 'Dependent PR: follow its base lineage before review.' :
            runtime.length ? 'Both PRs touch runtime files; reconcile changes, do not overwrite another worker.' :
            'Shared docs, tests or workflows; inspect only if both branches will be merged.',
    });
  }
  overlapping.sort((a,b) => b.runtime.length-a.runtime.length || b.shared.length-a.shared.length || a.first-b.first || a.second-b.second);
  const nonPassing = pulls.filter(p => p.checks.status !== 'success');
  const runtimeConflicts = overlapping.filter(o => o.category === 'runtime-overlap-review');
  const unexpected = pulls.filter(p => p.files.length === 0);
  return {
    repo: snapshot.repo,
    mainSha: snapshot.mainSha ?? null,
    inspectedAt: snapshot.inspectedAt ?? null,
    totalPRs: pulls.length,
    passingPRs: pulls.length - nonPassing.length,
    nonPassingPRs: nonPassing.map(p=>({ number:p.number, status:p.checks.status, head:p.head })),
    runtimeOverlapCount: runtimeConflicts.length,
    missingFileDiffs: unexpected.map(p=>p.number),
    pulls,
    overlaps: overlapping,
    reviewGates: [
      'PR #11 consolidates #6/#8/#9; merge/reconcile the integrated backend rather than replaying all slices independently.',
      'PR #2 browser editor must pass desktop/mobile real clicks and Save & Play; static compilation alone is insufficient.',
      'PR #2 guest onboarding browser fixture must align with the verified-wallet-only Habitat boundary in PR #11.',
      'World Keys contract can suffer world-ID squatting before signed owner binding; deployment readiness is NOT deployment authorization.',
      'PR #10 lists candidate creative assets; licensing and binary compatibility need sign-off before distribution.',
      'An isolated green workflow does not prove the combined main+backend+builder runtime or real mobile FPS.',
    ],
  };
}

function mdEscape(value) { return String(value??'').replace(/\|/g,'\\|').replace(/\r?\n/g,' '); }
export function formatMarkdown(report) {
  const lines = [
    '# CTRL cross-branch integration preflight',
    '',
    'Generated read-only from GitHub repository data. This report **does not merge, deploy, edit or attest to end-to-end release readiness**.',
    '',
    '- Repository: \`' + mdEscape(report.repo) + '\`',
    '- Main SHA: \`' + (report.mainSha || 'unknown') + '\`',
    '- Inspected at: ' + (report.inspectedAt || 'unspecified'),
    '- PRs: **' + report.totalPRs + '**; with all observed current-head workflows green: **' + report.passingPRs + '**; independent runtime-file overlap pairs to review: **' + report.runtimeOverlapCount + '**.',
    '',
    '## PR / CI / base dependency matrix',
    '',
    '| PR | Branch → base | CI on current head | Dependencies / supersession | Files |',
    '| --- | --- | --- | --- | ---: |',
  ];
  for (const pr of report.pulls) {
    let deps = [...pr.dependentOn.map(n=>'after #'+n),...pr.consolidatedBy.map(n=>'included by #'+n)].join(', ') || 'none';
    let links = pr.url ? '[#'+pr.number+']('+pr.url+')' : '#'+pr.number;
    const checks = pr.checks.checks.length
      ? pr.checks.checks.map(c=>c.workflow+': '+c.conclusion).join('; ')
      : 'no current-head run';
    lines.push('| '+links+' | \`'+mdEscape(pr.head)+'\` → \`'+mdEscape(pr.base)+'\` | **'+pr.checks.status+'** ('+mdEscape(checks)+') | '+deps+' | '+pr.files.length+' |');
  }
  lines.push('', '## Shared-file integration review', '',
    'Overlap is a **review signal**, not proof of an actual textual Git conflict. Shared files from known integrated slices are marked separately.', '',
    '| PRs | Category | Runtime overlap | Files (up to 10) |',
    '| --- | --- | ---: | --- |');
  for (const clash of report.overlaps.slice(0,35)) {
    lines.push('| #'+clash.first+' / #'+clash.second+' | '+clash.category+' | '+clash.runtime.length+' | '+mdEscape(clash.shared.slice(0,10).map(f=>'\`'+f+'\`').join(', ')+(clash.shared.length>10?' …':' '))+' |');
  }
  if (!report.overlaps.length) lines.push('| none | | 0 | |');
  if (report.overlaps.length>35) lines.push('', '_Additional '+(report.overlaps.length-35)+' overlaps available in the JSON artifact._');
  lines.push('', '## Human review gates', '');
  report.reviewGates.forEach((g,i)=>lines.push((i+1)+'. '+g));
  lines.push('', '## Handoff action', '',
    'Review the current-head CI links and shared runtime files. Integrate the backend baseline and wallet boundary first, then retest the existing Habitat World Builder on desktop and mobile. Do **not** merge automatically or use testnet scripts with real funds.',
    '', '## Re-run', '',
    '\`\`\`sh',
    'node --test tests/qa/integration-preflight.test.mjs',
    'GITHUB_TOKEN=<read-only-token> node scripts/qa/integration-preflight.mjs --repo '+report.repo+' --out /tmp/ctrl-integration-preflight.md --json-out /tmp/ctrl-integration-preflight.json',
    '\`\`\`',
    '');
  return lines.join('\n');
}

function argsFrom(argv) {
  const options = { repo: process.env.GITHUB_REPOSITORY || 'snidova1/ctrl-playground' };
  for (let i=0;i<argv.length;i++) {
    const arg=argv[i];
    if (['--repo','--out','--json-out','--fixture'].includes(arg)) {
      if (!argv[i+1] || argv[i+1].startsWith('--')) throw Error('Missing value for '+arg);
      options[arg.slice(2).replaceAll('-','_')] = argv[++i];
    } else if(arg==='--help') options.help=true;
    else throw Error('Unknown argument: '+arg);
  }
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(options.repo)) throw Error('Invalid owner/repo format');
  return options;
}

async function readGithub(repo, token) {
  if (!token) throw Error('Set a read-only GITHUB_TOKEN or use --fixture. No token is written to reports.');
  const root='https://api.github.com/repos/'+repo;
  const get=async (endpoint)=>{
    const response=await fetch(root+endpoint,{
      headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'ctrl-integration-preflight'}
    });
    if (!response.ok) {
      const reason=await response.text();
      throw Error('GitHub GET '+endpoint+' failed HTTP '+response.status+' '+reason.slice(0,200));
    }
    return response.json();
  };
  const list=async (endpoint)=>{
    const values=[];
    for(let page=1;page<=4;page++){
      const symbol=endpoint.includes('?')?'&':'?';
      const batch=await get(endpoint+symbol+'per_page=100&page='+page);
      if(!Array.isArray(batch)) throw Error('Expected array for '+endpoint);
      values.push(...batch);
      if(batch.length<100) return values;
    }
    throw Error('Pagination exceeded safety bound for '+endpoint);
  };
  const repository=await get('');
  const pulls=await list('/pulls?state=open');
  let cursor=0;
  const workers=Array.from({length:Math.min(4,pulls.length)},async ()=>{
    while(cursor<pulls.length) {
      const index=cursor++;
      const pull=pulls[index];
      const [files,runs]=await Promise.all([
        list('/pulls/'+pull.number+'/files'),
        get('/actions/runs?branch='+encodeURIComponent(pull.head.ref)+'&per_page=100')
      ]);
      pull.files=files.map(f=>({filename:f.filename,status:f.status}));
      pull.runs=(runs.workflow_runs??[]).map(r=>({name:r.name,id:r.id,head_sha:r.head_sha,status:r.status,conclusion:r.conclusion,created_at:r.created_at,html_url:r.html_url}));
    }
  });
  await Promise.all(workers);
  return {repo,mainSha:repository.default_branch? (await get('/branches/'+encodeURIComponent(repository.default_branch))).commit.sha:null,inspectedAt:new Date().toISOString(),pulls};
}

export async function main(argv=process.argv.slice(2)) {
  const options=argsFrom(argv);
  if (options.help) {
    process.stdout.write('Usage: node scripts/qa/integration-preflight.mjs [--repo owner/repo] [--out report.md] [--json-out report.json] [--fixture snapshot.json]\n');
    return;
  }
  const data=options.fixture? JSON.parse(readFileSync(options.fixture,'utf8')):await readGithub(options.repo,process.env.GITHUB_TOKEN||process.env.GH_TOKEN);
  const report=analyze(data);
  const markdown=formatMarkdown(report);
  if (options.out) {mkdirSync(path.dirname(path.resolve(options.out)),{recursive:true});writeFileSync(options.out,markdown);}
  if (options.json_out) {mkdirSync(path.dirname(path.resolve(options.json_out)),{recursive:true});writeFileSync(options.json_out,JSON.stringify(report,null,2)+'\n');}
  process.stdout.write(markdown);
}

if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(error=>{console.error('INTEGRATION_PREFLIGHT_ERROR '+error.message);process.exitCode=1;});
}

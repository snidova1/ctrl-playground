import {readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
const root='dist/client/_next/static/chunks';
const chunks=readdirSync(root).filter(name=>name.endsWith('.js')).map(name=>{const bytes=readFileSync(join(root,name));return {name,raw:statSync(join(root,name)).size,gzip:gzipSync(bytes).length};}).sort((a,b)=>b.raw-a.raw);
const rows=chunks.slice(0,12).map(c=>`| ${c.name} | ${(c.raw/1024).toFixed(1)} | ${(c.gzip/1024).toFixed(1)} |`).join('\n');
writeFileSync('docs/bundle-report.md',`# Production bundle inventory\n\nGenerated from the verified hosted build. These are individual emitted chunks, **not initial page transfer totals**. Worlds and wallet connectors are lazy imported. Gzip is calculated locally; actual serving compression may differ.\n\n| Chunk | Raw KiB | Gzip KiB |\n| --- | ---: | ---: |\n${rows}\n\n${chunks.length} JavaScript chunks emitted. Browser LCP, CLS, interaction delay, real-device frame time and WebGL memory still require measurements in a GPU-capable browser on representative hardware. The preview browser verified CSS3D/Canvas/SVG fallbacks, not GPU performance.\n`);
console.log('Bundle report saved.');

#!/usr/bin/env node
// Offline, deterministic candidate integrity validation. No third-party calls.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const path=fileURLToPath(new URL('../../creative-assets/premium-source-candidates.json',import.meta.url));
const data=JSON.parse(readFileSync(path,'utf8'));
const seen=new Set();
function assert(ok,msg){if(!ok)throw Error(msg);}
assert(data.version===1,'manifest version');
assert(data.candidates.length>=12,'too few real sourced candidates');
assert(data.sourceLicenseUrl==='https://polyhaven.com/license','license URL');
for(const c of data.candidates){
 assert(!seen.has(c.id),'duplicate '+c.id);seen.add(c.id);
 assert(c.source==='Poly Haven','unreviewed host');
 assert(/^[-_a-z0-9]+$/i.test(c.sourceSlug),'unsafe slug '+c.sourceSlug);
 assert(c.sourceUrl==='https://polyhaven.com/a/'+c.sourceSlug,'source link must be official');
 assert(c.license==='CC0-1.0'&&c.licenseEvidenceUrl===data.sourceLicenseUrl,'license mismatch');
 assert(['luxe','grand','signature'].includes(c.targetShelf),'unexpected shelf');
 assert(c.status==='public-cc0-source-found-binary-not-imported','false import assertion');
 assert(c.optimizedGlbPath===null&&c.sha256===null&&c.approvedForEthSale===false&&c.approvedForCtrlGallery===false,'cannot claim published binary');
 assert(c.sourcePageAdvertisedPackageMB>0,'source size missing');
}
assert(data.importedBinaryCount===0&&data.readyForPublishingCount===0,'unreviewed assets cannot ship');
for(const p of data.ethOriginalProductionBriefs){
 assert(['atelier','estate','masterpiece'].includes(p.band),'invalid price class');
 const bands={atelier:[100,1000],estate:[1000,5000],masterpiece:[5000,10000]};
 const [min,max]=bands[p.band];
 assert(p.priceUsdCents>=min&&p.priceUsdCents<=max,'outside USD price class');
 assert(p.sourceDonors.length>0&&p.sourceDonors.every(x=>seen.has(x)),'unknown source donor');
 assert(p.status==='design-brief-only-not-for-sale','false ETH sale assertion');
 assert(p.originalArtCompleted===false&&p.rightsAuditCompleted===false&&p.optimizedGlbsCompleted===false&&p.checkoutConfigured===false,'do not publish unfinished ETH');
 assert(p.originalWork.length>50,'ETH product must specify original added value');
}
console.log('PASS: '+data.candidates.length+' licensed source leads, '+data.ethOriginalProductionBriefs.length+' original ETH production concepts, 0 unreviewed published models');

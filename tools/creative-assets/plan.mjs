#!/usr/bin/env node
import {validateRepo,loadJSON} from './validate.mjs';
const stats=validateRepo(),sources=loadJSON('creative-assets/sources.json').sources;
console.log('CTRL CREATIVE-ASSETS // SOURCE REVIEW ONLY -- NO THIRD-PARTY FILES IMPORTED');
console.log(stats);
for(const category of new Set(sources.map(s=>s.category))){
  console.log('\n'+category.toUpperCase());
  for(const s of sources.filter(x=>x.category===category&&x.priority<=2))console.log('P'+s.priority+' '+s.title+' ['+s.rightsReview+']\n '+s.sourceUrl);
}
console.log('\nBEFORE INGEST: official source + exact pack license file + file SHA256 + skeleton compatibility + mobile budget + Astra approval');

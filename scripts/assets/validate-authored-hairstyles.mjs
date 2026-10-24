import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
const require=createRequire(`${process.env.GLTF_VALIDATOR_DIR ?? '/tmp/ctrl-costume-candidates/validator'}/package.json`);
const validator=require('gltf-validator');
const dir=new URL('../../public/plaza/characters/hairstyles/',import.meta.url).pathname;
const reports=[];
for(const name of readdirSync(dir).filter(n=>n.endsWith('.vrm'))){
 const result=await validator.validateBytes(new Uint8Array(readFileSync(`${dir}/${name}`)),{maxIssues:1000});
 reports.push({file:name,errors:result.issues.numErrors,warnings:result.issues.numWarnings,messages:result.issues.messages});
 console.log(name,JSON.stringify({errors:result.issues.numErrors,warnings:result.issues.numWarnings,first:result.issues.messages.filter(m=>m.severity===0).slice(0,3)}));
}
writeFileSync(`${dir}/gltf-validation.json`,JSON.stringify(reports,null,2));

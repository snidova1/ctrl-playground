import solc from 'solc';
import {readFile} from 'node:fs/promises';
export async function compileToken(){
 const source=await readFile(new URL('../../contracts/CTRLTestToken.sol',import.meta.url),'utf8');
 const result=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{'CTRLTestToken.sol':{content:source}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'paris',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}}})));
 const errors=(result.errors??[]).filter(e=>e.severity==='error');if(errors.length)throw new Error(errors.map(e=>e.formattedMessage).join('\n'));
 const c=result.contracts['CTRLTestToken.sol'].CTRLTestToken;
 return {abi:c.abi,bytecode:`0x${c.evm.bytecode.object}`,runtime:`0x${c.evm.deployedBytecode.object}`,compiler:solc.version()};
}

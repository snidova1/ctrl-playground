import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';
import ts from 'typescript';

const root=process.cwd(),world=resolve(root,'features/worldgacha');
const environment=readFileSync(resolve(world,'public-district-environment.tsx'),'utf8');
const life=readFileSync(resolve(world,'public-world-life.tsx'),'utf8');
describe('public world life integration contract',()=>{
 it('exports optional still with a safe backward-compatible default and forwards it',()=>{
  for(const text of [environment,life]){
   expect(text).toMatch(/export type Props=/);expect(text).toContain('still?:boolean');expect(text).toContain('still=false');
  }
  expect(environment).toContain('<PublicWorldLife player={player} night={night} still={still}>');
 });
 it('honors OS reduced motion, cleans up its listener, and keeps normal frustum culling',()=>{
  expect(life).toContain('(prefers-reduced-motion: reduce)');expect(life).toContain('still||reduced');
  expect(life).toContain("query.removeEventListener('change',change)");
  expect(life).toContain('mesh.current.boundingSphere=bounds');expect(life).not.toContain('frustumCulled={false}');
  expect(life).toContain('depthWrite={false}');expect(life).toContain('DynamicDrawUsage');
 });
 it('animates real stall signs and existing lanterns without moving structural solids',()=>{
  for(const kind of ['sign','cloth','lantern'])expect(environment).toContain(`kind='${kind}'`);
  expect(environment).toContain("if(!mesh||still||!lifeDetailVisible(player,-39,0)");
  expect(environment).toContain('time.current-last.current<1/20');
  expect(environment).toContain("size={[3.4,1.16,2.6]}");expect(environment).toContain("size={[5,.36,4]}");
  expect(environment).toContain('Math.hypot(player.x+39,player.z)<35');
  expect(environment).toContain('Math.hypot(player.x-39,player.z)<35');
  expect(life).not.toMatch(/Wildlife|Fountain|Character|Avatar|pointLight|Audio|fetch\(/);
 });
 it('typechecks only owned environment/life modules with repository ES2020 and JSX settings',()=>{
  const config=ts.readConfigFile(resolve(root,'tsconfig.json'),ts.sys.readFile);
  expect(config.error).toBeUndefined();
  const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,root);
  const program=ts.createProgram({rootNames:[resolve(world,'public-district-environment.tsx'),resolve(world,'public-world-life.tsx'),resolve(world,'public-world-life-motion.ts')],options:{...parsed.options,incremental:false,types:[],noEmit:true}});
  const diagnostics=ts.getPreEmitDiagnostics(program);
  expect(diagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n'))).toEqual([]);
 },60000);
});

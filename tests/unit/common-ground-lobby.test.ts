import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=(path:string)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
describe('Common Ground product boundary',()=>{
 it('routes the courtyard to a compact lobby, not the legacy workshop plaza',()=>{const route=source('app/courtyard/page.tsx');expect(route).toContain('common-ground/lobby');expect(route).not.toContain('plaza-app');});
 it('uses the lightweight lobby for unsigned entry without removing the signed home',()=>{const app=source('features/habitat/app.tsx');expect(app).toContain('common-ground/lobby-scene');expect(app).toContain('!state?.profile?<LobbyScene');expect(app).toContain('ensureStarterHome');expect(app).toContain('useWorldPresence');});
});

import {beforeAll,describe,expect,it} from 'vitest';
import {handleApi} from '@/server/api';
import {exec,one} from '@/db';
import {createSession} from '@/server/wallet/auth';
import type {HabitatState} from '@/domain/habitat';

const origin='http://localhost:3000';
interface Actor {id:string;wallet:string;cookie:string;worldId:string}
let owner:Actor,editor:Actor,outsider:Actor;
const object=(id=crypto.randomUUID())=>({
  id,assetId:'ctrl-block',name:'Secure Block',x:0,y:0,z:0,rotation:0,
  scale:1,behavior:'solid' as const,target:''
});
async function api(path:string,method='GET',payload?:unknown,cookie='',originOverride=origin){
  return handleApi(new Request(origin+'/api/habitat/'+path,{
    method,headers:{
      ...(method==='GET'?{}:{Origin:originOverride,'Content-Type':'application/json'}),
      ...(cookie?{Cookie:cookie}:{})
    },body:method==='GET'?undefined:JSON.stringify(payload??{})
  }),['habitat',...path.split('/')]);
}
async function actor(name:string):Promise<Actor>{
  const wallet='0x'+crypto.randomUUID().replaceAll('-','').slice(0,32)+'00000000';
  const id='wallet-'+wallet;
  await exec('INSERT INTO users(id,wallet,demo,created_at) VALUES(?,?,0,?)',
    id,wallet,new Date().toISOString());
  const cookie=(await createSession(id,false)).split(';')[0];
  const created=await api('profile','POST',{name,character:'female',randomize:true},cookie);
  expect(created.status).toBe(200);
  const state=await created.json() as HabitatState;
  expect(state.profile?.loadout.characterId).toBeTruthy();
  return {id,wallet,cookie,worldId:state.homeId!};
}
beforeAll(async()=>{
  owner=await actor('Owner One');editor=await actor('Editor Two');outsider=await actor('Outside Three');
});

describe('Habitat contract: safe discovery and ACL',()=>{
  it('exposes profile, visible worlds, and owner permissions without changing world ownership',async()=>{
    const profile=await api('profile','GET',undefined,owner.cookie);
    expect(profile.status).toBe(200);
    const body=await profile.json() as {profile:{loadout:{version:number;accessories:unknown[]}}};
    expect(body.profile.loadout).toMatchObject({version:1,accessories:[]});
    const list=await api('worlds','GET',undefined,owner.cookie);
    expect(list.status).toBe(200);
    const {worlds}=await list.json() as {worlds:{id:string}[]};
    expect(worlds.some(w=>w.id===owner.worldId)).toBe(true);
    expect(worlds.some(w=>w.id===editor.worldId)).toBe(false);
    const perms=await api('worlds/'+owner.worldId+'/permissions','GET',undefined,owner.cookie);
    expect(await perms.json()).toEqual({role:'owner',canVisit:true,canEdit:true,canManage:true});
    const foreign=await api('worlds/'+owner.worldId,'GET',undefined,outsider.cookie);
    expect(foreign.status).toBe(404);
    expect((await api('worlds/'+owner.worldId+'/permissions','GET',undefined,outsider.cookie)).status).toBe(404);
  });

  it('grants reviewed wallet editor then visitor ACLs; only owner manages members',async()=>{
    const grant=await api('worlds/'+owner.worldId+'/members','POST',
      {wallet:editor.wallet,role:'editor'},owner.cookie);
    expect(grant.status).toBe(200);
    expect((await grant.json() as {members:{profileId:string;role:string}[]}).members)
      .toEqual(expect.arrayContaining([expect.objectContaining({profileId:editor.id,role:'editor'})]));
    const perms=await api('worlds/'+owner.worldId+'/permissions','GET',undefined,editor.cookie);
    expect(await perms.json()).toEqual({role:'editor',canVisit:true,canEdit:true,canManage:false});
    const editorState=await api('worlds/'+owner.worldId,'GET',undefined,editor.cookie);
    expect(editorState.status).toBe(200);
    expect((await editorState.json() as HabitatState).permissions?.canEdit).toBe(true);
    expect((await api('worlds/'+owner.worldId+'/members','POST',
      {wallet:outsider.wallet,role:'editor'},editor.cookie)).status).toBe(403);
    expect((await api('worlds/'+owner.worldId+'/members','POST',
      {wallet:owner.wallet,role:'editor'},owner.cookie)).status).toBe(422);
    expect((await api('worlds/'+owner.worldId+'/members','POST',
      {wallet:'0x00000000000000000000000000000000000000dd',role:'editor'},owner.cookie)).status).toBe(422);
    const downgraded=await api('worlds/'+owner.worldId+'/members','POST',
      {wallet:editor.wallet,role:'visitor'},owner.cookie);
    expect(downgraded.status).toBe(200);
    const downgradedPermissions=await api('worlds/'+owner.worldId+'/permissions','GET',undefined,editor.cookie);
    expect(((await downgradedPermissions.json()) as {canEdit:boolean}).canEdit).toBe(false);
    expect((await api('worlds/'+owner.worldId+'/objects','POST',
      {revision:0,object:object()},editor.cookie)).status).toBe(403);
    const removed=await api('worlds/'+owner.worldId+'/members/'+editor.id,'DELETE',{},owner.cookie);
    expect(removed.status).toBe(200);
    expect((await api('worlds/'+owner.worldId,'GET',undefined,editor.cookie)).status).toBe(404);
  });

  it('supports private membership visits, public visibility and owner-only settings with revisions',async()=>{
    const grant=await api('worlds/'+owner.worldId+'/members','POST',
      {wallet:editor.wallet,role:'editor'},owner.cookie);
    expect(grant.status).toBe(200);
    const initial=await api('worlds/'+owner.worldId,'GET',undefined,owner.cookie).then(r=>r.json()) as HabitatState;
    const changed=await api('worlds/'+owner.worldId+'/settings','POST',
      {name:'Shared Studio',visibility:'public',revision:initial.world!.revision},owner.cookie);
    expect(changed.status).toBe(200);
    const next=await changed.json() as HabitatState;
    expect(next.world?.revision).toBe(initial.world!.revision+1);
    expect((await api('worlds/'+owner.worldId+'/settings','POST',
      {name:'Stale',visibility:'private',revision:initial.world!.revision},owner.cookie)).status).toBe(409);
    expect((await api('worlds/'+owner.worldId,'GET',undefined,outsider.cookie)).status).toBe(200);
    const visitorPerm=await api('worlds/'+owner.worldId+'/permissions','GET',undefined,outsider.cookie);
    expect((await visitorPerm.json() as {role:string}).role).toBe('visitor');
    expect((await api('worlds/'+owner.worldId+'/settings','POST',
      {name:'Attacker',visibility:'private'},editor.cookie)).status).toBe(403);
    const privateAgain=await api('worlds/'+owner.worldId+'/settings','POST',
      {name:'Shared Studio',visibility:'private',revision:next.world!.revision},owner.cookie);
    expect(privateAgain.status).toBe(200);
    expect((await api('worlds/'+owner.worldId,'GET',undefined,outsider.cookie)).status).toBe(404);
    expect((await api('worlds/'+owner.worldId,'GET',undefined,editor.cookie)).status).toBe(200);
  });
});

describe('Habitat contract: revisioned object editor',()=>{
  it('allows editor to create, patch, delete and PUT whole layout, rejecting stale revisions',async()=>{
    const seed=await api('worlds/'+owner.worldId,'GET',undefined,owner.cookie).then(r=>r.json()) as HabitatState;
    const id=crypto.randomUUID();
    const created=await api('worlds/'+owner.worldId+'/objects','POST',
      {revision:seed.world!.revision,object:object(id)},editor.cookie);
    expect(created.status).toBe(200);
    const first=await created.json() as HabitatState;
    expect(first.world?.objects[0].id).toBe(id);
    expect((await api('worlds/'+owner.worldId+'/objects','POST',
      {revision:first.world!.revision,object:object(id)},editor.cookie)).status).toBe(409);
    const patched=await api('worlds/'+owner.worldId+'/objects/'+id,'PATCH',
      {revision:first.world!.revision,object:{name:'Renamed Block',x:2}},editor.cookie);
    expect(patched.status).toBe(200);
    const second=await patched.json() as HabitatState;
    expect(second.world?.objects[0]).toMatchObject({name:'Renamed Block',x:2});
    expect((await api('worlds/'+owner.worldId+'/objects/'+id,'PATCH',
      {revision:first.world!.revision,object:{x:3}},editor.cookie)).status).toBe(409);
    expect((await api('worlds/'+owner.worldId+'/objects/'+id,'PATCH',
      {revision:second.world!.revision,object:{assetId:'https://evil.invalid/model.glb'}},editor.cookie)).status).toBe(422);
    const removed=await api('worlds/'+owner.worldId+'/objects/'+id,'DELETE',
      {revision:second.world!.revision},editor.cookie);
    expect(removed.status).toBe(200);
    const third=await removed.json() as HabitatState;
    expect(third.world?.objects).toHaveLength(0);
    const put=await api('worlds/'+owner.worldId+'/objects','PUT',
      {worldId:owner.worldId,revision:third.world!.revision,objects:[object()]},owner.cookie);
    expect(put.status).toBe(200);
    expect((await put.json() as HabitatState).world?.objects).toHaveLength(1);
  });
  it('enforces atomic revisions under contention and blocks script/remote content',async()=>{
    const state=await api('worlds/'+owner.worldId,'GET',undefined,owner.cookie).then(r=>r.json()) as HabitatState;
    const rev=state.world!.revision;
    const a=object(),b=object();
    const writes=await Promise.all([
      api('worlds/'+owner.worldId+'/objects','PUT',
        {worldId:owner.worldId,revision:rev,objects:[a]},owner.cookie),
      api('worlds/'+owner.worldId+'/objects','PUT',
        {worldId:owner.worldId,revision:rev,objects:[b]},editor.cookie)
    ]);
    expect(writes.map(r=>r.status).sort()).toEqual([200,409]);
    const fresh=await api('worlds/'+owner.worldId,'GET',undefined,owner.cookie).then(r=>r.json()) as HabitatState;
    const bad=await api('worlds/'+owner.worldId+'/objects','POST',
      {revision:fresh.world!.revision,object:{...object(),script:'downloadSecrets()'}},editor.cookie);
    expect(bad.status).toBe(422);
    const many=Array.from({length:121},()=>object());
    expect((await api('worlds/'+owner.worldId+'/objects','PUT',
      {worldId:owner.worldId,revision:fresh.world!.revision,objects:many},owner.cookie)).status).toBe(422);
  });
});

describe('Habitat contract: sequenced presence',()=>{
  it('sends loadout-bearing players and rejects stale session, replay and out-of-order sequence',async()=>{
    const joined=await api('join','POST',{id:owner.worldId},editor.cookie);
    expect(joined.status).toBe(200);
    const first=await joined.json() as HabitatState;
    const session=first.presenceSession!;
    expect(session?.id).toBeTruthy();
    const next=await api('presence','POST',{worldId:owner.worldId,x:0,z:6,angle:0,motion:{},
      sessionId:session.id,sequence:1},editor.cookie);
    expect(next.status).toBe(200);
    const updated=await next.json() as HabitatState & {accepted:{x:number;z:number}};
    expect(updated.presenceSession?.sequence).toBe(1);
    expect(updated.accepted).toEqual({x:0,z:6});
    expect(updated.players.find(p=>p.id===editor.id)?.loadout.version).toBe(1);
    expect((await api('presence','POST',{worldId:owner.worldId,x:0,z:6,angle:0,motion:{},
      sessionId:session.id,sequence:1},editor.cookie)).status).toBe(409);
    expect((await api('pose','POST',{worldId:owner.worldId,x:0,z:6,angle:0,motion:{}},editor.cookie)).status).toBe(409);
    const joinedAgain=await api('join','POST',{id:owner.worldId},editor.cookie);
    const second=await joinedAgain.json() as HabitatState;
    expect(second.presenceSession?.id).not.toBe(session.id);
    expect((await api('presence','POST',{worldId:owner.worldId,x:0,z:6,angle:0,motion:{},
      sessionId:session.id,sequence:2},editor.cookie)).status).toBe(409);
    expect((await api('leave','POST',{worldId:owner.worldId,sessionId:session.id},editor.cookie)).status).toBe(409);
    expect((await api('leave','POST',{worldId:owner.worldId,sessionId:second.presenceSession!.id},editor.cookie)).status).toBe(200);
    expect((await api('presence','POST',{worldId:owner.worldId,x:0,z:6,angle:0,motion:{},
      sessionId:second.presenceSession!.id,sequence:1},editor.cookie)).status).toBe(409);
  });
  it('expires old sessions and maintains the explicit legacy visit/pose flow',async()=>{
    const visit=await api('visit','POST',{id:owner.worldId},editor.cookie);
    expect(visit.status).toBe(200);
    const old=await api('pose','POST',{worldId:owner.worldId,x:0,z:6,angle:0,motion:{}},editor.cookie);
    expect(old.status).toBe(200);
    const joined=await api('join','POST',{id:owner.worldId},editor.cookie);
    const s=(await joined.json() as HabitatState).presenceSession!;
    await exec('UPDATE habitat_presence SET seen_at=? WHERE profile_id=?',Date.now()-20_000,editor.id);
    expect((await api('presence','POST',{worldId:owner.worldId,x:0,z:6,angle:0,motion:{},
      sessionId:s.id,sequence:1},editor.cookie)).status).toBe(409);
  });
});

describe('Habitat contract: security regression for new routes',()=>{
  it('rejects unauthenticated and cross-site object/membership mutations',async()=>{
    const world=owner.worldId;
    expect((await api('worlds/'+world,'GET')).status).toBe(401);
    expect((await api('worlds/'+world+'/objects','POST',{revision:0,object:object()})).status).toBe(401);
    expect((await api('worlds/'+world+'/members','POST',
      {wallet:editor.wallet,role:'editor'},owner.cookie,'https://foreign.invalid')).status).toBe(403);
    expect((await api('worlds/'+world+'/objects','PUT',
      {worldId:world,revision:0,objects:[]},outsider.cookie)).status).toBe(404);
  });
});

import {z} from 'zod';
import {one,query,exec,batch,statement} from '@/db';
import {identity,rateLimit} from '@/server/wallet/auth';
import {settings} from '@/server/env';
import {AppError,safeError} from '@/server/errors';
import {layoutSchema,motionSchema,collideWorld,type WorldProfile,type WorldObject} from '@/features/habitat/types';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {characterCatalog,seededAppearance,validVariant,type CharacterGender} from '@/features/plaza/characters/catalog';
import {
  characterProfileInputSchema,worldEditorSavePayloadSchema,worldIdSchema,
  poseInputSchema,presenceInputSchema,objectCreateSchema,
  objectUpdateSchema,objectDeleteSchema,worldSettingsSchema,memberInputSchema,
  type HabitatState,type WorldPermissions
} from '@/domain/habitat';
import {resolveHabitatAssets} from './asset-resolver';
import {readHabitatJson} from './read-json';

interface Row {id:string;owner_id:string;name:string;visibility:'public'|'private';revision:number;layout:string}
interface Principal {id:string;wallet:string}
interface PresenceRow {world_id:string;x:number;z:number;seen_at:number;session_id:string;sequence:number}
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const body=readHabitatJson;
const now=()=>Date.now();
const VALID_PRIMITIVES=new Set(['ctrl-block','ctrl-door','ctrl-switch','ctrl-lamp','ctrl-seat','ctrl-portal','ctrl-marker']);
const errorMissing=()=>new AppError('WORLD_NOT_FOUND',404,'This world is private or unavailable.');

async function principal(r:Request):Promise<Principal|null>{
  // A Common Ground guest, a demo account or a forged ctrl_session cannot
  // acquire a durable world or its editor/membership privileges.
  const u=await identity(r);
  return u&&!u.demo&&u.wallet?{id:u.id,wallet:u.wallet}:null;
}
async function role(w:Row,userId:string):Promise<WorldPermissions>{
  if(w.owner_id===userId)return {role:'owner',canVisit:true,canEdit:true,canManage:true};
  const member=await one<{role:'editor'|'visitor'}>(
    'SELECT role FROM habitat_members WHERE world_id=? AND profile_id=?',w.id,userId);
  if(member)return {role:member.role,canVisit:true,canEdit:member.role==='editor',canManage:false};
  if(w.visibility==='public')return {role:'visitor',canVisit:true,canEdit:false,canManage:false};
  throw errorMissing();
}
async function readWorld(id:string,userId:string):Promise<{row:Row;permissions:WorldPermissions}>{
  const row=await one<Row>('SELECT * FROM habitat_worlds WHERE id=?',id);
  if(!row)throw errorMissing();
  return {row,permissions:await role(row,userId)};
}
function loadout(p:WorldProfile){
  const gender:CharacterGender=p.character==='male'?'male':'female';
  return {version:1 as const,characterId:characterCatalog[gender].id,variantId:validVariant(p.variant),accessories:[]};
}
async function listing(userId:string){
  return query<{id:string;name:string;owner:string}>(
    "SELECT w.id,w.name,p.name AS owner FROM habitat_worlds w "+
    "JOIN habitat_profiles p ON p.id=w.owner_id WHERE w.visibility='public' "+
    "OR w.owner_id=? OR EXISTS (SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=?) "+
    'ORDER BY w.updated_at DESC LIMIT 60',userId,userId);
}
async function state(user:Principal,worldId?:string,strict=false):Promise<HabitatState>{
  const profileRow=await one<WorldProfile>('SELECT id,name,character,variant FROM habitat_profiles WHERE id=?',user.id);
  const home=await one<Row>('SELECT * FROM habitat_worlds WHERE owner_id=?',user.id);
  const presence=await one<PresenceRow>('SELECT * FROM habitat_presence WHERE profile_id=?',user.id);
  let w:Row|null=null,permissions:WorldPermissions|null=null;
  const target=worldId??presence?.world_id??home?.id;
  if(target){
    try{
      const selected=await readWorld(target,user.id);
      w=selected.row;permissions=selected.permissions;
    }catch(e){if(strict)throw e;if(home){w=home;permissions=await role(home,user.id);}}
  }
  const players=w?await query<WorldProfile&{x:number;z:number;angle:number;motion:string}>(
    'SELECT p.id,p.name,p.character,p.variant,s.x,s.z,s.angle,s.motion FROM habitat_presence s '+
    'JOIN habitat_profiles p ON p.id=s.profile_id WHERE s.world_id=? AND s.seen_at>? '+
    'ORDER BY s.seen_at DESC LIMIT 16',w.id,now()-15000):[];
  const states:HabitatState['states']={};
  if(w){
    const rows=await query<{object_id:string;active:number;used_at:number}>(
      'SELECT object_id,active,used_at FROM habitat_object_state WHERE world_id=?',w.id);
    for(const s of rows)states[s.object_id]={active:!!s.active,usedAt:s.used_at};
  }
  const liveSession=w&&presence&&presence.world_id===w.id&&presence.session_id&&
    presence.seen_at>now()-15000?{
      id:presence.session_id,worldId:presence.world_id,sequence:presence.sequence,
      expiresAt:presence.seen_at+15000
    }:null;
  return {
    profile:profileRow?{...profileRow,loadout:loadout(profileRow)}:null,
    homeId:home?.id??null,
    world:w?{id:w.id,ownerId:w.owner_id,name:w.name,visibility:w.visibility,
      revision:w.revision,objects:layoutSchema.parse(JSON.parse(w.layout))}:null,
    canEdit:!!permissions?.canEdit,
    permissions, presenceSession:liveSession,
    players:players.map(p=>({...p,motion:motionSchema.parse(JSON.parse(p.motion)),loadout:loadout(p)})),
    states,wallet:user.wallet,keyStatus:'not-deployed',worlds:await listing(user.id)
  };
}
function approved(objects:WorldObject[]){
  for(const o of objects){
    if(!getBuildAsset(o.assetId)&&!VALID_PRIMITIVES.has(o.assetId)){
      throw new AppError('UNKNOWN_ASSET',422,'Only reviewed local CTRL catalogue assets are supported.');
    }
  }
}
async function save(user:Principal,w:Row,permission:WorldPermissions,objects:WorldObject[],revision:number){
  if(!permission.canEdit)throw new AppError('EDITOR_REQUIRED',403);
  const validated=layoutSchema.parse(objects);approved(validated);
  const result=await exec(
    'UPDATE habitat_worlds SET layout=?,revision=revision+1,updated_at=? '+
    'WHERE id=? AND revision=? AND (owner_id=? OR EXISTS '+
    "(SELECT 1 FROM habitat_members WHERE world_id=? AND profile_id=? AND role='editor'))",
    JSON.stringify(validated),now(),w.id,revision,user.id,w.id,user.id);
  if(!result.meta.changes)throw new AppError('WORLD_EDIT_CONFLICT',409,'World changed. Reload the latest revision before editing.');
  return reply(await state(user,w.id,true));
}
async function members(w:Row){
  return {members:await query<{worldId:string;profileId:string;role:'editor'|'visitor';name:string}>(
    'SELECT m.world_id AS worldId,m.profile_id AS profileId,m.role,p.name '+
    'FROM habitat_members m JOIN habitat_profiles p ON p.id=m.profile_id '+
    'WHERE m.world_id=? ORDER BY p.name,m.profile_id',w.id)};
}
async function grantMember(w:Row,payload:unknown){
  const d=memberInputSchema.parse(payload);
  const wallet=d.wallet.toLowerCase();
  if('wallet-'+wallet===w.owner_id)throw new AppError('OWNER_ROLE_IMMUTABLE',422);
  const user=await one<{id:string}>(
    'SELECT u.id FROM users u JOIN habitat_profiles p ON p.id=u.id '+
    'WHERE lower(u.wallet)=? AND u.demo=0',wallet);
  if(!user)throw new AppError('MEMBER_ONBOARDING_REQUIRED',422,'Recipient must verify a wallet and onboard first.');
  await exec('INSERT INTO habitat_members(world_id,profile_id,role,created_at) VALUES(?,?,?,?) '+
    'ON CONFLICT(world_id,profile_id) DO UPDATE SET role=excluded.role',
    w.id,user.id,d.role,now());
  return reply(await members(w));
}
async function join(user:Principal,id:string,sequenced:boolean){
  const target=await readWorld(id,user.id);
  const session=sequenced?crypto.randomUUID():'';
  await exec('INSERT INTO habitat_presence(profile_id,world_id,x,z,angle,motion,seen_at,session_id,sequence) '+
    'VALUES(?,?,0,6,3.14,?,?,?,0) ON CONFLICT(profile_id) DO UPDATE SET '+
    'world_id=excluded.world_id,x=0,z=6,angle=3.14,motion=excluded.motion,'+
    'seen_at=excluded.seen_at,session_id=excluded.session_id,sequence=0',
    user.id,id,JSON.stringify(motionSchema.parse({})),now(),session);
  return reply(await state(user,target.row.id,true));
}
async function presence(user:Principal,d:unknown,sequenced:boolean){
  const input=sequenced?presenceInputSchema.parse(d):poseInputSchema.parse(d);
  const session=await one<PresenceRow>('SELECT * FROM habitat_presence WHERE profile_id=?',user.id);
  if(!session||session.world_id!==input.worldId)throw new AppError('WORLD_CHANGED',409);
  if(sequenced){
    if(session.session_id!==input.sessionId||!session.session_id||
       session.sequence>=input.sequence!||session.seen_at<=now()-15000)
      throw new AppError('PRESENCE_SESSION_STALE',409,'Join again to refresh your session.');
  }else if(session.session_id){
    // The legacy pose endpoint must not sidestep sequence validation.
    throw new AppError('PRESENCE_SESSION_STALE',409,'Use sequenced presence for this session.');
  }
  const {row}=await readWorld(input.worldId,user.id);
  const states:HabitatState['states']={};
  for(const item of await query<{object_id:string;active:number;used_at:number}>(
    'SELECT object_id,active,used_at FROM habitat_object_state WHERE world_id=?',row.id)){
    states[item.object_id]={active:!!item.active,usedAt:item.used_at};
  }
  const layout=layoutSchema.parse(JSON.parse(row.layout));
  const speedLimit=Math.min(10,Math.max(1,(now()-session.seen_at)/1000*4));
  if(Math.hypot(input.x-session.x,input.z-session.z)>speedLimit)throw new AppError('MOVE_TOO_FAST',422);
  const accepted=collideWorld(session,input,layout,states);
  const time=now();
  const result=sequenced?await exec(
    'UPDATE habitat_presence SET x=?,z=?,angle=?,motion=?,seen_at=?,sequence=? '+
    'WHERE profile_id=? AND world_id=? AND session_id=? AND sequence<? AND seen_at>?',
    accepted.x,accepted.z,input.angle,JSON.stringify(input.motion),time,input.sequence!,
    user.id,row.id,input.sessionId!,input.sequence!,time-15000
  ):await exec(
    "UPDATE habitat_presence SET x=?,z=?,angle=?,motion=?,seen_at=? WHERE profile_id=? AND world_id=? AND session_id=''",
    accepted.x,accepted.z,input.angle,JSON.stringify(input.motion),time,user.id,row.id);
  if(!result.meta.changes)throw new AppError('PRESENCE_SESSION_STALE',409);
  return reply({...await state(user,row.id,true),accepted});
}
async function interact(user:Principal,d:unknown){
  const input=z.object({id:z.string().uuid()}).strict().parse(d);
  const current=await state(user);
  const w=current.world;
  if(!w)throw new AppError('PROFILE_REQUIRED',409);
  const o=w.objects.find(v=>v.id===input.id);
  if(!o)throw new AppError('OBJECT_NOT_FOUND',404);
  const pos=await one<{x:number;z:number;seen_at:number}>(
    'SELECT x,z,seen_at FROM habitat_presence WHERE profile_id=? AND world_id=?',user.id,w.id);
  if(!pos||pos.seen_at<=now()-15000||Math.hypot(pos.x-o.x,pos.z-o.z)>3.5)
    throw new AppError('COME_CLOSER',422);
  const target=o.behavior==='switch'?w.objects.find(v=>v.id===o.target):o;
  if(!target)throw new AppError('TARGET_REQUIRED',422);
  if(!['decoration','solid','portal','checkpoint','finish','seat'].includes(target.behavior)){
    await exec('INSERT INTO habitat_object_state(world_id,object_id,active,used_at) VALUES(?,?,1,?) '+
      'ON CONFLICT(world_id,object_id) DO UPDATE SET active=1-active,used_at=excluded.used_at',
      w.id,target.id,now());
  }
  return reply({object:o,state:await state(user,w.id,true)});
}
async function route(user:Principal,r:Request,path:string[]):Promise<Response>{
  const p=path.join('/'),method=r.method;
  if(method==='GET'&&p==='state')return reply(await state(user));
  if(method==='GET'&&p==='profile')return reply({profile:(await state(user)).profile});
  if(method==='GET'&&p==='worlds')return reply({worlds:await listing(user.id)});
  if(method==='GET'&&path[0]==='worlds'&&path.length>=2){
    const worldId=worldIdSchema.parse(path[1]);
    const {row,permissions}=await readWorld(worldId,user.id);
    if(path.length===2)return reply(await state(user,row.id,true));
    if(path.length===3&&path[2]==='permissions')return reply(permissions);
    if(path.length===3&&path[2]==='members'){
      if(!permissions.canManage)throw new AppError('OWNER_REQUIRED',403);
      return reply(await members(row));
    }
  }
  if(method==='POST'&&p==='profile'){
    const d=characterProfileInputSchema.parse(await body(r));
    const variant=d.randomize?seededAppearance(user.id,d.character).variantId:d.variant??'original';
    const id=crypto.randomUUID(),created=now();
    await batch([
      statement('INSERT INTO habitat_profiles(id,name,character,variant,created_at) VALUES(?,?,?,?,?) '+
        'ON CONFLICT(id) DO UPDATE SET name=excluded.name,character=excluded.character,variant=excluded.variant',
        user.id,d.name,d.character,variant,created),
      statement("INSERT OR IGNORE INTO habitat_worlds(id,owner_id,name,visibility,layout,created_at,updated_at) "+
        "VALUES(?,?,?,'private','[]',?,?)",id,user.id,d.name+"'s place",created,created)
    ]);
    return reply(await state(user));
  }
  if(method==='POST'&&p==='assets/resolve')return reply(resolveHabitatAssets(await body(r)));
  if(method==='POST'&&(p==='join'||p==='visit')){
    const d=z.object({id:worldIdSchema}).strict().parse(await body(r));
    return join(user,d.id,p==='join');
  }
  if(method==='POST'&&(p==='presence'||p==='pose')){
    return presence(user,await body(r),p==='presence');
  }
  if(method==='POST'&&p==='leave'){
    const d=z.object({worldId:worldIdSchema,sessionId:z.string().uuid()}).strict().parse(await body(r));
    const result=await exec(
      'DELETE FROM habitat_presence WHERE profile_id=? AND world_id=? AND session_id=? AND session_id<>?',
      user.id,d.worldId,d.sessionId,'');
    if(!result.meta.changes)throw new AppError('PRESENCE_SESSION_STALE',409);
    return reply({ok:true});
  }
  if(method==='POST'&&p==='save'){
    const d=worldEditorSavePayloadSchema.parse(await body(r));
    const current=await state(user);
    if(!current.world)throw new AppError('PROFILE_REQUIRED',409);
    if(current.world.id!==d.worldId)throw new AppError('WORLD_CHANGED',409);
    const {row,permissions}=await readWorld(current.world.id,user.id);
    return save(user,row,permissions,d.objects,d.revision);
  }
  if(method==='POST'&&p==='settings'){
    const d=worldSettingsSchema.parse(await body(r));
    const current=await state(user);
    if(!current.world)throw new AppError('PROFILE_REQUIRED',409);
    const {row,permissions}=await readWorld(current.world.id,user.id);
    if(!permissions.canManage)throw new AppError('OWNER_REQUIRED',403);
    const revision=d.revision??row.revision;
    const result=await exec('UPDATE habitat_worlds SET name=?,visibility=?,revision=revision+1,updated_at=? '+
      'WHERE id=? AND owner_id=? AND revision=?',d.name,d.visibility,now(),row.id,user.id,revision);
    if(!result.meta.changes)throw new AppError('WORLD_EDIT_CONFLICT',409);
    return reply(await state(user,row.id,true));
  }
  if(method==='POST'&&p==='use')return interact(user,await body(r));
  if(path[0]==='worlds'&&path.length>=3){
    const id=worldIdSchema.parse(path[1]);
    const {row,permissions}=await readWorld(id,user.id);
    if(path[2]==='settings'&&path.length===3&&method==='POST'){
      if(!permissions.canManage)throw new AppError('OWNER_REQUIRED',403);
      const d=worldSettingsSchema.parse(await body(r));
      const result=await exec('UPDATE habitat_worlds SET name=?,visibility=?,revision=revision+1,updated_at=? '+
        'WHERE id=? AND owner_id=? AND revision=?',
        d.name,d.visibility,now(),id,user.id,d.revision??row.revision);
      if(!result.meta.changes)throw new AppError('WORLD_EDIT_CONFLICT',409);
      return reply(await state(user,id,true));
    }
    if(path[2]==='members'){
      if(!permissions.canManage)throw new AppError('OWNER_REQUIRED',403);
      if(path.length===3&&method==='POST')return grantMember(row,await body(r));
      if(path.length===4&&method==='DELETE'){
        const memberId=z.string().min(1).max(200).parse(path[3]);
        if(memberId===row.owner_id)throw new AppError('OWNER_ROLE_IMMUTABLE',403);
        const deleted=await exec(
          'DELETE FROM habitat_members WHERE world_id=? AND profile_id=?',id,memberId);
        if(!deleted.meta.changes)throw new AppError('MEMBER_NOT_FOUND',404);
        return reply(await members(row));
      }
    }
    if(path[2]==='objects'){
      if(!permissions.canEdit)throw new AppError('EDITOR_REQUIRED',403);
      const objects=layoutSchema.parse(JSON.parse(row.layout));
      if(path.length===3&&method==='PUT'){
        const d=worldEditorSavePayloadSchema.parse(await body(r));
        if(d.worldId!==id)throw new AppError('WORLD_CHANGED',409);
        return save(user,row,permissions,d.objects,d.revision);
      }
      if(path.length===3&&method==='POST'){
        const d=objectCreateSchema.parse(await body(r));
        if(objects.some(o=>o.id===d.object.id))throw new AppError('OBJECT_ALREADY_EXISTS',409);
        return save(user,row,permissions,[...objects,d.object],d.revision);
      }
      if(path.length===4){
        const objectId=z.string().uuid().parse(path[3]);
        const index=objects.findIndex(o=>o.id===objectId);
        if(index<0)throw new AppError('OBJECT_NOT_FOUND',404);
        if(method==='PATCH'){
          const d=objectUpdateSchema.parse(await body(r));
          return save(user,row,permissions,objects.map((o,i)=>i===index?{...o,...d.object}:o),d.revision);
        }
        if(method==='DELETE'){
          const d=objectDeleteSchema.parse(await body(r));
          return save(user,row,permissions,objects.filter(o=>o.id!==objectId),d.revision);
        }
      }
    }
  }
  throw new AppError('ROUTE_NOT_FOUND',404);
}
export async function handleHabitat(r:Request,path:string[]):Promise<Response>{
  try{
    if(r.method!=='GET'){
      const expected=settings().origin||new URL(r.url).origin;
      if(r.headers.get('origin')!==expected)throw new AppError('ORIGIN_NOT_ALLOWED',403);
      if(!r.headers.get('content-type')?.startsWith('application/json'))
        throw new AppError('JSON_REQUIRED',415);
    }
    const user=await principal(r);
    if(!user)throw new AppError('WALLET_SESSION_REQUIRED',401,
      'Verify your wallet to use personal worlds. Common Ground remains open to guests.');
    if(r.method!=='GET')await rateLimit('habitat:'+path.join('/')+':'+user.id,
      path[0]==='presence'||path[0]==='pose'?150:40);
    return await route(user,r,path);
  }catch(e){
    if(e instanceof z.ZodError||e instanceof SyntaxError)return reply({code:'INVALID_INPUT',detail:'Invalid world input.'},422);
    const safe=safeError(e);
    return reply({code:safe.code,detail:safe.detail},safe.status);
  }
}

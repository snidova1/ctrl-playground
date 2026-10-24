import {z,ZodError} from 'zod';
import {layoutSchema,worldIdSchema} from '@/domain/habitat';
import {isLifePlacementFree} from '@/features/cozy-life/world-placement';
import {batch,exec,one,statement} from '@/db';
import {identity,rateLimit} from '@/server/wallet/auth';
import {settings} from '@/server/env';
import {AppError,safeError} from '@/server/errors';
import {
  applyLifeAction,barterActionSchema,changeInventory,createLifeState,lifeActionSchema,LifeError,normalizeLifeState,servingActionSchema,
  type BarterAction,type Inventory,type ItemId,type LifeOffering,type LifeResponse,type LifeState,type LifeServing,type ServingAction,type LifeAction,
} from '@/domain/cozy-life';

const requestSchema=z.object({revision:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),action:z.union([lifeActionSchema,barterActionSchema,servingActionSchema])}).strict();
interface StateRow {profile_id:string;revision:number;state:string}
interface OfferRow {id:string;maker_id:string;give_item:ItemId;give_quantity:number;want_item:ItemId;want_quantity:number;status:string;created_at:number}
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

async function readJson(request:Request):Promise<unknown>{
  const length=request.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||!Number.isSafeInteger(Number(length))))throw new AppError('INVALID_CONTENT_LENGTH',400);
  if(length!==null&&Number(length)>8192)throw new AppError('INPUT_TOO_LARGE',413);
  if(!request.body)throw new AppError('INVALID_JSON',400);
  const reader=request.body.getReader(),decoder=new TextDecoder();let bytes=0,text='';
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>8192){void reader.cancel().catch(()=>{});throw new AppError('INPUT_TOO_LARGE',413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
  try{return JSON.parse(text) as unknown;}catch{throw new AppError('INVALID_JSON',400);}
}
async function ensureState(profileId:string,now:number){
  const initial=createLifeState(now);
  await exec('INSERT OR IGNORE INTO cozy_life_states(profile_id,revision,state,updated_at) VALUES(?,0,?,?)',profileId,JSON.stringify(initial),now);
}
async function load(profileId:string):Promise<LifeState>{
  const row=await one<StateRow>('SELECT * FROM cozy_life_states WHERE profile_id=?',profileId);
  if(!row)throw new AppError('LIFE_STATE_NOT_FOUND',404);
  return normalizeLifeState(JSON.parse(row.state) as LifeState);
}
/** Single SELECT: state, community totals and offers share the same SQLite/D1 read snapshot. */
async function snapshot(profileId:string):Promise<LifeResponse>{
  const row=await one<{state:string;totals:string;contributors:number;offers:string;servings:string}>(`
    SELECT s.state,
      (SELECT COALESCE(json_group_array(json_object('id',m.id,'makerId',m.maker_id,'makerName',COALESCE(p.name,'Gardener'),'itemId',m.item_id,'createdAt',m.created_at,'mine',CASE WHEN m.maker_id=? THEN 1 ELSE 0 END)),'[]')
       FROM (SELECT * FROM
         (SELECT * FROM cozy_life_servings WHERE status='open' AND maker_id<>? ORDER BY created_at DESC,id LIMIT 100)
         UNION ALL SELECT * FROM
         (SELECT * FROM cozy_life_servings WHERE status='open' AND maker_id=? ORDER BY created_at DESC,id LIMIT 20)
         ORDER BY created_at DESC,id) m LEFT JOIN habitat_profiles p ON p.id=m.maker_id) AS servings,
      (SELECT COALESCE(json_group_array(json_object('itemId',item,'quantity',quantity)),'[]') FROM
        (SELECT e.key AS item,SUM(CAST(e.value AS INTEGER)) AS quantity
         FROM cozy_life_states c,json_each(c.state,'$.contributions') e GROUP BY e.key)) AS totals,
      (SELECT COUNT(*) FROM cozy_life_states c WHERE EXISTS
        (SELECT 1 FROM json_each(c.state,'$.contributions') e WHERE CAST(e.value AS INTEGER)>0)) AS contributors,
      (SELECT COALESCE(json_group_array(json_object(
        'id',o.id,'makerId',o.maker_id,'makerName',COALESCE(p.name,'Gardener'),
        'give',json_object('itemId',o.give_item,'quantity',o.give_quantity),
        'want',json_object('itemId',o.want_item,'quantity',o.want_quantity),
        'createdAt',o.created_at,'mine',CASE WHEN o.maker_id=? THEN 1 ELSE 0 END)),'[]')
       FROM (SELECT * FROM
         (SELECT * FROM cozy_life_offers WHERE status='open' AND maker_id<>? ORDER BY created_at DESC,id LIMIT 100)
         UNION ALL SELECT * FROM
         (SELECT * FROM cozy_life_offers WHERE status='open' AND maker_id=? ORDER BY created_at DESC,id LIMIT 20)
         ORDER BY created_at DESC,id) o LEFT JOIN habitat_profiles p ON p.id=o.maker_id) AS offers
    FROM cozy_life_states s WHERE s.profile_id=?`,profileId,profileId,profileId,profileId,profileId,profileId,profileId);
  if(!row)throw new AppError('LIFE_STATE_NOT_FOUND',404);
  const state=normalizeLifeState(JSON.parse(row.state) as LifeState);
  const totals:Inventory={};let totalItems=0;
  for(const item of JSON.parse(row.totals) as {itemId:ItemId;quantity:number}[]){totals[item.itemId]=item.quantity;totalItems+=item.quantity;}
  const offerings=(JSON.parse(row.offers) as (Omit<LifeOffering,'mine'>&{mine:number})[]).map(o=>({...o,mine:!!o.mine}));
  const servings=(JSON.parse(row.servings) as (Omit<LifeServing,'mine'>&{mine:number})[]).map(s=>({...s,mine:!!s.mine}));
  return {state,profileId,serverNow:Date.now(),offerings,servings,community:{totals,totalItems,contributors:row.contributors,personal:state.contributions}};
}
function cas(profileId:string,previous:LifeState,next:LifeState):D1PreparedStatement{
  return statement('UPDATE cozy_life_states SET state=?,revision=?,updated_at=? WHERE profile_id=? AND revision=?',JSON.stringify(next),next.revision,next.updatedAt,profileId,previous.revision);
}
function assertChanged():D1PreparedStatement{
  return statement('INSERT OR REPLACE INTO cozy_life_atomic_guard(id) VALUES(CASE WHEN changes()=1 THEN 1 ELSE 0 END)');
}
async function atomic(statements:D1PreparedStatement[]){
  try{await batch(statements);}catch(error){
    if(error instanceof Error&&error.message.includes('cozy_life_cas_success'))throw new AppError('LIFE_EDIT_CONFLICT',409,'The activity changed. Refresh before trying again.');
    throw error;
  }
}
function delta(state:LifeState,debit:ItemId,n:number,credit:ItemId,m:number,now:number){
  // A single map is safe because same-item swaps are rejected at offer creation.
  return changeInventory(state,{[debit]:-n,[credit]:m},now);
}
async function barter(profileId:string,previous:LifeState,action:BarterAction,now:number){
  if(action.type==='offer-create'){
    if(action.give.itemId===action.want.itemId)throw new LifeError('SAME_TRADE_ITEM');
    const count=await one<{n:number}>("SELECT COUNT(*) AS n FROM cozy_life_offers WHERE maker_id=? AND status='open'",profileId);
    if((count?.n??0)>=20)throw new LifeError('OFFER_LIMIT');
    const next=changeInventory(previous,{[action.give.itemId]:-action.give.quantity},now);
    await atomic([
      cas(profileId,previous,next),assertChanged(),
      statement(`INSERT INTO cozy_life_offers(id,maker_id,give_item,give_quantity,want_item,want_quantity,created_at)
        SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM cozy_life_offers WHERE maker_id=? AND status='open')<20`,
        crypto.randomUUID(),profileId,action.give.itemId,action.give.quantity,action.want.itemId,action.want.quantity,now,profileId),assertChanged(),
    ]);return;
  }
  const offer=await one<OfferRow>('SELECT * FROM cozy_life_offers WHERE id=?',action.offerId);
  if(!offer)throw new AppError('OFFER_NOT_FOUND',404);
  if(offer.status!=='open')throw new AppError('OFFER_UNAVAILABLE',409);
  if(action.type==='offer-cancel'){
    if(offer.maker_id!==profileId)throw new AppError('OFFER_FORBIDDEN',403);
    const next=changeInventory(previous,{[offer.give_item]:offer.give_quantity},now);
    await atomic([
      statement("UPDATE cozy_life_offers SET status='canceled',closed_at=? WHERE id=? AND maker_id=? AND status='open'",now,offer.id,profileId),assertChanged(),
      cas(profileId,previous,next),assertChanged(),
    ]);return;
  }
  if(offer.maker_id===profileId)throw new AppError('OFFER_FORBIDDEN',403,'You cannot accept your own offer.');
  const maker=await load(offer.maker_id);
  const next=delta(previous,offer.want_item,offer.want_quantity,offer.give_item,offer.give_quantity,now);
  // Escrow was debited at creation: do NOT debit maker's given item a second time.
  const makerNext=changeInventory(maker,{[offer.want_item]:offer.want_quantity},Math.max(now,maker.updatedAt));
  await atomic([
    statement("UPDATE cozy_life_offers SET status='accepted',taker_id=?,closed_at=? WHERE id=? AND maker_id=? AND status='open' AND maker_id<>?",profileId,now,offer.id,offer.maker_id,profileId),assertChanged(),
    cas(offer.maker_id,maker,makerNext),assertChanged(),
    cas(profileId,previous,next),assertChanged(),
  ]);
}
async function serving(profileId:string,previous:LifeState,action:ServingAction,now:number){
  if(action.type==='serve'){
    const count=await one<{n:number}>("SELECT COUNT(*) AS n FROM cozy_life_servings WHERE maker_id=? AND status='open'",profileId);
    if((count?.n??0)>=20)throw new LifeError('SERVING_LIMIT');
    const next=changeInventory(previous,{[action.itemId]:-1},now);
    await atomic([cas(profileId,previous,next),assertChanged(),
      statement(`INSERT INTO cozy_life_servings(id,maker_id,item_id,created_at)
        SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM cozy_life_servings WHERE maker_id=? AND status='open')<20`,crypto.randomUUID(),profileId,action.itemId,now,profileId),assertChanged()]);return;
  }
  const meal=await one<{status:string}>('SELECT status FROM cozy_life_servings WHERE id=?',action.servingId);
  if(!meal)throw new AppError('SERVING_NOT_FOUND',404);
  if(meal.status!=='open')throw new AppError('SERVING_UNAVAILABLE',409);
  const next=changeInventory(previous,{},now);next.mealsEaten=(previous.mealsEaten??0)+1;
  await atomic([
    statement("UPDATE cozy_life_servings SET status='eaten',taker_id=?,eaten_at=? WHERE id=? AND status='open'",profileId,now,action.servingId),assertChanged(),
    cas(profileId,previous,next),assertChanged(),
  ]);
}
async function placementGuard(profileId:string,previous:LifeState,action:LifeAction):Promise<D1PreparedStatement[]>{
  if(action.type!=='place-garden'&&action.type!=='place-craft')return [];
  const home=await one<{id:string;layout:string;revision:number}>('SELECT id,layout,revision FROM habitat_worlds WHERE owner_id=?',profileId);
  if(!home)throw new AppError('HOME_REQUIRED',403,'Physical placement requires your existing own Habitat.');
  const objects=layoutSchema.parse(JSON.parse(home.layout));
  if(!isLifePlacementFree(objects,action.type==='place-garden'?'garden':action.itemId,action,previous.decorations??[],action.type==='place-garden'?undefined:previous.gardenAnchor))throw new LifeError('PLACEMENT_BLOCKED');
  // A furniture edit racing placement invalidates this guarded transaction instead of
  // accepting collision validation against an obsolete world layout. No home mutation.
  return [statement(`INSERT OR REPLACE INTO cozy_life_atomic_guard(id) VALUES(CASE WHEN EXISTS
    (SELECT 1 FROM habitat_worlds WHERE id=? AND owner_id=? AND revision=?) THEN 1 ELSE 0 END)`,home.id,profileId,home.revision)];
}
async function worldView(request:Request,profileId:string){
  const id=worldIdSchema.parse(new URL(request.url).searchParams.get('worldId'));
  if(!await one('SELECT id FROM habitat_profiles WHERE id=?',profileId))throw new AppError('PROFILE_REQUIRED',403);
  const world=await one<{owner_id:string;visibility:string;member:number}>(`SELECT w.owner_id,w.visibility,
    EXISTS(SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=?) AS member
    FROM habitat_worlds w WHERE w.id=?`,profileId,id);
  if(!world)throw new AppError('WORLD_NOT_FOUND',404);
  if(world.owner_id!==profileId&&world.visibility!=='public'&&!world.member)throw new AppError('WORLD_FORBIDDEN',403);
  const row=await one<StateRow>('SELECT * FROM cozy_life_states WHERE profile_id=?',world.owner_id);
  const state=row?normalizeLifeState(JSON.parse(row.state) as LifeState):createLifeState();
  // Explicit allowlist: do not expose state, inventory, wallet or account identifiers.
  return reply({beds:state.beds.map(b=>({id:b.id,crop:b.crop,plantedAt:b.plantedAt,wateredAt:b.wateredAt,readyAt:b.readyAt})),
    ...(state.gardenAnchor?{gardenAnchor:{x:state.gardenAnchor.x,z:state.gardenAnchor.z}}:{}),
    decorations:(state.decorations??[]).map(d=>({id:d.id,itemId:d.itemId,x:d.x,z:d.z,rotation:d.rotation}))});
}
export async function handleCozyLife(request:Request,path:string[]=[]):Promise<Response>{
  try{
    const isWorld=path.length===1&&path[0]==='world';
    if(path.length&&!isWorld)throw new AppError('ROUTE_NOT_FOUND',404);
    if(isWorld&&request.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET','Cache-Control':'no-store'}});
    if(!['GET','POST'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, POST','Cache-Control':'no-store'}});
    if(request.method==='POST'){
      if(request.headers.get('origin')!==(settings().origin||new URL(request.url).origin))throw new AppError('ORIGIN_NOT_ALLOWED',403);
      if(!request.headers.get('content-type')?.startsWith('application/json'))throw new AppError('JSON_REQUIRED',415);
    }
    const user=await identity(request);
    if(!user||user.demo||!user.wallet)throw new AppError('WALLET_SESSION_REQUIRED',401,'A signed wallet session is required for persistent cozy life.');
    await rateLimit(`cozy-life:${request.method}:${user.id}`,request.method==='POST'?40:120);
    const now=Date.now();
    if(isWorld)return await worldView(request,user.id);
    if(request.method==='GET'){await ensureState(user.id,now);return reply(await snapshot(user.id));}
    const data=requestSchema.parse(await readJson(request));
    await ensureState(user.id,now);
    const previous=await load(user.id);
    if(previous.revision!==data.revision)throw new AppError('LIFE_EDIT_CONFLICT',409,'Refresh the latest activity state before trying again.');
    if(data.action.type==='serve'||data.action.type==='eat-serving'){
      await serving(user.id,previous,data.action,Math.max(now,previous.updatedAt));
    }else if(data.action.type==='offer-create'||data.action.type==='offer-accept'||data.action.type==='offer-cancel'){
      await barter(user.id,previous,data.action,now);
    }else{
      const guards=await placementGuard(user.id,previous,data.action);
      const entropy=crypto.getRandomValues(new Uint32Array(1))[0]/0x1_0000_0000;
      const next=applyLifeAction(previous,data.action,Math.max(now,previous.updatedAt),entropy);
      await atomic([...guards,cas(user.id,previous,next),assertChanged()]);
    }
    return reply(await snapshot(user.id));
  }catch(error){
    if(error instanceof ZodError)return reply({code:'INVALID_COMMAND',detail:error.errors.map(e=>e.message).join('. ')},422);
    if(error instanceof LifeError)return reply({code:error.code,detail:error.code.replaceAll('_',' ')},422);
    const e=safeError(error);return reply({code:e.code,detail:e.detail},e.status);
  }
}

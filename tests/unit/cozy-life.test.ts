import {describe,expect,it} from 'vitest';
import {applyLifeAction,changeInventory,createLifeState,CROPS,FISHING,lifeActionSchema,type LifeState} from '@/domain/cozy-life';
const start=1_000;
function planted(){return applyLifeAction(createLifeState(start),{type:'plant',bedId:0,cropId:'turnip'},start);}
function stocked():LifeState{return {...createLifeState(start),inventory:{turnip:4,tomato:2,herb:4,perch:2,driftwood:6,clay:4}};}
describe('cozy life deterministic nonfinancial reducer',()=>{
  it('creates independent seed inventories and beds without pretend players or financial balances',()=>{
    const a=createLifeState(start),b=createLifeState(start);a.inventory['turnip-seed']=0;
    expect(b.inventory['turnip-seed']).toBe(4);expect(b.beds).toHaveLength(4);expect(b.revision).toBe(0);
    expect(b).not.toHaveProperty('balance');expect(b).not.toHaveProperty('players');
  });
  it('debits a seed, requires watering, waits full grow time, harvests actual yield and returns seed',()=>{
    const original=createLifeState(start),p=applyLifeAction(original,{type:'plant',bedId:0,cropId:'turnip'},start);
    expect(original.inventory['turnip-seed']).toBe(4);expect(p.inventory['turnip-seed']).toBe(3);
    expect(()=>applyLifeAction(p,{type:'harvest',bedId:0},999_999)).toThrow('CROP_NOT_READY');
    const waterTime=start+5_000,w=applyLifeAction(p,{type:'water',bedId:0},waterTime);
    expect(w.beds[0].readyAt).toBe(waterTime+CROPS.turnip.growMs);
    expect(()=>applyLifeAction(w,{type:'harvest',bedId:0},waterTime+CROPS.turnip.growMs-1)).toThrow('CROP_NOT_READY');
    const h=applyLifeAction(w,{type:'harvest',bedId:0},waterTime+CROPS.turnip.growMs);
    expect(h.inventory.turnip).toBe(CROPS.turnip.yield);expect(h.inventory['turnip-seed']).toBe(4);
    expect(h.stats.harvests).toBe(1);expect(h.beds[0].crop).toBeNull();expect(h.revision).toBe(3);
    expect(()=>applyLifeAction(h,{type:'harvest',bedId:0},h.updatedAt)).toThrow('BED_EMPTY');
  });
  it('rejects occupied/empty beds, rewatering, missing seeds and invalid fields without mutation',()=>{
    const p=planted();expect(()=>applyLifeAction(p,{type:'plant',bedId:0,cropId:'herb'},start)).toThrow('BED_OCCUPIED');
    expect(()=>applyLifeAction(p,{type:'water',bedId:1},start)).toThrow('BED_EMPTY');
    const w=applyLifeAction(p,{type:'water',bedId:0},start);
    expect(()=>applyLifeAction(w,{type:'water',bedId:0},start+1)).toThrow('ALREADY_WATERED');
    const empty=createLifeState(start);empty.inventory={};expect(()=>applyLifeAction(empty,{type:'plant',bedId:0,cropId:'herb'},start)).toThrow('INSUFFICIENT_ITEMS');
    expect(lifeActionSchema.safeParse({type:'water',bedId:99}).success).toBe(false);
    expect(lifeActionSchema.safeParse({type:'reel',random:0,itemId:'carp'}).success).toBe(false);
    expect(p.beds[0].wateredAt).toBeNull();
  });
  it('fishing enforces bite time and produces deterministic server-supplied catches exactly once',()=>{
    const c=applyLifeAction(createLifeState(start),{type:'cast'},start);
    expect(()=>applyLifeAction(c,{type:'cast'},start+1)).toThrow('ALREADY_FISHING');
    expect(()=>applyLifeAction(c,{type:'reel'},c.fishing!.biteAt-1)).toThrow('FISH_TOO_EARLY');
    for(const [index,id] of FISHING.catches.entries()){
      const r=applyLifeAction(c,{type:'reel'},c.fishing!.biteAt,index/FISHING.catches.length);
      expect(r.inventory[id]).toBe(1);expect(r.fishing).toBeNull();expect(r.stats.fishCaught).toBe(1);
      expect(()=>applyLifeAction(r,{type:'reel'},r.updatedAt)).toThrow('NOT_FISHING');
      expect(()=>applyLifeAction(r,{type:'cast'},r.updatedAt)).toThrow('FISHING_COOLDOWN');
      expect(applyLifeAction(r,{type:'cast'},r.nextCastAt).fishing).not.toBeNull();
    }
  });
  it('expired fishing gives no loot and can be cleared or replaced',()=>{
    const c=applyLifeAction(createLifeState(start),{type:'cast'},start),t=c.fishing!.expiresAt+1;
    const r=applyLifeAction(c,{type:'reel'},t,0);expect(r.inventory).toEqual(c.inventory);expect(r.stats.fishCaught).toBe(0);expect(r.fishing).toBeNull();
    expect(applyLifeAction(c,{type:'cast'},t).fishing?.castAt).toBe(t);
  });
  it('cooking and crafting consume actual ingredients and track lifetime crafting separately',()=>{
    const original=stocked(),soup=applyLifeAction(original,{type:'cook',recipeId:'garden-soup'},start);
    expect(soup.inventory).toMatchObject({turnip:2,tomato:1,'garden-soup':1});expect(soup.stats.mealsCooked).toBe(1);
    const pot=applyLifeAction(soup,{type:'craft',recipeId:'flower-pot'},start);
    expect(pot.inventory).toMatchObject({clay:2,herb:3,'flower-pot':1});expect(pot.crafted['flower-pot']).toBe(1);
    expect(pot.stats.itemsCrafted).toBe(1);expect(original.inventory.clay).toBe(4);
    const bench=applyLifeAction(pot,{type:'craft',recipeId:'wooden-bench'},start);expect(bench.inventory.driftwood).toBe(3);
  });
  it('a partially satisfiable recipe never consumes any ingredient on failure',()=>{
    const s=stocked();s.inventory.tomato=0;const original=structuredClone(s);
    expect(()=>applyLifeAction(s,{type:'cook',recipeId:'garden-soup'},start)).toThrow('INSUFFICIENT_ITEMS');expect(s).toEqual(original);
  });
  it('contributions debit inventory permanently, accumulate personal counts, reject overspend',()=>{
    const s=stocked(),c=applyLifeAction(s,{type:'contribute',itemId:'turnip',quantity:3},start);
    expect(c.inventory.turnip).toBe(1);expect(c.contributions.turnip).toBe(3);
    expect(()=>applyLifeAction(c,{type:'contribute',itemId:'turnip',quantity:2},start)).toThrow('INSUFFICIENT_ITEMS');
    expect(lifeActionSchema.safeParse({type:'contribute',itemId:'turnip',quantity:-1}).success).toBe(false);
    expect(lifeActionSchema.safeParse({type:'contribute',itemId:'perch',quantity:1}).success).toBe(false);
  });
  it('rejects clock rollback, invalid randomness and inventory overflow',()=>{
    expect(()=>applyLifeAction(createLifeState(start),{type:'cast'},start-1)).toThrow('INVALID_TIME');
    const c=applyLifeAction(createLifeState(start),{type:'cast'},start);
    expect(()=>applyLifeAction(c,{type:'reel'},c.fishing!.biteAt,1)).toThrow('INVALID_RANDOM');
    const s=stocked();s.inventory.turnip=1_000_000;
    expect(()=>changeInventory(s,{turnip:1},start)).toThrow('INVENTORY_FULL');
    expect(()=>changeInventory(s,{clay:-9},start)).toThrow('INSUFFICIENT_ITEMS');
  });
});

import type {VRM} from '@pixiv/three-vrm';

export type CharacterExpressionId='neutral'|'happy'|'relaxed'|'angry'|'sad';
const expressionIds:readonly CharacterExpressionId[]=['neutral','happy','relaxed','angry','sad'];
const blendSeconds=.2,blinkSeconds=.2,openSeconds=.06;
const clamp=(value:number)=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
const ease=(t:number)=>t*t*(3-2*t);
const intensityFor=(id:CharacterExpressionId)=>id==='neutral'?0:id==='happy'?.55:id==='angry'?.45:.65;
interface Channel {id:CharacterExpressionId;name:string;eye:boolean;value:number;from:number;target:number;}
interface Temporary {id:CharacterExpressionId;intensity:number;remaining:number|null;}
export interface ExpressionControllerOptions {seed?:number;blendDuration?:number;}

/**
 * Original, dependency-light CTRL implementation of the lifecycle contracts in
 * docs/avatar-three-repo-audit.md: AIRI's narrow morph ownership and cycle-latched
 * blink suppression, plus Amica's open-eye handoff and cancelable restore.
 * No upstream source copied. No wall-clock timers or independent VRM updates.
 *
 * applyCharacterExpression remains the legacy appearance input: it writes
 * ctrlExpression and immediate manager weights. Our stored weights, NOT those
 * writes, are the source for each blend; update overwrites them before VRM.update
 * renders morphs. Custom expressions/visemes are deliberately not owned. Idle
 * life is opt-in; gaze yields to explicit look targets and temporary expressions.
 */
export class CharacterExpressionController {
  readonly availableExpressions:readonly CharacterExpressionId[];
  private readonly channels:Channel[];
  private readonly blinkNames:string[];
  private readonly combinedBlink:string|undefined;
  private readonly blendDuration:number;
  private baseline:CharacterExpressionId='neutral';
  private temporary:Temporary|null=null;
  private transitionTime=0;
  private randomState:number;
  private blinkWait:number;
  private blinkTime:number|null=null;
  private blinkSuppressed=false;
  private blinkValue=0;
  private opening:{from:number;elapsed:number}|null=null;
  private idleLife=false;
  private idleWarmth=false;
  private lifeTime=0;
  private gazeRest:{yaw:number;pitch:number}|null=null;
  private disposed=false;

  constructor(private readonly vrm:Pick<VRM,'scene'|'expressionManager'>&Partial<Pick<VRM,'lookAt'>>,options:ExpressionControllerOptions={}){
    const manager=vrm.expressionManager;
    const names=new Map(Object.keys(manager?.expressionMap??{}).map(name=>[name.toLowerCase(),name]));
    this.channels=expressionIds.flatMap(id=>{
      const name=names.get(id);if(!name)return [];
      const expression=manager!.getExpression(name);
      const value=clamp(manager!.getValue(name)??0);
      // VRM0 joy/fun frequently close eyes without declaring overrideBlink.
      const eye=id==='happy'||id==='relaxed'||(expression?.overrideBlink!==undefined&&expression.overrideBlink!=='none');
      return [{id,name,eye,value,from:value,target:value}];
    });
    this.availableExpressions=Object.freeze(expressionIds.filter(id=>id==='neutral'||this.channels.some(channel=>channel.id===id)));
    this.blinkNames=['blink','blinkleft','blinkright'].flatMap(id=>names.has(id)?[names.get(id)!]:[]);
    this.combinedBlink=names.get('blink');
    this.blendDuration=Number.isFinite(options.blendDuration)?Math.max(0,options.blendDuration!):blendSeconds;
    // Scene ids are per-instance (not the shared asset id). Explicit seeds allow
    // deterministic replay; there is no shared PRNG/elapsed clock across avatars.
    this.randomState=(options.seed??vrm.scene.id)>>>0;
    this.blinkWait=this.nextBlinkInterval();
    this.syncBaseline();
    this.transitionTo(this.baseline,intensityFor(this.baseline));
  }

  /** A temporary override; omit holdSeconds to hold until reset/replacement. */
  setExpression(id:string,intensity?:number,holdSeconds?:number):boolean{
    if(this.disposed)return false;
    const supported=this.resolve(id);if(!supported)return false;
    const weight=intensity===undefined?intensityFor(supported):clamp(intensity);
    this.temporary={id:supported,intensity:weight,remaining:holdSeconds===undefined?null:Number.isFinite(holdSeconds)?Math.max(0,holdSeconds):0};
    this.transitionTo(supported,weight,this.idleWarmth);
    return true;
  }

  /** The shared animator enables this only while its actual body state is Idle.
   * No separate timers, mixers, raw eye rotations or extra VRM.update calls. */
  setIdleLife(enabled:boolean){if(!this.disposed)this.idleLife=enabled;}

  /** Restore the latest creator choice, not the baseline at emote start. */
  resetExpression(){
    if(this.disposed)return;
    this.temporary=null;this.syncBaseline();
    this.transitionTo(this.baseline,intensityFor(this.baseline),this.idleWarmth);
  }

  update(delta:number){
    if(this.disposed||!Number.isFinite(delta)||delta<0)return;
    this.syncBaseline();
    if(this.temporary&&this.temporary.remaining!==null){
      this.temporary.remaining-=delta;
      if(this.temporary.remaining<=1e-9)this.resetExpression();
    }
    this.lifeTime=(this.lifeTime+delta)%12;
    const ambient=this.idleLife&&!this.temporary&&this.baseline==='neutral';
    // A brief, barely-there smile, not a permanent happy preset or closed eyes.
    const pulse=ambient&&this.lifeTime>6&&this.lifeTime<9?.065*Math.sin((this.lifeTime-6)/3*Math.PI)**2:0;
    if(this.idleWarmth&&!ambient&&!this.temporary&&this.baseline==='neutral')this.transitionTo('neutral',0,true);
    this.idleWarmth=ambient;
    const suppress=this.channels.some(channel=>channel.eye&&(channel.value>0||channel.target>0||(ambient&&channel.id==='happy'&&pulse>0)));
    const blendDelta=this.updateBlink(delta,suppress);
    this.transitionTime+=blendDelta;
    const t=this.blendDuration===0?(this.opening?0:1):Math.min(1,this.transitionTime/this.blendDuration);
    for(const channel of this.channels){
      // Assign exact terminal targets, including neutral's zero, before idling.
      if(ambient&&channel.id==='happy'){
        channel.value+=(pulse-channel.value)*(1-Math.exp(-8*blendDelta));
        if(pulse===0&&channel.value<1e-6)channel.value=0;
      }else channel.value=t>=1?channel.target:channel.from+(channel.target-channel.from)*ease(t);
      this.vrm.expressionManager!.setValue(channel.name,channel.value);
    }
    this.writeBlink();
    this.updateGaze(delta,ambient);
  }

  dispose(){
    if(this.disposed)return;
    this.disposed=true;this.temporary=null;this.opening=null;this.blinkTime=null;this.blinkValue=0;
    for(const channel of this.channels)this.vrm.expressionManager!.setValue(channel.name,0);
    this.writeBlink();
    const lookAt=this.vrm.lookAt;
    if(this.gazeRest&&lookAt&&!lookAt.target){lookAt.yaw=this.gazeRest.yaw;lookAt.pitch=this.gazeRest.pitch;}
    this.gazeRest=null;
  }

  private resolve(id:unknown):CharacterExpressionId|undefined{
    if(typeof id!=='string')return undefined;
    return this.availableExpressions.find(candidate=>candidate===id.toLowerCase());
  }

  private syncBaseline(){
    const id=this.resolve(this.vrm.scene.userData.ctrlExpression)??'neutral';
    if(id===this.baseline)return;
    this.baseline=id;
    if(!this.temporary)this.transitionTo(id,intensityFor(id),this.idleWarmth);
  }

  private transitionTo(id:CharacterExpressionId,intensity:number,force=false){
    const targetFor=(channel:Channel)=>id!=='neutral'&&channel.id===id?intensity:0;
    if(!force&&this.channels.every(channel=>channel.target===targetFor(channel)))return;
    for(const channel of this.channels){channel.from=channel.value;channel.target=targetFor(channel);}
    this.transitionTime=0;
  }

  private updateGaze(delta:number,ambient:boolean){
    const lookAt=this.vrm.lookAt;
    // Never commandeer an explicit target, even a manual one, or write eye
    // bones/morphs beside the existing VRM look-at applier.
    if(!lookAt||lookAt.target){this.gazeRest=null;return;}
    if(!ambient&&!this.gazeRest)return;
    this.gazeRest??={yaw:lookAt.yaw,pitch:lookAt.pitch};
    const phase=this.lifeTime/12*Math.PI*2,blend=1-Math.exp(-10*delta);
    const yaw=this.gazeRest.yaw+(ambient?3*Math.sin(phase)+.6*Math.sin(phase*3):0);
    const pitch=this.gazeRest.pitch+(ambient?.8*Math.sin(phase*2):0);
    lookAt.yaw+=(yaw-lookAt.yaw)*blend;lookAt.pitch+=(pitch-lookAt.pitch)*blend;
    if(!ambient&&Math.abs(lookAt.yaw-yaw)+Math.abs(lookAt.pitch-pitch)<1e-5){lookAt.yaw=yaw;lookAt.pitch=pitch;this.gazeRest=null;}
  }

  private nextBlinkInterval(){
    // Mulberry32: compact per-controller deterministic PRNG, never Math.random.
    let n=this.randomState=(this.randomState+0x6d2b79f5)>>>0;
    n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);
    return 1+((n^(n>>>14))>>>0)/4294967296*5;
  }

  /** Advance even suppressed cycles. Return time left after opening the eyelids. */
  private updateBlink(delta:number,suppress:boolean){
    if(suppress&&this.blinkValue>0&&!this.blinkSuppressed&&!this.opening){
      this.opening={from:this.blinkValue,elapsed:0};
    }
    if(suppress&&this.blinkTime!==null)this.blinkSuppressed=true;
    let remaining=delta;
    while(remaining>0){
      if(this.blinkTime===null){
        const step=Math.min(remaining,this.blinkWait);this.blinkWait-=step;remaining-=step;
        if(this.blinkWait<=1e-9){this.blinkTime=0;this.blinkSuppressed=suppress;}
      }else{
        const step=Math.min(remaining,blinkSeconds-this.blinkTime);this.blinkTime+=step;remaining-=step;
        if(this.blinkTime>=blinkSeconds-1e-9){
          this.blinkTime=null;this.blinkSuppressed=false;this.blinkWait=this.nextBlinkInterval();
        }
      }
    }
    let blendDelta=delta;
    if(this.opening){
      const step=Math.min(delta,openSeconds-this.opening.elapsed);this.opening.elapsed+=step;blendDelta-=step;
      this.blinkValue=this.opening.from*(1-ease(Math.min(1,this.opening.elapsed/openSeconds)));
      if(this.opening.elapsed>=openSeconds-1e-9){this.opening=null;this.blinkValue=0;}
    }else{
      this.blinkValue=this.blinkTime===null||this.blinkSuppressed?0:Math.sin(this.blinkTime/blinkSeconds*Math.PI);
    }
    return blendDelta;
  }

  private writeBlink(){
    for(const name of this.blinkNames){
      // Prefer combined blink; do not double-add left/right on the same eyelids.
      this.vrm.expressionManager!.setValue(name,!this.combinedBlink||name===this.combinedBlink?this.blinkValue:0);
    }
  }
}
